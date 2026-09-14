---
name: blog-assemble-html
description: Markdown 下書きを WordPress 投入用のブロック HTML に変換する時に使う。site/<domain>/template/article.html の capbox・hcb_wrap・FAQ・まとめ・check_list の正確なマークアップに流し込む。blog-draft の後、blog-publish の前に位置する。
---

# blog-assemble-html — ブロック HTML 化

## 手順

1. **`site/<domain>/template/article.html` を読む** — capbox / hcb_wrap / accordion / check_list の正確なマークアップはここが正本。クラス名を1文字でも変えない
2. 下書き `site/<domain>/draft/<slug>.md` をブロック HTML に変換し、`site/<domain>/draft/<slug>.html` へ出力
3. **変換ルール**:

| 下書き | 出力ブロック |
|---|---|
| 段落 | `<!-- wp:paragraph --><p>…</p><!-- /wp:paragraph -->` |
| `## ` | `<!-- wp:heading --><h2 class="wp-block-heading">` |
| `### ` | `<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">` |
| 箇条書き | `<!-- wp:list --><ul class="wp-block-list">` |
| ```ts ブロック | `<!-- wp:loos-hcb/code-block {"langType":"ts","langName":"TypeScript"} --><div class="hcb_wrap"><pre class="prism undefined-numbers lang-ts" data-lang="TypeScript"><code>…` |
| まとめ capbox | template の `is-style-check_list -list-under-dashed` 構造 |
| FAQ | template の `swell-block-accordion is-style-main` 構造 |

4. **コード中の `<` `>` `&` `"` は HTML エスケープ**（`&lt;` `&gt;` `&amp;` `&quot;`）。絵文字・❌⭕はそのまま可（実記事は `&#x274c;` エンティティだが生文字でも描画される）
5. **生成後にブロック整合を検証**: `wp:` コメントの開閉が対応しているか、capbox/accordion の div 入れ子が閉じているかを目視＋`blog-quality-gate` の構造チェックで確認

## 絶対禁止

- template/article.html に無い SWELL ブロック（ボタン・バナー等）を自作する
- `class="wp-block-heading"` 等のクラスを省略する（目次・スタイルが効かなくなる）
- 目次・関連記事・CTA を本文に書く（テーマが自動挿入する）
