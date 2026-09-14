# blog — AI だけで回すブログ運用基盤

programming-life.net（WordPress / SWELL）を、記事執筆から公開・保守・解析まで人に頼らず回すためのリポジトリ。

## 大原則

- **skill は「手順」だけを持つ。サイト固有値は `site/<domain>/` からしか読まない。**
  別ドメインのブログを横展開する時は `site/<domain>/` を複製するだけで済む形を維持する。
- 秘密情報はリポジトリに書かない。`setup.sh` が 1Password から `.mcp.json` / `.env` を生成する。
- 旧リポジトリ `ritmo-inc/programming-life-mcp` は触らない（こちらに統合済み）。

## キルスイッチ（最重要）

リポジトリ直下に `kill-switch` という名前のファイルが存在する間、
**公開・更新・承認系の skill は先頭で必ず確認し、存在すれば何もせず終了する**。

対象: `blog-publish` / `blog-internal-link-refresh` / `blog-comment-moderation` / `blog-wpadmin-ops`（変更系のみ）。
参照系（analytics-report 等）と下書き作成は止めない。

## skill ルーティング

| やりたいこと | skill |
|---|---|
| 新サイト追加・プロファイル確認 | `blog-site-profile` |
| 記事本文を書く・直す（全場面） | `blog-voice` |
| 次に書く記事を決める | `blog-topic-research` |
| 見出し設計 | `blog-outline` |
| 本文執筆 | `blog-draft` |
| WordPress 投入用 HTML 化 | `blog-assemble-html` |
| アイキャッチ生成 | `blog-eyecatch` |
| 公開前チェック（必須ゲート） | `blog-quality-gate` |
| 公開 | `blog-publish` |
| 旧記事へ関連リンク追記 | `blog-internal-link-refresh` |
| コメントモデレーション | `blog-comment-moderation` |
| wp-admin 操作（REST で届かない管理） | `blog-wpadmin-ops` |
| 週次レポート | `blog-analytics-report` |
| サイト 5xx/403/WAF 障害 | `blog-incident` |

WordPress 汎用知識（セキュリティ・フック・パフォーマンス・テーマ・E2E）は
`.claude/skills/wordpress-*` / `playwright-e2e-*` を参照。

## 禁止事項

- `.mcp.json` / `.env` / サービスアカウント JSON をコミットしない（`.gitignore` 済み）
- `kill-switch` が効く skill で確認を省略しない
- `site/<domain>/` にある値を skill 側へハードコードしない
- 記事本文の品質ゲートを落としたまま公開しない
- XSERVER の WAF を迂回するために分割投稿を超えた細工をしない
