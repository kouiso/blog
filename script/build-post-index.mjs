#!/usr/bin/env node
// build-post-index.mjs — 公開記事の slug/title/link を索引化して site/<domain>/post-index.json を生成する
//
// 使い方:
//   node script/build-post-index.mjs [domain]
//   （認証情報は .env / .mcp.json から読む。引数省略時は site/ 直下の全ドメイン）
//
// 出力: site/<domain>/post-index.json
//   [{ slug, title, url, date, modified, categories: [slug...] }]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const env = { ...process.env };
  if (existsSync(join(root, '.env'))) {
    for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)="?([^"\n]*)"?/);
      if (m && env[m[1]] === undefined) env[m[1]] = m[2];
    }
  }
  if (existsSync(join(root, '.mcp.json'))) {
    const mcp = JSON.parse(readFileSync(join(root, '.mcp.json'), 'utf8'));
    const w = mcp.mcpServers?.['wordpress-programming-life']?.env ?? {};
    env.WP_USER ??= w.WORDPRESS_USERNAME;
    env.WP_APP_PASSWORD ??= w.WORDPRESS_APP_PASSWORD;
  }
  return env;
}

const env = loadEnv();
if (!env.WP_USER || !env.WP_APP_PASSWORD) {
  console.error('[build-post-index] WP_USER / WP_APP_PASSWORD が未設定。先に setup.sh を実行すること。');
  process.exit(1);
}

const auth = 'Basic ' + Buffer.from(`${env.WP_USER}:${env.WP_APP_PASSWORD}`).toString('base64');

async function fetchAll(baseUrl, path, fields) {
  const out = [];
  for (let page = 1; ; page++) {
    const url = `${baseUrl}/wp-json/wp/v2/${path}?per_page=100&page=${page}&context=edit&_fields=${fields}`;
    const res = await fetch(url, { headers: { Authorization: auth } });
    if (res.status === 400) break; // ページ末端
    if (!res.ok) throw new Error(`${path} page ${page}: HTTP ${res.status}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
}

async function build(domain) {
  const baseUrl = `https://${domain}`;
  const cats = await fetchAll(baseUrl, 'categories', 'id,slug,name');
  const catById = Object.fromEntries(cats.map((c) => [c.id, c.slug]));
  const posts = await fetchAll(baseUrl, 'posts', 'slug,title,link,date,modified,categories');
  const index = posts
    .map((p) => ({
      slug: p.slug,
      title: p.title.raw ?? p.title.rendered,
      url: p.link,
      date: p.date.slice(0, 10),
      modified: p.modified.slice(0, 10),
      categories: p.categories.map((id) => catById[id]).filter(Boolean),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const out = join(root, 'site', domain, 'post-index.json');
  writeFileSync(out, JSON.stringify(index, null, 2) + '\n');
  console.log(`[build-post-index] ${domain}: ${index.length} posts -> ${out}`);
}

const domains = process.argv[2]
  ? [process.argv[2]]
  : readdirSync(join(root, 'site'), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

for (const d of domains) await build(d);
