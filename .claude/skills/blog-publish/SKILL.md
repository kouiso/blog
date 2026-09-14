---
name: blog-publish
description: 記事を公開する時に使う。kill-switch 確認が先頭。wp_create_post(draft) → quality-gate → wp_update_post(publish) → post-index 更新の順。XSERVER の WAF が大きな POST を弾く実績があるため分割投稿と再試行を内蔵する。--dry-run で draft 作成→gate→即削除までの検証経路を持つ。
---

# blog-publish — 公開

## 0. キルスイッチ（必ず先頭）

```bash
test -f kill-switch && echo "kill-switch 有効 — 公開処理を中止" && exit 0
```

`kill-switch` が存在する間は draft 作成すら行わない（Routine の無駄撃ち防止）。

## 手順

1. **draft 作成**: `wp_create_post`（status: draft、title / content(組み立て済みHTML) / categories / featured_media）
2. **gate**: `node script/quality-gate.mjs site/<domain>/draft/<slug>.md --html <slug>.html` — FAIL なら下書きのまま理由を report に残して終了
3. **publish**: `wp_update_post`（status: publish）
4. **post-index 更新**: `node script/build-post-index.mjs <domain>` → 差分を commit
5. **結果を `site/<domain>/report/<YYYY-WW>.md` に追記**: 公開 slug・gate 結果・内部リンク本数

## WAF 対策（XSERVER）

- 大きな POST（柱記事の全文 HTML）は WAF に弾かれることがある
- `wp_create_post` が 403/413 を返したら: **content を H2 単位で分割**し、空 draft 作成 → `wp_update_post` で追記していく
- 再試行は間隔を空けて最大3回。それでもダメなら `blog-incident` へ

## --dry-run（検証経路）

本番を汚さない検証用。`wp_create_post`(draft) → gate → **`wp_delete_post` で即削除**。
実績として「既存記事 `typescript-class` を複製 draft にして assemble→gate→削除まで通す」がこの経路の確認方法。

## 絶対禁止

- kill-switch 確認を飛ばす
- gate FAIL のまま publish する
- 失敗した draft を残したまま黙って終わる（report に残すか削除する）
