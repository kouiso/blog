import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { generateKeyPairSync, verify } from 'node:crypto';
import { fetchClarity } from '../script/fetch-clarity.mjs';
import { sitePath, validDate, requestJson } from '../script/analytics-common.mjs';
import { comparePages, generateReport, periods, renderReport, summarizeClarity, updateBacklog, weekName } from '../script/generate-report.mjs';

const domain = 'example.test';
const clarity = [
  { metricName: 'Traffic', information: [{ URL: `https://${domain}/typescript-demo/`, totalSessionCount: '20' }] },
  { metricName: 'ScrollDepth', information: [{ URL: `https://${domain}/typescript-demo/`, averageScrollDepth: 40 }] },
  { metricName: 'DeadClickCount', information: [{ URL: `https://${domain}/typescript-demo/`, sessionsWithMetricPercentage: 10 }] },
  { metricName: 'RageClickCount', information: [{ URL: `https://${domain}/typescript-demo/`, sessionsWithMetricPercentage: 2 }] },
];
const data = {
  ga4: {
    previous: [{ page: '/typescript-demo/', sessions: 100, engagementRate: 0.7, averageSessionDuration: 90 }],
    current: [{ page: '/typescript-demo/', sessions: 80, engagementRate: 0.3, averageSessionDuration: 60 }],
  },
  gsc: {
    previous: [{ page: `https://${domain}/typescript-demo/`, position: 8, impressions: 1000, clicks: 40, ctr: 0.04 }],
    current: [{ page: `https://${domain}/typescript-demo/`, position: 11, impressions: 800, clicks: 20, ctr: 0.025 }],
  },
  clarity: [{ data: clarity }],
};

function sandbox(t) {
  const base = mkdtempSync(resolve(tmpdir(), 'blog-analytics-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const site = resolve(base, 'site', domain);
  mkdirSync(resolve(site, 'keyword'), { recursive: true });
  writeFileSync(resolve(site, 'profile.md'), '# Test site');
  writeFileSync(resolve(site, 'keyword/backlog.yaml'), 'keywords:\n');
  writeFileSync(resolve(site, 'post-index.json'), JSON.stringify([{ slug: 'typescript-demo', title: 'Example article' }]));
  const fixture = resolve(base, 'fixture.json');
  writeFileSync(fixture, JSON.stringify(data));
  return { base, site, fixture };
}

test('Clarity: missing token skips without a network request or output', async (t) => {
  const { base, site } = sandbox(t);
  const result = await fetchClarity({ domain, base, env: {}, fetchImpl: () => assert.fail('network') });
  assert.equal(result.message, 'CLARITY_API_TOKEN 未取得');
  assert.equal(readdirSync(site).includes('analytics'), false);
});

test('Clarity: daily atomic overwrite and URL dimension; fixture is isolated', async (t) => {
  const { base, site } = sandbox(t);
  let calls = 0;
  const fetchImpl = async (url, options) => {
    calls++;
    assert.match(url, /numOfDays=1&dimension1=URL/);
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => clarity };
  };
  const opts = { domain, base, env: { CLARITY_API_TOKEN: 'test-only' }, now: validDate('2026-01-04'), fetchImpl };
  const first = await fetchClarity(opts);
  await fetchClarity(opts);
  assert.equal(calls, 2);
  assert.deepEqual(readdirSync(resolve(site, 'analytics/clarity')), ['2026-01-04.json']);
  assert.deepEqual(JSON.parse(readFileSync(first.path)).data, clarity);
  const fixture = resolve(base, 'clarity.json');
  writeFileSync(fixture, JSON.stringify(clarity));
  const result = await fetchClarity({ ...opts, fixture, fetchImpl: () => assert.fail('network') });
  assert.match(result.path, /clarity-fixture/);
  assert.equal(JSON.parse(readFileSync(result.path)).fixture, true);
});

test('Clarity: API failures and malformed responses do not write files or leak response bodies', async (t) => {
  const { base } = sandbox(t);
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(fetchClarity({ domain, base, env: { CLARITY_API_TOKEN: 'test-only' },
      fetchImpl: async () => ({ ok: false, status }) }), new RegExp(`HTTP ${status}`));
  }
  await assert.rejects(fetchClarity({ domain, base, env: { CLARITY_API_TOKEN: 'test-only' },
    fetchImpl: async () => ({ ok: true, json: async () => ({ error: 'bad' }) }) }), /Invalid Clarity/);
});

test('date ranges and ISO weeks include year boundaries; invalid paths and dates fail', () => {
  assert.equal(weekName(validDate('2021-01-01')), '2020-53');
  assert.equal(weekName(validDate('2026-01-04')), '2026-01');
  assert.deepEqual(periods(validDate('2026-01-04')), {
    current: { startDate: '2025-12-29', endDate: '2026-01-04' },
    previous: { startDate: '2025-12-22', endDate: '2025-12-28' },
  });
  assert.throws(() => validDate('2026-02-30'));
  assert.throws(() => sitePath('../outside'));
});

test('report compares page aliases, declines, and zero baselines without invented values', () => {
  const [page] = comparePages(data, domain);
  assert.equal(page.sessionChange, -0.2);
  assert.equal(page.positionDelta, 3);
  assert.equal(page.rewrite, true);
  assert.equal(comparePages({ ga4: { previous: [{ page: '/new', sessions: 0 }], current: [{ page: '/new', sessions: 10, engagementRate: 0.7 }] } }, domain)[0].sessionChange, null);
  assert.equal(comparePages({ gsc: { current: [{ page: 'https://other.test/x' }] } }, domain).length, 0);
  const report = renderReport({ domain, end: validDate('2026-01-04'), data, clarity: data.clarity, fixture: true });
  for (const heading of ['伸びた記事 / 落ちた記事', '直帰・スクロール深度で怪しい記事', 'リライト候補', '今週の決定と次の一手']) assert.ok(report.includes(heading));
  assert.match(report, /-20.00%/);
  assert.match(report, /fixture・本番値ではありません/);
  assert.equal(summarizeClarity(data.clarity).find((m) => m.key === 'Traffic/totalSessionCount').average, 20);
});

test('fixture report is isolated, blocks backlog writes, and makes no network calls', async (t) => {
  const { base, fixture, site } = sandbox(t);
  const path = await generateReport({ domain, base, fixture, end: validDate('2026-01-04'), fetchImpl: () => assert.fail('network') });
  assert.equal(path, resolve(site, 'report/fixture/2026-01.md'));
  assert.match(readFileSync(path, 'utf8'), /Clarity 1日分/);
  await assert.rejects(generateReport({ domain, base, fixture, update: true }), /cannot update/);
  assert.equal(readFileSync(resolve(site, 'keyword/backlog.yaml'), 'utf8'), 'keywords:\n');
});

test('page aliases aggregate rather than overwrite; GSC position is impression weighted', () => {
  const alias = structuredClone(data);
  alias.ga4.current.push({ page: '/typescript-demo', sessions: 20, engagementRate: 0.8, averageSessionDuration: 120 });
  alias.gsc.current.push({ page: `https://${domain}/typescript-demo/?ref=test`, position: 6, impressions: 200, clicks: 10, ctr: 0.05 });
  const [page] = comparePages(alias, domain);
  assert.equal(page.current.ga4.sessions, 100);
  assert.equal(page.current.ga4.engagementRate, 0.4);
  assert.equal(page.current.ga4.averageSessionDuration, 72);
  assert.equal(page.current.gsc.impressions, 1000);
  assert.equal(page.current.gsc.ctr, 0.03);
  assert.equal(page.current.gsc.position, 10);
  assert.equal(page.sessionChange, 0);
});

test('Clarity report preserves live Url rows and legacy URL rows without averaging URL dimensions', () => {
  const snapshots = [{ data: [{ metricName: 'ScrollDepth', information: [
    { Url: `https://${domain}/live/`, averageScrollDepth: 40 },
    { URL: `https://${domain}/legacy/`, averageScrollDepth: 60 },
    { Url: null, averageScrollDepth: 20 },
  ] }] }];
  const report = renderReport({ domain, end: validDate('2026-01-04'), data, clarity: snapshots });
  assert.match(report, /https:\/\/example\.test\/live\/ \/ ScrollDepth/);
  assert.match(report, /https:\/\/example\.test\/legacy\/ \/ ScrollDepth/);
  assert.equal(report.split('\n').filter((line) => line.includes(' / ScrollDepth')).length, 2);
  assert.deepEqual(summarizeClarity(snapshots), [{ key: 'ScrollDepth/averageScrollDepth', average: 40 }]);
});

test('backlog adds known rewrite candidates once and preserves existing content', (t) => {
  const { site } = sandbox(t);
  const path = resolve(site, 'keyword/backlog.yaml');
  const index = JSON.parse(readFileSync(resolve(site, 'post-index.json')));
  updateBacklog(path, comparePages(data, domain), validDate('2026-01-04'), index);
  const first = readFileSync(path, 'utf8');
  assert.match(first, /source: rewrite/);
  updateBacklog(path, comparePages(data, domain), validDate('2026-01-04'), index);
  assert.equal(readFileSync(path, 'utf8'), first);
});

test('Google OAuth reports paginate GA4 and query GSC for both periods', async (t) => {
  const { base } = sandbox(t);
  const requests = [];
  const fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body);
    requests.push({ url, body });
    assert.equal(opts.headers.Authorization, 'Bearer test-only');
    const data = url.includes('analyticsdata') ? { rowCount: 2, rows: [{ dimensionValues: [{ value: `/page-${body.offset}` }],
      metricValues: [{ value: '10' }, { value: '0.5' }, { value: '60' }] }] } :
      { rows: [{ keys: [`https://${domain}/page-0`], clicks: 1, impressions: 10, ctr: 0.1, position: 9 }] };
    return { ok: true, json: async () => data };
  };
  const path = await generateReport({ domain, base, end: validDate('2026-01-04'), fetchImpl,
    env: { GOOGLE_ACCESS_TOKEN: 'test-only', GA4_PROPERTY_ID: '123', GSC_SITE_URL: `https://${domain}/` } });
  assert.equal(requests.length, 6);
  assert.deepEqual(requests[0].body.dateRanges, [{ startDate: '2025-12-29', endDate: '2026-01-04' }]);
  assert.match(readFileSync(path, 'utf8'), /10→10/);
});

test('missing credentials are explicit, and only current-window live Clarity is used', async (t) => {
  const { base, site } = sandbox(t);
  mkdirSync(resolve(site, 'analytics/clarity'), { recursive: true });
  for (const [date, fixture] of [['2026-01-04', false], ['2026-01-03', true], ['2025-12-01', false]])
    writeFileSync(resolve(site, `analytics/clarity/${date}.json`), JSON.stringify({ fixture, data: clarity }));
  const path = await generateReport({ domain, base, end: validDate('2026-01-04'), env: {}, fetchImpl: () => assert.fail('network') });
  const report = readFileSync(path, 'utf8');
  assert.match(report, /Google 認証未取得/);
  assert.match(report, /Clarity 1日分/);
  assert.doesNotMatch(report, /20→/);
});

test('CLI rejects unsafe dates and exits successfully when token is absent', () => {
  const env = { ...process.env, CLARITY_API_TOKEN: '' };
  const result = execFileSync(process.execPath, ['script/fetch-clarity.mjs', 'programming-life.net'], { env, encoding: 'utf8' });
  assert.match(result, /CLARITY_API_TOKEN 未取得/);
  const invalid = spawnSync(process.execPath, ['script/fetch-clarity.mjs', 'programming-life.net', '--date', '2026-01-04'], { env });
  assert.equal(invalid.status, 1);
});

test('existing Google key uses signed read-only JWT; bad API JSON is redacted', async (t) => {
  const { base } = sandbox(t);
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const path = resolve(base, 'local-key.json');
  writeFileSync(path, JSON.stringify({ client_email: 'test@example.test', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }));
  let exchanges = 0;
  const fetchImpl = async (url, opts) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      exchanges++;
      const jwt = opts.body.get('assertion');
      const [header, payload, signature] = jwt.split('.');
      assert.equal(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), publicKey, Buffer.from(signature, 'base64url')), true);
      const claims = JSON.parse(Buffer.from(payload, 'base64url'));
      assert.match(claims.scope, /analytics.readonly/);
      assert.match(claims.scope, /webmasters.readonly/);
      assert.equal(claims.aud, url);
      return { ok: true, json: async () => ({ access_token: 'test-only' }) };
    }
    return { ok: true, json: async () => ({ rows: [] }) };
  };
  await generateReport({ domain, base, env: { GOOGLE_SERVICE_ACCOUNT_JSON: path, GA4_PROPERTY_ID: '123' }, fetchImpl });
  assert.equal(exchanges, 1);
  writeFileSync(path, '{ private credential');
  await assert.rejects(generateReport({ domain, base, env: { GOOGLE_SERVICE_ACCOUNT_JSON: path } }), /^Error: Google credentials could not be read$/);
  await assert.rejects(requestJson('https://example.test', {}, async () => ({ ok: true, json: async () => { throw new Error('private response'); } })), /^Error: Analytics API returned invalid JSON$/);
});
