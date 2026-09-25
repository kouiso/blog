#!/usr/bin/env node
// keyword-planner.mjs — Google キーワードプランナーから検索ボリューム等を CSV 取得
//
// 前提（doc/keyword-tools.md 参照）:
//   - CDP 有効の Chrome が起動済み（既定 http://localhost:29229、CDP_ENDPOINT で変更可）
//   - その Chrome で Google 広告 (ads.google.com) にログイン済み
//   - アカウントは「キャンセル済み」でも使える（広告掲載だけ不可）
//   - playwright が必要。import 解決順: playwright → playwright-core → $PLAYWRIGHT_PATH
//
// Usage: node script/keyword-planner.mjs [--ocid 1142410486] [--authuser 1] "種キーワード1" ...
// Output: stdout に JSON [{ keyword, currency, avgMonthlySearches, trend3m, yoy, competition,
//          competitionIndex, bidLow, bidHigh, monthly: { "YYYY-Mon": n|null } }]

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
function loadPw() {
  for (const name of ['playwright', 'playwright-core', process.env.PLAYWRIGHT_PATH].filter(Boolean)) {
    try { return require(name); } catch {}
  }
  throw new Error('playwright が見つからない。npm i playwright-core か PLAYWRIGHT_PATH を指定');
}
const { chromium } = loadPw();

const args = process.argv.slice(2);
const opt = { ocid: '1142410486', authuser: '1' };
const seeds = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--ocid') opt.ocid = args[++i];
  else if (args[i] === '--authuser') opt.authuser = args[++i];
  else seeds.push(args[i]);
}
if (!seeds.length || seeds.length > 10) {
  console.error('Usage: node script/keyword-planner.mjs [--ocid N] [--authuser N] <seed...> (1-10件)');
  process.exit(1);
}

const CDP = process.env.CDP_ENDPOINT || 'http://localhost:29229';
const browser = await chromium.connectOverCDP(CDP);
const page = await browser.contexts()[0].newPage();

await page.goto(`https://ads.google.com/aw/keywordplanner/home?ocid=${opt.ocid}&authuser=${opt.authuser}`, {
  waitUntil: 'domcontentloaded', timeout: 30000,
});
await page.waitForTimeout(6000);
await page.click('text=新しいキーワードを見つける', { timeout: 10000 });
await page.waitForTimeout(5000);

const input = page.locator('input[aria-label="検索キーワード入力領域"]');
for (const s of seeds) {
  await input.click();
  await input.fill(s);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
}
await page.locator('text=結果を表示').first().click({ timeout: 5000 });
await page.waitForTimeout(12000);

await page.click('text=キーワード候補をダウンロード', { timeout: 5000 });
await page.waitForTimeout(2500);
const dlP = page.waitForEvent('download', { timeout: 20000 });
await page.click('text=.csv', { timeout: 5000 });
const dl = await dlP;
const csvPath = join(tmpdir(), 'kp-' + Date.now() + '.csv');
await dl.saveAs(csvPath);
await page.close();

// Google の CSV は UTF-16LE TSV
const lines = readFileSync(csvPath, 'utf16le').split(/\r?\n/).map(l => l.replace(/^﻿/, ''));
const headerIdx = lines.findIndex(l => l.startsWith('Keyword\t'));
const header = lines[headerIdx].split('\t');
const monthlyCols = header.map((h, i) => ({ h, i })).filter(c => /^Searches: /.test(c.h));
const rows = [];
for (const line of lines.slice(headerIdx + 1)) {
  if (!line.trim()) continue;
  const c = line.split('\t');
  if (!c[0]) continue;
  const monthly = {};
  for (const mc of monthlyCols) {
    const m = mc.h.match(/Searches: (\w+) (\d+)/);
    const v = c[mc.i];
    monthly[`${m[2]}-${m[1]}`] = v === '' || v === undefined ? null : Number(v);
  }
  rows.push({
    keyword: c[0], currency: c[1], avgMonthlySearches: c[2] ? Number(c[2]) : null,
    trend3m: c[3], yoy: c[4], competition: c[5],
    competitionIndex: c[6] ? Number(c[6]) : null,
    bidLow: c[7] ? Number(c[7]) : null, bidHigh: c[8] ? Number(c[8]) : null,
    monthly,
  });
}
console.log(JSON.stringify(rows, null, 2));
// CDP 接続が残ると終了しないため明示終了（browser.close() は接続先の Chrome 自体を閉じるので使わない）
process.exit(0);
