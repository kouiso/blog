#!/usr/bin/env node
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { dateString, loadEnv, requestJson, root, sitePath, validDate } from './analytics-common.mjs';

export function validateClarity(data) {
  if (!Array.isArray(data) || !data.every((metric) => typeof metric.metricName === 'string' && Array.isArray(metric.information)))
    throw new Error('Invalid Clarity response');
  return data;
}

export async function fetchClarity({ domain, base = root, env = loadEnv(base), fixture, now = new Date(), fetchImpl = fetch }) {
  const site = sitePath(domain, base);
  if (!fixture && !env.CLARITY_API_TOKEN) return { skipped: true, message: 'CLARITY_API_TOKEN 未取得' };
  const data = validateClarity(fixture ? JSON.parse(readFileSync(fixture, 'utf8')) : await requestJson(
    'https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1&dimension1=URL',
    { headers: { Authorization: `Bearer ${env.CLARITY_API_TOKEN}` } }, fetchImpl));
  const dir = resolve(site, fixture ? 'analytics/clarity-fixture' : 'analytics/clarity');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${dateString(now)}.json`);
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify({ capturedAt: now.toISOString(), fixture: Boolean(fixture), numOfDays: 1, data }, null, 2) + '\n');
  renameSync(temp, path);
  return { path, data };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: { fixture: { type: 'string' }, date: { type: 'string' } } });
    if (positionals.length !== 1) throw new Error('usage: node script/fetch-clarity.mjs <domain> [--fixture <json>] [--date YYYY-MM-DD]');
    if (values.date && !values.fixture) throw new Error('--date requires --fixture');
    const result = await fetchClarity({ domain: positionals[0], fixture: values.fixture, now: values.date ? validDate(values.date) : new Date() });
    console.log(result.message ?? result.path);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
