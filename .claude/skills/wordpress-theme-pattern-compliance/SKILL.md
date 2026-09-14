---
name: wordpress-theme-pattern-compliance
description: WordPress theme development, template file creation, muashi theme modification
---


# WordPress Theme Pattern Compliance (WordPressテーマパターン準拠)

## Purpose (目的)
<!-- muashiテーマの既存パターンを完全に踏襲し、一貫性のあるテーマ実装を保証 -->
Fully comply with existing muashi theme patterns to ensure consistent theme implementation.


## muashi Theme Structure (muashiテーマ構造)

```
wp-content/themes/muashi/
├── style.css              # Main stylesheet
├── functions.php          # Theme functions
├── index.php              # Fallback template
├── header.php             # Header template
├── footer.php             # Footer template
├── sidebar.php            # Sidebar template
├── single.php             # Single post template
├── page.php               # Page template
├── archive.php            # Archive template
├── 404.php                # 404 error template
├── searchform.php         # Search form template
├── search.php             # Search results template
├── parts/                 # Template parts
│   ├── header-nav.php
│   ├── product-card.php
│   └── ...
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── languages/
```


## Template Hierarchy Compliance (テンプレート階層準拠)

### Use Specific Templates (具体的なテンプレートを使用)

```php
// WordPress template hierarchy (most specific → least specific):
// 1. single-{post_type}-{slug}.php (e.g., single-product-paint-a.php)
// 2. single-{post_type}.php (e.g., single-product.php)
// 3. single.php
// 4. singular.php
// 5. index.php

// ✅ Good: Create specific template for custom post type
// wp-content/themes/muashi/single-product.php

// ✅ Good: Create archive template for custom post type
// wp-content/themes/muashi/archive-product.php
```


## get_template_part() Usage (get_template_part()の使用)

### Standard Pattern (標準パターン)

```php
// ✅ Good: Use get_template_part() for reusable components
// In archive-product.php or single-product.php
while (have_posts()) : the_post();
	get_template_part('parts/product', 'card'); // Loads parts/product-card.php
endwhile;

// Alternative with slug parameter
get_template_part('parts/content', get_post_type()); // Loads parts/content-product.php for products
```

### Template Part File Naming (テンプレートパーツファイル命名)

```
parts/
├── content-page.php       # Page content
├── content-product.php    # Product content
├── product-card.php       # Product card component
├── header-nav.php         # Header navigation
└── footer-contact.php     # Footer contact section
```


## BEM CSS Naming Convention (BEM CSS命名規則)

### Block Element Modifier (ブロック要素修飾子)

```scss
// ✅ Good: BEM naming
// Block
.product {}

// Element
.product__title {}
.product__description {}
.product__price {}

// Modifier
.product--featured {}
.product__price--sale {}

// Example HTML
<div class="product product--featured">
	<h2 class="product__title">Paint A</h2>
	<p class="product__description">...</p>
	<span class="product__price product__price--sale">¥1,000</span>
</div>

// ❌ Bad: Nested class names
.product .title {} // Not BEM
.product-title-bold {} // Not BEM
```


## SCSS File Organization (SCSSファイル構成)

### Recommended Structure (推奨構造)

```scss
// muashi/assets/css/main.scss

// 1. Variables
@import 'variables';

// 2. Mixins
@import 'mixins';

// 3. Base styles
@import 'base/reset';
@import 'base/typography';

// 4. Components
@import 'components/header';
@import 'components/footer';
@import 'components/product-card';

// 5. Pages
@import 'pages/home';
@import 'pages/product';
@import 'pages/archive';

// 6. Utilities
@import 'utilities';
```


## WordPress Template Tags (WordPressテンプレートタグ)

### Always Use Template Tags (常にテンプレートタグを使用)

```php
// ✅ Good: Use WordPress template tags
<a href="<?php echo esc_url(home_url('/')); ?>">Home</a>
<link href="<?php echo esc_url(get_stylesheet_uri()); ?>" rel="stylesheet">
<script src="<?php echo esc_url(get_template_directory_uri()); ?>/js/main.js"></script>

// ❌ Bad: Hardcoded paths
<a href="https://musashi-paint.com/">Home</a>
<link href="/wp-content/themes/muashi/style.css" rel="stylesheet">
```


## Header & Footer Pattern (ヘッダー・フッターパターン)

### header.php

```php
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo('charset'); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); // REQUIRED ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); // WordPress 5.2+ ?>

<header class="site-header">
	<!-- Header content -->
	<?php get_template_part('parts/header', 'nav'); ?>
</header>
```

### footer.php

```php
<footer class="site-footer">
	<!-- Footer content -->
</footer>

<?php wp_footer(); // REQUIRED ?>
</body>
</html>
```


## Loop Pattern (ループパターン)

### Standard WordPress Loop (標準WordPressループ)

```php
// ✅ Good: Standard loop
<?php if (have_posts()) : ?>
	<?php while (have_posts()) : the_post(); ?>
		<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
			<h2><?php the_title(); ?></h2>
			<div class="entry-content">
				<?php the_content(); ?>
			</div>
		</article>
	<?php endwhile; ?>

	<?php the_posts_pagination(); ?>
<?php else : ?>
	<p><?php esc_html_e('No products found.', 'muashi'); ?></p>
<?php endif; ?>
```


## Internationalization (i18n) (国際化)

### Always Use Translation Functions (常に翻訳関数を使用)

```php
// ✅ Good: Translatable strings
__('Product', 'muashi'); // Returns translated string
_e('Product', 'muashi'); // Echoes translated string
_n('%s product', '%s products', $count, 'muashi'); // Plural form
esc_html__('Product', 'muashi'); // Escaped translated string
esc_html_e('Product', 'muashi'); // Escaped echoed translated string

// ❌ Bad: Hardcoded Japanese
echo '製品'; // Not translatable
```


## Custom Functions Naming (カスタム関数命名)

### Prefix All Functions (全関数にプレフィックス)

```php
// ✅ Good: Prefixed functions
function muashi_get_product_price($product_id) {
	return get_post_meta($product_id, '_product_price', true);
}

function muashi_display_product_card($product_id) {
	// ...
}

// ❌ Bad: No prefix (conflicts with other themes/plugins)
function get_product_price($product_id) {
	// ...
}
```


## Template Parts Best Practices (テンプレートパーツベストプラクティス)

### Keep Template Parts Small (テンプレートパーツを小さく保つ)

```php
// ✅ Good: Small, reusable template parts
// parts/product-card.php - Only product card HTML
// parts/product-meta.php - Only product metadata
// parts/product-gallery.php - Only product gallery

// ❌ Bad: Large, monolithic template part
// parts/product-everything.php - 500 lines of mixed HTML/PHP
```


## Related Files (関連ファイル)

- `.claude/rules/wordpress.md` - WordPress development rules
- `prompt/skills/wordpress-hook-pattern-compliance.md` - Hook patterns
- `prompt/skills/wordpress-performance-optimization.md` - Performance patterns
