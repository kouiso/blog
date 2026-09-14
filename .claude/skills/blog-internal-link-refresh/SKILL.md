---
name: blog-internal-link-refresh
description: 公開後・月次で、新記事に関連する旧記事へ関連リンクを追記する時に使う。post-index.json から関連記事を選び、wp_update_post で旧記事の末尾に追記する。kill-switch 確認が先頭。blog-monthly-refresh Routine と新記事公開後に呼ばれる。
---

# blog-internal-link-refresh — 旧記事への内部リンク追記

## 0. キルスイッチ

`kill-switch` が存在すれば何もしない。

## 手順

1. **対象の新記事を特定** — 直近に公開された記事（post-index.json の date 降順）
2. **関連する旧記事を post-index.json から選ぶ** — 同カテゴリ・トピックが近いものを優先（3〜5本）
3. **旧記事の現行 content を取得**（`wp_get_post` で raw を取る）
4. **追記方針**: 記事末尾の構造を壊さない位置に、新記事へのリンクを自然文で1段落追加
   - 例: `<p>関連記事：<a href="https://<domain>/<slug>/">タイトル</a>もあわせてご覧ください。</p>`
   - 既に同じリンクがあればスキップ（二重追記しない）
5. **`wp_update_post` で更新** → 更新した記事 slug と追加先を report に記録

## 絶対禁止

- 記事本文の途中へリンクを挿入して構造を壊す
- 同じリンクを二重に追記する
- 存在しない slug へリンクする（post-index.json と照合してから）
