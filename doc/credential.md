# credential.md — 人が一度だけやること

このリポジトリの自動運用に必要な認証情報の発行・配置手順。
全部 1Password に置き、`setup.sh` が取り出す。完了したら `bash setup.sh` で `.env` を再生成する。

## 1. Google サービスアカウント（GA4 + Search Console）

1. GCP コンソールでプロジェクトを選択（なければ作成）
2. **API を有効化**: 「Google Analytics Data API」「Google Search Console API」
3. サービスアカウント作成 → JSON キーを発行・ダウンロード
4. **GA4**: プロパティの管理 → アクセス管理 → SA のメールアドレスに「閲覧者」付与
5. **Search Console**: プロパティの設定 → ユーザーと権限 → SA のメールアドレスを追加
6. JSON キーを 1Password **RITMO** vault に item `programming-life.net GA Service Account` として保存（`credential` フィールド or 添付ファイル）
7. `bash setup.sh` 再実行 → `.env` に `GOOGLE_SERVICE_ACCOUNT_JSON` が入る

## 2. Microsoft Clarity Data Export API

- トークンは既に 1Password **RITMO** vault の `Microsoft Clarity APIキー` にある
- 失効・再発行する場合: Clarity プロジェクト `skx5c2r6wr` の Settings → Data Export API → Generate new API token → 同 item の password フィールドを更新
- `bash setup.sh` 再実行 → `.env` に `CLARITY_API_TOKEN` が入る

## 3. wp-admin 通常ログイン

- 1Password `磯貝プライベート共有` vault の `programming-life.net`（item `v3hyideaoxwzyh57hkpfomzbhm`）に username/password があることを確認
- `blog-wpadmin-ops`（Playwright ログイン）がこれを使う

## 4. Routine 環境の変数

Claude Code Routines の実行環境に以下を設定:

| 変数 | 値 |
|---|---|
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password service account token（実行時に setup.sh が op で各鍵を取得） |

## 補足: 既知の異常

- `programming-life.net MCP App Password`（RITMO vault）の password フィールドは `"値\n値"` と二重・引用符付きで保存されている。`setup.sh` が正規化して吸収するため動作上の問題はないが、サービスアカウントは read-only で item を編集できない。直す場合は手動で password フィールドを24文字の値だけに更新すること。
