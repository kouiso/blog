import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export const root = fileURLToPath(new URL('../', import.meta.url));

export function sitePath(domain, base = root) {
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(domain)) throw new Error('Invalid domain');
  const site = resolve(base, 'site', domain);
  if (!existsSync(resolve(site, 'profile.md'))) throw new Error('Site profile not found');
  return site;
}

export function loadEnv(base = root) {
  const path = resolve(base, '.env');
  return { ...(existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {}), ...process.env };
}

export async function requestJson(url, options = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Analytics API HTTP ${response.status}`);
  try { return await response.json(); } catch { throw new Error('Analytics API returned invalid JSON'); }
}

export function dateString(date) {
  return date.toISOString().slice(0, 10);
}

export function validDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.valueOf()) || dateString(date) !== value)
    throw new Error('Invalid date');
  return date;
}
