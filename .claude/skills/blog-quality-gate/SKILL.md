---
name: blog-quality-gate
description: 記事公開前の必須ゲート。文体 lint（NG表の機械チェック）・字数・タイトル/slug重複・内部リンク死活・コードコンパイル・closing構造を script/quality-gate.mjs で検査し、1つでも落ちたら公開しない。blog-publish から必ず呼ばれる。手動でゲートだけ回す時もこれ。
---

# blog-quality-gate — 公開前の必須ゲート

## 手順

```bash
node script/quality-gate.mjs site/<domain>/draft/<slug>.md --html site/<domain>/draft/<slug>.html
```

- 柱記事の時は `--pillar` を付ける（字数閾値が 12,000 字になる）
- ts ブロックを含まない記事でも `--skip-ts` は付けない（検出自体がテスト対象）

## 検査項目（script/quality-gate.mjs が機械実行）

| 項目 | 落ちる条件 |
|---|---|
| NG表現 | voice.md 禁止カテゴリ2表 + 手順省略語（同様に/残りも/以下略/簡単です）の検出 |
| 常体混入 | だ・やで・ちゃう・命令形が地の文に出る |
| 字数 | 通常 <3,500字 / 柱 <12,000字 |
| 重複 | slug またはタイトルが post-index.json の既存記事と一致 |
| 内部リンク | 3本未満、または post-index に無い slug へのリンク |
| コードコンパイル | ```ts ブロックが tsc --noEmit --strict で落ちる |
| closing 構造 | 「まとめ」「FAQ」が無い |
| ブロック整合 | （--html 指定時）wp コメント開閉不整合・capbox/hcb_wrap/accordion/check_list 欠落 |

## 落ちた時

- **公開しない**。下書きのまま、落ちた項目と理由を `site/<domain>/report/` の当該週レポートに1行で残す
- 機械チェックを通っても「3表を守った」以上の意味は持たない — 語り口の不自然さは `blog-voice` の6手順で担保する

## 絶対禁止

- FAIL のまま `blog-publish` に進む
- ゲートを通すために NG_PHRASES 側を削る（voice.md と乖離する）
