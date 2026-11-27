// fix-issue-headings.mjs — issue が作られた直後に見出しを1段浅くする（kouiso/blog#14 の項目3）
// issue フォームで作ると見出しが「###」になるため、「###」→「##」、「####」→「###」へ直す。
// コードブロックの中は触らない。変わらないときは何もしない。
// 実行: GitHub Actions（.github/workflows/fix-issue-headings.yml）から
//   node script/gh/fix-issue-headings.mjs
import { pathToFileURL } from 'node:url';
import { gh, readEvent } from './rest.mjs';

const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/** 本文の見出しを直した文字列を返す */
export function fixHeadings(body) {
  if (!body) return body;
  let fence = null; // 開いているコードブロックの記号
  return body
    .split('\n')
    .map((line) => {
      const m = line.match(FENCE);
      if (m) {
        if (!fence) fence = m[1];
        else if (m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
        return line;
      }
      if (fence) return line;
      return line.replace(/^( {0,3})(#{3,4})(?=[ \t\r]|$)/, (_, sp, h) => sp + h.slice(1));
    })
    .join('\n');
}

export async function run(event, call = gh) {
  const issue = event.issue;
  if (!issue || issue.pull_request) return 'skip: issue ではない';
  const fixed = fixHeadings(issue.body);
  if (fixed === issue.body) return 'skip: 変更なし';
  const repo = event.repository.full_name;
  await call('PATCH', `/repos/${repo}/issues/${issue.number}`, { body: fixed });
  return `fixed: #${issue.number}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(await run(await readEvent()));
}
