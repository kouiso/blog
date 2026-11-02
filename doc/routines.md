# routines.md — Claude Code Routines 定義

4 本の定期実行。Claude Code の Routines 機能で作成する（このリポジトリを対象に登録）。
全 Routine 共通: 実行開始時に `bash setup.sh` を走らせ、結果を `site/<domain>/report/` に記録して commit/push する。

## blog-daily-ops — `0 22 * * *`（JST 7:00）

```
1. kill-switch 確認（あれば何もしない）
2. 死活確認（curl トップページ + 認証付き REST）— 失敗したら blog-incident
3. blog-comment-moderation（保留コメント承認/spam）
4. wp-admin のプラグイン/テーマ更新有無の確認（blog-wpadmin-ops 参照系）
5. node script/fetch-clarity.mjs <domain>（Clarity直近分を日次保存。トークン未取得時はスキップ）
6. 結果を report に追記して commit
```

## blog-weekly-article — `0 0 * * 1,4`（週2本）

```
1. kill-switch 確認
2. blog-topic-research で backlog 確認（queued が無ければ補充）
3. backlog 先頭を消費: blog-outline → blog-draft → blog-eyecatch → blog-assemble-html
4. blog-quality-gate — FAIL なら下書きのまま理由を report に残して終了
5. blog-publish（公開）→ post-index 更新
6. blog-internal-link-refresh（新記事への逆リンクを旧記事へ）
7. report に追記して commit/push
```

## blog-weekly-report — `0 0 * * 0`

```
1. node script/generate-report.mjs <domain>（GA4 + GSC + Clarity 蓄積分を集計）
2. レポートを確認し、追記する場合は同コマンドに --update-backlog を付ける
3. commit/push
```

## blog-monthly-refresh — `0 0 1 * *`

```
1. kill-switch 確認
2. 順位が下落した記事のリライト（backlog の source: rewrite を消費）
3. blog-internal-link-refresh 全件
4. 既存記事 HTML と template/article.html の diff（SWELL 更新検知）
5. report に追記して commit/push
```

## 手動発火・停止

- 各 Routine は手動でも発火できる。kill-switch の有無で公開系の挙動が変わることを確認済みであること
- 止めたい時は `touch kill-switch`（再開は `rm kill-switch`）

## 未登録環境での登録・検証手順

Claude Code の Routines を利用できる環境で、このリポジトリを対象として上の4定義を登録します。
登録先の秘密情報設定へ、既存の `OP_SERVICE_ACCOUNT_TOKEN` を渡します。値はプロンプトや実行ログに書きません。
このリポジトリから Routines の登録や資格情報の発行は行いません。

登録後は、まず読み取り用の `blog-daily-ops` を手動発火します。
`kill-switch` があると冒頭で終了し、無いと死活確認・コメント取得まで到達することを、
検証時だけコメント承認・プラグイン更新を無効にして確認します。
本番の公開処理を手動発火で試す代わりに、README の fixture コマンドで
品質ゲート・模擬draft削除を確認します（本番draftの検証は #6 の別作業です）。
4本の一覧、`setup.sh` の成功、停止時と読み取り時の結果を記録してから運用開始とします。
これらの記録が無い状態は「定義済み・未登録/未検証」であり、登録済みとは扱いません。
