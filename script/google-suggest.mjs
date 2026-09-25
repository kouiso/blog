#!/usr/bin/env node
// google-suggest.mjs — Google サジェストを無料 API から取得（ラッコキーワード相当）
// Usage: node script/google-suggest.mjs "プログラミング 学習" "typescript 入門" ...
// Output: JSON [{ query, suggestions: [...] }]

const queries = process.argv.slice(2);
if (!queries.length) {
  console.error('Usage: node script/google-suggest.mjs <query...>');
  process.exit(1);
}

async function suggest(q) {
  const url = `https://suggestqueries.google.com/complete/search?client=chrome&hl=ja&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for "${q}"`);
  const buf = await res.arrayBuffer();
  // hl=ja では Shift_JIS で返ることがある（Content-Type は嘘をつくので置換文字で判定）
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('shift_jis').decode(buf);
  const data = JSON.parse(text);
  return data[1] ?? [];
}

const out = [];
for (const q of queries) {
  try {
    out.push({ query: q, suggestions: await suggest(q) });
  } catch (e) {
    out.push({ query: q, error: String(e.message ?? e) });
  }
}
console.log(JSON.stringify(out, null, 2));
