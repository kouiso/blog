# Application Password 再発行手順

WordPress MCP は Application Password を使って REST API に認証する。
通常パスワードとは別物なので、紛失・漏洩時は本手順で再発行する。

## 発行手順

1. https://programming-life.net/login_49954 にログイン（1Password: `programming-life.net`）
2. `ユーザー` → `プロフィール` に移動
3. ページ下部の「アプリケーションパスワード」セクションへスクロール
4. 新しいアプリケーションパスワードの名前に `mcp-wordpress` と入力
5. 「新しいアプリケーションパスワードを追加」をクリック
6. 表示されたパスワード（`XXXX XXXX XXXX XXXX XXXX XXXX` 形式）をコピー
   ⚠️ この画面を閉じると二度と表示されない
7. 1Password の item `programming-life.net MCP App Password` の password フィールドを更新
8. `setup.sh` を再実行（スペースなしの値が `.mcp.json` に入る）

## 注意

- Application Password の権限は WordPress ユーザー権限に準じる（管理者 = 全操作可）
- 不要になったら wp-admin のプロフィールページから失効させること
- この手順は `blog-wpadmin-ops` skill からも参照される
