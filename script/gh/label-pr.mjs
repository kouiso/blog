// label-pr.mjs — PR にブランチ名と変更したファイルの場所でラベルを付ける（kouiso/blog#14 の項目6）
// - 既に付いているラベルは消さない（足すだけ）。
// - 無いラベルは GitHub が付ける時に作る。
// 実行: GitHub Actions（.github/workflows/pr-auto-setup.yml）から
//   node script/gh/label-pr.mjs
import { pathToFileURL } from 'node:url';
import { gh, readEvent } from './rest.mjs';

/** ブランチ名の頭 → ラベル（#14 の表のとおり） */
export const BRANCH_RULES = [
  [/^(feature|feat)\//, 'feature'],
  [/^(bugfix|fix)\//, 'bugfix'],
  [/^hotfix\//, 'hotfix'],
  [/^(chore|refactor)\//, 'chore'],
  [/^docs\//, 'documentation'],
  [/^release\//, 'release'],
];

/** 変更したファイルの場所 → ラベル（このリポの作りに合わせたもの） */
export const PATH_RULES = [
  [/^(doc\/|README\.md$|AGENTS\.md$|CLAUDE\.md$)/, 'documentation'],
  [/^(\.github\/|\.claude\/settings[^/]*\.json$|setup\.sh$|\.gitignore$)/, 'config'],
  [/^site\//, 'site'],
  [/^script\//, 'script'],
  [/^test\//, 'test'],
];

/** 付けるべきラベルの一覧（重なりなし・順序は決まった形） */
export function labelsFor(branch, files) {
  const out = new Set();
  for (const [re, label] of BRANCH_RULES) if (re.test(branch ?? '')) out.add(label);
  for (const f of files) for (const [re, label] of PATH_RULES) if (re.test(f)) out.add(label);
  return [...out];
}

/** PR で変わったファイルの名前を全部読む（100 件ずつ、最大 3000 件） */
export async function changedFiles(repo, number, call = gh) {
  const names = [];
  for (let page = 1; page <= 30; page++) {
    const rows = await call('GET', `/repos/${repo}/pulls/${number}/files?per_page=100&page=${page}`);
    for (const r of rows) {
      names.push(r.filename);
      if (r.previous_filename) names.push(r.previous_filename);
    }
    if (rows.length < 100) break;
  }
  return names;
}

export async function run(event, call = gh) {
  const pr = event.pull_request;
  if (!pr) return 'skip: PR ではない';
  const repo = event.repository.full_name;
  const want = labelsFor(pr.head?.ref, await changedFiles(repo, pr.number, call));
  const have = new Set((pr.labels ?? []).map((l) => l.name));
  const add = want.filter((l) => !have.has(l));
  if (add.length === 0) return 'skip: 足すラベルなし';
  await call('POST', `/repos/${repo}/issues/${pr.number}/labels`, { labels: add });
  return `labeled: #${pr.number} + ${add.join(', ')}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(await run(await readEvent()));
}
