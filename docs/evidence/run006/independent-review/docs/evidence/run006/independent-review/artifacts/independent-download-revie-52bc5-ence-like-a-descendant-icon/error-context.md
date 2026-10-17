# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: independent-download-review.spec.mjs >> own exact icon class provides source-local evidence like a descendant icon
- Location: tests/independent-download-review.spec.mjs:32:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -1,8 +1,8 @@
  Array [
    Object {
-     "action": "locate",
+     "action": "navigate",
      "id": "own",
    },
    Object {
      "action": "locate",
      "id": "child",
```

# Page snapshot

```yaml
- main [ref=e2]:
  - link "공개 양식" [ref=e3] [cursor=pointer]:
    - /url: /api/FileDown.do
  - link "공개 양식" [ref=e4] [cursor=pointer]:
    - /url: /api/FileDown.do
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { build } from 'esbuild';
  3  | 
  4  | let engine;
  5  | test.beforeAll(async () => {
  6  |   const bundle = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer'; export {sourceAction,sourceDownloadEvidence} from './src/action-policy'; export {isCandidateCurrent} from './src/page-session'; export {openEasyMode} from './src/easy-mode'; export {locateOriginal} from './src/action-bridge';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'IndependentDownload', loader: { '.css': 'text' } });
  7  |   engine = bundle.outputFiles[0].text;
  8  | });
  9  | 
  10 | async function setup(page, html) {
  11 |   await page.route('**/*', route => route.abort());
  12 |   await page.setContent(`<base href="https://independent.invalid/public/">${html}`);
  13 |   await page.addScriptTag({ content: engine });
  14 | }
  15 | 
  16 | async function observations(page) {
  17 |   return page.evaluate(() => {
  18 |     window.reviewCandidates = IndependentDownload.analyzePage();
  19 |     return reviewCandidates.map(({ element, label, action }) => ({ id: element.id, label, action,
  20 |       evidence: IndependentDownload.sourceDownloadEvidence(element, label) ?? null }));
  21 |   });
  22 | }
  23 | 
  24 | test('fixed safe-label negations do not become a download operation', async ({ page }) => {
  25 |   const labels = ['Do not download', 'No download', 'Never download now', '금지된 다운로드'];
  26 |   await setup(page, `<main>${labels.map((label, i) => `<a id="negative-${i}" href="/api/FileDown.do?part=${i}" aria-label="${label}">공개 양식</a>`).join('')}<a id="positive" href="/api/FileDown.do" aria-label="Download now">공개 양식</a></main>`);
  27 |   const result = await observations(page);
  28 |   expect(result.filter(row => row.id.startsWith('negative-'))).toEqual(labels.map((label, i) => ({ id: `negative-${i}`, label, action: 'navigate', evidence: null })));
  29 |   expect(result.find(row => row.id === 'positive').action).toBe('locate');
  30 | });
  31 | 
  32 | test('own exact icon class provides source-local evidence like a descendant icon', async ({ page }) => {
  33 |   await setup(page, '<main><a id="own" class="ir-download" href="/api/FileDown.do">공개 양식</a><a id="child" href="/api/FileDown.do"><i class="ir-download" aria-hidden="true"></i>공개 양식</a></main>');
  34 |   const result = await observations(page);
> 35 |   expect(result.map(({ id, action }) => ({ id, action }))).toEqual([{ id: 'own', action: 'locate' }, { id: 'child', action: 'locate' }]);
     |                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  36 | });
  37 | 
  38 | test('adding the own icon class synchronously invalidates and blocks an old navigation card', async ({ page }) => {
  39 |   await setup(page, '<main><a id="source" href="/api/FileDown.do">신청서 이용 안내</a></main>');
  40 |   const result = await page.evaluate(() => {
  41 |     window.reviewCandidates = IndependentDownload.analyzePage();
  42 |     const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
  43 |     IndependentDownload.openEasyMode(host);
  44 |     const card = host.shadowRoot.querySelector('.card');
  45 |     let blocked = null;
  46 |     // Observe product cancellation, then stop every browser default action.
  47 |     card.addEventListener('click', event => { blocked = event.defaultPrevented; event.preventDefault(); }, { once: true });
  48 |     document.querySelector('#source').className = 'ir-download';
  49 |     const current = IndependentDownload.isCandidateCurrent(reviewCandidates[0]);
  50 |     card.click();
  51 |     return { current, blocked };
  52 |   });
  53 |   expect(result).toEqual({ current: false, blocked: true });
  54 | });
  55 | 
  56 | test('query/path/marker lookalikes and outside icons remain ordinary navigation', async ({ page }) => {
  57 |   const rows = [['query', '/guide?next=/api/FileDown.do', 'ir-download'], ['hash', '/guide#FileDown.do', 'ir-download'], ['suffix', '/api/FileDown.doing', 'ir-download'], ['child-path', '/api/FileDown.do/help', 'ir-download'], ['guide', '/api/FileDown.do', 'icon-download-guide'], ['negative', '/api/FileDown.do', 'no-download']];
  58 |   await setup(page, `<main><div class="ir-download">${rows.map(([id, href, marker]) => `<a id="${id}" href="${href}"><span class="${marker}"></span>공개 양식</a>`).join('')}<a id="outside" href="/api/FileDown.do">공개 양식</a><i class="ir-download"></i></div></main>`);
  59 |   expect((await observations(page)).map(row => row.action)).toEqual(Array(rows.length + 1).fill('navigate'));
  60 | });
  61 | 
  62 | test('editable descendants and private getters never contribute a download signal', async ({ page }) => {
  63 |   await setup(page, '<main><a id="editable" href="/api/FileDown.do">공개 양식<span contenteditable="true"><i class="ir-download"></i>PRIVATE_CANARY Download</span></a><a id="custom" href="/api/FileDown.do">공개 양식<span role="slider"><span class="ir-download"></span>PRIVATE_CANARY Download</span></a><a id="input" href="/api/FileDown.do">공개 양식<input class="ir-download" value="PRIVATE_CANARY Download"></a></main>');
  64 |   await page.evaluate(() => {
  65 |     window.privateReads = 0;
  66 |     const trap = () => { privateReads++; throw Error('private content read'); };
  67 |     for (const input of document.querySelectorAll('input')) Object.defineProperty(input, 'value', { get: trap });
  68 |     for (const editor of document.querySelectorAll('[contenteditable],[role=slider]')) {
  69 |       for (const key of ['textContent', 'innerText']) Object.defineProperty(editor, key, { get: trap });
  70 |       for (const node of editor.childNodes) if (node.nodeType === Node.TEXT_NODE) Object.defineProperty(node, 'nodeValue', { get: trap });
  71 |     }
  72 |   });
  73 |   const result = await observations(page);
  74 |   expect(result.map(row => row.action)).toEqual(['navigate', 'navigate', 'navigate']);
  75 |   expect(JSON.stringify(result)).not.toContain('PRIVATE_CANARY');
  76 |   expect(await page.evaluate(() => ({ reads: privateReads, snapshots: JSON.stringify(reviewCandidates.map(row => row.snapshot)) }))).toEqual(expect.objectContaining({ reads: 0 }));
  77 |   expect(await page.evaluate(() => JSON.stringify(reviewCandidates.map(row => row.snapshot)))).not.toContain('PRIVATE_CANARY');
  78 | });
  79 | 
  80 | test('focus-time marker mutation rejects original guidance without activation', async ({ page }) => {
  81 |   await setup(page, '<main><form id="form"><a id="source" href="/api/FileDown.do"><i id="marker" class="ir-download"></i>신청서 이용 안내</a></form></main>');
  82 |   const result = await page.evaluate(() => {
  83 |     const candidate = IndependentDownload.analyzePage().find(row => row.element.id === 'source');
  84 |     let clicks = 0, submits = 0;
  85 |     const source = document.querySelector('#source');
  86 |     source.addEventListener('click', event => { clicks++; event.preventDefault(); });
  87 |     document.addEventListener('click', event => { if (event.target.closest('#source')) clicks++; });
  88 |     document.querySelector('#form').addEventListener('submit', event => { submits++; event.preventDefault(); });
  89 |     source.addEventListener('focus', () => { document.querySelector('#marker').className = 'ir-print'; }, { once: true });
  90 |     const guidance = IndependentDownload.locateOriginal(candidate, () => {});
  91 |     return { guidance, clicks, submits };
  92 |   });
  93 |   expect(result).toEqual({ guidance: { ok: false, reason: 'changed' }, clicks: 0, submits: 0 });
  94 | });
  95 | 
```