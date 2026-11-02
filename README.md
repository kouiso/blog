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

## 解析スクリプトとローカル検証

Node.js 22.16 以降を使用します。追加パッケージは不要です。

```bash
# 日次取り溜め（.env の CLARITY_API_TOKEN。未取得なら終了コード0でスキップ）
node script/fetch-clarity.mjs programming-life.net
# 週次集計（昨日まで7日間 vs その前7日間、UTC）
node script/generate-report.mjs programming-life.net
# 検出済みの既存記事を backlog へ重複なく追記する場合のみ
node script/generate-report.mjs programming-life.net --update-backlog

# 認証なし・通信なしの fixture 実行
node script/fetch-clarity.mjs programming-life.net --fixture test/clarity.fixture.json --date 2026-01-04
node script/generate-report.mjs programming-life.net --fixture test/analytics.fixture.json --end 2026-01-04
node script/publish-dry-run.mjs programming-life.net --fixture test/publish-dry-run.fixture.json --date 2026-01-04
node --test test/*.test.mjs
```

本番保存先は `site/<domain>/analytics/clarity/<YYYY-MM-DD>.json` と
`site/<domain>/report/<ISO年-WW>.md` です。Clarity は直近1日の URL 別データを
1回取得し、同日は上書きします（API は日10回まで）。週報には観測行の単純平均と
URL別の観測値を出し、週次ユニーク数や重み付き平均にはしません。

Google 認証は既存の `GOOGLE_ACCESS_TOKEN`（読み取り権限のある OAuth トークン）か
既存鍵への `GOOGLE_SERVICE_ACCOUNT_JSON` パスを `.env` に設定します。
`GA4_PROPERTY_ID`（数値）と `GSC_SITE_URL`（登録済みプロパティ名）も必要です。
認証・設定が無い項目は「未取得」と表示し、実績値を捏造しません。
SA・APIキーの発行や設定変更はこのスクリプトでは行いません。

fixture は `analytics/clarity-fixture/` と `report/fixture/` に隔離し、
本番週報や backlog に混ぜません（`--fixture --update-backlog` はエラー）。
dry-run CLI は fixture 専用で、WordPress の認証・通信・公開操作を持ちません。
実際の品質ゲートを実行し、模擬draftの削除・404・元記事の不変を確認します。
同梱の短い記事はゲートFAILになる設計です。ゲート結果を記録して削除できれば検証は成功します。
本番の複製・削除確認は #6 の外部検証として別途必要です。

## キルスイッチの操作

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
