#!/usr/bin/env node
// check-ts.mjs — 記事下書き内の ```ts / ```typescript コードブロックを抽出して tsc --noEmit に通す
//
// 使い方:
//   node script/check-ts.mjs site/<domain>/draft/<slug>.md
//
// 各ブロックを tmp/check-ts-<slug>/block-N.ts に書き出し、npx tsc --noEmit --strict を実行。
// コード例に依存する外部変数（画面のDOM等）はブロック内で宣言されている前提。
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node script/check-ts.mjs <draft.md>');
  process.exit(1);
}

const src = readFileSync(file, 'utf8');
const blocks = [...src.matchAll(/```(?:ts|typescript)\n([\s\S]*?)```/g)].map((m) => m[1]);
if (blocks.length === 0) {
  console.log('[check-ts] ts コードブロックなし — OK');
  process.exit(0);
}

const dir = join(tmpdir(), `check-ts-${basename(file, '.md')}`);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

let failed = 0;
blocks.forEach((code, i) => {
  const f = join(dir, `block-${i}.ts`);
  writeFileSync(f, code);
  try {
    execFileSync('npx', ['-y', '-p', 'typescript@~5.9.0', 'tsc', '--noEmit', '--strict', '--skipLibCheck', f], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    console.log(`[check-ts] block-${i}: OK`);
  } catch (e) {
    failed++;
    console.error(`[check-ts] block-${i}: NG\n${e.stdout ?? e.message}`);
  }
});

if (failed) {
  console.error(`[check-ts] ${failed}/${blocks.length} ブロックがコンパイル失敗`);
  process.exit(1);
}
console.log(`[check-ts] ${blocks.length} ブロックすべて OK`);
