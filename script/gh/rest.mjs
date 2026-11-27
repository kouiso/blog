// rest.mjs — GitHub Actions から GitHub REST API を叩く最小の共通部品
// 追加パッケージなし。トークンは Actions が渡す GITHUB_TOKEN だけを使う。
import { readFile } from 'node:fs/promises';

const API = process.env.GITHUB_API_URL || 'https://api.github.com';

/** Actions が置くイベントの JSON を読む */
export async function readEvent(path = process.env.GITHUB_EVENT_PATH) {
  if (!path) throw new Error('GITHUB_EVENT_PATH がありません');
  return JSON.parse(await readFile(path, 'utf8'));
}

/**
 * GitHub REST を1回呼ぶ。失敗したら例外にする。
 * @param {string} method
 * @param {string} path  例: /repos/o/r/issues/1
 * @param {object} [body]
 * @param {{token?: string, fetchImpl?: typeof fetch}} [opts]
 */
export async function gh(method, path, body, opts = {}) {
  const token = opts.token ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN がありません');
  const fetchImpl = opts.fetchImpl ?? fetch;
  const res = await fetchImpl(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}


/** ボットが作ったものかどうか */
export function isBot(user) {
  return !!user && (user.type === 'Bot' || /\[bot\]$/.test(user.login ?? ''));
}
