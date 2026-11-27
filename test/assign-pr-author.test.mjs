// assign-pr-author.test.mjs — PR の作成者を担当者にする判定を検証
// 実行: node --test test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../script/gh/assign-pr-author.mjs';
import { isBot } from '../script/gh/rest.mjs';

const ev = (user, assignees = []) => ({
  pull_request: { number: 7, user, assignees },
  repository: { full_name: 'o/r' },
});
const recorder = () => {
  const calls = [];
  return { calls, call: async (...a) => { calls.push(a); } };
};

test('作った人を担当者にする', async () => {
  const { calls, call } = recorder();
  assert.equal(await run(ev({ login: 'alice', type: 'User' }), call), 'assigned: #7 → alice');
  assert.deepEqual(calls, [['POST', '/repos/o/r/issues/7/assignees', { assignees: ['alice'] }]]);
});

test('既に担当者なら呼ばない', async () => {
  const { calls, call } = recorder();
  const u = { login: 'alice', type: 'User' };
  assert.equal(await run(ev(u, [u]), call), 'skip: 担当者に設定済み');
  assert.equal(calls.length, 0);
});

test('ほかの人が担当者でも、作った人を足す（外さない）', async () => {
  const { calls, call } = recorder();
  await run(ev({ login: 'alice', type: 'User' }, [{ login: 'bob' }]), call);
  assert.deepEqual(calls[0][2], { assignees: ['alice'] });
});

test('ボットの PR は対象外', async () => {
  const { calls, call } = recorder();
  assert.match(await run(ev({ login: 'dependabot[bot]', type: 'Bot' }), call), /^skip: ボット/);
  assert.match(await run(ev({ login: 'devin-ai-integration[bot]', type: 'User' }), call), /^skip: ボット/);
  assert.equal(calls.length, 0);
});

test('isBot は type と [bot] の両方で見分ける', () => {
  assert.equal(isBot({ login: 'x', type: 'Bot' }), true);
  assert.equal(isBot({ login: 'x[bot]', type: 'User' }), true);
  assert.equal(isBot({ login: 'kouiso', type: 'User' }), false);
  assert.equal(isBot(null), false);
});
