// fix-issue-headings.mjs — issue が作られた直後に見出しを1段浅くする（kouiso/blog#14 の項目3）
// issue フォームで作ると見出しが「###」から始まるため、「###」→「##」、「####」→「###」…と全体を1段上げる。
// - 一番浅い見出しが「###」の本文だけを直す（手で ## から書いた本文の段の関係を壊さないため）。
// - コードブロックの中は触らない。引用（> ###）や箇条書きの中の見出しは対象外。
// - 変わらないときは何もしない。
// 実行: GitHub Actions（.github/workflows/fix-issue-headings.yml）から
//   node script/gh/fix-issue-headings.mjs
import { pathToFileURL } from 'node:url';
import { gh, readEvent } from './rest.mjs';

const OPEN_FENCE = /^ {0,3}(`{3,}(?!.*`)|~{3,})/;
const HEADING = /^( {0,3})(#{1,6})(?=[ \t\r]|$)/;

/** 各行に「コードブロックの外か」を付けて返す */
function scan(lines) {
  let fence = null; // 開いているコードブロックの記号
  return lines.map((line) => {
    if (fence) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*\r?$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return { line, outside: false };
    }
    const open = line.match(OPEN_FENCE);
    if (open) {
      fence = open[1];
      return { line, outside: false };
    }
    return { line, outside: true };
  });
}

/** 本文の見出しを直した文字列を返す */
export function fixHeadings(body) {
  if (!body) return body;
  const rows = scan(body.split('\n'));
  const levels = rows
    .filter((r) => r.outside)
    .map((r) => r.line.match(HEADING)?.[2].length)
    .filter(Boolean);
  if (levels.length === 0 || Math.min(...levels) !== 3) return body;
  return rows
    .map(({ line, outside }) => (outside ? line.replace(HEADING, (_, sp, h) => sp + h.slice(1)) : line))
    .join('\n');
}

export async function run(event, call = gh) {
  const issue = event.issue;
  if (!issue || issue.pull_request) return 'skip: issue ではない';
  const path = `/repos/${event.repository.full_name}/issues/${issue.number}`;
  // 作成から runner が動くまでの間に書き手が直していることがあるので、今の本文を読み直す
  const live = await call('GET', path);
  const fixed = fixHeadings(live.body);
  if (fixed === live.body) return 'skip: 変更なし';
  await call('PATCH', path, { body: fixed });
  return `fixed: #${issue.number}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(await run(await readEvent()));
}
