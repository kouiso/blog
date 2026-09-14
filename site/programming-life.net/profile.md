# サイトプロファイル: programming-life.net

skill が参照するサイト固有情報の正本。手順は書かない（手順は `.claude/skills/`）。

## 基本

| 項目 | 値 |
|---|---|
| サイトURL | https://programming-life.net |
| ブログ名 | programming-life.net |
| CMS | WordPress（XSERVER ホスティング） |
| テーマ | SWELL 2.8.1 |
| wp-admin ログインURL | https://programming-life.net/login_49954 |
| REST API | `/wp-json` は匿名 403（XSERVER 制限）。Application Password 認証必須 |
| 対象読者 | プログラミング初心者・未経験からの学習者 |
| 記事数（2026-09 時点） | 62 本 |

## カテゴリ

| slug | 名前 | 記事数 | slug 命名規則 |
|---|---|---|---|
| `typescript` | TypeScript | 47 | `typescript-xxx` |
| `programming` | プログラミング | 15 | `programming-xxx` |

新規記事はこの2カテゴリのどちらか。カテゴリ増設は行わない。

## 計測・外部サービス

| サービス | ID / 設定 |
|---|---|
| GA4 + Search Console | Site Kit by Google、gtag `GT-NFDH7RG` |
| Microsoft Clarity | project `skx5c2r6wr` |
| メルマガ/LP フォーム | MyASP `https://my915p.com/p/r/LOfgRSOa` |

## 有効プラグイン

Site Kit by Google / Microsoft Clarity / Contact Form 7 / Highlighting Code Block /
EWWW Image Optimizer / blog-floating-button / Google XML Sitemaps

## 記事の約束

- アイキャッチ: slug 名の PNG、1200×630、`template/eyecatch.html` から生成
- 関連記事・目次・フローティング CTA は SWELL/プラグインが自動挿入するため本文には書かない
- コメントモデレーション基準（`blog-comment-moderation` 用）:
  - approve: 記事内容への質問・感想・報告（日本語/英語）
  - spam: 外部リンク付き宣伝、意味をなさない文字列、攻撃的投稿、英語圏スパム定型

## 秘密情報の配置

`setup.sh` が生成する `.env` に入る値（発行手順は `doc/credential.md`）:

| 環境変数 | 用途 | 1Password |
|---|---|---|
| `WP_ADMIN_URL` / `WP_ADMIN_USER` / `WP_ADMIN_PASSWORD` | wp-admin ログイン（wpadmin-ops） | 磯貝プライベート共有 `programming-life.net` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GA4 Data API / Search Console API | RITMO `programming-life.net GA Service Account` |
| `CLARITY_API_TOKEN` | Clarity Data Export API | RITMO `Microsoft Clarity APIキー` |
