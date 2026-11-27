// fix-issue-headings.test.mjs — 見出しの段を直す規則と、変わらない時に書き換えないことを検証
// 実行: node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixHeadings, run } from '../script/gh/fix-issue-headings.mjs';

test('フォームの本文（### から始まる）は全体を1段上げる', () => {
  assert.equal(fixHeadings('### 背景\n本文\n#### 細目\n##### 孫'), '## 背景\n本文\n### 細目\n#### 孫');
});

test('手で ## から書いた本文は段の関係を壊さない', () => {
  const s = '## 背景\n### 細目\n#### 孫';
  assert.equal(fixHeadings(s), s);
});

test('見出しの無い本文・文中の # はそのまま', () => {
  const s = '文中の ### は見出しではない\n#タグ';
  assert.equal(fixHeadings(s), s);
});

test('見出しだけの行（中身なし）も直す', () => {
  assert.equal(fixHeadings('###\n'), '##\n');
});

test('コードブロックの中は触らず、段の判定にも使わない', () => {
  const s = '```md\n## 例\n### 例\n```\n### 外\n~~~\n#### 例2\n~~~';
  assert.equal(fixHeadings(s), '```md\n## 例\n### 例\n```\n## 外\n~~~\n#### 例2\n~~~');
});

test('ブロックの中の ```js は閉じとみなさない', () => {
  assert.equal(fixHeadings('```\n```js\n### in\n```\n### out'), '```\n```js\n### in\n```\n## out');
});

test('info に ` を含む行はコードブロックの始まりではない', () => {
  assert.equal(fixHeadings('``` a`b\n### 見出し'), '``` a`b\n## 見出し');
});

test('閉じていないコードブロックの後ろは触らない', () => {
  const s = '### 外\n```\n### 中';
  assert.equal(fixHeadings(s), '## 外\n```\n### 中');
});

test('HTML コメントの中の見出しも同じように上がる', () => {
  assert.equal(fixHeadings('<!--\n### c\n-->\n### d'), '<!--\n## c\n-->\n## d');
});

test('引用の中の見出しは対象外', () => {
  assert.equal(fixHeadings('### a\n> ### q'), '## a\n> ### q');
});

test('CRLF の本文も直す', () => {
  assert.equal(fixHeadings('### 背景\r\n本文\r\n###\r\n'), '## 背景\r\n本文\r\n##\r\n');
});

test('空や null はそのまま返す', () => {
  assert.equal(fixHeadings(''), '');
  assert.equal(fixHeadings(null), null);
});

const event = { issue: { number: 3, body: '### 古い本文' }, repository: { full_name: 'o/r' } };
const fake = (liveBody) => {
  const calls = [];
  const call = async (method, path, body) => {
    calls.push([method, path, body]);
    return method === 'GET' ? { body: liveBody } : null;
  };
  return { calls, call };
};

test('今の本文を読み直して、それを直す（作成直後の書き直しを消さない）', async () => {
  const { calls, call } = fake('### 書き直した本文');
  assert.equal(await run(event, call), 'fixed: #3');
  assert.deepEqual(calls, [
    ['GET', '/repos/o/r/issues/3', undefined],
    ['PATCH', '/repos/o/r/issues/3', { body: '## 書き直した本文' }],
  ]);
});

test('変わらない時は PATCH を呼ばない', async () => {
  const { calls, call } = fake('## 背景');
  assert.equal(await run(event, call), 'skip: 変更なし');
  assert.equal(calls.filter((c) => c[0] === 'PATCH').length, 0);
});

test('PR のイベントは対象外', async () => {
  const e = { issue: { number: 1, body: '### a', pull_request: {} }, repository: { full_name: 'o/r' } };
  assert.equal(await run(e, async () => { throw new Error('呼ばれた'); }), 'skip: issue ではない');
});
