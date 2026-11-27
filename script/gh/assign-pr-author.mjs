// assign-pr-author.mjs — PR が開かれたとき、作った人を担当者にする（kouiso/blog#14 の項目5）
// - ボットが作った PR は対象外。
// - 既に作った人が担当者なら何もしない。
// - 開き直したとき（reopened）も足す（#14「開き直したときも」）。
// - ボットは type が Bot か、名前が [bot] で終わるもので見分ける。それ以外の機械のアカウントは見分けない。
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
  const res = await call('POST', `/repos/${repo}/issues/${pr.number}/assignees`, { assignees: [author.login] });
  // 担当者にできない人だと、GitHub はエラーにせず黙って外すので、返りで確かめる
  if (!(res?.assignees ?? []).some((a) => a.login === author.login)) {
    return `not-assigned: #${pr.number} → ${author.login}（GitHub が受け付けなかった）`;
  }
  return `assigned: #${pr.number} → ${author.login}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const result = await run(await readEvent());
    console.log(result);
    if (result.startsWith('not-assigned')) console.log(`::warning::${result}`);
  } catch (e) {
    // 失敗は目に見えるように残し、段は赤にする（job は continue-on-error で続く）
    console.log(`::warning::担当者を付けられませんでした: ${e.message}`);
    process.exit(1);
  }
}
