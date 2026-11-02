#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createSign } from 'node:crypto';
import { dateString, loadEnv, requestJson, root, sitePath, validDate } from './analytics-common.mjs';
import { validateClarity } from './fetch-clarity.mjs';

export function periods(end) {
  const offset = (n) => dateString(new Date(end.valueOf() - n * 86400000));
  return { current: { startDate: offset(6), endDate: offset(0) }, previous: { startDate: offset(13), endDate: offset(7) } };
}

export function weekName(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  return `${year}-${String(Math.ceil((((d - new Date(Date.UTC(year, 0, 1))) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

async function googleToken(env, fetchImpl) {
  if (env.GOOGLE_ACCESS_TOKEN) return env.GOOGLE_ACCESS_TOKEN;
  if (!env.GOOGLE_SERVICE_ACCOUNT_JSON) return null;
  let key;
  try { key = JSON.parse(readFileSync(env.GOOGLE_SERVICE_ACCOUNT_JSON, 'utf8')); }
  catch { throw new Error('Google credentials could not be read'); }
  const encode = (data) => Buffer.from(JSON.stringify(data)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(payload).sign(key.private_key, 'base64url');
  const result = await requestJson('https://oauth2.googleapis.com/token', { method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${payload}.${signature}` }) }, fetchImpl);
  if (!result.access_token) throw new Error('Google access token missing');
  return result.access_token;
}

async function googleData(env, dates, fetchImpl) {
  const missing = [];
  const token = await googleToken(env, fetchImpl);
  const result = { ga4: {}, gsc: {}, missing };
  if (!token) { missing.push('Google 認証未取得'); return result; }
  if (env.GA4_PROPERTY_ID && !/^\d+$/.test(env.GA4_PROPERTY_ID)) throw new Error('GA4_PROPERTY_ID must be numeric');
  for (const [period, range] of Object.entries(dates)) {
    if (env.GA4_PROPERTY_ID) {
      const rows = [];
      let offset = 0;
      while (true) {
        const data = await requestJson(`https://analyticsdata.googleapis.com/v1beta/properties/${env.GA4_PROPERTY_ID}:runReport`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateRanges: [range], dimensions: [{ name: 'pagePath' }],
            metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }], limit: 10000, offset }),
        }, fetchImpl);
        rows.push(...(data.rows ?? []));
        offset = rows.length;
        if (!data.rows?.length || offset >= Number(data.rowCount ?? offset)) break;
      }
      result.ga4[period] = rows.map((row) => ({ page: row.dimensionValues[0].value,
        sessions: Number(row.metricValues[0].value), engagementRate: Number(row.metricValues[1].value),
        averageSessionDuration: Number(row.metricValues[2].value) }));
    }
    if (env.GSC_SITE_URL) {
      const rows = [];
      while (true) {
        const data = await requestJson(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(env.GSC_SITE_URL)}/searchAnalytics/query`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...range, dimensions: ['page'], rowLimit: 25000, startRow: rows.length }),
        }, fetchImpl);
        rows.push(...(data.rows ?? []));
        if ((data.rows?.length ?? 0) < 25000) break;
      }
      result.gsc[period] = rows.map((row) => ({ page: row.keys[0], impressions: row.impressions, clicks: row.clicks, ctr: row.ctr, position: row.position }));
    }
  }
  if (!env.GA4_PROPERTY_ID) missing.push('GA4_PROPERTY_ID 未設定');
  if (!env.GSC_SITE_URL) missing.push('GSC_SITE_URL 未設定');
  return result;
}

export function pagePath(value, domain) {
  const url = new URL(value, `https://${domain}`);
  if (url.hostname !== domain) return null;
  return url.pathname.replace(/\/$/, '') || '/';
}

export function comparePages(data, domain) {
  const pages = new Map();
  for (const source of ['ga4', 'gsc']) {
    for (const period of ['previous', 'current']) {
      for (const row of data[source]?.[period] ?? []) {
        const path = pagePath(row.page, domain);
        if (!path) continue;
        const page = pages.get(path) ?? { path, previous: {}, current: {} };
        const previous = page[period][source];
        if (!previous) page[period][source] = { ...row };
        else if (source === 'ga4') {
          const sessions = previous.sessions + row.sessions;
          page[period][source] = { page: path, sessions,
            engagementRate: sessions ? (previous.engagementRate * previous.sessions + row.engagementRate * row.sessions) / sessions : 0,
            averageSessionDuration: sessions ? (previous.averageSessionDuration * previous.sessions + row.averageSessionDuration * row.sessions) / sessions : 0 };
        } else {
          const impressions = previous.impressions + row.impressions;
          const clicks = previous.clicks + row.clicks;
          page[period][source] = { page: path, impressions, clicks, ctr: impressions ? clicks / impressions : 0,
            position: impressions ? (previous.position * previous.impressions + row.position * row.impressions) / impressions : 0 };
        }
        pages.set(path, page);
      }
    }
  }
  return [...pages.values()].map((page) => {
    const before = page.previous.ga4?.sessions;
    const after = page.current.ga4?.sessions;
    const positionDelta = page.current.gsc && page.previous.gsc ? page.current.gsc.position - page.previous.gsc.position : null;
    return { ...page, sessionChange: before > 0 && after !== undefined ? (after - before) / before : null,
      positionDelta, rewrite: (positionDelta !== null && positionDelta >= 2) || (after > 0 && page.current.ga4.engagementRate < 0.4) };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

export function summarizeClarity(snapshots) {
  const totals = new Map();
  for (const snapshot of snapshots) {
    for (const metric of validateClarity(snapshot.data)) {
      for (const row of metric.information) {
        for (const [field, value] of Object.entries(row)) {
          if (field === 'URL' || field === 'Url' || value === '' || !Number.isFinite(Number(value))) continue;
          const key = `${metric.metricName}/${field}`;
          const entry = totals.get(key) ?? { sum: 0, count: 0 };
          entry.sum += Number(value);
          entry.count++;
          totals.set(key, entry);
        }
      }
    }
  }
  return [...totals].map(([key, value]) => ({ key, average: value.sum / value.count }));
}

const cell = (value) => String(value ?? '未取得').replace(/[|\r\n]/g, ' ');
const number = (value) => value === null || value === undefined ? '未取得' : Number(value).toFixed(2);

export function renderReport({ domain, end, data, clarity = [], fixture = false }) {
  const pages = comparePages(data, domain);
  const dates = periods(end);
  const lines = [`# ${domain} 週次レポート ${weekName(end)}`, '',
    `${fixture ? '【fixture・本番値ではありません】 ' : ''}${dates.current.startDate}〜${dates.current.endDate}（前週 ${dates.previous.startDate}〜${dates.previous.endDate}）`,
    ...(data.missing ?? []).map((message) => `- ${message}`), '', '## 伸びた記事 / 落ちた記事',
    '| slug | sessions 前週→今週 | 前週比 | position 前週→今週（差） | engagementRate 前週→今週 | 平均滞在秒 | impressions 前週→今週 | clicks 前週→今週 | ctr 前週→今週 |',
    '|---|---|---|---|---|---|---|---|---|'];
  for (const p of pages) lines.push(`| ${cell(p.path)} | ${cell(p.previous.ga4?.sessions)}→${cell(p.current.ga4?.sessions)} | ${p.sessionChange === null ? '算出不可' : number(p.sessionChange * 100) + '%'} | ${number(p.previous.gsc?.position)}→${number(p.current.gsc?.position)}（${number(p.positionDelta)}） | ${number(p.previous.ga4?.engagementRate)}→${number(p.current.ga4?.engagementRate)} | ${number(p.current.ga4?.averageSessionDuration)} | ${cell(p.previous.gsc?.impressions)}→${cell(p.current.gsc?.impressions)} | ${cell(p.previous.gsc?.clicks)}→${cell(p.current.gsc?.clicks)} | ${number(p.previous.gsc?.ctr)}→${number(p.current.gsc?.ctr)} |`);
  lines.push('', '## 直帰・スクロール深度で怪しい記事',
    ...pages.filter((p) => p.current.ga4?.engagementRate < 0.4).map((p) => `- ${cell(p.path)}：低 engagement（${number(p.current.ga4.engagementRate)}）`),
    ...(clarity.length ? [`Clarity ${clarity.length}日分。各メトリクスは観測行の単純平均（週次ユニーク数ではありません）。`,
      ...summarizeClarity(clarity).map((m) => `- ${cell(m.key)}：${number(m.average)}`),
      ...clarity.flatMap((snapshot) => snapshot.data.flatMap((metric) => metric.information
        .filter((row) => row.Url || row.URL).map((row) => `- ${cell(row.Url || row.URL)} / ${cell(metric.metricName)}：${cell(JSON.stringify(row))}`)))] : ['Clarity 未取得']),
    '', '## リライト候補（順位下落・低 engagement）',
    ...pages.filter((p) => p.rewrite).map((p) => `- ${cell(p.path)}：順位下落または低 engagement`),
    '', '## 今週の決定と次の一手', pages.some((p) => p.rewrite) ? '候補の記事を確認し、見出しと冒頭の改善を検討する。' : 'データを継続取得し、次週の変化を確認する。', '');
  return lines.join('\n');
}

export function updateBacklog(path, pages, end, index) {
  let text = readFileSync(path, 'utf8');
  const existing = new Set([...text.matchAll(/^\s*- slug:\s*["']?([^\s"']+)/gm)].map((m) => m[1]));
  for (const page of pages.filter((p) => p.rewrite)) {
    const slug = page.path.replace(/^\//, '');
    const post = index.find((p) => p.slug === slug);
    if (existing.has(slug) || !post || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue;
    text += `\n  - slug: ${slug}\n    title: ${JSON.stringify(post.title + '（リライト）')}\n    category: ${JSON.stringify(post.categories?.[0] ?? '')}\n    intent: 既存記事の内容を改善する\n    source: rewrite\n    notes: 週次レポートで順位下落または低engagementを検出\n    added: ${dateString(end)}\n    status: queued\n`;
    existing.add(slug);
  }
  writeFileSync(path, text);
}

export async function generateReport({ domain, base = root, end = new Date(Date.now() - 86400000), fixture,
  env = loadEnv(base), fetchImpl = fetch, update = false }) {
  const site = sitePath(domain, base);
  if (fixture && update) throw new Error('Fixture cannot update production backlog');
  const data = fixture ? JSON.parse(readFileSync(fixture, 'utf8')) : await googleData(env, periods(end), fetchImpl);
  const dates = periods(end).current;
  const clarityDir = resolve(site, 'analytics/clarity');
  const clarity = fixture ? (data.clarity ?? []) : (existsSync(clarityDir) ? readdirSync(clarityDir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.json$/.test(name) && name.slice(0, 10) >= dates.startDate && name.slice(0, 10) <= dates.endDate)
    .map((name) => JSON.parse(readFileSync(resolve(clarityDir, name), 'utf8'))).filter((s) => !s.fixture) : []);
  const dir = resolve(site, fixture ? 'report/fixture' : 'report');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${weekName(end)}.md`);
  writeFileSync(path, renderReport({ domain, end, data, clarity, fixture: Boolean(fixture) }));
  if (update) updateBacklog(resolve(site, 'keyword/backlog.yaml'), comparePages(data, domain), end,
    JSON.parse(readFileSync(resolve(site, 'post-index.json'), 'utf8')));
  return path;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      fixture: { type: 'string' }, end: { type: 'string' }, 'update-backlog': { type: 'boolean' } } });
    if (positionals.length !== 1) throw new Error('usage: node script/generate-report.mjs <domain> [--fixture <json>] [--end YYYY-MM-DD] [--update-backlog]');
    console.log(await generateReport({ domain: positionals[0], fixture: values.fixture,
      ...(values.end ? { end: validDate(values.end) } : {}), update: values['update-backlog'] }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
