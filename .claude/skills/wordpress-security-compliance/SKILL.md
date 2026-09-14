---
name: wordpress-security-compliance
description: WordPress security implementation, form processing, AJAX handlers, REST API endpoints
---


# WordPress Security Compliance (WordPressセキュリティ準拠)

## Purpose (目的)
<!-- WordPress開発におけるOWASP Top 10対応とセキュリティベストプラクティスの徹底 -->
Ensure OWASP Top 10 compliance and security best practices in WordPress development.


## Core Security Principles (核心セキュリティ原則)

1. **Never Trust User Input** - All user input is potentially malicious
   <!-- ユーザー入力を決して信頼しない - 全てのユーザー入力は潜在的に悪意がある -->
2. **Defense in Depth** - Multiple layers of security
   <!-- 多層防御 - 複数のセキュリティ層 -->
3. **Principle of Least Privilege** - Grant minimum necessary permissions
   <!-- 最小権限の原則 - 必要最小限の権限を付与 -->
4. **Fail Securely** - Errors should not reveal sensitive information
   <!-- 安全な失敗 - エラーは機密情報を明かすべきではない -->


## OWASP Top 10 WordPress Compliance Checklist (OWASP Top 10 WordPress準拠チェックリスト)

### A01:2021 – Broken Access Control (アクセス制御の不備)

#### Capability Checks (ケイパビリティチェック)

**MANDATORY for all admin functions:**
<!-- 全管理機能で必須: -->

```php
// ✅ Correct: Always check capabilities
function muashi_save_product_meta($post_id) {
	// Check capability FIRST
	if (!current_user_can('edit_post', $post_id)) {
		wp_die(__('You do not have permission to edit this product.', 'muashi'));
	}

	// Then process
	update_post_meta($post_id, '_product_price', sanitize_text_field($_POST['price']));
}

// ❌ Wrong: No capability check
function muashi_save_product_meta($post_id) {
	update_post_meta($post_id, '_product_price', $_POST['price']);
}
```

**WordPress Capability Reference**:
- `edit_posts` - Edit any post
- `edit_published_posts` - Edit published posts
- `delete_posts` - Delete posts
- `manage_options` - Manage site options (admin only)
- `upload_files` - Upload files

**Custom Capabilities for Custom Post Types**:
```php
// Define custom capabilities
'capability_type' => 'product',
'map_meta_cap' => true,

// Results in:
// - edit_product
// - read_product
// - delete_product
// - edit_products
// - delete_products
// - publish_products
```


### A02:2021 – Cryptographic Failures (暗号化の失敗)

#### Sensitive Data Protection (機密データ保護)

**Never store passwords in plain text:**
<!-- パスワードを平文で保存しない: -->

```php
// ✅ Correct: Hash passwords
$hashed_password = wp_hash_password($password);
update_user_meta($user_id, '_custom_password', $hashed_password);

// Verify password
if (wp_check_password($password, $hashed_password)) {
	// Password is correct
}

// ❌ Wrong: Plain text password
update_user_meta($user_id, '_custom_password', $password);
```

**Use WordPress Transients for sensitive cache data:**
<!-- 機密キャッシュデータにはWordPress Transientsを使用: -->

```php
// ✅ Correct: Use transients for sensitive temporary data
set_transient('muashi_api_token_' . $user_id, $token, HOUR_IN_SECONDS);
$token = get_transient('muashi_api_token_' . $user_id);

// ❌ Wrong: Storing in options table permanently
update_option('muashi_api_token_' . $user_id, $token);
```


### A03:2021 – Injection (インジェクション)

#### SQL Injection Prevention (SQLインジェクション対策)

**ALWAYS use `$wpdb->prepare()` for user input in SQL:**
<!-- SQLでユーザー入力を使う場合は必ず`$wpdb->prepare()`を使用: -->

```php
global $wpdb;

// ✅ Correct: Using $wpdb->prepare()
$product_id = intval($_GET['id']);
$product = $wpdb->get_row(
	$wpdb->prepare(
		"SELECT * FROM {$wpdb->prefix}products WHERE id = %d",
		$product_id
	)
);

// ✅ Correct: Multiple parameters
$results = $wpdb->get_results(
	$wpdb->prepare(
		"SELECT * FROM {$wpdb->prefix}products
		WHERE category = %s AND price > %d",
		$category,
		$min_price
	)
);

// ❌ CRITICAL ERROR: Direct user input in SQL
$wpdb->query("SELECT * FROM {$wpdb->prefix}products WHERE id = {$_GET['id']}");

// ❌ CRITICAL ERROR: String concatenation
$wpdb->query("SELECT * FROM {$wpdb->prefix}products WHERE name = '" . $_POST['name'] . "'");
```

**WordPress Query Functions (Preferred)**:
<!-- WordPress Query関数（推奨）: -->

```php
// ✅ Best: Use WordPress functions when possible
$product = get_post($_GET['id']);

// ✅ Good: WP_Query
$query = new WP_Query([
	'post_type' => 'product',
	'p' => intval($_GET['id'])
]);

// ✅ Good: get_posts()
$products = get_posts([
	'post_type' => 'product',
	'posts_per_page' => 10,
	'meta_key' => '_product_price',
	'meta_value' => intval($_POST['min_price']),
	'meta_compare' => '>='
]);
```

**Prepared Statement Placeholders**:
- `%d` - Integer
- `%f` - Float
- `%s` - String


### A04:2021 – Insecure Design (安全でない設計)

#### Nonce Verification (Nonce検証)

**MANDATORY for ALL form submissions and AJAX requests:**
<!-- 全フォーム送信とAJAXリクエストで必須: -->

```php
// ✅ Correct: Nonce field in form
function muashi_product_form() {
	?>
	<form method="post" action="">
		<?php wp_nonce_field('muashi_save_product', 'muashi_product_nonce'); ?>
		<input type="text" name="product_name" value="">
		<button type="submit">Save</button>
	</form>
	<?php
}

// ✅ Correct: Nonce verification on form submit
function muashi_save_product_handler() {
	// Verify nonce FIRST
	if (!isset($_POST['muashi_product_nonce']) ||
	    !wp_verify_nonce($_POST['muashi_product_nonce'], 'muashi_save_product')) {
		wp_die(__('Security check failed.', 'muashi'));
	}

	// Then check capability
	if (!current_user_can('edit_posts')) {
		wp_die(__('Permission denied.', 'muashi'));
	}

	// Then process
	$product_name = sanitize_text_field($_POST['product_name']);
	// ... save product
}

// ❌ CRITICAL ERROR: No nonce verification
function muashi_save_product_handler() {
	$product_name = $_POST['product_name'];
	// ... save without verification
}
```

**AJAX Nonce Pattern:**
<!-- AJAXのNonceパターン: -->

```php
// ✅ Correct: AJAX nonce in JavaScript
function muashi_enqueue_scripts() {
	wp_enqueue_script('muashi-ajax', get_template_directory_uri() . '/js/ajax.js', ['jquery'], '1.0', true);
	wp_localize_script('muashi-ajax', 'muashiAjax', [
		'ajaxurl' => admin_url('admin-ajax.php'),
		'nonce' => wp_create_nonce('muashi_ajax_nonce')
	]);
}

// JavaScript
jQuery.ajax({
	url: muashiAjax.ajaxurl,
	type: 'POST',
	data: {
		action: 'muashi_get_products',
		nonce: muashiAjax.nonce,
		category: 'paint'
	},
	success: function(response) {
		// ...
	}
});

// PHP AJAX handler
function muashi_get_products_ajax() {
	// Verify nonce
	check_ajax_referer('muashi_ajax_nonce', 'nonce');

	// Process request
	$category = sanitize_text_field($_POST['category']);
	// ...

	wp_send_json_success($products);
}
add_action('wp_ajax_muashi_get_products', 'muashi_get_products_ajax');
add_action('wp_ajax_nopriv_muashi_get_products', 'muashi_get_products_ajax'); // For logged-out users
```

**REST API Nonce:**
<!-- REST API Nonce: -->

```php
// ✅ Correct: REST API nonce
wp_localize_script('muashi-rest', 'muashiRest', [
	'rootUrl' => esc_url_raw(rest_url()),
	'nonce' => wp_create_nonce('wp_rest')
]);

// JavaScript
fetch(muashiRest.rootUrl + 'muashi/v1/products', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'X-WP-Nonce': muashiRest.nonce
	},
	body: JSON.stringify({
		name: 'Product Name'
	})
});

// PHP REST API endpoint
function muashi_create_product(WP_REST_Request $request) {
	// Nonce is automatically verified by WordPress for authenticated REST requests

	// Check capability
	if (!current_user_can('edit_posts')) {
		return new WP_Error('rest_forbidden', __('Permission denied.', 'muashi'), ['status' => 403]);
	}

	$name = sanitize_text_field($request->get_param('name'));
	// ...
}
```


### A05:2021 – Security Misconfiguration (セキュリティ設定ミス)

#### Disable File Editing in Production (本番環境でファイル編集を無効化)

```php
// wp-config.php (Production only)
define('DISALLOW_FILE_EDIT', true);
define('DISALLOW_FILE_MODS', true); // Disable plugin/theme installation too
```

#### Secure wp-config.php (wp-config.phpのセキュア化)

```php
// ✅ Define security keys (use WordPress.org secret-key service)
define('AUTH_KEY',         'put-your-unique-phrase-here');
define('SECURE_AUTH_KEY',  'put-your-unique-phrase-here');
define('LOGGED_IN_KEY',    'put-your-unique-phrase-here');
define('NONCE_KEY',        'put-your-unique-phrase-here');
define('AUTH_SALT',        'put-your-unique-phrase-here');
define('SECURE_AUTH_SALT', 'put-your-unique-phrase-here');
define('LOGGED_IN_SALT',   'put-your-unique-phrase-here');
define('NONCE_SALT',       'put-your-unique-phrase-here');

// ✅ Disable debug in production
define('WP_DEBUG', false);
define('WP_DEBUG_LOG', false);
define('WP_DEBUG_DISPLAY', false);

// ✅ Force SSL for admin
define('FORCE_SSL_ADMIN', true);
```


### A06:2021 – Vulnerable Components (脆弱なコンポーネント)

#### Keep WordPress, Themes, Plugins Updated (WordPress、テーマ、プラグインを最新に保つ)

**Auto-updates enabled for:**
<!-- 自動更新を有効化: -->
- WordPress core minor versions
- Plugins (security updates)
- Themes (security updates)

**Check for updates:**
```bash
# Via WP-CLI
wp core check-update
wp plugin list --update=available
wp theme list --update=available
```


### A07:2021 – Identification and Authentication Failures (識別・認証の失敗)

#### Limit Login Attempts (ログイン試行回数制限)

```php
// ✅ Install and configure a plugin like "Limit Login Attempts Reloaded"
// Or implement custom login attempt limiting:

function muashi_check_login_attempts($user, $username, $password) {
	$attempts = get_transient('muashi_login_attempts_' . $username);

	if ($attempts >= 5) {
		return new WP_Error('too_many_attempts', __('Too many failed login attempts. Please try again later.', 'muashi'));
	}

	return $user;
}
add_filter('authenticate', 'muashi_check_login_attempts', 30, 3);

function muashi_track_failed_login($username) {
	$attempts = (int) get_transient('muashi_login_attempts_' . $username);
	$attempts++;
	set_transient('muashi_login_attempts_' . $username, $attempts, 15 * MINUTE_IN_SECONDS);
}
add_action('wp_login_failed', 'muashi_track_failed_login');
```


### A08:2021 – Software and Data Integrity Failures (ソフトウェア・データ整合性の失敗)

#### Verify File Uploads (ファイルアップロード検証)

```php
// ✅ Correct: Validate file type and size
function muashi_validate_uploaded_file($file) {
	// Check file size (max 5MB)
	if ($file['size'] > 5 * MB_IN_BYTES) {
		return new WP_Error('file_too_large', __('File is too large.', 'muashi'));
	}

	// Check MIME type (only images allowed)
	$allowed_mime_types = ['image/jpeg', 'image/png', 'image/gif'];
	$file_type = wp_check_filetype($file['name']);

	if (!in_array($file_type['type'], $allowed_mime_types, true)) {
		return new WP_Error('invalid_file_type', __('Invalid file type.', 'muashi'));
	}

	// Use WordPress file upload handler
	$upload = wp_handle_upload($file, ['test_form' => false]);

	if (isset($upload['error'])) {
		return new WP_Error('upload_error', $upload['error']);
	}

	return $upload;
}

// ❌ Wrong: No validation
move_uploaded_file($_FILES['file']['tmp_name'], '/path/to/destination/' . $_FILES['file']['name']);
```


### A09:2021 – Security Logging and Monitoring Failures (セキュリティログ・監視の失敗)

#### Log Security Events (セキュリティイベントのログ記録)

```php
// ✅ Log suspicious activity
function muashi_log_security_event($event_type, $details) {
	if (!WP_DEBUG_LOG) {
		return;
	}

	error_log(sprintf(
		'[SECURITY] %s: %s - User: %d - IP: %s',
		$event_type,
		$details,
		get_current_user_id(),
		$_SERVER['REMOTE_ADDR'] ?? 'unknown'
	));
}

// Example usage
function muashi_save_product_handler() {
	if (!wp_verify_nonce($_POST['muashi_product_nonce'], 'muashi_save_product')) {
		muashi_log_security_event('NONCE_FAILURE', 'Product save nonce verification failed');
		wp_die(__('Security check failed.', 'muashi'));
	}
	// ...
}
```


### A10:2021 – Server-Side Request Forgery (SSRF) (サーバーサイドリクエストフォージェリ)

#### Validate External URLs (外部URL検証)

```php
// ✅ Correct: Validate and sanitize external URLs
function muashi_fetch_external_data($url) {
	// Validate URL
	$parsed_url = wp_parse_url($url);

	// Block localhost, private IPs
	if (in_array($parsed_url['host'], ['localhost', '127.0.0.1', '0.0.0.0'], true)) {
		return new WP_Error('invalid_url', __('Invalid URL.', 'muashi'));
	}

	// Use WordPress HTTP API
	$response = wp_remote_get($url, [
		'timeout' => 10,
		'redirection' => 5,
		'httpversion' => '1.1',
		'user-agent' => 'MusashiPaint/' . wp_get_theme()->get('Version'),
		'sslverify' => true
	]);

	if (is_wp_error($response)) {
		return $response;
	}

	return wp_remote_retrieve_body($response);
}

// ❌ Wrong: Direct file_get_contents() with user input
$data = file_get_contents($_POST['external_url']);
```


## WordPress-Specific Escaping Rules (WordPress特有のエスケープルール)

### Output Context-Based Escaping (出力コンテキスト別エスケープ)

**MANDATORY for ALL user-generated content output:**
<!-- 全ユーザー生成コンテンツ出力で必須: -->

#### HTML Context (HTMLコンテキスト)

```php
// ✅ Correct: esc_html() for plain text in HTML
<h1><?php echo esc_html($product_name); ?></h1>
<p><?php echo esc_html($product_description); ?></p>

// ❌ Wrong: No escaping
<h1><?php echo $product_name; ?></h1>
```

#### Attribute Context (属性コンテキスト)

```php
// ✅ Correct: esc_attr() for HTML attributes
<input type="text" name="product_name" value="<?php echo esc_attr($product_name); ?>">
<div class="product" data-id="<?php echo esc_attr($product_id); ?>">

// ❌ Wrong: Using esc_html() in attributes
<input type="text" value="<?php echo esc_html($product_name); ?>">
```

#### URL Context (URLコンテキスト)

```php
// ✅ Correct: esc_url() for URLs
<a href="<?php echo esc_url($product_link); ?>">View Product</a>
<img src="<?php echo esc_url($product_image); ?>" alt="">

// ❌ Wrong: No escaping for URLs
<a href="<?php echo $product_link; ?>">View Product</a>
```

#### JavaScript Context (JavaScriptコンテキスト)

```php
// ✅ Correct: esc_js() for JavaScript strings
<script>
var productName = '<?php echo esc_js($product_name); ?>';
</script>

// ❌ Wrong: No escaping in JavaScript
<script>
var productName = '<?php echo $product_name; ?>';
</script>
```

#### Rich Text Context (リッチテキストコンテキスト)

```php
// ✅ Correct: wp_kses_post() for rich text (allows safe HTML)
<div class="product-content">
	<?php echo wp_kses_post($product_content); ?>
</div>

// ✅ Correct: wp_kses() with custom allowed tags
$allowed_tags = [
	'p' => [],
	'br' => [],
	'strong' => [],
	'em' => []
];
echo wp_kses($user_bio, $allowed_tags);

// ❌ Wrong: Using esc_html() on rich text (strips all HTML)
echo esc_html($product_content); // Displays <p>text</p> literally
```


## Input Sanitization (入力サニタイズ)

### Sanitization Functions by Input Type (入力タイプ別サニタイズ関数)

```php
// ✅ Text field
$name = sanitize_text_field($_POST['name']);

// ✅ Email
$email = sanitize_email($_POST['email']);

// ✅ URL
$website = esc_url_raw($_POST['website']);

// ✅ Integer
$product_id = absint($_POST['product_id']); // Always positive integer
// or
$product_id = intval($_POST['product_id']); // Can be negative

// ✅ Float
$price = floatval($_POST['price']);

// ✅ Textarea (multi-line text)
$description = sanitize_textarea_field($_POST['description']);

// ✅ HTML class/ID
$class = sanitize_html_class($_POST['class']);

// ✅ Filename
$filename = sanitize_file_name($_POST['filename']);

// ✅ Post meta key
$meta_key = sanitize_key($_POST['meta_key']);

// ✅ Array of text values
$tags = array_map('sanitize_text_field', $_POST['tags']);

// ✅ Checkbox (boolean)
$is_featured = isset($_POST['featured']) && $_POST['featured'] === '1' ? 1 : 0;

// ❌ Wrong: No sanitization
$name = $_POST['name'];
```


## Security Checklist for Common WordPress Tasks (WordPress一般タスクのセキュリティチェックリスト)

### Form Processing Checklist (フォーム処理チェックリスト)

- [ ] Nonce field added: `wp_nonce_field()`
- [ ] Nonce verified: `wp_verify_nonce()`
- [ ] Capability checked: `current_user_can()`
- [ ] All inputs sanitized: `sanitize_text_field()`, etc.
- [ ] All outputs escaped: `esc_html()`, `esc_attr()`, etc.
- [ ] SQL uses `$wpdb->prepare()` or WordPress functions

### AJAX Handler Checklist (AJAXハンドラーチェックリスト)

- [ ] Nonce passed in request: `wp_create_nonce()`
- [ ] Nonce verified: `check_ajax_referer()`
- [ ] Capability checked: `current_user_can()`
- [ ] Inputs sanitized
- [ ] Outputs escaped
- [ ] Proper response: `wp_send_json_success()` / `wp_send_json_error()`
- [ ] Both `wp_ajax_` and `wp_ajax_nopriv_` hooks registered (if needed for logged-out users)

### REST API Endpoint Checklist (REST APIエンドポイントチェックリスト)

- [ ] Permission callback defined
- [ ] Capability checked in permission callback
- [ ] Arguments validated via `args` schema
- [ ] Inputs sanitized via `sanitize_callback`
- [ ] Outputs validated via `validate_callback`
- [ ] Proper error responses: `WP_Error`
- [ ] Nonce handled (automatic for authenticated requests)

### Custom Post Type Checklist (カスタム投稿タイプチェックリスト)

- [ ] Custom capabilities defined
- [ ] Meta box save callbacks verify nonce
- [ ] Meta box save callbacks check capability
- [ ] Meta values sanitized on save
- [ ] Meta values escaped on display


## Security Testing (セキュリティテスト)

### Manual Security Testing (手動セキュリティテスト)

**XSS Testing:**
<!-- XSSテスト: -->
```
Input: <script>alert('XSS')</script>
Expected: Escaped or stripped, no alert shown
```

**SQL Injection Testing:**
<!-- SQLインジェクションテスト: -->
```
Input: ' OR '1'='1
Expected: Treated as literal string, no SQL bypass
```

**CSRF Testing:**
<!-- CSRFテスト: -->
```
Submit form without nonce: Should fail
Submit form with invalid nonce: Should fail
Submit form with valid nonce: Should succeed
```

**Authentication Bypass Testing:**
<!-- 認証バイパステスト: -->
```
Access admin page as logged-out user: Should redirect to login
Access admin AJAX action without capability: Should fail
```


## Related Files (関連ファイル)

- `.claude/rules/prohibitions.md` - WordPress security prohibitions
- `.claude/rules/wordpress.md` - WordPress development rules
- `prompt/agents/security-reviewer.md` - Security review agent
- `prompt/commands/security-check.md` - Security check command
