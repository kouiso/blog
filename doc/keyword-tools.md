# キーワード調査ツール

記事テーマの裏取りに使う3つのスクリプト。`blog-topic-research` の手順4（任意）から呼ぶ想定。

| ツール | 取れるもの | 認証 |
|---|---|---|
| `script/google-suggest.mjs` | Googleサジェスト（ラッコキーワードの元データと同じ） | 不要・無料 |
| `script/rakko-keyword.mjs` | ラッコキーワードのサジェスト一覧＋重要度区分（＋〜＋＋＋）。`--mode` で YouTube/Amazon/楽天/Bing、`--type related|lsi` で関連・LSI | ラッコID（フリー） |
| `script/keyword-planner.mjs` | Googleキーワードプランナー: 月間検索数・競合・入札単価・トレンド | Google広告アカウント（UI経由） |

## 使い方

```bash
# サジェスト（認証なし・どこでも動く）
node script/google-suggest.mjs "typescript 入門" "プログラミング 副業"

# ラッコキーワード（要CDP Chrome + ラッコIDログイン）
node script/rakko-keyword.mjs "typescript 入門"
node script/rakko-keyword.mjs --mode youtube "typescript 入門"
node script/rakko-keyword.mjs --type related "typescript 入門"

# キーワードプランナー（要CDP Chrome + Google広告ログイン）
node script/keyword-planner.mjs "typescript 入門"
```

## 前提環境

- **CDP Chrome**: `--remote-debugging-port=29229` で起動済みのブラウザ（`CDP_ENDPOINT` で変更可）
- **playwright**: `playwright` → `playwright-core` → `$PLAYWRIGHT_PATH` の順で解決
- **Google広告**: `kouiso@ritmo.co.jp` のアカウント（ocid=1142410486、authuser=1）にブラウザでログイン済みであること。**アカウントはキャンセル済みでもプランナーは使える**（広告掲載は不可・課金も発生しない）
- **ラッコID**: `programming.life12345@gmail.com`（ラッコID 532938、フリープラン）。資格情報は 1Password RITMO vault の「rakkokeyword.com」アイテム。未ログイン時は `RAKKO_EMAIL` / `RAKKO_PASSWORD` 環境変数で自動ログインを試みる

## 取れるデータの注意点

- **キーワードプランナーのボリュームは区切り値**（10〜100→50、100〜1000→500、1000〜1万→5000 等のバケット代表値）。正確な数値は広告掲載中のアカウントのみ返る。テーマの優先度付けには十分
- **ラッコの数値カラムは有料**（検索数・SEO難易度・CPC → エントリー ¥660/月〜）。フリーで取れるのはキーワード一覧＋重要度区分のみ。数値はキーワードプランナー側で取る分担
- ラッコのフリープランには利用回数制限あり（1日の検索回数。超えたら翌日）

## 組み合わせ例

1. `google-suggest.mjs` で種キーワードを展開
2. `keyword-planner.mjs` に展開候補を渡してボリューム降順ソート
3. `rakko-keyword.mjs --type lsi` で関連語を足して見出し候補にする

## 取得できないもの（代替案）

- **正確な検索数値** → 広告掲載（課金）が必要。必要になったらエントリープランかGoogle広告の再アクティブ化を検討
- **ラッコの SEO難易度・CPC** → 有料プランのみ。代替としてキーワードプランナーの Competition (indexed value) と bid を使う
- **Search Console の自社実績** → GA SA（`GOOGLE_SERVICE_ACCOUNT_JSON`）で `blog-topic-research` 本体が取得済み
