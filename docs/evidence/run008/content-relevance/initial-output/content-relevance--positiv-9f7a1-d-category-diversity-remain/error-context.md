# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: content-relevance.spec.mjs >> @positive current-topic documents displace broad peers while curriculum and category diversity remain
- Location: tests/content-relevance.spec.mjs:41:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: ArrayContaining ["curriculum", "global-search", "global-apply", "global-login"]
Received: ["document-a", "document-b", "curriculum", "broad-major", "global-search", "global-apply"]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - link "검색" [ref=e3] [cursor=pointer]:
      - /url: /search
    - link "신청" [ref=e4] [cursor=pointer]:
      - /url: /apply
    - link "로그인" [ref=e5] [cursor=pointer]:
      - /url: /login
  - generic [ref=e6]:
    - heading "학사안내" [level=2] [ref=e7]
    - list [ref=e8]:
      - listitem [ref=e9]:
        - link "교육과정" [ref=e10] [cursor=pointer]:
          - /url: /education/structure.html
      - listitem [ref=e11]:
        - link "전공제도" [ref=e12] [cursor=pointer]:
          - /url: /education/major.html
      - listitem [ref=e13]:
        - link "교양과정" [ref=e14] [cursor=pointer]:
          - /url: /education/term.html
  - main [ref=e15]:
    - heading "학사안내" [level=2] [ref=e16]
    - list [ref=e17]:
      - listitem [ref=e18]:
        - link "학사안내" [ref=e19] [cursor=pointer]:
          - /url: /education/topic.html#unfamiliar
      - listitem [ref=e20]:
        - link "미래융합 학위 운영편람" [ref=e21] [cursor=pointer]:
          - /url: /education/other-book.html#unfamiliar
      - listitem [ref=e22]:
        - link "새로운 전공 선택 안내책자" [ref=e23] [cursor=pointer]:
          - /url: /education/other-manual.html
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { build } from 'esbuild';
  3   | import path from 'node:path';
  4   | 
  5   | let engine;
  6   | test.beforeAll(async () => {
  7   |   const baseline = process.env.EASYWEB_CONTENT_BASELINE === '1';
  8   |   const oldRanker = path.resolve('docs/evidence/run008/content-relevance/before-ranker.ts');
  9   |   const plugins = baseline ? [{ name: 'preserved-ranker', setup(builder) {
  10  |     builder.onResolve({ filter: /^\.\/src\/ranker$/ }, () => ({ path: oldRanker }));
  11  |     builder.onResolve({ filter: /^\.\/analyzer$/ }, args => args.importer === oldRanker ? { path: path.resolve('src/analyzer.ts') } : undefined);
  12  |   }}] : [];
  13  |   const result = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {contentEvidence} from './src/content-evidence';export {isCandidateCurrent} from './src/page-session';export {rank,remainingMenus} from './src/ranker';`, resolveDir: process.cwd() },
  14  |     plugins, bundle: true, write: false, format: 'iife', globalName: 'ContentRelevance' });
  15  |   engine = result.outputFiles[0].text;
  16  | });
  17  | 
  18  | const url = 'https://unfamiliar.example.invalid/education/topic.html';
  19  | const globals = `<header><a id="global-search" href="/search">검색</a><a id="global-apply" href="/apply">신청</a><a id="global-login" href="/login">로그인</a></header>`;
  20  | const broad = `<ul id="broad"><li><a id="curriculum" href="/education/structure.html">교육과정</a></li><li><a id="broad-major" href="/education/major.html">전공제도</a></li><li><a id="broad-term" href="/education/term.html">교양과정</a></li></ul>`;
  21  | const documents = `<ul id="documents"><li class="active"><a id="current-topic" href="/education/topic.html#unfamiliar">학사안내</a></li><li><a id="document-a" href="/education/other-book.html#unfamiliar">미래융합 학위 운영편람</a></li><li><a id="document-b" href="/education/other-manual.html">새로운 전공 선택 안내책자</a></li></ul>`;
  22  | const primary = () => `${globals}<div><h2>학사안내</h2>${broad}</div><main><h2 id="current-heading">학사안내</h2>${documents}</main>`;
  23  | 
  24  | async function setup(page, html) {
  25  |   await page.route('**/*', route => route.request().isNavigationRequest()
  26  |     ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }) : route.abort());
  27  |   await page.goto(url);
  28  |   await page.addScriptTag({ content: engine });
  29  |   await page.evaluate(() => {
  30  |     window.sources = ContentRelevance.analyzePage();
  31  |     window.candidates = ContentRelevance.classify(sources, { mode: 'generic' });
  32  |     for (const candidate of candidates) {
  33  |       const proof = ContentRelevance.contentEvidence(candidate);
  34  |       if (proof) candidate.contentEvidence = proof;
  35  |     }
  36  |   });
  37  | }
  38  | 
  39  | const selected = page => page.evaluate(() => ContentRelevance.rank(candidates).map(candidate => candidate.element.id));
  40  | 
  41  | test('@positive current-topic documents displace broad peers while curriculum and category diversity remain', async ({ page }) => {
  42  |   await setup(page, primary());
  43  |   const first = await selected(page);
  44  |   expect(first).toHaveLength(6);
  45  |   expect(first.slice(0, 2)).toEqual(['document-a', 'document-b']);
> 46  |   expect(first).toEqual(expect.arrayContaining(['curriculum', 'global-search', 'global-apply', 'global-login']));
      |                 ^ Error: expect(received).toEqual(expected) // deep equality
  47  | });
  48  | 
  49  | test('@positive parent-topic and following content section support unfamiliar layout divs without site-specific classes', async ({ page }) => {
  50  |   const parent = `<ul><li class="selected"><a href="/education/topic.html#parent">공개 학사안내</a></li><li><a href="/education/structure.html">교육과정</a></li></ul>`;
  51  |   await setup(page, `${globals}<div><h2>학사안내</h2><div><div>${parent}</div><div><div>${documents}</div></div></div><section><p>고정된 공개 설명</p></section></div>`);
  52  |   expect(await page.evaluate(() => candidates.filter(candidate => candidate.contentEvidence?.level === 2).map(candidate => candidate.element.id))).toEqual(['document-a', 'document-b']);
  53  | });
  54  | 
  55  | test('array shuffles and unfamiliar labels retain source-backed selection and distinct overflow', async ({ page }) => {
  56  |   await setup(page, primary().replace('미래융합 학위 운영편람', '독립학위 handbook').replace('새로운 전공 선택 안내책자', '연계전공 manual'));
  57  |   expect(await page.evaluate(() => {
  58  |     const expected = ContentRelevance.rank(candidates).map(candidate => candidate.element.id).join(',');
  59  |     for (let run = 0; run < 24; run++) {
  60  |       const rotated = [...candidates.slice(run % candidates.length), ...candidates.slice(0, run % candidates.length)].reverse();
  61  |       if (ContentRelevance.rank(rotated).map(candidate => candidate.element.id).join(',') !== expected) return false;
  62  |     }
  63  |     const first = ContentRelevance.rank(candidates);
  64  |     const all = [...first, ...ContentRelevance.remainingMenus([...candidates, candidates[0]], first)];
  65  |     return all.length === candidates.length && new Set(all.map(candidate => candidate.element)).size === candidates.length
  66  |       && all.every(candidate => candidates.includes(candidate));
  67  |   })).toBe(true);
  68  | });
  69  | 
  70  | for (const [name, html] of [
  71  |   ['plain body sidebar', `<div><h2>학사안내</h2>${documents}</div>`],
  72  |   ['unrelated main heading', `<main><h2>별도 지역 안내</h2>${documents}</main>`],
  73  |   ['neighbouring heading', `<section><h2>학사안내</h2></section><main>${documents}</main>`],
  74  |   ['article', `<main><article><h2>학사안내</h2>${documents}</article></main>`],
  75  |   ['navigation', `<main><nav><h2>학사안내</h2>${documents}</nav></main>`],
  76  |   ['form', `<main><form><h2>학사안내</h2>${documents}</form></main>`],
  77  |   ['breadcrumb', `<main class="breadcrumb"><h2>학사안내</h2>${documents}</main>`],
  78  |   ['skip navigation', `<main id="skip-navigation"><h2>학사안내</h2>${documents}</main>`],
  79  | ]) test(`unproven ${name} cannot acquire content relevance`, async ({ page }) => {
  80  |   await setup(page, html);
  81  |   expect(await page.evaluate(() => candidates.some(candidate => candidate.contentEvidence))).toBe(false);
  82  | });
  83  | 
  84  | test('a heading or current selected row replacement changes dependency identity', async ({ page }) => {
  85  |   for (const id of ['current-heading', 'documents']) {
  86  |     await setup(page, primary());
  87  |     expect(await page.evaluate(id => {
  88  |       const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  89  |       const oldProof = candidate.contentEvidence;
  90  |       const node = document.getElementById(id);
  91  |       const replacement = node.cloneNode(false);
  92  |       while (node.firstChild) replacement.append(node.firstChild);
  93  |       node.replaceWith(replacement);
  94  |       const proof = ContentRelevance.contentEvidence(candidate);
  95  |       return !!proof && oldProof.dependencies.includes(node) && !proof.dependencies.includes(node)
  96  |         && proof.dependencies.includes(replacement);
  97  |     }, id)).toBe(true);
  98  |   }
  99  | });
  100 | 
  101 | test('source currentness rejects an equal-content replacement of the relevance heading', async ({ page }) => {
  102 |   await setup(page, primary());
  103 |   expect(await page.evaluate(() => {
  104 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  105 |     const before = ContentRelevance.isCandidateCurrent(candidate);
  106 |     const heading = document.getElementById('current-heading');
  107 |     heading.replaceWith(heading.cloneNode(true));
  108 |     return { before, after: ContentRelevance.isCandidateCurrent(candidate) };
  109 |   })).toEqual({ before: true, after: false });
  110 | });
  111 | 
  112 | test('changing selection, topic heading, or dependency danger removes the positive relation', async ({ page }) => {
  113 |   for (const kind of ['selected', 'heading', 'danger']) {
  114 |     await setup(page, primary());
  115 |     expect(await page.evaluate(kind => {
  116 |       const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  117 |       if (kind === 'selected') document.querySelector('#current-topic').parentElement.className = '';
  118 |       if (kind === 'heading') document.getElementById('current-heading').replaceChildren('다른 지역 자료');
  119 |       if (kind === 'danger') document.getElementById('document-b').setAttribute('href', '/delete?cmd=payment');
  120 |       return ContentRelevance.contentEvidence(candidate);
  121 |     }, kind)).toBeUndefined();
  122 |   }
  123 | });
  124 | 
  125 | test('nested editable values and private getters are excluded from all proof fingerprints', async ({ page }) => {
  126 |   await setup(page, primary().replace('id="current-heading">학사안내', 'id="current-heading">학사안내<span role="textbox">PRIVATE_EDITOR</span><textarea>PRIVATE_TEXTAREA</textarea>'));
  127 |   expect(await page.evaluate(() => {
  128 |     let reads = 0;
  129 |     for (const node of document.querySelectorAll('textarea,[role="textbox"]')) for (const key of ['value','textContent','innerText'])
  130 |       Object.defineProperty(node, key, { get() { reads++; throw Error('private getter'); } });
  131 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  132 |     const proof = ContentRelevance.contentEvidence(candidate);
  133 |     return { reads, hasProof: !!proof, privateInFingerprint: proof?.fingerprint.includes('PRIVATE_') };
  134 |   })).toEqual({ reads: 0, hasProof: true, privateInFingerprint: false });
  135 | });
  136 | 
  137 | test('dangerous original controls, branch expanders, default submits and below-threshold candidates get no evidence', async ({ page }) => {
  138 |   await setup(page, primary().replace('href="/education/other-book.html#unfamiliar"', 'href="/delete?cmd=payment"'));
  139 |   expect(await page.evaluate(() => candidates.some(candidate => candidate.element.id === 'document-a'))).toBe(false);
  140 |   await setup(page, primary());
  141 |   expect(await page.evaluate(() => {
  142 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  143 |     const below = ContentRelevance.contentEvidence({ ...candidate, score: 54 });
  144 |     candidate.element.setAttribute('aria-expanded','false');
  145 |     const branch = ContentRelevance.contentEvidence(candidate);
  146 |     const form = document.createElement('form'); const button = document.createElement('button');
```