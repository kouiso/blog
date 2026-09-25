#!/usr/bin/env node
// rakko-keyword.mjs — ラッコキーワードの結果ページからキーワード一覧を取得（フリープラン対応）
//
// 前提（doc/keyword-tools.md 参照）:
//   - CDP 有効の Chrome（既定 http://localhost:29229、CDP_ENDPOINT で変更可）
//   - rakkoid.com にログイン済み。未ログインなら RAKKO_EMAIL / RAKKO_PASSWORD
//     （1Password「rakkokeyword.com」アイテム）で自動ログインを試みる
//   - playwright が必要（playwright → playwright-core → $PLAYWRIGHT_PATH の順で解決）
//
// Usage: node script/rakko-keyword.mjs [--type suggest|related|lsi] [--mode google|youtube|amazon|rakuten|bing] "種キーワード"
// Output: stdout に JSON { seed, type, mode, count, keywords: [{ keyword, rank }] }
//         rank は ＋/＋＋/＋α/＋＋＋ の重要度区分（区分なし行は null）
//
// 注意: 月間検索数・SEO難易度・CPC は有料プラン（エントリー¥660/月〜）専用。
//       ボリュームは script/keyword-planner.mjs で取る設計。

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function loadPw() {
  for (const name of ['playwright', 'playwright-core', process.env.PLAYWRIGHT_PATH].filter(Boolean)) {
    try { return require(name); } catch {}
  }
  throw new Error('playwright が見つからない。npm i playwright-core か PLAYWRIGHT_PATH を指定');
}
const { chromium } = loadPw();

const args = process.argv.slice(2);
const opt = { type: 'suggest', mode: 'google' };
let seed = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--type') opt.type = args[++i];
  else if (args[i] === '--mode') opt.mode = args[++i];
  else seed = args[i];
}
if (!seed) {
  console.error('Usage: node script/rakko-keyword.mjs [--type suggest|related|lsi] [--mode google|youtube|amazon|rakuten|bing] <seed>');
  process.exit(1);
}

const TYPE_URL = {
  suggest: `https://rakkokeyword.com/result/suggestKeywords${opt.mode !== 'google' ? '?mode=' + opt.mode + '&' : '?'}q=`,
  related: 'https://rakkokeyword.com/result/relatedKeywords?q=',
  lsi: 'https://rakkokeyword.com/result/otherKeywords?q=',
};
if (!TYPE_URL[opt.type]) { console.error('unknown --type: ' + opt.type); process.exit(1); }

const CDP = process.env.CDP_ENDPOINT || 'http://localhost:29229';
const browser = await chromium.connectOverCDP(CDP);
const ctx = browser.contexts()[0];
const page = await ctx.newPage();

await page.goto(TYPE_URL[opt.type] + encodeURIComponent(seed), { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);

let txt = await page.evaluate(() => document.body.innerText);

// 未ログインなら rakkoid ログインを試行
if (page.url().includes('rakkoid.com') || /初回ログイン確認/.test(txt)) {
  if (page.url().includes('otherServiceFirstLogin')) {
    await page.locator('button:has-text("ラッコキーワードにログインする")').click().catch(() => {});
    await page.waitForTimeout(6000);
  } else if (process.env.RAKKO_EMAIL && process.env.RAKKO_PASSWORD) {
    await page.goto('https://rakkoid.com/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.fill('input[type=email]', process.env.RAKKO_EMAIL).catch(() => {});
    await page.fill('input[type=password]', process.env.RAKKO_PASSWORD).catch(() => {});
    await page.locator('button:has-text("ログイン")').first().click().catch(() => {});
    await page.waitForTimeout(6000);
    if (page.url().includes('otherServiceFirstLogin')) {
      await page.locator('button:has-text("ラッコキーワードにログインする")').click().catch(() => {});
      await page.waitForTimeout(6000);
    }
  }
  await page.goto(TYPE_URL[opt.type] + encodeURIComponent(seed), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  txt = await page.evaluate(() => document.body.innerText);
}
await page.close();

// 行は「キーワード\t区分」形式（区分: ＋ / ＋＋ / ＋α / ＋＋＋、無い行もある）
const rows = [];
for (const line of txt.split('\n')) {
  const m = line.match(/^\s*(.+?)\s*\t\s*(＋＋＋|＋＋|＋α|＋)\s*$/);
  if (m && m[1] && !/^(キーワード|区分|指定なし)/.test(m[1])) {
    rows.push({ keyword: m[1].trim(), rank: m[2] });
  }
}
// 関連キーワード/LSI ページは区分なし — 種を含む短い行を拾うフォールバック
if (!rows.length) {
  const head = seed.split(' ')[0];
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (t && t.length > 1 && t.length < 60 && !/[\t=]/.test(t) && t.includes(head)) {
      rows.push({ keyword: t, rank: null });
    }
  }
}
console.log(JSON.stringify({ seed, type: opt.type, mode: opt.mode, count: rows.length, keywords: rows }, null, 2));
process.exit(0);
