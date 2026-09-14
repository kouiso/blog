---
name: blog-wpadmin-ops
description: REST API で届かない wp-admin 管理操作を Playwright で行う時に使う。プラグイン/テーマ更新、SWELL 設定、Site Kit 確認、Application Password 再発行。.env の WP_ADMIN_* でログインし、操作前後にスクショを doc/evidence/ へ残す。kill-switch 確認が先頭（変更系操作のみ）。
---

# blog-wpadmin-ops — wp-admin 管理操作

## 0. キルスイッチ

`kill-switch` が存在する間は**変更系操作**（更新・設定変更・再発行）を行わない。
参照系（更新有無の確認・Site Kit の状態確認）は実行してよい。

## 前提

- `.env` に `WP_ADMIN_URL` / `WP_ADMIN_USER` / `WP_ADMIN_PASSWORD`（setup.sh が生成）
- ブラウザ操作は共有 Chrome への CDP attach か新規 headless Playwright

## 手順

1. Playwright で `WP_ADMIN_URL`（例: https://programming-life.net/login_49954）へログイン
2. **操作前にスクショ** → `doc/evidence/<YYYYMMDD>-<作業名>-before.png`
3. 目的の操作を実行:
   - プラグイン/テーマ更新: ダッシュボード → 更新
   - SWELL 設定: 外観 → カスタマイズ
   - Site Kit: ダッシュボードで連携状態確認
   - Application Password 再発行: `doc/application-password.md` の手順
4. **操作後にスクショ** → `doc/evidence/<YYYYMMDD>-<作業名>-after.png`
5. 結果を report に追記

## 注意

- SWELL のテーマ更新でクラス名が変わり得る → 月次 ops で既存記事 HTML と `template/article.html` を diff し、ズレたら template を更新する
- XSERVER の WAF が管理画面の連続操作を弾くことがある → 操作間に待機を入れる

## 絶対禁止

- スクショを残さずに本番管理画面を操作する
- ログイン情報をスクリプトへハードコードする（必ず .env から読む）
