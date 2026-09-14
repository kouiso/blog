# blog

[programming-life.net](https://programming-life.net)（WordPress / SWELL）を、記事執筆から公開・保守・解析まで
AI だけで回すためのリポジトリ。旧 `ritmo-inc/programming-life-mcp` はここに統合済み（旧リポは触らない）。

- WordPress 操作: [docdyhr/mcp-wordpress](https://github.com/docdyhr/mcp-wordpress)（59 tools、Application Password 認証）
- wp-admin 操作: Playwright（REST で届かない管理用）
- 解析: GA4 Data API / Search Console API / Clarity Data Export API

## セットアップ

```bash
bash setup.sh        # 1Password → .mcp.json / .env を生成
claude mcp list      # wordpress-programming-life が出れば OK
```

認証情報の発行・配置手順（人が一度だけやること）は `doc/credential.md`。
Application Password の再発行は `doc/application-password.md`。

## ディレクトリ

```
site/<domain>/      サイトプロファイル（profile.md / voice.md / template/ / keyword/ / post-index.json / report/）
.claude/skills/     運用 skill 群（CLAUDE.md のルーティング表を参照）
script/             skill が呼ぶスクリプト
doc/                認証発行手順・運用設計・インシデント手順
kill-switch         このファイルが存在する間、公開系 Routine / skill は一切動かない
```

## 定期実行（Claude Code Routines）

| Routine | cron(UTC) | 内容 |
|---|---|---|
| blog-daily-ops | `0 22 * * *`（JST 7:00） | コメント承認・死活確認・更新有無 |
| blog-weekly-article | `0 0 * * 1,4` | 記事 1 本を下書き→品質ゲート→公開（週 2 本） |
| blog-weekly-report | `0 0 * * 0` | 解析レポート生成・backlog 補充 |
| blog-monthly-refresh | `0 0 1 * *` | 順位下落記事リライト・内部リンク更新 |

## キルスイッチ

```bash
touch kill-switch   # 全公開系動作を停止
rm kill-switch      # 再開
```

## mcp-wordpress ツール一覧（59 tools）

| カテゴリ | ツール数 | 主な操作 |
|---|---|---|
| Posts | 6 | 投稿の作成・編集・削除・一覧 |
| Pages | 6 | 固定ページ管理 |
| Media | 6 | メディアライブラリ |
| Users | 6 | ユーザー管理 |
| Comments | 7 | コメント管理・モデレーション |
| Taxonomies | 10 | カテゴリー・タグ |
| Site Settings | 7 | サイト設定・統計 |
| Authentication | 6 | 認証テスト |
| Cache Management | 4 | キャッシュ制御 |
| Performance | 6 | パフォーマンス監視 |

プラグイン更新・テーマ設定は REST に無い → `blog-wpadmin-ops`（Playwright）で補う。
