---
name: wordpress-hook-pattern-compliance
description: WordPress hook usage, action/filter implementation, functions.php modification
---


# WordPress Hook Pattern Compliance (WordPressフックパターン準拠)

## Purpose (目的)
<!-- WordPressフックの正しい使用タイミング、優先度、命名規則を徹底し、パフォーマンスとメンテナンス性を最大化 -->
Ensure correct usage timing, priority, and naming conventions for WordPress hooks to maximize performance and maintainability.


## Core Hook Principles (核心フック原則)

1. **Right Hook, Right Time** - Use appropriate hook for each task
   <!-- 正しいフック、正しいタイミング - 各タスクに適切なフックを使用 -->
2. **Minimize Hook Usage** - Don't register hooks unnecessarily
   <!-- フック使用を最小化 - 不要にフックを登録しない -->
3. **Correct Priority** - Use default priority unless order matters
   <!-- 正しい優先度 - 順序が重要でない限りデフォルト優先度を使用 -->
4. **Namespace Custom Hooks** - Prefix all custom hooks with theme/plugin name
   <!-- カスタムフックの名前空間 - 全カスタムフックにテーマ・プラグイン名をプレフィックス -->


## WordPress Hook Execution Order (WordPressフック実行順序)

### Critical Hooks in Order (順序通りの重要フック)

```php
// 1. muplugins_loaded - Must-Use plugins loaded
// 2. plugins_loaded - Regular plugins loaded
// 3. sanitize_comment_cookies - Sanitize comment cookies
// 4. setup_theme - Before theme functions.php
// 5. after_setup_theme - After theme functions.php (THEME INITIALIZATION)
// 6. init - Initialize custom post types, taxonomies, etc.
// 7. widgets_init - Register widgets
// 8. wp_loaded - All WordPress core loaded
// 9. parse_request - Parse request
// 10. send_headers - Send HTTP headers
// 11. template_redirect - Before template is loaded (REDIRECT LOGIC)
// 12. wp_enqueue_scripts - Enqueue frontend scripts/styles
// 13. wp_head - <head> section output
// 14. wp_body_open - After <body> tag
// 15. wp_footer - Before </body> tag
// 16. shutdown - After all output sent
```

**Visual Timeline:**
```
Plugin Load → Theme Load → Init → Loaded → Template → Output
     ↓            ↓          ↓       ↓         ↓         ↓
plugins_      after_     init    wp_     template_  wp_enqueue_
loaded       setup_theme        loaded  redirect    scripts
```


## Hook Usage Patterns by Task (タスク別フック使用パターン)

### 1. Theme Initialization (テーマ初期化)

**Hook**: `after_setup_theme`
**Priority**: 10 (default)
**When to use**: Theme features, image sizes, menus
<!-- 使用時期: テーマ機能、画像サイズ、メニュー -->

```php
// ✅ Correct: Use after_setup_theme for theme features
function muashi_theme_setup() {
	// Add theme support
	add_theme_support('title-tag');
	add_theme_support('post-thumbnails');
	add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption']);

	// Register nav menus
	register_nav_menus([
		'primary' => __('Primary Menu', 'muashi'),
		'footer' => __('Footer Menu', 'muashi')
	]);

	// Add image sizes
	add_image_size('product-thumbnail', 300, 300, true);
	add_image_size('product-large', 800, 600, false);
}
add_action('after_setup_theme', 'muashi_theme_setup');

// ❌ Wrong: Using init for theme features
add_action('init', 'muashi_theme_setup'); // Too late!
```


### 2. Custom Post Types & Taxonomies (カスタム投稿タイプ・タクソノミー)

**Hook**: `init`
**Priority**: 10 (default)
**When to use**: ALWAYS for register_post_type() and register_taxonomy()
<!-- 使用時期: register_post_type()とregister_taxonomy()には必ず -->

```php
// ✅ Correct: Register custom post types in init
function muashi_register_product_post_type() {
	register_post_type('product', [
		'label' => __('Products', 'muashi'),
		'public' => true,
		'has_archive' => true,
		'supports' => ['title', 'editor', 'thumbnail'],
		'rewrite' => ['slug' => 'products']
	]);
}
add_action('init', 'muashi_register_product_post_type');

// ✅ Correct: Register taxonomies in init
function muashi_register_product_taxonomy() {
	register_taxonomy('product_category', 'product', [
		'label' => __('Product Categories', 'muashi'),
		'hierarchical' => true,
		'rewrite' => ['slug' => 'product-category']
	]);
}
add_action('init', 'muashi_register_product_taxonomy');

// ❌ Wrong: Using after_setup_theme (too early)
add_action('after_setup_theme', 'muashi_register_product_post_type');

// ❌ Wrong: Using wp_loaded (too late, URL rewrite won't work properly)
add_action('wp_loaded', 'muashi_register_product_post_type');
```


### 3. Enqueuing Scripts & Styles (スクリプト・スタイル読み込み)

**Frontend Hook**: `wp_enqueue_scripts`
**Admin Hook**: `admin_enqueue_scripts`
**Priority**: 10 (default)

```php
// ✅ Correct: Enqueue scripts/styles in wp_enqueue_scripts (FRONTEND)
function muashi_enqueue_assets() {
	// Enqueue styles
	wp_enqueue_style(
		'muashi-style',
		get_stylesheet_uri(),
		[],
		wp_get_theme()->get('Version')
	);

	// Enqueue scripts
	wp_enqueue_script(
		'muashi-main',
		get_template_directory_uri() . '/js/main.js',
		['jquery'],
		wp_get_theme()->get('Version'),
		true // in footer
	);

	// Conditional enqueuing (only on product pages)
	if (is_singular('product')) {
		wp_enqueue_script(
			'muashi-product',
			get_template_directory_uri() . '/js/product.js',
			['jquery'],
			wp_get_theme()->get('Version'),
			true
		);
	}
}
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');

// ✅ Correct: Enqueue admin scripts (ADMIN)
function muashi_enqueue_admin_assets($hook) {
	// Only on product edit screen
	if ('post.php' !== $hook && 'post-new.php' !== $hook) {
		return;
	}

	$screen = get_current_screen();
	if ('product' !== $screen->post_type) {
		return;
	}

	wp_enqueue_script(
		'muashi-admin-product',
		get_template_directory_uri() . '/js/admin-product.js',
		['jquery'],
		wp_get_theme()->get('Version'),
		true
	);
}
add_action('admin_enqueue_scripts', 'muashi_enqueue_admin_assets');

// ❌ Wrong: Enqueuing in init (too early, WordPress core scripts not loaded yet)
add_action('init', 'muashi_enqueue_assets');

// ❌ Wrong: Enqueuing in wp_head (direct output, bad practice)
add_action('wp_head', 'muashi_enqueue_assets');

// ❌ Wrong: Unconditional enqueuing (loads on ALL pages)
function muashi_enqueue_assets() {
	wp_enqueue_script('muashi-product', ...); // Loads even on non-product pages!
}
```


### 4. Widgets (ウィジェット)

**Hook**: `widgets_init`
**Priority**: 10 (default)

```php
// ✅ Correct: Register widgets in widgets_init
function muashi_register_widgets() {
	register_sidebar([
		'name' => __('Primary Sidebar', 'muashi'),
		'id' => 'sidebar-primary',
		'before_widget' => '<div id="%1$s" class="widget %2$s">',
		'after_widget' => '</div>',
		'before_title' => '<h3 class="widget-title">',
		'after_title' => '</h3>'
	]);

	// Register custom widget
	register_widget('Muashi_Product_Widget');
}
add_action('widgets_init', 'muashi_register_widgets');

// ❌ Wrong: Using init
add_action('init', 'muashi_register_widgets');
```


### 5. Redirects & Early Exit (リダイレクト・早期終了)

**Hook**: `template_redirect`
**Priority**: 10 (default)
**When to use**: Before template is loaded, can redirect or exit
<!-- 使用時期: テンプレート読み込み前、リダイレクトまたは終了可能 -->

```php
// ✅ Correct: Redirect logic in template_redirect
function muashi_redirect_old_products() {
	if (is_singular('product')) {
		$product_status = get_post_meta(get_the_ID(), '_product_status', true);

		if ('discontinued' === $product_status) {
			wp_safe_redirect(home_url('/products/'));
			exit;
		}
	}
}
add_action('template_redirect', 'muashi_redirect_old_products');

// ❌ Wrong: Redirecting in init (too early, can't detect page type yet)
add_action('init', 'muashi_redirect_old_products');

// ❌ Wrong: Redirecting in wp_head (headers already sent)
add_action('wp_head', 'muashi_redirect_old_products');
```


### 6. AJAX Handlers (AJAXハンドラー)

**Logged-in Hook**: `wp_ajax_{action}`
**Not Logged-in Hook**: `wp_ajax_nopriv_{action}`

```php
// ✅ Correct: AJAX handlers
function muashi_get_products_ajax() {
	check_ajax_referer('muashi_ajax_nonce', 'nonce');

	$category = sanitize_text_field($_POST['category'] ?? '');
	$products = get_posts([
		'post_type' => 'product',
		'posts_per_page' => 10,
		'tax_query' => [
			[
				'taxonomy' => 'product_category',
				'field' => 'slug',
				'terms' => $category
			]
		]
	]);

	wp_send_json_success($products);
}

// For logged-in users
add_action('wp_ajax_muashi_get_products', 'muashi_get_products_ajax');

// For logged-out users (if applicable)
add_action('wp_ajax_nopriv_muashi_get_products', 'muashi_get_products_ajax');
```


## Hook Priority (フック優先度)

### Priority Scale (優先度スケール)

- **1-5**: Very early (remove default WordPress behaviors)
  <!-- 非常に早い（WordPressデフォルト動作の削除） -->
- **10**: Default (use this unless you have a reason not to)
  <!-- デフォルト（理由がない限りこれを使用） -->
- **15-20**: After default
  <!-- デフォルト後 -->
- **100+**: Very late (override other plugins)
  <!-- 非常に遅い（他プラグインの上書き） -->
- **999+**: Last resort (generally avoid)
  <!-- 最終手段（通常は避ける） -->

### When to Adjust Priority (優先度を調整する場合)

```php
// ✅ Correct: Using priority to run before/after other functions
// Run early to remove default WordPress behavior
function muashi_remove_admin_bar() {
	show_admin_bar(false);
}
add_action('after_setup_theme', 'muashi_remove_admin_bar', 5); // Priority 5 (early)

// Run late to override plugin behavior
function muashi_override_plugin_style() {
	wp_dequeue_style('some-plugin-style');
	wp_enqueue_style('muashi-override', ...);
}
add_action('wp_enqueue_scripts', 'muashi_override_plugin_style', 20); // Priority 20 (late)

// ❌ Wrong: Using extreme priority without reason
add_action('init', 'muashi_register_post_type', 999); // Unnecessarily late

// ❌ Wrong: Using priority when order doesn't matter
add_action('wp_footer', 'muashi_footer_script', 15); // Priority 10 is fine
```

**Default Priority 10 Rule:**
<!-- デフォルト優先度10のルール: -->
**If you don't have a specific reason to change priority, use 10 (or omit the parameter).**
<!-- 優先度を変更する具体的な理由がない場合は、10を使用（またはパラメータを省略）。 -->


## Custom Hooks (カスタムフック)

### Naming Convention (命名規則)

**ALWAYS prefix custom hooks with theme/plugin name:**
<!-- カスタムフックには必ずテーマ・プラグイン名をプレフィックス: -->

```php
// ✅ Correct: Prefixed custom hooks
do_action('muashi_before_product_content', $product_id);
do_action('muashi_after_product_content', $product_id);
$price = apply_filters('muashi_product_price', $price, $product_id);

// ❌ Wrong: No prefix (conflicts with other themes/plugins)
do_action('before_product_content', $product_id);
apply_filters('product_price', $price);
```

### Creating Custom Action Hooks (カスタムアクションフックの作成)

```php
// ✅ Correct: Custom action hook in template
function muashi_display_product_content($product_id) {
	// Allow modifications before content
	do_action('muashi_before_product_content', $product_id);

	// Display content
	the_content();

	// Allow additions after content
	do_action('muashi_after_product_content', $product_id);
}

// Usage in child theme or plugin
function muashi_add_social_share_buttons($product_id) {
	echo '<div class="social-share">...</div>';
}
add_action('muashi_after_product_content', 'muashi_add_social_share_buttons');
```

### Creating Custom Filter Hooks (カスタムフィルターフックの作成)

```php
// ✅ Correct: Custom filter hook
function muashi_get_product_price($product_id) {
	$price = get_post_meta($product_id, '_product_price', true);

	// Allow price modifications
	return apply_filters('muashi_product_price', $price, $product_id);
}

// Usage: Add tax to price
function muashi_add_tax_to_price($price, $product_id) {
	$tax_rate = 0.1; // 10% tax
	return $price * (1 + $tax_rate);
}
add_filter('muashi_product_price', 'muashi_add_tax_to_price', 10, 2);
```


## Hook Organization in functions.php (functions.phpでのフック整理)

### Recommended Organization (推奨される整理方法)

```php
/**
 * Theme Setup
 * Hook: after_setup_theme
 */
function muashi_theme_setup() {
	// ...
}
add_action('after_setup_theme', 'muashi_theme_setup');

/**
 * Custom Post Types
 * Hook: init
 */
function muashi_register_custom_post_types() {
	// ...
}
add_action('init', 'muashi_register_custom_post_types');

/**
 * Taxonomies
 * Hook: init
 */
function muashi_register_taxonomies() {
	// ...
}
add_action('init', 'muashi_register_taxonomies');

/**
 * Widgets
 * Hook: widgets_init
 */
function muashi_register_widgets() {
	// ...
}
add_action('widgets_init', 'muashi_register_widgets');

/**
 * Enqueue Scripts & Styles (Frontend)
 * Hook: wp_enqueue_scripts
 */
function muashi_enqueue_assets() {
	// ...
}
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');

/**
 * Enqueue Scripts & Styles (Admin)
 * Hook: admin_enqueue_scripts
 */
function muashi_enqueue_admin_assets() {
	// ...
}
add_action('admin_enqueue_scripts', 'muashi_enqueue_admin_assets');

/**
 * AJAX Handlers
 * Hook: wp_ajax_*, wp_ajax_nopriv_*
 */
function muashi_ajax_get_products() {
	// ...
}
add_action('wp_ajax_muashi_get_products', 'muashi_ajax_get_products');
add_action('wp_ajax_nopriv_muashi_get_products', 'muashi_ajax_get_products');
```

**Group by Hook Type, Not by Feature:**
<!-- 機能別ではなく、フック種類別にグループ化: -->
- ✅ All `init` hooks together
- ✅ All `wp_enqueue_scripts` hooks together
- ❌ All product-related hooks together


## Common Hook Anti-Patterns (よくあるフックアンチパターン)

### Anti-Pattern 1: Wrong Hook for Task (タスクに間違ったフック)

```php
// ❌ Wrong: Enqueuing in init (too early)
function muashi_enqueue_assets() {
	wp_enqueue_style('muashi-style', ...);
}
add_action('init', 'muashi_enqueue_assets');

// ✅ Correct: Use wp_enqueue_scripts
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');
```

### Anti-Pattern 2: Registering Hook Inside Hook (フック内でフック登録)

```php
// ❌ Wrong: Registering hook inside another hook
function muashi_init() {
	add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');
}
add_action('init', 'muashi_init');

// ✅ Correct: Register hooks directly
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');
```

### Anti-Pattern 3: Duplicate Hook Registration (重複フック登録)

```php
// ❌ Wrong: Registering same hook multiple times
add_action('init', 'muashi_register_post_type');
add_action('init', 'muashi_register_post_type'); // Duplicate!

// ✅ Correct: Register once
add_action('init', 'muashi_register_post_type');
```

### Anti-Pattern 4: Heavy Processing in Every Hook (全フックで重い処理)

```php
// ❌ Wrong: Heavy processing in wp_enqueue_scripts (runs on every page)
function muashi_enqueue_assets() {
	$products = get_posts(['post_type' => 'product', 'posts_per_page' => -1]); // SLOW!
	if (count($products) > 10) {
		wp_enqueue_script('muashi-product-slider', ...);
	}
}
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');

// ✅ Correct: Use conditional check, avoid queries
function muashi_enqueue_assets() {
	// Use conditional tags, not queries
	if (is_post_type_archive('product')) {
		wp_enqueue_script('muashi-product-slider', ...);
	}
}
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');
```


## Hook Performance Best Practices (フックパフォーマンスベストプラクティス)

1. **Conditional Hook Registration** - Only register hooks when needed
   <!-- 条件付きフック登録 - 必要な場合のみフックを登録 -->

```php
// ✅ Good: Conditional hook registration
if (is_admin()) {
	add_action('admin_menu', 'muashi_add_admin_menu');
} else {
	add_action('wp_enqueue_scripts', 'muashi_enqueue_frontend_assets');
}
```

2. **Avoid Queries in Hooks** - Pre-compute or cache data
   <!-- フック内でクエリを避ける - 事前計算またはキャッシュ -->

```php
// ❌ Bad: Query in every hook call
function muashi_get_featured_products() {
	$products = get_posts(['post_type' => 'product', 'meta_key' => '_featured', 'meta_value' => '1']);
	// ...
}
add_action('wp_footer', 'muashi_get_featured_products');

// ✅ Good: Cache query results
function muashi_get_featured_products() {
	$products = get_transient('muashi_featured_products');
	if (false === $products) {
		$products = get_posts(['post_type' => 'product', 'meta_key' => '_featured', 'meta_value' => '1']);
		set_transient('muashi_featured_products', $products, 12 * HOUR_IN_SECONDS);
	}
	// ...
}
add_action('wp_footer', 'muashi_get_featured_products');
```

3. **Remove Unnecessary Hooks** - Deregister hooks you don't need
   <!-- 不要なフックを削除 - 必要のないフックの登録を解除 -->

```php
// ✅ Good: Remove unnecessary WordPress defaults
remove_action('wp_head', 'wp_generator'); // Remove WordPress version meta tag
remove_action('wp_head', 'wlwmanifest_link'); // Remove Windows Live Writer manifest
remove_action('wp_head', 'rsd_link'); // Remove Really Simple Discovery link
```


## Related Files (関連ファイル)

- `.claude/rules/prohibitions.md` - Hook misuse prohibitions
- `.claude/rules/wordpress.md` - WordPress development rules
- `prompt/skills/wordpress-performance-optimization.md` - Performance optimization including hooks
