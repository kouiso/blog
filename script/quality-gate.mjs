#!/usr/bin/env node
// quality-gate.mjs — 公開前の必須ゲート。1つでも落ちたら公開しない。
//
// 使い方:
//   node script/quality-gate.mjs site/<domain>/draft/<slug>.md [--html <slug>.html] [--pillar]
//
// チェック: NG表現 / 常体混入 / 字数 / slug・タイトル重複 / 内部リンク死活・本数 /
//           コードコンパイル(ts) / まとめ・FAQ の closing 構造
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// voice.md「禁止カテゴリ」と同期させること（片方だけの更新はゲートの空洞化になる）
export const NG_PHRASES = [
  'することができます', 'これにより', 'と言えるでしょう', 'ではないでしょうか',
  'いかがでしたでしょうか', 'さまざまな場面で', '言うまでもありません', 'あらゆる観点から',
  'することは可能です', 'について言及', 'を実施します', 'に関しても同様です',
  '同様に', '残りも', '以下略', '簡単です',
];

// 常体・関西弁・命令形の混入検出（地の文対象。コードブロックは除外してから検査する）
export const TONE_PATTERNS = [
  /[。！？]?\s*(だ|だぞ|だろ|だった)[。！？\n]/,
  /(やで|やな|やねん|ちゃう|ワイ|ええわけ)/,
  /(書け|使え|確認しろ|実行しろ|開け|消せ)[。！？\n]/,
];

export const LIMITS = { normalMin: 3500, pillarMin: 12000, internalLinksMin: 3 };

function stripCode(md) {
  return md.replace(/```[\s\S]*?```/g, '');
}

export function lintNgPhrases(md) {
  const text = stripCode(md);
  return NG_PHRASES.filter((p) => text.includes(p)).map((p) => `NG表現: 「${p}」`);
}

export function lintTone(md) {
  const text = stripCode(md);
  const hits = [];
  for (const re of TONE_PATTERNS) {
    const m = text.match(re);
    if (m) hits.push(`常体/関西弁/命令形: 「${m[0].trim()}」`);
  }
  return hits;
}

export function checkLength(md, { pillar = false } = {}) {
  const len = stripCode(md).replace(/\s/g, '').length;
  const min = pillar ? LIMITS.pillarMin : LIMITS.normalMin;
  return len < min ? [`字数不足: ${len}字（${pillar ? '柱記事' : '通常'}は ${min}字以上）`] : [];
}

export function checkDuplicate(slug, title, postIndex) {
  const out = [];
  if (postIndex.some((p) => p.slug === slug)) out.push(`slug 重複: ${slug} は既存記事と同一`);
  if (title && postIndex.some((p) => p.title === title)) out.push(`タイトル重複: 「${title}」`);
  return out;
}

export function extractInternalLinks(text, domain) {
  const re = new RegExp(`https?://${domain.replace(/\./g, '\\.')}/([a-z0-9\\-]+)/?`, 'g');
  return [...new Set([...text.matchAll(re)].map((m) => m[1]))];
}

export function checkInternalLinks(text, postIndex, domain) {
  const links = extractInternalLinks(text, domain);
  const known = new Set(postIndex.map((p) => p.slug));
  const dead = links.filter((s) => !known.has(s));
  const out = [];
  if (links.length < LIMITS.internalLinksMin)
    out.push(`内部リンク不足: ${links.length} 本（${LIMITS.internalLinksMin} 本以上必要）`);
  for (const s of dead) out.push(`内部リンク死: ${s} は post-index に無い`);
  return out;
}

export function checkClosing(md) {
  const out = [];
  if (!/まとめ/.test(md)) out.push('「まとめ」セクションが無い');
  if (!/よくある質問|FAQ/.test(md)) out.push('FAQ セクションが無い');
  return out;
}

export function checkBlockHtml(html) {
  const out = [];
  const opens = (html.match(/<!-- wp:/g) ?? []).length;
  const closes = (html.match(/<!-- \/wp:/g) ?? []).length;
  if (opens !== closes) out.push(`wp ブロックコメント不整合: open=${opens} close=${closes}`);
  for (const [name, marker] of [
    ['capbox', 'swell-block-capbox'],
    ['コードブロック', 'hcb_wrap'],
    ['FAQ accordion', 'swell-block-accordion'],
    ['まとめ check_list', 'is-style-check_list'],
  ]) {
    if (!html.includes(marker)) out.push(`構造欠落: ${name}（${marker}）が無い`);
  }
  return out;
}

export function checkTsCompile(md, { skip = false } = {}) {
  if (skip) return [];
  const blocks = [...md.matchAll(/```(?:ts|typescript)\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (!blocks.length) return [];
  const dir = join(tmpdir(), `qg-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const errors = [];
  blocks.forEach((code, i) => {
    const f = join(dir, `b${i}.ts`);
    writeFileSync(f, code);
    try {
      execFileSync('npx', ['-y', '-p', 'typescript@~5.9.0', 'tsc', '--noEmit', '--strict', '--skipLibCheck', f],
        { stdio: 'pipe', encoding: 'utf8' });
    } catch (e) {
      errors.push(`ts block-${i} コンパイル失敗: ${String(e.stdout ?? e.message).slice(0, 300)}`);
    }
  });
  rmSync(dir, { recursive: true, force: true });
  return errors;
}

export function runGate({ md, html, slug, title, domain, postIndex, pillar = false, skipTs = false }) {
  const violations = [
    ...lintNgPhrases(md),
    ...lintTone(md),
    ...checkLength(md, { pillar }),
    ...checkDuplicate(slug, title, postIndex),
    ...checkInternalLinks(md + (html ?? ''), postIndex, domain),
    ...checkClosing(md),
    ...(html ? checkBlockHtml(html) : []),
    ...checkTsCompile(md, { skip: skipTs }),
  ];
  return { ok: violations.length === 0, violations };
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const mdPath = args[0];
  const pillar = args.includes('--pillar');
  const htmlIdx = args.indexOf('--html');
  const skipTs = args.includes('--skip-ts');
  if (!mdPath) {
    console.error('usage: node script/quality-gate.mjs <draft.md> [--html <slug>.html] [--pillar] [--skip-ts]');
    process.exit(2);
  }
  const domain = mdPath.split('/').slice(-3, -2)[0];
  const slug = mdPath.split('/').pop().replace(/\.md$/, '');
  const postIndexPath = join(root, 'site', domain, 'post-index.json');
  const postIndex = existsSync(postIndexPath) ? JSON.parse(readFileSync(postIndexPath, 'utf8')) : [];
  const md = readFileSync(mdPath, 'utf8');
  const html = htmlIdx > -1 ? readFileSync(args[htmlIdx + 1], 'utf8') : undefined;
  const title = (md.match(/^title:\s*(.+)$/m) ?? [])[1];

  const { ok, violations } = runGate({ md, html, slug, title, domain, postIndex, pillar, skipTs });
  if (ok) {
    console.log('[quality-gate] PASS');
  } else {
    console.error(`[quality-gate] FAIL — ${violations.length} 件:`);
    violations.forEach((v) => console.error(`  - ${v}`));
  }
  process.exit(ok ? 0 : 1);
}
