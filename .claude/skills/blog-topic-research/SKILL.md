---
name: blog-topic-research
description: 次に書く記事のテーマを決める時に使う。Search Console API の実績（表示回数が多いのに CTR が低い、順位 8〜20 位）から候補を出し、post-index.json と重複・カニバリ判定して keyword/backlog.yaml へ追記する。週次レポート・記事週次 Routine から呼ばれる。
---

# blog-topic-research — 次の記事を決める

## 前提

- `.env` に `GOOGLE_SERVICE_ACCOUNT_JSON` が必要（未設定なら手順を止めて「GA SA 未発行。doc/credential.md」を報告）
- サイトの Search Console プロパティは `site/<domain>/profile.md` のサイトURL
- 参照する既存記事は `site/<domain>/post-index.json`（古ければ `node script/build-post-index.mjs` で更新）

## 手順

1. **GSC API で直近28日のクエリ実績を取得**（`searchanalytics.query`、dimensions: query,page）
2. **候補を絞る**:
   - 表示回数が多いのに CTR が低い（= 需要はあるが記事が拾えていない）
   - 平均順位 8〜20 位（= トップを取れる見込みがあるクエリ）
3. **post-index.json と照合**:
   - 既存記事が同じクエリを狙っている → 新規記事ではなくリライト候補（`status: rewrite` 相当として notes に記録）
   - 既存記事とトピックが被る → カニバリになるので除外
4. **（任意）候補の需要をキーワードツールで裏取り** — `script/google-suggest.mjs` でサジェスト展開、`script/keyword-planner.mjs` で月間ボリューム・競合を取得（要CDPログインChrome。doc/keyword-tools.md 参照）。ボリューム0件級の候補は notes に記録
5. **`site/<domain>/keyword/backlog.yaml` の `keywords:` に追記**
   - slug は `typescript-xxx` / `programming-xxx` 規則（profile.md の命名規則に従う）
   - `source: gsc`、`gsc:` に実測値、`added` に今日の日付、`status: queued`
6. 追記した候補の一覧を1行ずつ報告する

## 絶対禁止

- GSC の実績なしに思いつきで backlog を埋める
- post-index.json と照合せずカニバリ候補を積む
- backlog.yaml のスキーマ（コメント参照）を勝手に変える
