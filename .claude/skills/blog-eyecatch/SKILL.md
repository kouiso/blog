---
name: blog-eyecatch
description: アイキャッチ画像を生成する時に使う。site/<domain>/template/eyecatch.html にタイトルとカテゴリを流し込み、Playwright(Chromium) で 1200×630 のスクショを撮って PNG 化し、wp_upload_media で WordPress メディアへ登録する。人手ゼロ。blog-publish の前に必要。
---

# blog-eyecatch — アイキャッチ生成

## 手順

1. **`site/<domain>/template/eyecatch.html` の `{{TITLE}}` / `{{CATEGORY}}` を置き換え**
   - TITLE: 記事タイトル（長い場合は 3 行に収まるようテンプレ側で clamp 済み）
   - CATEGORY: 表示名（TypeScript / プログラミング）
2. **Playwright(Chromium) でスクショ**:

```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://<絶対パス>/eyecatch-filled.html');
  await p.screenshot({ path: '<slug>.png' });
  await b.close();
})();
"
```

   ※ playwright が無ければ `npx -y playwright@latest screenshot --viewport-size=1200,630 <file> <slug>.png`
3. **生成 PNG を Read で目視確認** — 文字が見切れていないか・1200×630 かを必ず確認
4. **`wp_upload_media`（MCP）で `<slug>.png` をアップロード** → 返り値の media ID を記録（`wp_update_post` の featured_media に使う）

## 絶対禁止

- 生成した PNG を目視せずにアップロードする
- 既存記事と同じファイル名で上書きする（slug 名なので重複したら `<slug>-2.png`）
- 1200×630 以外の寸法で出す
