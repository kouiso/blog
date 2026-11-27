// assign-pr-author.mjs — PR が開かれたとき、作った人を担当者にする（kouiso/blog#14 の項目5）
// - ボットが作った PR は対象外。
// - 既に作った人が担当者なら何もしない。
// 実行: GitHub Actions（.github/workflows/pr-auto-setup.yml）から
//   node script/gh/assign-pr-author.mjs
import { pathToFileURL } from 'node:url';
import { gh, isBot, readEvent } from './rest.mjs';

export async function run(event, call = gh) {
  const pr = event.pull_request;
  if (!pr) return 'skip: PR ではない';
  const author = pr.user;
  if (isBot(author)) return `skip: ボットの PR (${author.login})`;
  if ((pr.assignees ?? []).some((a) => a.login === author.login)) return 'skip: 担当者に設定済み';
  const repo = event.repository.full_name;
  await call('POST', `/repos/${repo}/issues/${pr.number}/assignees`, { assignees: [author.login] });
  return `assigned: #${pr.number} → ${author.login}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(await run(await readEvent()));
}
