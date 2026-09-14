---
name: blog-site-profile
description: 新しいサイト（ドメイン）をこの基盤に追加する時、または既存プロファイルを確認・更新する時に使う。site/<domain>/ の作り方と、既存サイトから voice/template を逆算する調査手順が本体。横展開の入口。
---

# blog-site-profile — サイト追加・プロファイル管理

## 新サイト追加の手順

1. `site/<domain>/` を作る（programming-life.net を複製するのが最短）
2. **profile.md を埋める**: URL・カテゴリ・slug 規則・CTA・計測ID・wp-admin URL・コメント基準
3. **既存記事から voice.md を逆算する**（この調査が本質）:
   - REST で公開記事を数本取得（`?context=edit` で raw content）
   - 記事の型を抽出: 導入の段落数 / 見出し構造 / 使われているブロック / 締めの形
   - 定型句・語尾・一人称の有無を拾って voice.md へ
   - 分量の実測（文字数レンジ）を記録
4. **template を逆算する**: raw content からブロックの正確なマークアップ（class 名・コメント形式まで）を `template/article.html` へ写す
5. `node script/build-post-index.mjs <domain>` で post-index.json を初期生成
6. `keyword/backlog.yaml` を空キューで作る

## 確認・更新時

- profile.md の値（プラグイン・計測ID・カテゴリ）が現行と合っているか REST / wp-admin で確認
- テーマ更新でクラス名が変わっていないか、既存記事 HTML と template を diff（blog-wpadmin-ops の月次作業と同じ）

## 絶対禁止

- サイト固有値を `.claude/skills/` 側へ書く（全て site/<domain>/ へ）
- 実記事を見ずに voice.md / template を想像で書く
