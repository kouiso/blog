import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fixtureClient, fixtureDryRun, runDryRun } from '../script/publish-dry-run.mjs';

const fixture = new URL('./publish-dry-run.fixture.json', import.meta.url);
const input = JSON.parse(readFileSync(fixture));
const domain = 'example.test';

test('dry-run executes the real gate, deletes only its duplicate, checks 404 and unchanged source', async () => {
  const client = fixtureClient(input.source);
  const result = await runDryRun({ ...input, sourceSlug: input.slug, domain, client });
  assert.equal(result.createdId, 101);
  assert.equal(result.gate.ok, false);
  assert.ok(result.gate.violations.some((v) => v.includes('字数不足')));
  assert.equal(result.deleted, true);
  assert.equal(result.notFound, true);
  assert.equal(result.unchanged, true);
  assert.equal(result.ok, true);
  assert.deepEqual(await client.getSource(), input.source);
  await assert.rejects(client.deleteDraft(input.source.id), /Only test drafts/);
});

test('gate exceptions still clean up; failed deletion and changed source fail visibly', async () => {
  const args = { ...input, sourceSlug: input.slug, domain };
  const client = fixtureClient(input.source);
  const result = await runDryRun({ ...args, client, gate: () => { throw new Error('Gate failed'); } });
  assert.equal(result.deleted, true);
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Gate failed');
  const failDelete = fixtureClient(input.source);
  failDelete.deleteDraft = async () => { throw new Error('Delete failed'); };
  const failed = await runDryRun({ ...args, client: failDelete });
  assert.equal(failed.ok, false);
  assert.equal(failed.cleanupError, 'Delete failed');
  const modified = fixtureClient(input.source);
  let reads = 0;
  modified.getSource = async () => ({ ...input.source, modified: reads++ ? 'changed' : input.source.modified });
  assert.equal((await runDryRun({ ...args, client: modified })).unchanged, false);
});

test('unsafe create response never deletes the original', async () => {
  const client = fixtureClient(input.source);
  client.createDraft = async () => input.source;
  client.deleteDraft = () => assert.fail('must not delete original');
  const result = await runDryRun({ ...input, sourceSlug: input.slug, domain, client });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'Unsafe draft response');
});

test('local fixture ignores kill-switch without network, and writes only isolated evidence', async (t) => {
  const base = mkdtempSync(resolve(tmpdir(), 'blog-dry-run-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  mkdirSync(resolve(base, 'site', domain), { recursive: true });
  writeFileSync(resolve(base, 'site', domain, 'profile.md'), '# Test');
  writeFileSync(resolve(base, 'kill-switch'), '');
  const result = await fixtureDryRun({ domain, fixture, base, now: new Date('2026-01-04T00:00:00Z') });
  assert.equal(result.ok, true);
  assert.match(result.path, /report\/fixture\/2026-01.md$/);
  assert.match(readFileSync(result.path, 'utf8'), /本番操作なし/);
});
