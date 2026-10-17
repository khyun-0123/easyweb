import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let engine;
test.beforeAll(async () => {
  const bundle = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer'; export {sourceAction,sourceDownloadEvidence} from './src/action-policy'; export {isCandidateCurrent} from './src/page-session'; export {openEasyMode} from './src/easy-mode'; export {locateOriginal} from './src/action-bridge';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'IndependentDownload', loader: { '.css': 'text' } });
  engine = bundle.outputFiles[0].text;
});

async function setup(page, html) {
  await page.route('**/*', route => route.abort());
  await page.setContent(`<base href="https://independent.invalid/public/">${html}`);
  await page.addScriptTag({ content: engine });
}

async function observations(page) {
  return page.evaluate(() => {
    window.reviewCandidates = IndependentDownload.analyzePage();
    return reviewCandidates.map(({ element, label, action }) => ({ id: element.id, label, action,
      evidence: IndependentDownload.sourceDownloadEvidence(element, label) ?? null }));
  });
}

test('fixed safe-label negations do not become a download operation', async ({ page }) => {
  const labels = ['Do not download', 'No download', 'Never download now', '금지된 다운로드'];
  await setup(page, `<main>${labels.map((label, i) => `<a id="negative-${i}" href="/api/FileDown.do?part=${i}" aria-label="${label}">공개 양식</a>`).join('')}<a id="positive" href="/api/FileDown.do" aria-label="Download now">공개 양식</a></main>`);
  const result = await observations(page);
  expect(result.filter(row => row.id.startsWith('negative-'))).toEqual(labels.map((label, i) => ({ id: `negative-${i}`, label, action: 'navigate', evidence: null })));
  expect(result.find(row => row.id === 'positive').action).toBe('locate');
});

test('own exact icon class provides source-local evidence like a descendant icon', async ({ page }) => {
  await setup(page, '<main><a id="own" class="ir-download" href="/api/FileDown.do">공개 양식</a><a id="child" href="/api/FileDown.do"><i class="ir-download" aria-hidden="true"></i>공개 양식</a></main>');
  const result = await observations(page);
  expect(result.map(({ id, action }) => ({ id, action }))).toEqual([{ id: 'own', action: 'locate' }, { id: 'child', action: 'locate' }]);
});

test('adding the own icon class synchronously invalidates and blocks an old navigation card', async ({ page }) => {
  await setup(page, '<main><a id="source" href="/api/FileDown.do">신청서 이용 안내</a></main>');
  const result = await page.evaluate(() => {
    window.reviewCandidates = IndependentDownload.analyzePage();
    const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
    IndependentDownload.openEasyMode(host);
    const card = host.shadowRoot.querySelector('.card');
    let blocked = null;
    // Observe product cancellation, then stop every browser default action.
    card.addEventListener('click', event => { blocked = event.defaultPrevented; event.preventDefault(); }, { once: true });
    document.querySelector('#source').className = 'ir-download';
    const current = IndependentDownload.isCandidateCurrent(reviewCandidates[0]);
    card.click();
    return { current, blocked };
  });
  expect(result).toEqual({ current: false, blocked: true });
});

test('query/path/marker lookalikes and outside icons remain ordinary navigation', async ({ page }) => {
  const rows = [['query', '/guide?next=/api/FileDown.do', 'ir-download'], ['hash', '/guide#FileDown.do', 'ir-download'], ['suffix', '/api/FileDown.doing', 'ir-download'], ['child-path', '/api/FileDown.do/help', 'ir-download'], ['guide', '/api/FileDown.do', 'icon-download-guide'], ['negative', '/api/FileDown.do', 'no-download']];
  await setup(page, `<main><div class="ir-download">${rows.map(([id, href, marker]) => `<a id="${id}" href="${href}"><span class="${marker}"></span>공개 양식</a>`).join('')}<a id="outside" href="/api/FileDown.do">공개 양식</a><i class="ir-download"></i></div></main>`);
  expect((await observations(page)).map(row => row.action)).toEqual(Array(rows.length + 1).fill('navigate'));
});

test('editable descendants and private getters never contribute a download signal', async ({ page }) => {
  await setup(page, '<main><a id="editable" href="/api/FileDown.do">공개 양식<span contenteditable="true"><i class="ir-download"></i>PRIVATE_CANARY Download</span></a><a id="custom" href="/api/FileDown.do">공개 양식<span role="slider"><span class="ir-download"></span>PRIVATE_CANARY Download</span></a><a id="input" href="/api/FileDown.do">공개 양식<input class="ir-download" value="PRIVATE_CANARY Download"></a></main>');
  await page.evaluate(() => {
    window.privateReads = 0;
    const trap = () => { privateReads++; throw Error('private content read'); };
    for (const input of document.querySelectorAll('input')) Object.defineProperty(input, 'value', { get: trap });
    for (const editor of document.querySelectorAll('[contenteditable],[role=slider]')) {
      for (const key of ['textContent', 'innerText']) Object.defineProperty(editor, key, { get: trap });
      for (const node of editor.childNodes) if (node.nodeType === Node.TEXT_NODE) Object.defineProperty(node, 'nodeValue', { get: trap });
    }
  });
  const result = await observations(page);
  expect(result.map(row => row.action)).toEqual(['navigate', 'navigate', 'navigate']);
  expect(JSON.stringify(result)).not.toContain('PRIVATE_CANARY');
  expect(await page.evaluate(() => ({ reads: privateReads, snapshots: JSON.stringify(reviewCandidates.map(row => row.snapshot)) }))).toEqual(expect.objectContaining({ reads: 0 }));
  expect(await page.evaluate(() => JSON.stringify(reviewCandidates.map(row => row.snapshot)))).not.toContain('PRIVATE_CANARY');
});

test('focus-time marker mutation rejects original guidance without activation', async ({ page }) => {
  await setup(page, '<main><form id="form"><a id="source" href="/api/FileDown.do"><i id="marker" class="ir-download"></i>신청서 이용 안내</a></form></main>');
  const result = await page.evaluate(() => {
    const candidate = IndependentDownload.analyzePage().find(row => row.element.id === 'source');
    let clicks = 0, submits = 0;
    const source = document.querySelector('#source');
    source.addEventListener('click', event => { clicks++; event.preventDefault(); });
    document.addEventListener('click', event => { if (event.target.closest('#source')) clicks++; });
    document.querySelector('#form').addEventListener('submit', event => { submits++; event.preventDefault(); });
    source.addEventListener('focus', () => { document.querySelector('#marker').className = 'ir-print'; }, { once: true });
    const guidance = IndependentDownload.locateOriginal(candidate, () => {});
    return { guidance, clicks, submits };
  });
  expect(result).toEqual({ guidance: { ok: false, reason: 'changed' }, clicks: 0, submits: 0 });
});
