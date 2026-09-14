---
name: blog-incident
description: サイトの 5xx/403/WAF 障害に対応する時に使う。死活確認 → XSERVER WAF/REST 制限の切り分け → 復旧手順 → 直せない時だけ1行で通知。blog-daily-ops Routine の死活確認が失敗した時にも呼ばれる。
---

# blog-incident — 障害対応

## 手順

1. **死活確認**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://<domain>/
   curl -s -o /dev/null -w "%{http_code}" https://<domain>/wp-json/wp/v2/posts?per_page=1  # 認証付き
   ```
2. **切り分け**:

| 症状 | 原因候補 | 対応 |
|---|---|---|
| サイト全体 5xx | XSERVER 側障害 or PHP  fatal | wp-admin 画面が開くか確認。開けばプラグイン/テーマ起因を疑う |
| REST だけ 403 | XSERVER REST 制限 / WAF | Application Password の失効を確認（wpadmin-ops で再発行） |
| POST だけ弾かれる | WAF のサイズ制限 | blog-publish の分割投稿手順へ |
| 管理画面も 403 | IP 制限・WAF 誤検知 | XSERVER 管理画面の WAF 設定を確認（人の操作が要る可能性） |

3. **復旧できる範囲は自分でやる**（Application Password 再発行、再試行等）
4. **直せない時だけ1行で通知** — report に「状況・切り分け結果・人に必要な操作」を記録して終了。長い障害報告は書かない

## 絶対禁止

- 原因を切り分ける前にプラグインを無効化する（状況を悪化させる）
- XSERVER のサーバー管理画面（パネル）へ勝手に入る — そこは人の領域
