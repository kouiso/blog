// label-pr.test.mjs — ブランチ名・ファイルの場所からラベルを決める規則と、足すだけであることを検証
// 実行: node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { labelsFor, changedFiles, run } from '../script/gh/label-pr.mjs';

test('ブランチ名の頭でラベルが決まる（#14 の表）', () => {
  const cases = {
    'feature/x': 'feature', 'feat/x': 'feature',
    'bugfix/x': 'bugfix', 'fix/x': 'bugfix',
    'hotfix/x': 'hotfix',
    'chore/x': 'chore', 'refactor/x': 'chore',
    'docs/x': 'documentation',
    'release/x': 'release',
  };
  for (const [branch, label] of Object.entries(cases)) assert.deepEqual(labelsFor(branch, []), [label], branch);
});

test('ブランチ名の大文字小文字は区別しない', () => {
  assert.deepEqual(labelsFor('Feature/x', []), ['feature']);
});

test('頭が一致しないブランチ名には付けない', () => {
  assert.deepEqual(labelsFor('claude/fix-x', []), []);
  assert.deepEqual(labelsFor('features/x', []), []);
  assert.deepEqual(labelsFor(undefined, []), []);
});

test('ファイルの場所でラベルが決まる', () => {
  assert.deepEqual(labelsFor('x', ['doc/routines.md']), ['documentation']);
  assert.deepEqual(labelsFor('x', ['README.md', 'AGENTS.md']), ['documentation']);
  assert.deepEqual(labelsFor('x', ['.github/workflows/a.yml']), ['config']);
  assert.deepEqual(labelsFor('x', ['setup.sh', '.gitignore']), ['config']);
  assert.deepEqual(labelsFor('x', ['site/programming-life.net/profile.md']), ['site']);
  assert.deepEqual(labelsFor('x', ['script/quality-gate.mjs']), ['script']);
  assert.deepEqual(labelsFor('x', ['test/a.test.mjs']), ['test']);
  assert.deepEqual(labelsFor('x', ['.claude/skills/blog-draft/SKILL.md']), ['skill']);
  assert.deepEqual(labelsFor('x', ['.mcp.json.example']), ['config']);
});

test('site の中の .md は documentation にしない', () => {
  assert.deepEqual(labelsFor('x', ['site/a/voice.md']), ['site']);
});

test('ブランチとファイルの両方から、重ならずに付ける', () => {
  assert.deepEqual(labelsFor('docs/x', ['doc/a.md', 'script/b.mjs']), ['documentation', 'script']);
});

const pages = (n) => Array.from({ length: n }, (_, i) => ({ filename: `script/f${i}.mjs` }));

test('変わったファイルを 100 件ずつ全部読む', async () => {
  const asked = [];
  const call = async (m, path) => {
    asked.push(path);
    return path.endsWith('page=1') ? pages(100) : [{ filename: 'doc/x.md', previous_filename: 'doc/old.md' }];
  };
  const files = await changedFiles('o/r', 5, call);
  assert.equal(files.length, 102);
  assert.deepEqual(asked, ['/repos/o/r/pulls/5/files?per_page=100&page=1', '/repos/o/r/pulls/5/files?per_page=100&page=2']);
});

const event = (ref, labels = []) => ({
  pull_request: { number: 5, head: { ref }, labels: labels.map((name) => ({ name })) },
  repository: { full_name: 'o/r' },
});

test('無いラベルだけを足す（既にあるものは消さない・送らない）', async () => {
  const calls = [];
  const call = async (m, path, body) => {
    calls.push([m, path, body]);
    return m === 'GET' ? [{ filename: 'test/a.test.mjs' }] : null;
  };
  assert.equal(await run(event('feat/x', ['feature', 'wip']), call), 'labeled: #5 + test');
  assert.deepEqual(calls.at(-1), ['POST', '/repos/o/r/issues/5/labels', { labels: ['test'] }]);
});

test('足すものが無ければ POST しない', async () => {
  let posted = 0;
  const call = async (m) => { if (m === 'POST') posted++; return []; };
  assert.equal(await run(event('claude/x'), call), 'skip: 足すラベルなし');
  assert.equal(posted, 0);
});

test('ファイルの取得は 30 ページ（3000 件）で止まる', async () => {
  let n = 0;
  const call = async () => { n++; return pages(100); };
  const files = await changedFiles('o/r', 5, call);
  assert.equal(n, 30);
  assert.equal(files.length, 3000);
});

test('API が失敗したら例外を投げる（段は赤になる）', async () => {
  const call = async () => { throw new Error('GET → 500'); };
  await assert.rejects(run(event('feat/x'), call), /500/);
});
