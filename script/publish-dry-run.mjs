#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { runGate } from './quality-gate.mjs';
import { root, sitePath, validDate } from './analytics-common.mjs';
import { weekName } from './generate-report.mjs';

export async function runDryRun({ client, sourceSlug, md, domain, postIndex, gate = runGate }) {
  const source = await client.getSource(sourceSlug);
  if (!Number.isSafeInteger(source.id) || !source.content?.raw || !source.modified) throw new Error('Invalid source post');
  const title = `[dry-run] ${source.title.raw}`;
  const slug = `${sourceSlug}-dry-run`;
  let draftId;
  const result = { sourceId: source.id, gate: '未実行', deleted: false, notFound: false, unchanged: false };
  try {
    const draft = await client.createDraft({ status: 'draft', title, slug, content: source.content.raw });
    if (!Number.isSafeInteger(draft.id) || draft.id === source.id || draft.status !== 'draft') throw new Error('Unsafe draft response');
    draftId = draft.id;
    result.createdId = draftId;
    const draftPost = await client.getPost(draftId);
    if (draftPost.status !== 'draft' || draftPost.content.raw !== source.content.raw) throw new Error('Draft content mismatch');
    result.gate = await gate({ md, html: draftPost.content.raw, slug, title, domain, postIndex });
  } catch (error) {
    result.error = error.message;
  } finally {
    if (draftId !== undefined) {
      try {
        result.deleted = (await client.deleteDraft(draftId)).deleted === true;
        try { await client.getPost(draftId); } catch (error) { if (error.status === 404) result.notFound = true; else throw error; }
      } catch (error) { result.cleanupError = error.message; }
    }
    const after = await client.getSource(sourceSlug);
    result.unchanged = after.id === source.id && after.modified === source.modified && after.content.raw === source.content.raw;
  }
  result.ok = Boolean(draftId && result.deleted && result.notFound && result.unchanged && !result.error && !result.cleanupError);
  return result;
}

export function fixtureClient(source) {
  const posts = new Map([[source.id, structuredClone(source)]]);
  let nextId = source.id + 1;
  return {
    async getSource() { return structuredClone(posts.get(source.id)); },
    async createDraft(input) {
      const post = { id: nextId++, status: input.status, title: { raw: input.title }, content: { raw: input.content }, modified: source.modified };
      posts.set(post.id, post);
      return structuredClone(post);
    },
    async getPost(id) {
      if (!posts.has(id)) throw Object.assign(new Error('Not found'), { status: 404 });
      return structuredClone(posts.get(id));
    },
    async deleteDraft(id) {
      if (id === source.id || posts.get(id)?.status !== 'draft') throw new Error('Only test drafts may be deleted');
      return { deleted: posts.delete(id) };
    },
  };
}

export async function fixtureDryRun({ domain, fixture, base = root, now = new Date() }) {
  const site = sitePath(domain, base);
  const input = JSON.parse(readFileSync(fixture, 'utf8'));
  const result = await runDryRun({ client: fixtureClient(input.source), sourceSlug: input.slug, md: input.md,
    domain, postIndex: input.postIndex });
  const dir = resolve(site, 'report/fixture');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${weekName(now)}.md`);
  const line = `${now.toISOString()} fixture dry-run（本番操作なし）: ${JSON.stringify(result)}\n`;
  writeFileSync(path, line, { flag: 'a' });
  return { path, ...result };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: { fixture: { type: 'string' }, date: { type: 'string' } } });
    if (positionals.length !== 1 || !values.fixture) throw new Error('usage: node script/publish-dry-run.mjs <domain> --fixture <json> [--date YYYY-MM-DD] (本番通信なし)');
    const result = await fixtureDryRun({ domain: positionals[0], fixture: values.fixture, now: values.date ? validDate(values.date) : new Date() });
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
