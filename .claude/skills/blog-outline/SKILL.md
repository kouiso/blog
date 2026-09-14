---
name: blog-outline
description: 記事の見出し設計（H2/capbox/H3構成）を作る時に使う。site/<domain>/template/article.html の型に沿ってアウトラインを生成し、内部リンク先を post-index.json から3本以上選ぶ。backlog の queued 候補をアウトラインへ起こす場面、構成の組み直しで発火。
---

# blog-outline — 見出し設計

## 手順

1. **`site/<domain>/voice.md` の「記事の型」を確認** — H2→capbox→H3→段落→コード→まとめ→FAQ の構造から外れない
2. **`site/<domain>/post-index.json` から内部リンク先を3本以上選ぶ**
   - 同じカテゴリの記事を優先
   - 新記事で触れるトピックと重なる既存記事を選ぶ（後続の blog-internal-link-refresh の逆方向）
3. **アウトラインを YAML か表で出力**:

```
title: （検索意図に対する答えが分かる一文。!や？は1つまで）
slug: typescript-xxx | programming-xxx
category: typescript | programming
h2:
  - title: H2見出し
    h3: [H3見出し, H3見出し, ...]
summary_points: [まとめ箇条書きの項目, ...]
faq: [よくある質問のQ, ...]        # 4〜6個
internal_links: [slug, slug, slug] # 3本以上
```

4. H2 の capbox に入れる「配下 H3 トピックの箇条書き」を各 H2 ごとに書く
5. 読者の検索意図に対し、FAQ が「記事本文で拾いきれなかった横の疑問」をカバーしているか確認

## 絶対禁止

- 「この記事でわかること」箱を導入に置く（このサイトの型に無い）
- post-index.json を参照せず内部リンクを思いつきで決める
- H3 を持たない H2 を量産する（まとめ・FAQ 以外の H2 は配下に H3 を持つ型）
