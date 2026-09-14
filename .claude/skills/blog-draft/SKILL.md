---
name: blog-draft
description: 記事本文を執筆する時に使う。アウトラインを章（H2/H3）ごとに書き進め、短段落・対比コード・定型句を守る。TypeScript のコード例は script/check-ts.mjs で tsc --noEmit を通す。blog-outline の後、blog-assemble-html の前に位置する。
---

# blog-draft — 本文執筆

## 前提

- 先に `blog-voice`（voice.md 適用＋既存記事3本読み）と `blog-outline` を通す
- 下書きは `site/<domain>/draft/<slug>.md` に置く（アウトラインの frontmatter + 本文）

## 手順

1. **章（H2）ごとに書く**。一度に全文を書かない — 1 章書くたび voice.md の禁止表を確認する
2. **段落は 1〜2 文の短段落**。`wp:paragraph` 1つに収まる長さを基準にする
3. **コードブロックは対比形式** — ❌ 悪い例 / ⭕ 良い例 / 💡 ポイント / 🚨 危険、のコメントを入れる
4. **定型句を使う** — 「初心者がよくつまずくのが〜」「実務では〜」「〜に注意してください」等（voice.md 参照）
5. **TS コード例は実行検証**:
   ```bash
   node script/check-ts.mjs site/<domain>/draft/<slug>.md
   ```
   ` ```ts ` / ` ```typescript ` ブロックを抽出して `tsc --noEmit --strict` に通す。落ちたら直してから次へ
6. **各 H2 の最後に内部リンクを1つ以上**（アウトラインで選んだ3本を散らす）
7. **まとめ・FAQ は最後に書く** — 本文で言い切った内容を箇条書き・Q&A に圧縮する

## 分量

- 柱記事（backlog の notes に `pillar` とあるもの）: 13,000〜20,000 字
- 通常記事: 4,000〜6,000 字

## 絶対禁止

- コードを検証せず「たぶん動く」で進める
- 全章を一気に書いて後から文体を直す（後から直す前提の執筆は禁止）
- 「同様に」「残りも」「以下略」で手順を端折る
