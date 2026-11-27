// fix-issue-headings.test.mjs — 見出しの段を直す規則と、変わらない時に呼ばないことを検証
// 実行: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixHeadings, run } from '../script/gh/fix-issue-headings.mjs';

test('### は ## に、#### は ### になる', () => {
  assert.equal(fixHeadings('### 背景\n本文\n#### 細目'), '## 背景\n本文\n### 細目');
});

test('##・#####・本文中の # は変えない', () => {
  const s = '## 既に浅い\n##### 深い\n文中の ### は見出しではない\n#タグ';
  assert.equal(fixHeadings(s), s);
});

test('見出しだけの行（中身なし）も直す', () => {
  assert.equal(fixHeadings('###\n'), '##\n');
});

test('コードブロックの中は触らない', () => {
  const s = '```md\n### 例\n```\n### 外\n~~~\n#### 例2\n~~~';
  assert.equal(fixHeadings(s), '```md\n### 例\n```\n## 外\n~~~\n#### 例2\n~~~');
});

test('CRLF の本文も直す', () => {
  assert.equal(fixHeadings('### 背景\r\n本文'), '## 背景\r\n本文');
});

test('空や null はそのまま返す', () => {
  assert.equal(fixHeadings(''), '');
  assert.equal(fixHeadings(null), null);
});

const event = (body) => ({ issue: { number: 3, body }, repository: { full_name: 'o/r' } });

test('変わる時だけ PATCH を1回呼ぶ', async () => {
  const calls = [];
  const call = async (...a) => { calls.push(a); };
  assert.equal(await run(event('### 背景'), call), 'fixed: #3');
  assert.deepEqual(calls, [['PATCH', '/repos/o/r/issues/3', { body: '## 背景' }]]);
});

test('変わらない時は API を呼ばない', async () => {
  let n = 0;
  assert.equal(await run(event('## 背景'), async () => { n++; }), 'skip: 変更なし');
  assert.equal(n, 0);
});

test('PR のイベントは対象外', async () => {
  const e = { issue: { number: 1, body: '### a', pull_request: {} }, repository: { full_name: 'o/r' } };
  assert.equal(await run(e, async () => { throw new Error('呼ばれた'); }), 'skip: issue ではない');
});
