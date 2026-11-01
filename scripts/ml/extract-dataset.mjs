import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// M0 of docs/09_local_ai_review.md. Exposed development suites only, each source
// page once (same list as compare-development uniqueSuites). Never add a fresh
// holdout here. Labels come from human `accepted` annotations, never from the
// rule engine; the rule result is kept only as a comparison column.
const suites = ['core','blind-v2','blind-v3','development-v4-corrected','blind-v5','development-v6-corrected-v2','development-v7-corrected-v2','blind-v8','blind-v9-v2','blind-v10'];
const correctedBaseSuite = {
  'development-v4-corrected': 'blind-v4',
  'development-v6-corrected-v2': 'blind-v6',
  'development-v7-corrected-v2': 'blind-v7-v2',
};
const siteAliases = { cheonan: 'city', nl: 'library', nps: 'public-agency', safekorea: 'government' };
for (const arg of process.argv.slice(2)) if (!/^--output-dir=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const outputDir = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'docs/evidence/local-ai/m0';
await mkdir(outputDir, { recursive: true });
if ((await readdir(outputDir)).length) throw Error('Extraction requires an empty output directory');
const sha = input => createHash('sha256').update(input).digest('hex');

const bundle = await build({ stdin: {
  contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {rank} from './src/ranker';
window.extractEasyWeb=()=>{
  const raw=analyzePage();
  const classified=classify(raw,{mode:'institution'});
  const ruleCategory=new Map(classified.map(c=>[c.element,c.category]));
  const selected=new Set(rank(classified).map(c=>c.element));
  return raw.map(c=>{
    let hrefPath=null, sameHost=null;
    if(c.href){try{const u=new URL(c.href);hrefPath=u.pathname.split('/').filter(Boolean).pop()?.replace(/\\.[a-z0-9]+$/i,'')??'';sameHost=u.host===location.host;}catch{}}
    return {label:c.label,sectionLabel:c.sectionLabel??null,contextLabels:(c.contextLabels??[]).slice(0,3),context:c.context,action:c.action,
      tag:c.element.tagName.toLowerCase(),role:c.element.getAttribute('role'),hrefPath,sameHost,opensNewWindow:!!c.opensNewWindow,
      evalId:c.element.dataset.evalId??null,ruleCategory:ruleCategory.get(c.element)??null,ruleSelected:selected.has(c.element)};
  });
};`,
  resolveDir: process.cwd(), loader: 'ts',
}, bundle: true, write: false, format: 'iife' });

const rows = [], pages = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const suite of suites) {
    const dataRoot = suite === 'core' ? 'evaluation' : `evaluation/${suite}`;
    const siteRoot = suite === 'blind-v9-v2' ? dataRoot : `${dataRoot}/sites`;
    for (const file of (await readdir(siteRoot)).filter(name => name.endsWith('.json')).sort()) {
      const site = JSON.parse(await readFile(`${siteRoot}/${file}`, 'utf8'));
      const siteId = siteAliases[site.siteId] ?? site.siteId;
      for (const target of site.pages) {
        const html = await readFile(target.fixture, 'utf8');
        const page = await browser.newPage({ viewport: target.observation.viewport });
        try {
          await page.route('**/*', route => route.request().isNavigationRequest()
            ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
            : route.abort());
          await page.goto(target.finalUrl || target.url);
          const cdp = await page.context().newCDPSession(page);
          await cdp.send('Page.enable');
          const { frameTree } = await cdp.send('Page.getFrameTree');
          const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'easyweb-ml-extract' });
          const injected = await cdp.send('Runtime.evaluate', { expression: bundle.outputFiles[0].text, contextId: executionContextId });
          if (injected.exceptionDetails) throw Error(`Engine injection failed: ${injected.exceptionDetails.text}`);
          const observed = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.extractEasyWeb())', contextId: executionContextId, returnByValue: true });
          if (observed.exceptionDetails) throw Error(`${target.id}: extraction failed`);
          await cdp.detach();
          const accepted = new Map(target.accepted.map(item => [item.sourceId, item.category]));
          const expected = new Set(target.expected.flatMap(item => item.sourceIds));
          const candidates = JSON.parse(observed.result.value);
          for (const candidate of candidates) {
            // Annotated but not accepted means a reviewer saw it and did not
            // accept it as any category. Unannotated controls stay unlabeled.
            const label = candidate.evalId === null ? null : accepted.get(candidate.evalId) ?? 'none';
            rows.push({ suite, siteId, pageId: target.id, ...candidate, gold: label, expected: expected.has(candidate.evalId) });
          }
          pages.push({ suite, siteId, pageId: target.id, fixtureSha256: sha(html), candidates: candidates.length });
        } finally { await page.close(); }
      }
    }
  }
} finally { await browser.close(); }

if (pages.length !== 60) throw Error(`Expected 60 unique exposed pages, got ${pages.length}`);
const count = key => rows.reduce((acc, row) => (acc[row[key] ?? 'unlabeled'] = (acc[row[key] ?? 'unlabeled'] ?? 0) + 1, acc), {});
const jsonl = rows.map(row => JSON.stringify(row)).join('\n') + '\n';
await writeFile(path.join(outputDir, 'dataset.jsonl'), jsonl);
const summary = {
  createdAt: new Date().toISOString(),
  classification: 'EXPOSED_DEVELOPMENT_ONLY',
  scope: 'Training/diagnostic features for docs/09_local_ai_review.md M0. Gold labels are human accepted annotations; ruleCategory is comparison only. Not an independent evaluation.',
  suites, pages: pages.length, candidates: rows.length,
  goldDistribution: count('gold'), bySite: count('siteId'),
  datasetSha256: sha(jsonl), bundleSha256: sha(bundle.outputFiles[0].text), pageDetails: pages,
};
await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ pages: summary.pages, candidates: summary.candidates, goldDistribution: summary.goldDistribution, bySite: summary.bySite }, null, 2));
