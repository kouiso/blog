---
name: blog-comment-moderation
description: 保留中コメントを日次でモデレーションする時に使う。wp_list_comments(hold) → 判定 → approve / spam。判定基準は site/<domain>/profile.md のコメントモデレーション基準が正本。kill-switch 確認が先頭。blog-daily-ops Routine から呼ばれる。
---

# blog-comment-moderation — コメント承認

## 0. キルスイッチ

`kill-switch` が存在すれば何もしない（approve/spam は公開系操作）。

## 手順

1. `wp_list_comments`（status: hold）で保留中コメントを取得
2. **判定基準は `site/<domain>/profile.md` の「コメントモデレーション基準」**をそのまま適用:
   - approve: 記事内容への質問・感想・報告
   - spam: 外部リンク付き宣伝、意味をなさない文字列、攻撃的投稿、英語圏スパム定型
3. `wp_update_comment` で approve または spam へ
4. 判断に迷うもの（宣伝かどうか微妙、記事への苦情等）は **hold のまま残し**、件数と内容を report に1行で記録
5. 処理件数を `site/<domain>/report/<YYYY-WW>.md` に追記（approved N / spam N / hold N）

## 絶対禁止

- 迷ったコメントを approve する（迷ったら hold に残す。削除もしない）
- profile.md の基準を読まずに自分の感覚で判定する
