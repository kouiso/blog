# routines.md — Claude Code Routines 定義

4 本の定期実行。Claude Code の Routines 機能で作成する（このリポジトリを対象に登録）。
全 Routine 共通: 実行開始時に `bash setup.sh` を走らせ、結果を `site/<domain>/report/` に記録して commit/push する。

## blog-daily-ops — `0 22 * * *`（JST 7:00）

```
1. kill-switch 確認（あれば何もしない）
2. 死活確認（curl トップページ + 認証付き REST）— 失敗したら blog-incident
3. blog-comment-moderation（保留コメント承認/spam）
4. wp-admin のプラグイン/テーマ更新有無の確認（blog-wpadmin-ops 参照系）
5. Clarity Data Export API で直近分を取り溜め（週次レポートの原料）
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
1. blog-analytics-report（GA4 + GSC + Clarity 蓄積分を集計）
2. リライト候補を keyword/backlog.yaml へ追記
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
