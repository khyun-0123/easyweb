# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: content-relevance.spec.mjs >> @positive current-topic documents displace broad peers while curriculum and category diversity remain
- Location: tests/content-relevance.spec.mjs:42:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Array [
-   "document-a",
-   "document-b",
+   "broad-major",
+   "curriculum",
  ]
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
  3   | import { readFile } from 'node:fs/promises';
  4   | import path from 'node:path';
  5   | 
  6   | let engine;
  7   | test.beforeAll(async () => {
  8   |   const baseline = process.env.EASYWEB_CONTENT_BASELINE === '1';
  9   |   const oldRanker = path.resolve('docs/evidence/run008/content-relevance/before-ranker.ts');
  10  |   const plugins = baseline ? [{ name: 'preserved-ranker', setup(builder) {
  11  |     builder.onResolve({ filter: /^\.\/src\/ranker$/ }, () => ({ path: oldRanker }));
  12  |     builder.onResolve({ filter: /^\.\/analyzer$/ }, args => args.importer === oldRanker ? { path: path.resolve('src/analyzer.ts') } : undefined);
  13  |   }}] : [];
  14  |   const result = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {contentEvidence} from './src/content-evidence';export {rank,remainingMenus} from './src/ranker';`, resolveDir: process.cwd() },
  15  |     plugins, bundle: true, write: false, format: 'iife', globalName: 'ContentRelevance' });
  16  |   engine = result.outputFiles[0].text;
  17  | });
  18  | 
  19  | const url = 'https://unfamiliar.example.invalid/education/topic.html';
  20  | const globals = `<header><a id="global-search" href="/search">검색</a><a id="global-apply" href="/apply">신청</a><a id="global-login" href="/login">로그인</a></header>`;
  21  | const broad = `<ul id="broad"><li><a id="curriculum" href="/education/structure.html">교육과정</a></li><li><a id="broad-major" href="/education/major.html">전공제도</a></li><li><a id="broad-term" href="/education/term.html">교양과정</a></li></ul>`;
  22  | const documents = `<ul id="documents"><li class="active"><a id="current-topic" href="/education/topic.html#unfamiliar">학사안내</a></li><li><a id="document-a" href="/education/other-book.html#unfamiliar">미래융합 학위 운영편람</a></li><li><a id="document-b" href="/education/other-manual.html">새로운 전공 선택 안내책자</a></li></ul>`;
  23  | const primary = () => `${globals}<div><h2>학사안내</h2>${broad}</div><main><h2 id="current-heading">학사안내</h2>${documents}</main>`;
  24  | 
  25  | async function setup(page, html) {
  26  |   await page.route('**/*', route => route.request().isNavigationRequest()
  27  |     ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }) : route.abort());
  28  |   await page.goto(url);
  29  |   await page.addScriptTag({ content: engine });
  30  |   await page.evaluate(() => {
  31  |     window.sources = ContentRelevance.analyzePage();
  32  |     window.candidates = ContentRelevance.classify(sources, { mode: 'generic' });
  33  |     for (const candidate of candidates) {
  34  |       const proof = ContentRelevance.contentEvidence(candidate);
  35  |       if (proof) candidate.contentEvidence = proof;
  36  |     }
  37  |   });
  38  | }
  39  | 
  40  | const selected = page => page.evaluate(() => ContentRelevance.rank(candidates).map(candidate => candidate.element.id));
  41  | 
  42  | test('@positive current-topic documents displace broad peers while curriculum and category diversity remain', async ({ page }) => {
  43  |   await setup(page, primary());
  44  |   const first = await selected(page);
  45  |   expect(first).toHaveLength(6);
> 46  |   expect(first.slice(0, 2)).toEqual(['document-a', 'document-b']);
      |                             ^ Error: expect(received).toEqual(expected) // deep equality
  47  |   expect(first).toEqual(expect.arrayContaining(['curriculum', 'global-search', 'global-apply', 'global-login']));
  48  | });
  49  | 
  50  | test('@positive parent-topic and following content section support unfamiliar layout divs without site-specific classes', async ({ page }) => {
  51  |   const parent = `<ul><li class="selected"><a href="/education/topic.html#parent">공개 학사안내</a></li><li><a href="/education/structure.html">교육과정</a></li></ul>`;
  52  |   await setup(page, `${globals}<div><h2>학사안내</h2><div><div>${parent}</div><div><div>${documents}</div></div></div><section><p>고정된 공개 설명</p></section></div>`);
  53  |   expect(await page.evaluate(() => candidates.filter(candidate => candidate.contentEvidence?.level === 2).map(candidate => candidate.element.id))).toEqual(['document-a', 'document-b']);
  54  | });
  55  | 
  56  | test('array shuffles and unfamiliar labels retain source-backed selection and distinct overflow', async ({ page }) => {
  57  |   await setup(page, primary().replace('미래융합 학위 운영편람', '독립학위 handbook').replace('새로운 전공 선택 안내책자', '연계전공 manual'));
  58  |   expect(await page.evaluate(() => {
  59  |     const expected = ContentRelevance.rank(candidates).map(candidate => candidate.element.id).join(',');
  60  |     for (let run = 0; run < 24; run++) {
  61  |       const rotated = [...candidates.slice(run % candidates.length), ...candidates.slice(0, run % candidates.length)].reverse();
  62  |       if (ContentRelevance.rank(rotated).map(candidate => candidate.element.id).join(',') !== expected) return false;
  63  |     }
  64  |     const first = ContentRelevance.rank(candidates);
  65  |     const all = [...first, ...ContentRelevance.remainingMenus([...candidates, candidates[0]], first)];
  66  |     return all.length === candidates.length && new Set(all.map(candidate => candidate.element)).size === candidates.length
  67  |       && all.every(candidate => candidates.includes(candidate));
  68  |   })).toBe(true);
  69  | });
  70  | 
  71  | for (const [name, html] of [
  72  |   ['plain body sidebar', `<div><h2>학사안내</h2>${documents}</div>`],
  73  |   ['unrelated main heading', `<main><h2>별도 지역 안내</h2>${documents}</main>`],
  74  |   ['neighbouring heading', `<section><h2>학사안내</h2></section><main>${documents}</main>`],
  75  |   ['article', `<main><article><h2>학사안내</h2>${documents}</article></main>`],
  76  |   ['navigation', `<main><nav><h2>학사안내</h2>${documents}</nav></main>`],
  77  |   ['form', `<main><form><h2>학사안내</h2>${documents}</form></main>`],
  78  |   ['breadcrumb', `<main class="breadcrumb"><h2>학사안내</h2>${documents}</main>`],
  79  |   ['skip navigation', `<main id="skip-navigation"><h2>학사안내</h2>${documents}</main>`],
  80  | ]) test(`unproven ${name} cannot acquire content relevance`, async ({ page }) => {
  81  |   await setup(page, html);
  82  |   expect(await page.evaluate(() => candidates.some(candidate => candidate.contentEvidence))).toBe(false);
  83  | });
  84  | 
  85  | test('a heading or current selected row replacement changes dependency identity', async ({ page }) => {
  86  |   for (const id of ['current-heading', 'documents']) {
  87  |     await setup(page, primary());
  88  |     expect(await page.evaluate(id => {
  89  |       const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  90  |       const oldProof = candidate.contentEvidence;
  91  |       const node = document.getElementById(id);
  92  |       const replacement = node.cloneNode(false);
  93  |       while (node.firstChild) replacement.append(node.firstChild);
  94  |       node.replaceWith(replacement);
  95  |       const proof = ContentRelevance.contentEvidence(candidate);
  96  |       return !!proof && oldProof.dependencies.includes(node) && !proof.dependencies.includes(node)
  97  |         && proof.dependencies.includes(replacement);
  98  |     }, id)).toBe(true);
  99  |   }
  100 | });
  101 | 
  102 | test('changing selection, topic heading, or dependency danger removes the positive relation', async ({ page }) => {
  103 |   for (const kind of ['selected', 'heading', 'danger']) {
  104 |     await setup(page, primary());
  105 |     expect(await page.evaluate(kind => {
  106 |       const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  107 |       if (kind === 'selected') document.querySelector('#current-topic').parentElement.className = '';
  108 |       if (kind === 'heading') document.getElementById('current-heading').replaceChildren('다른 지역 자료');
  109 |       if (kind === 'danger') document.getElementById('document-b').setAttribute('href', '/delete?cmd=payment');
  110 |       return ContentRelevance.contentEvidence(candidate);
  111 |     }, kind)).toBeUndefined();
  112 |   }
  113 | });
  114 | 
  115 | test('nested editable values and private getters are excluded from all proof fingerprints', async ({ page }) => {
  116 |   await setup(page, primary().replace('id="current-heading">학사안내', 'id="current-heading">학사안내<span role="textbox">PRIVATE_EDITOR</span><textarea>PRIVATE_TEXTAREA</textarea>'));
  117 |   expect(await page.evaluate(() => {
  118 |     let reads = 0;
  119 |     for (const node of document.querySelectorAll('textarea,[role="textbox"]')) for (const key of ['value','textContent','innerText'])
  120 |       Object.defineProperty(node, key, { get() { reads++; throw Error('private getter'); } });
  121 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  122 |     const proof = ContentRelevance.contentEvidence(candidate);
  123 |     return { reads, hasProof: !!proof, privateInFingerprint: proof?.fingerprint.includes('PRIVATE_') };
  124 |   })).toEqual({ reads: 0, hasProof: true, privateInFingerprint: false });
  125 | });
  126 | 
  127 | test('dangerous original controls, branch expanders, default submits and below-threshold candidates get no evidence', async ({ page }) => {
  128 |   await setup(page, primary().replace('href="/education/other-book.html#unfamiliar"', 'href="/delete?cmd=payment"'));
  129 |   expect(await page.evaluate(() => candidates.some(candidate => candidate.element.id === 'document-a'))).toBe(false);
  130 |   await setup(page, primary());
  131 |   expect(await page.evaluate(() => {
  132 |     const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
  133 |     const below = ContentRelevance.contentEvidence({ ...candidate, score: 54 });
  134 |     candidate.element.setAttribute('aria-expanded','false');
  135 |     const branch = ContentRelevance.contentEvidence(candidate);
  136 |     const form = document.createElement('form'); const button = document.createElement('button');
  137 |     button.textContent = '새로운 학위 안내서'; form.append(button); document.querySelector('main').append(form);
  138 |     const submit = ContentRelevance.contentEvidence({ ...candidate, element: button, label: '새로운 학위 안내서', action: 'locate' });
  139 |     return [below, branch, submit].every(proof => proof === undefined);
  140 |   })).toBe(true);
  141 | });
  142 | 
  143 | test('@positive six equally supported local topics remain author ordered while overflow and globals survive', async ({ page }) => {
  144 |   const labels = ['융합학위 운영편람','독립전공 안내책자','공동학위 설명서','복수전공 핸드북','연계학위 자료집','창의전공 요람','미래학위 지침서','교양학위 매뉴얼'];
  145 |   await setup(page, `${globals}<main><h2 id="topic-heading">학사안내</h2><ul>${labels.map((label,index) => `<li><a id="local-${index}" href="/education/book-${index}.html">${label}</a></li>`).join('')}</ul></main>`);
  146 |   expect(await page.evaluate(() => {
```