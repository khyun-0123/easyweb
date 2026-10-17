import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scorePage } from './evaluation-metrics.mjs';

const args = process.argv.slice(2);
const value = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const engine = value('engine', 'current');
const split = value('split', 'calibration');
if (!['current', 'baseline'].includes(engine) || !['all', 'calibration', 'holdout'].includes(split)) throw new Error('engine=current|baseline, split=calibration|holdout|all');
const siteFiles = (await readdir('evaluation/sites')).filter(file => file.endsWith('.json')).sort();
const sites = await Promise.all(siteFiles.map(async file => JSON.parse(await readFile(`evaluation/sites/${file}`, 'utf8'))));
const ids = new Set();
const categories = new Set(['login', 'search', 'notice', 'academic', 'apply', 'help']);
let expectedCount = 0;
for (const site of sites) {
  if (!site.siteId || site.pages.length !== 3) throw new Error(`사이트당 3개 페이지 필요: ${site.siteId}`);
  if (site.pages.filter(p => p.split === 'holdout').length !== 1) throw new Error(`사이트당 보류 페이지 1개 필요: ${site.siteId}`);
  for (const page of site.pages) {
    if (ids.has(page.id)) throw new Error(`페이지 ID 중복: ${page.id}`);
    ids.add(page.id);
    if (page.expected.length < 2 || !page.task?.expectedSourceIds?.length) throw new Error(`정답/과제 부족: ${page.id}`);
    if (!page.expected.every(x => categories.has(x.category) && x.sourceIds?.length)) throw new Error(`정답 분류/소스 누락: ${page.id}`);
    if (!page.accepted.every(x => categories.has(x.category) && x.sourceId)) throw new Error(`허용 추천 형식 오류: ${page.id}`);
    if (page.fixture.includes('..') || !page.fixture.startsWith('evaluation/fixtures/')) throw new Error('fixture 경로 오류');
    expectedCount += page.expected.length;
  }
}
if (sites.length !== 5 || ids.size !== 15 || expectedCount < 30) throw new Error('5개 사이트·15개 페이지·30개 이상 기대 기능이 필요합니다.');
const root = engine === 'baseline' ? './docs/evidence/run001/baseline/src' : './src';
const bundle = await build({ stdin: {
  contents: `import {analyzePage} from '${root}/analyzer'; import {classify} from '${root}/classifier'; import {rank} from '${root}/ranker'; window.evaluateEasyWeb=()=>{const raw=analyzePage();const classified=classify(raw);return {candidateCount:raw.length,classifiedCount:classified.length,selected:rank(classified).map(({element,snapshot,...item})=>({...item,sourceId:element.dataset.evalId??null}))};};`,
  resolveDir: process.cwd(), loader: 'ts',
}, bundle: true, write: false, format: 'iife' });
const sha = input => createHash('sha256').update(input).digest('hex');
const fixtureHashes = {};
const browser = await chromium.launch({ headless: true });
const environment = { node: process.version, platform: process.platform, architecture: process.arch,
  chromium: browser.version(), playwright: JSON.parse(await readFile('node_modules/@playwright/test/package.json', 'utf8')).version };
const results = [];
try {
  for (const site of sites) {
    for (const target of site.pages.filter(p => split === 'all' || p.split === split)) {
      const html = await readFile(target.fixture, 'utf8');
      fixtureHashes[target.id] = sha(html);
      const page = await browser.newPage({ viewport: target.observation.viewport });
      try {
        // 실제 페이지와 같은 URL로 오프라인 재현하며 제3자 통신은 차단합니다.
        await page.route('**/*', route => route.request().isNavigationRequest()
          ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
          : route.abort());
        await page.goto(target.finalUrl || target.url);
        const sourceIds = await page.locator('[data-eval-id]').evaluateAll(elements => elements.map(el => el.dataset.evalId));
        if (new Set(sourceIds).size !== sourceIds.length) throw new Error(`${target.id}: fixture 소스 ID 중복`);
        for (const expected of target.expected) for (const id of expected.sourceIds) if (!sourceIds.includes(id)) throw new Error(`${target.id}: 소스 ID 없음 ${id}`);
        for (const accepted of target.accepted) if (!sourceIds.includes(accepted.sourceId)) throw new Error(`${target.id}: 허용 소스 ID 없음 ${accepted.sourceId}`);
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        const actual = await page.evaluate(() => window.evaluateEasyWeb());
        const destinations = await page.locator('a[data-eval-id][href]').evaluateAll(elements => Object.fromEntries(elements.map(el => [el.dataset.evalId, el.href])));
        results.push({ siteId: site.siteId, pageId: target.id, split: target.split, url: target.finalUrl || target.url, ...actual,
          ...scorePage(actual, target, destinations),
        });
      } finally { await page.close(); }
    }
  }
} finally { await browser.close(); }
function summarize(rows) {
  const sum = name => rows.reduce((total, row) => total + row[name], 0);
  return { pages: rows.length, correct: sum('correct'), recommended: sum('recommended'), matched: sum('matched'), expected: sum('expected'),
    precision: sum('recommended') ? sum('correct') / sum('recommended') : null, recall: sum('matched') / sum('expected'),
    tasksRecommended: rows.filter(row => row.taskRecommended).length,
  };
}
const report = { checkedAt: new Date().toISOString(), engine, split,
  environment,
  scope: '독립적으로 작성한 공개 메뉴 재구성 fixture의 오프라인 평가. 실제 전체 페이지·실제 Chrome 실행·과제 완료 결과가 아님.',
  engineHash: sha(bundle.outputFiles[0].text), datasetHash: sha(JSON.stringify(sites)), fixtureHashes,
  summary: summarize(results), sites: sites.map(site => ({ siteId: site.siteId, ...summarize(results.filter(row => row.siteId === site.siteId)) })), results };
await mkdir('docs/evidence/run001', { recursive: true });
const output = `docs/evidence/run001/evaluation-${engine}-${split}.json`;
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, summary: report.summary, sites: report.sites }, null, 2));
