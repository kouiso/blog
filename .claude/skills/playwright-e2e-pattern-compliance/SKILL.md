---
name: playwright-e2e-pattern-compliance
description: Playwright E2E test implementation, test file creation, test execution
---


# Playwright E2E Pattern Compliance (Playwright E2Eパターン準拠)

## Purpose (目的)
<!-- Playwright E2Eテストの既存パターンを踏襲し、一貫性のあるテスト実装を保証 -->
Comply with existing Playwright E2E test patterns to ensure consistent test implementation.


## Test File Structure (テストファイル構造)

```
test/
├── e2e/
│   ├── home.spec.ts         # Homepage tests
│   ├── product.spec.ts      # Product page tests
│   ├── search.spec.ts       # Search functionality tests
│   └── contact.spec.ts      # Contact form tests
├── fixtures/
│   └── test-data.ts         # Test data fixtures
└── playwright.config.ts      # Playwright configuration
```


## Standard Test Pattern (標準テストパターン)

### Basic Test Structure (基本テスト構造)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Product Page', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to page before each test
		await page.goto('/products/paint-a/');
	});

	test('displays product title', async ({ page }) => {
		// ✅ Good: Use data-testid for reliable selectors
		const title = page.getByTestId('product-title');
		await expect(title).toBeVisible();
		await expect(title).toHaveText('Paint A');
	});

	test('displays product price', async ({ page }) => {
		const price = page.getByTestId('product-price');
		await expect(price).toBeVisible();
		await expect(price).toContainText('¥');
	});
});
```


## Selector Strategy (セレクタ戦略)

### Priority Order (優先順序)

1. **data-testid** (Highest priority - most stable)
   <!-- 最優先 - 最も安定 -->
2. **Role & Accessible Name** (Good for accessibility)
   <!-- アクセシビリティに良い -->
3. **Text Content** (Fragile for internationalization)
   <!-- 国際化に脆弱 -->
4. **CSS Selectors** (Last resort - fragile)
   <!-- 最終手段 - 脆弱 -->

```typescript
// ✅ Best: data-testid
await page.getByTestId('product-title').click();

// ✅ Good: Role + accessible name
await page.getByRole('button', { name: 'Add to Cart' }).click();

// ⚠️ OK: Text (but fragile for i18n)
await page.getByText('製品一覧').click();

// ❌ Avoid: CSS selectors (fragile)
await page.locator('.product__title').click();
```


## Adding data-testid to WordPress Templates (WordPressテンプレートにdata-testidを追加)

### Template Implementation (テンプレート実装)

```php
<!-- ✅ Good: Add data-testid to important elements -->
<article class="product" data-testid="product-card">
	<h2 class="product__title" data-testid="product-title">
		<?php the_title(); ?>
	</h2>

	<div class="product__price" data-testid="product-price">
		<?php echo esc_html(muashi_get_product_price(get_the_ID())); ?>
	</div>

	<button class="product__cart-button" data-testid="add-to-cart">
		<?php esc_html_e('Add to Cart', 'muashi'); ?>
	</button>
</article>
```


## Waiting Strategies (待機戦略)

### Auto-waiting (自動待機)

```typescript
// ✅ Good: Playwright auto-waits
await page.getByTestId('product-title').click(); // Waits for element to be visible and enabled

// ❌ Bad: Manual waiting (unnecessary)
await page.waitForTimeout(1000);
await page.getByTestId('product-title').click();
```

### Explicit Waiting (明示的待機)

```typescript
// ✅ Good: Wait for specific condition
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="product-list"]');
await expect(page.getByTestId('product-title')).toBeVisible();

// For AJAX requests
await page.waitForResponse(response =>
	response.url().includes('/wp-json/muashi/v1/products') &&
	response.status() === 200
);
```


## Form Testing (フォームテスト)

### Contact Form Example (お問い合わせフォームの例)

```typescript
test('submits contact form successfully', async ({ page }) => {
	await page.goto('/contact/');

	// Fill form
	await page.getByTestId('contact-name').fill('Test User');
	await page.getByTestId('contact-email').fill('test@example.com');
	await page.getByTestId('contact-message').fill('This is a test message.');

	// Submit
	await page.getByTestId('contact-submit').click();

	// Verify success message
	const successMessage = page.getByTestId('contact-success');
	await expect(successMessage).toBeVisible();
	await expect(successMessage).toContainText('送信が完了しました');
});
```


## Navigation Testing (ナビゲーションテスト)

```typescript
test('navigates to product page from home', async ({ page }) => {
	await page.goto('/');

	// Click product card
	await page.getByTestId('product-card').first().click();

	// Verify URL
	await expect(page).toHaveURL(/\/products\/.+/);

	// Verify product page elements
	await expect(page.getByTestId('product-title')).toBeVisible();
});
```


## Screenshot Testing (スクリーンショットテスト)

```typescript
test('product page visual regression', async ({ page }) => {
	await page.goto('/products/paint-a/');

	// Wait for page to be fully loaded
	await page.waitForLoadState('networkidle');

	// Take screenshot
	await expect(page).toHaveScreenshot('product-page.png', {
		fullPage: true,
		maxDiffPixels: 100
	});
});
```


## Accessibility Testing (アクセシビリティテスト)

```typescript
import AxeBuilder from '@axe-core/playwright';

test('product page has no accessibility violations', async ({ page }) => {
	await page.goto('/products/paint-a/');

	const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

	expect(accessibilityScanResults.violations).toEqual([]);
});
```


## Test Organization (テスト整理)

### Group Related Tests (関連テストをグループ化)

```typescript
test.describe('Product Search', () => {
	test.describe('Successful Search', () => {
		test('displays results for valid query', async ({ page }) => {
			// ...
		});

		test('shows product count', async ({ page }) => {
			// ...
		});
	});

	test.describe('Empty Search', () => {
		test('shows no results message', async ({ page }) => {
			// ...
		});
	});
});
```


## Running Tests (テスト実行)

### NPM Scripts (NPMスクリプト)

```bash
# Run all tests
npm run test

# Run smoke tests only
npm run test:smoke

# Run specific test file
npx playwright test test/e2e/product.spec.ts

# Run in UI mode (debugging)
npm run test:ui

# Run in headed mode (see browser)
npx playwright test --headed

# Generate test report
npx playwright show-report
```


## Test Data Management (テストデータ管理)

### Use Fixtures (Fixturesを使用)

```typescript
// test/fixtures/test-data.ts
export const testProducts = [
	{
		title: 'Paint A',
		price: '¥1,000',
		slug: 'paint-a'
	},
	{
		title: 'Paint B',
		price: '¥2,000',
		slug: 'paint-b'
	}
];

// test/e2e/product.spec.ts
import { testProducts } from '../fixtures/test-data';

test('displays all test products', async ({ page }) => {
	await page.goto('/products/');

	for (const product of testProducts) {
		await expect(page.getByText(product.title)).toBeVisible();
	}
});
```


## Best Practices (ベストプラクティス)

1. **Use data-testid** - Most stable selector strategy
   <!-- 最も安定したセレクタ戦略 -->
2. **Avoid fixed waits** - Use auto-waiting or explicit conditions
   <!-- 固定待機を避ける - 自動待機または明示的条件を使用 -->
3. **Test user flows** - Not just individual elements
   <!-- ユーザーフローをテスト - 個別要素だけでなく -->
4. **Keep tests independent** - Each test should work alone
   <!-- テストを独立させる - 各テストは単独で動作すべき -->
5. **Use descriptive test names** - Clear what is being tested
   <!-- 説明的なテスト名を使用 - 何がテストされているか明確に -->


## Related Files (関連ファイル)

- `playwright.config.ts` - Playwright configuration
- `.claude/rules/testing.md` - Testing protocols
- `prompt/commands/tdd.md` - TDD workflow
