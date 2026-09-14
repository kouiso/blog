---
name: wordpress-performance-optimization
description: WordPress performance optimization, query optimization, caching implementation
---


# WordPress Performance Optimization (WordPressパフォーマンス最適化)

## Purpose (目的)
<!-- WordPressサイトのパフォーマンスを最大化し、ページ読み込み速度とサーバー負荷を最小化 -->
Maximize WordPress site performance, minimize page load time and server load.


## Core Performance Principles (核心パフォーマンス原則)

1. **Minimize Queries** - Reduce database queries to absolute minimum
   <!-- クエリ最小化 - データベースクエリを絶対最小限に削減 -->
2. **Cache Aggressively** - Cache everything that doesn't change frequently
   <!-- 積極的キャッシング - 頻繁に変わらないものは全てキャッシュ -->
3. **Lazy Load** - Load assets only when needed
   <!-- 遅延読み込み - 必要な時だけアセットを読み込む -->
4. **Optimize Assets** - Minimize and concatenate CSS/JS
   <!-- アセット最適化 - CSS/JSを最小化・結合 -->


## 1. WP_Query Optimization (WP_Query最適化)

### Use Fields Parameter (fieldsパラメータを使用)

```php
// ❌ Bad: Fetch all post data when only IDs needed
$query = new WP_Query([
	'post_type' => 'product',
	'posts_per_page' => 100
]);
// Returns full post objects (memory intensive)

// ✅ Good: Fetch only IDs
$query = new WP_Query([
	'post_type' => 'product',
	'posts_per_page' => 100,
	'fields' => 'ids' // Returns array of post IDs only
]);
```

### Limit posts_per_page (posts_per_pageを制限)

```php
// ❌ Bad: Fetch all posts
$query = new WP_Query([
	'post_type' => 'product',
	'posts_per_page' => -1 // Gets ALL posts (can be thousands)
]);

// ✅ Good: Limit to necessary amount
$query = new WP_Query([
	'post_type' => 'product',
	'posts_per_page' => 10,
	'paged' => get_query_var('paged') ? get_query_var('paged') : 1
]);
```

### Disable Update Post Caches (更新投稿キャッシュを無効化)

```php
// ✅ Good: Disable unnecessary caches when only reading data
$query = new WP_Query([
	'post_type' => 'product',
	'posts_per_page' => 10,
	'no_found_rows' => true, // Don't calculate total pages (faster)
	'update_post_meta_cache' => false, // Don't update meta cache
	'update_post_term_cache' => false // Don't update term cache
]);
```


## 2. Meta Query Optimization (メタクエリ最適化)

### Pre-load Meta Cache (メタキャッシュを事前読み込み)

```php
// ❌ Bad: get_post_meta() in loop (N+1 query problem)
$products = get_posts(['post_type' => 'product', 'posts_per_page' => 50]);
foreach ($products as $product) {
	$price = get_post_meta($product->ID, '_product_price', true); // Separate query for each product!
	echo $price;
}

// ✅ Good: Pre-load meta cache
$products = get_posts(['post_type' => 'product', 'posts_per_page' => 50]);
update_meta_cache('post', wp_list_pluck($products, 'ID')); // One query for all meta

foreach ($products as $product) {
	$price = get_post_meta($product->ID, '_product_price', true); // Retrieved from cache
	echo $price;
}
```


## 3. Transients API Caching (Transients APIキャッシング)

### Cache Expensive Queries (高コストクエリをキャッシュ)

```php
// ✅ Good: Cache expensive query results
function muashi_get_featured_products() {
	$cache_key = 'muashi_featured_products';
	$products = get_transient($cache_key);

	if (false === $products) {
		// Expensive query
		$products = get_posts([
			'post_type' => 'product',
			'posts_per_page' => 10,
			'meta_query' => [
				[
					'key' => '_featured',
					'value' => '1'
				]
			],
			'orderby' => 'meta_value_num',
			'meta_key' => '_product_price'
		]);

		// Cache for 12 hours
		set_transient($cache_key, $products, 12 * HOUR_IN_SECONDS);
	}

	return $products;
}

// Clear cache when product is updated
function muashi_clear_featured_products_cache($post_id) {
	if ('product' === get_post_type($post_id)) {
		delete_transient('muashi_featured_products');
	}
}
add_action('save_post', 'muashi_clear_featured_products_cache');
```

### Cache External API Responses (外部APIレスポンスをキャッシュ)

```php
// ✅ Good: Cache external API calls
function muashi_get_weather_data() {
	$cache_key = 'muashi_weather_data';
	$weather = get_transient($cache_key);

	if (false === $weather) {
		$response = wp_remote_get('https://api.weather.com/current');
		$weather = wp_remote_retrieve_body($response);

		// Cache for 30 minutes
		set_transient($cache_key, $weather, 30 * MINUTE_IN_SECONDS);
	}

	return $weather;
}
```


## 4. Conditional Asset Loading (条件付きアセット読み込み)

### Load Only Where Needed (必要な場所でのみ読み込み)

```php
// ✅ Good: Conditional script enqueuing
function muashi_enqueue_assets() {
	// Product page only
	if (is_singular('product')) {
		wp_enqueue_script('muashi-product-gallery', ...);
		wp_enqueue_style('muashi-product-style', ...);
	}

	// Homepage only
	if (is_front_page()) {
		wp_enqueue_script('muashi-slider', ...);
	}

	// Contact page only
	if (is_page('contact')) {
		wp_enqueue_script('muashi-contact-form', ...);
	}
}
add_action('wp_enqueue_scripts', 'muashi_enqueue_assets');
```

### Dequeue Unnecessary Scripts (不要なスクリプトの登録解除)

```php
// ✅ Good: Remove unnecessary WordPress defaults
function muashi_dequeue_unnecessary_scripts() {
	// Remove jQuery Migrate (if not needed)
	wp_deregister_script('jquery-migrate');

	// Remove Emoji scripts (if not using emojis)
	remove_action('wp_head', 'print_emoji_detection_script', 7);
	remove_action('wp_print_styles', 'print_emoji_styles');
}
add_action('wp_enqueue_scripts', 'muashi_dequeue_unnecessary_scripts');
```


## 5. Image Optimization (画像最適化)

### Use Appropriate Image Sizes (適切な画像サイズを使用)

```php
// Define custom image sizes
add_image_size('product-thumbnail', 300, 300, true);
add_image_size('product-medium', 600, 600, false);
add_image_size('product-large', 1200, 900, false);

// ✅ Good: Use appropriate size
the_post_thumbnail('product-thumbnail'); // For gallery

// ❌ Bad: Use full size everywhere
the_post_thumbnail('full'); // Loads original (huge) image
```

### Lazy Loading (遅延読み込み)

```php
// ✅ Good: Add loading="lazy" attribute (WordPress 5.5+)
the_post_thumbnail('product-thumbnail', ['loading' => 'lazy']);

// Or for custom images
echo '<img src="' . esc_url($image_url) . '" loading="lazy" alt="">';
```


## 6. Database Query Optimization (データベースクエリ最適化)

### Use $wpdb->get_var() for Single Values ($wpdb->get_var()を単一値に使用)

```php
// ✅ Good: Get single value
$count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'product'");

// ❌ Bad: Get full row when only need count
$result = $wpdb->get_row("SELECT COUNT(*) as count FROM {$wpdb->posts} WHERE post_type = 'product'");
$count = $result->count;
```

### Index Custom Columns (カスタムカラムにインデックス)

```sql
-- ✅ Good: Add index to frequently queried meta keys
ALTER TABLE wp_postmeta ADD INDEX meta_key_value (_product_price);
```


## 7. Limit Autosaves and Revisions (自動保存とリビジョンを制限)

```php
// wp-config.php

// ✅ Good: Limit post revisions
define('WP_POST_REVISIONS', 5); // Keep only 5 revisions

// Disable autosave (optional)
define('AUTOSAVE_INTERVAL', 300); // Every 5 minutes instead of 60 seconds
```


## 8. Object Caching (オブジェクトキャッシング)

### Use wp_cache_* Functions (wp_cache_*関数を使用)

```php
// ✅ Good: Object cache
function muashi_get_product_count() {
	$cache_key = 'muashi_product_count';
	$count = wp_cache_get($cache_key);

	if (false === $count) {
		$count = wp_count_posts('product')->publish;
		wp_cache_set($cache_key, $count, '', 12 * HOUR_IN_SECONDS);
	}

	return $count;
}
```


## 9. Pagination Optimization (ページネーション最適化)

```php
// ✅ Good: Use pagination, not LOAD MORE or infinite scroll for large datasets
$paged = get_query_var('paged') ? get_query_var('paged') : 1;

$query = new WP_Query([
	'post_type' => 'product',
	'posts_per_page' => 12,
	'paged' => $paged
]);

// Display pagination
the_posts_pagination();
```


## 10. Minimize HTTP Requests (HTTPリクエストを最小化)

### Concatenate & Minify (結合・最小化)

```php
// Enable script/style concatenation (requires plugin or custom implementation)
// Or use a plugin like Autoptimize, WP Rocket

// ✅ Good: Register dependencies correctly to allow concatenation
wp_enqueue_script('muashi-main', ..., ['jquery', 'muashi-utils'], ..., true);
wp_enqueue_script('muashi-product', ..., ['muashi-main'], ..., true);

// WordPress can load these together
```


## Performance Checklist (パフォーマンスチェックリスト)

- [ ] WP_Query uses `fields => 'ids'` when only IDs needed
- [ ] Expensive queries are cached with Transients
- [ ] Scripts/styles loaded conditionally (not on all pages)
- [ ] Images use appropriate sizes (not full size everywhere)
- [ ] Lazy loading enabled for images
- [ ] Meta cache pre-loaded before loops
- [ ] `posts_per_page` limited (not -1)
- [ ] Post revisions limited in wp-config.php
- [ ] Object caching used where applicable
- [ ] HTTP requests minimized (concatenation/minification)


## Related Files (関連ファイル)

- `.claude/rules/prohibitions.md` - Performance prohibitions
- `prompt/skills/wordpress-hook-pattern-compliance.md` - Hook performance
