import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import assert from 'node:assert/strict';

// Replay only the two already-exposed original controls. Evaluation IDs are
// used here for correspondence; they are never part of the product rule.
const fixture = 'evaluation/blind-v8/fixtures/city-blind-v8.html';
const html = await readFile(fixture, 'utf8');
const sourceFiles = Object.fromEntries(await Promise.all(['src/action-policy.ts', 'src/analyzer.ts'].map(async file =>
  [file, createHash('sha256').update(await readFile(file)).digest('hex')])));
const bundle = await build({ stdin: { contents: "export { analyzePage } from './src/analyzer';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'KnownDownloads' });
const browser = await chromium.launch({ headless: true });
let result;
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  await page.setContent(html);
  const ids = ['city-v8-c015', 'city-v8-c016'];
  const original = await page.evaluate(ids => ids.map(id => {
    const element = document.querySelector(`[data-eval-id="${id}"]`);
    return [id, element.outerHTML];
  }), ids);
  // Keep the fixture's script-src 'none'. Inject only our analyzer in an
  // isolated world, as the existing offline evaluator/extension harness does.
  const cdp = await page.context().newCDPSession(page);
  const { frameTree } = await cdp.send('Page.getFrameTree');
  const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'easyweb-known-download-replay' });
  const injected = await cdp.send('Runtime.evaluate', { expression: bundle.outputFiles[0].text, contextId: executionContextId });
  assert(!injected.exceptionDetails);
  const observed = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify((() => {
    const candidates = KnownDownloads.analyzePage();
    return ${JSON.stringify(ids)}.map(id => {
      const candidate = candidates.find(item => item.element.getAttribute('data-eval-id') === id);
      if (!candidate) throw new Error('Missing original control ' + id);
      return { id, label: candidate.label, action: candidate.action, cardHref: candidate.href ?? null,
        originalHref: candidate.element.getAttribute('href'), downloadIcon: !!candidate.element.querySelector('i.ir-download') };
    });
  })())`, contextId: executionContextId, returnByValue: true });
  assert(!observed.exceptionDetails);
  const controls = JSON.parse(observed.result.value);
  assert.equal(controls.length, 2);
  assert(controls.every(control => control.action === 'locate' && control.cardHref === null && control.downloadIcon));
  const after = await page.evaluate(ids => ids.map(id => [id, document.querySelector(`[data-eval-id="${id}"]`).outerHTML]), ids);
  assert.deepEqual(after, original);
  result = { checkedAt: new Date().toISOString(), status: 'PASS', fixture,
    fixtureSha256: createHash('sha256').update(html).digest('hex'), sourceFiles,
    browser: browser.version(), controls, originalMarkupUnchanged: true,
    scope: 'Headless replay of two already-exposed frozen source controls; analyzer action metadata only. No source click, actual destination response, file download/execution, native install or human task result.',
    directNavigationCardHrefs: 0, sourceClicks: 0, network: 'All requests aborted' };
} finally { await browser.close(); }
await writeFile('docs/evidence/run006/known-download-controls.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, controls: result.controls.map(({ id, action, cardHref }) => ({ id, action, cardHref })) }));
