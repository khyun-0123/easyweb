import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Read-only look at what the current engine shows first on the real public
// pages of the core suite. Fixtures are reduced menus, so this catches noise
// (individual posts, banners) that the development scores never see.
// No clicks, input or form submission. Output is for human review only.
for (const arg of process.argv.slice(2)) if (!/^--output-dir=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const outputDir = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length);
if (!outputDir) throw Error('--output-dir=<new empty directory> is required');
await mkdir(outputDir, { recursive: true });
if ((await readdir(outputDir)).length) throw Error('Output directory must be empty');

const bundle = await build({ stdin: {
  contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {rank} from './src/ranker'; import {composeFirstScreen} from './src/page-types';
window.easywebFirstSix=()=>{const raw=analyzePage();const classified=classify(raw);const screen=composeFirstScreen(raw,classified);const common=screen.common;
return {candidateCount:raw.length,classifiedCount:classified.length,
  common:common.map(({kind,candidate})=>({kind,label:candidate.label,href:candidate.href??null})),
  pageType:screen.type,
  ranked:[...screen.cards,...rank(screen.pool).filter(c=>!screen.cards.includes(c))].map(c=>({category:c.category,label:c.label,section:c.sectionLabel??null,action:c.action,href:c.href??null,score:c.score}))};};`,
  resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife' });

const pages = [];
for (const file of (await readdir('evaluation/sites')).filter(name => name.endsWith('.json')).sort()) {
  const site = JSON.parse(await readFile(`evaluation/sites/${file}`, 'utf8'));
  for (const page of site.pages) pages.push({ siteId: site.siteId, siteName: site.name, pageId: page.id, url: page.finalUrl || page.url,
    expected: page.expected.map(item => ({ category: item.category, label: item.label })) });
}
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const target of pages) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    try {
      const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      // Some sites fade the whole page in after load; analyze what a user can see.
      await page.waitForTimeout(1500);
      // Run like the extension: in an isolated world, so page globals cannot interfere.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.enable');
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'easyweb-live-first-six' });
      const injected = await cdp.send('Runtime.evaluate', { expression: bundle.outputFiles[0].text, contextId: executionContextId });
      if (injected.exceptionDetails) throw Error(`Engine injection failed: ${injected.exceptionDetails.text}`);
      const observed = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.easywebFirstSix())', contextId: executionContextId, returnByValue: true });
      if (observed.exceptionDetails) throw Error(`Engine failed: ${observed.exceptionDetails.exception?.description?.slice(0, 200) ?? observed.exceptionDetails.text}`);
      await cdp.detach();
      const analysis = JSON.parse(observed.result.value);
      results.push({ ...target, finalUrl: page.url(), httpStatus: response?.status() ?? null, ...analysis,
        firstSix: analysis.ranked.slice(0, 6), moreCount: Math.max(0, analysis.ranked.length - 6) });
    } catch (error) {
      results.push({ ...target, error: String(error).slice(0, 300) });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }

const report = { checkedAt: new Date().toISOString(), scope: 'Live public pages, read-only headless. Engine output only; not task completion, not an independent evaluation. Pages may have changed since annotation.', results };
await writeFile(path.join(outputDir, 'first-six.json'), JSON.stringify(report, null, 2) + '\n');
const lines = [];
for (const r of results) {
  lines.push(`### ${r.siteName} · ${r.pageId}`, '', r.url, '');
  if (r.error) { lines.push(`열기 실패: ${r.error}`, ''); continue; }
  lines.push(`후보 ${r.candidateCount}개 · 분류됨 ${r.classifiedCount}개 · 다른 메뉴 ${r.moreCount}개`, '');
  lines.push(`정답표의 꼭 필요한 기능: ${r.expected.map(e => `${e.label}(${e.category})`).join(', ')}`, '');
  lines.push('| # | 분류 | 카드에 나온 메뉴 | 이동 | 좋음/별로 | 메모 |', '| --- | --- | --- | --- | --- | --- |');
  r.firstSix.forEach((c, i) => lines.push(`| ${i + 1} | ${c.category} | ${c.label.replace(/\|/g, '/').slice(0, 60)} | ${c.action === 'navigate' ? '바로 이동' : '원본 안내'} |  |  |`));
  lines.push('', '빠진 기능 (있으면 적기):', '');
}
await writeFile(path.join(outputDir, 'first-six.md'), lines.join('\n') + '\n');
console.log(results.map(r => `${r.pageId}: ${r.error ? 'ERROR' : r.firstSix.map(c => `${c.category}:${c.label.slice(0, 24)}`).join(' / ')}`).join('\n'));
