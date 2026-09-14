// quality-gate.test.mjs — NG表の各項目を含む偽記事で全部落ちること、正常記事で通ることを検証
// 実行: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lintNgPhrases, lintTone, checkLength, checkDuplicate,
  checkInternalLinks, checkClosing, checkBlockHtml, runGate, NG_PHRASES,
} from '../script/quality-gate.mjs';

const postIndex = [
  { slug: 'typescript-class', title: 'TypeScriptのクラス入門', url: 'https://programming-life.net/typescript-class/', categories: ['typescript'] },
  { slug: 'typescript-zod', title: 'TypeScript×Zodで型安全', url: 'https://programming-life.net/typescript-zod/', categories: ['typescript'] },
  { slug: 'programming-learn', title: 'プログラミング勉強法', url: 'https://programming-life.net/programming-learn/', categories: ['programming'] },
];

const goodBody = `
初心者がよくつまずくのが型定義です。ここでは、以下のトピックに分けて解説していきます。

実務では注意してください。詳しくは https://programming-life.net/typescript-class/ と
https://programming-life.net/typescript-zod/ と https://programming-life.net/programming-learn/ を参照してください。

## まとめ

分かりやすいようにまとめを記載します。

### よくある質問（FAQ）

質問への回答です。
`.repeat(30); // 字数確保

test('NG表現: 登録されている全項目が1つずつ検出される', () => {
  for (const phrase of NG_PHRASES) {
    const hits = lintNgPhrases(`これは${phrase}テストです。`);
    assert.ok(hits.some((h) => h.includes(phrase)), `未検出: ${phrase}`);
  }
});

test('常体混入: だ/やで/ちゃう/命令形を検出する', () => {
  for (const bad of ['これは型だ。', '完了やで。', 'そうちゃう。', 'ファイルを書け。']) {
    assert.ok(lintTone(bad).length > 0, `未検出: ${bad}`);
  }
});

test('常体混入: ですます体は通す', () => {
  assert.equal(lintTone('これは型です。確認してください。').length, 0);
});

test('字数: 短い記事は落ちる / 柱記事は閾値が高い', () => {
  assert.ok(checkLength('短い文章です。').length > 0);
  assert.ok(checkLength('あ'.repeat(5000), { pillar: true }).length > 0);
  assert.equal(checkLength('あ'.repeat(13000), { pillar: true }).length, 0);
});

test('重複: 既存 slug / タイトルを検出する', () => {
  assert.ok(checkDuplicate('typescript-class', '新しい記事', postIndex).length > 0);
  assert.ok(checkDuplicate('typescript-new', 'TypeScriptのクラス入門', postIndex).length > 0);
  assert.equal(checkDuplicate('typescript-new', '新しい記事', postIndex).length, 0);
});

test('内部リンク: 3本未満と死リンクを検出する', () => {
  assert.ok(checkInternalLinks('本文のみ', postIndex, 'programming-life.net').length > 0);
  const dead = checkInternalLinks('参照 https://programming-life.net/not-exist-slug/ ほか https://programming-life.net/typescript-class/ と https://programming-life.net/typescript-zod/ も', postIndex, 'programming-life.net');
  assert.ok(dead.some((d) => d.includes('not-exist-slug')));
  const ok = checkInternalLinks(goodBody, postIndex, 'programming-life.net');
  assert.equal(ok.length, 0);
});

test('closing構造: まとめとFAQが無いと落ちる', () => {
  assert.equal(checkClosing('## まとめ\n### よくある質問（FAQ）').length, 0);
  assert.ok(checkClosing('本文だけ').length >= 2);
});

test('ブロックHTML: コメント不整合と必須構造の欠落を検出する', () => {
  assert.ok(checkBlockHtml('<!-- wp:paragraph --><p>x</p>').some((v) => v.includes('不整合')));
  const full = `<!-- wp:x --><div class="swell-block-capbox"></div><!-- /wp:x -->
<!-- wp:y --><div class="hcb_wrap"></div><!-- /wp:y -->
<!-- wp:z --><div class="swell-block-accordion"></div><!-- /wp:z -->
<!-- wp:w --><ul class="is-style-check_list"></ul><!-- /wp:w -->`;
  assert.equal(checkBlockHtml(full).length, 0);
});

test('runGate: 全部NGの偽記事は落ち、正常記事は通る', () => {
  const bad = runGate({
    md: 'これはすることができます短い記事だ。同様に進めます。',
    slug: 'typescript-class', title: '既存', domain: 'programming-life.net',
    postIndex, skipTs: true,
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.violations.length >= 5, `想定より少ない: ${bad.violations}`);

  const good = runGate({
    md: goodBody, slug: 'typescript-new-article', title: '新しい記事タイトル',
    domain: 'programming-life.net', postIndex, skipTs: true,
  });
  assert.equal(good.ok, true, good.violations.join('\n'));
});
