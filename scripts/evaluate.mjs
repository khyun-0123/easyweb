import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scorePage, qualityGate } from './evaluation-metrics.mjs';
import { validateFreshMode, verifyFrozenFiles } from './evaluation-protocol.mjs';
import { buildMenuFlowHarness, observeMenuFlow } from './menu-flow-evaluation.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/evaluate.mjs [--engine=current|baseline] [--suite=core|blind-v2|blind-v3|blind-v4|blind-v5|blind-v6|development-v4-corrected] [--split=calibration|holdout|all] [--output-dir=docs/evidence/run003] [--phase=post-holdout-development|fresh-blind-validation|frozen-baseline] [--engine-freeze=FILE] [--dataset-freeze=FILE] [--require-quality] [--with-menu-flow]\nFresh blind mode requires explicit frozen inputs and a new output file. Menu-flow coverage is separate from initial-screen quality.');
  process.exit(0);
}
for (const arg of args) {
  if (!/^--(?:engine|suite|split|output-dir|phase|engine-freeze|dataset-freeze)=.+$/.test(arg)
    && !['--require-quality', '--with-menu-flow'].includes(arg)) throw new Error(`Unknown or incomplete option: ${arg}`);
}
const value = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const engine = value('engine', 'current');
const split = value('split', 'calibration');
const outputDir = value('output-dir', 'docs/evidence/run003');
const suite = value('suite', 'core');
const withMenuFlow = args.includes('--with-menu-flow');
if (withMenuFlow && engine !== 'current') throw new Error('Menu flow is supported for the current engine only');
if (!['core', 'blind-v2', 'blind-v3', 'blind-v4', 'blind-v5', 'blind-v6', 'development-v4-corrected'].includes(suite)) throw new Error('suite=core|blind-v2|blind-v3|blind-v4|blind-v5|blind-v6|development-v4-corrected');
const dataRoot = suite === 'core' ? 'evaluation' : `evaluation/${suite}`;
const fixtureRoot = suite === 'development-v4-corrected' ? 'evaluation/blind-v4' : dataRoot;
const phase = value('phase', engine === 'baseline' ? 'frozen-baseline' : 'post-holdout-development');
if (!['frozen-baseline', 'fresh-blind-validation', 'post-holdout-development'].includes(phase)) throw new Error('Invalid evaluation phase');
if (suite === 'development-v4-corrected' && phase !== 'post-holdout-development') throw new Error('Adjudicated v4 data is development only');
const output = `${outputDir}/evaluation-${engine}-${suite === 'core' ? '' : `${suite}-`}${split}.json`;
let freezeVerification = null;
if (phase === 'fresh-blind-validation') {
  validateFreshMode({ engine, suite, split, outputDir,
    explicitOutput: args.some(arg => arg.startsWith('--output-dir=')),
    engineFreeze: value('engine-freeze'), datasetFreeze: value('dataset-freeze') });
  try {
    await readFile(output);
    throw new Error('First independent evaluation already exists; preserve it and use development phase after exposure');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const requiredPagesPerSite = suite === 'core' ? 3 : 1;
const requiredPageCount = suite === 'core' ? 15 : 5;
const minimumExpected = suite === 'core' ? 30 : 10;
if (!['current', 'baseline'].includes(engine) || !['all', 'calibration', 'holdout'].includes(split)) throw new Error('engine=current|baseline, split=calibration|holdout|all');
const siteFiles = (await readdir(`${dataRoot}/sites`)).filter(file => file.endsWith('.json')).sort();
const sites = await Promise.all(siteFiles.map(async file => JSON.parse(await readFile(`${dataRoot}/sites/${file}`, 'utf8'))));
const ids = new Set();
const categories = new Set(['login', 'search', 'notice', 'academic', 'apply', 'help']);
let expectedCount = 0;
for (const site of sites) {
  if (!site.siteId || site.pages.length !== requiredPagesPerSite) throw new Error(`사이트당 ${requiredPagesPerSite}개 페이지 필요: ${site.siteId}`);
  if (site.pages.filter(p => p.split === 'holdout').length !== 1) throw new Error(`사이트당 보류 페이지 1개 필요: ${site.siteId}`);
  for (const page of site.pages) {
    if (ids.has(page.id)) throw new Error(`페이지 ID 중복: ${page.id}`);
    ids.add(page.id);
    if (page.expected.length < 2 || !page.task?.expectedSourceIds?.length) throw new Error(`정답/과제 부족: ${page.id}`);
    if (!page.expected.every(x => categories.has(x.category) && x.sourceIds?.length)) throw new Error(`정답 분류/소스 누락: ${page.id}`);
    if (!page.accepted.every(x => categories.has(x.category) && x.sourceId)) throw new Error(`허용 추천 형식 오류: ${page.id}`);
    if (page.fixture.includes('..') || !page.fixture.startsWith(`${fixtureRoot}/fixtures/`)) throw new Error('fixture 경로 오류');
    expectedCount += page.expected.length;
  }
}
if (sites.length !== 5 || ids.size !== requiredPageCount || expectedCount < minimumExpected) throw new Error(`5개 사이트·${requiredPageCount}개 페이지·${minimumExpected}개 이상 기대 기능이 필요합니다.`);
if (phase === 'fresh-blind-validation') {
  const productFiles = (await readdir('src')).map(file => `src/${file}`).concat('extension/manifest.json');
  const datasetFiles = siteFiles.map(file => `${dataRoot}/sites/${file}`).concat(sites.flatMap(site => site.pages.map(page => page.fixture)));
  freezeVerification = {
    engine: await verifyFrozenFiles(value('engine-freeze'), productFiles),
    dataset: await verifyFrozenFiles(value('dataset-freeze'), datasetFiles),
    scope: 'Frozen bytes verified before product execution. Independent annotation/blinding is a separate process claim, not established by hashes alone.',
  };
}
const root = engine === 'baseline' ? './docs/evidence/run001/baseline/src' : './src';
const sha = input => createHash('sha256').update(input).digest('hex');
const toolPaths = ['scripts/evaluate.mjs', 'scripts/evaluation-metrics.mjs', 'scripts/evaluation-protocol.mjs', 'scripts/menu-flow-evaluation.mjs'];
const toolHashes = Object.fromEntries(await Promise.all(toolPaths.map(async path => [path, sha(await readFile(path))])));
const bundle = await build({ stdin: {
  contents: `import {analyzePage} from '${root}/analyzer'; import {classify} from '${root}/classifier'; import {rank} from '${root}/ranker'; window.evaluateEasyWeb=()=>{const raw=analyzePage();const classified=classify(raw);return {candidateCount:raw.length,classifiedCount:classified.length,selected:rank(classified).map(({element,snapshot,...item})=>({...item,sourceId:element.dataset.evalId??null}))};};`,
  resolveDir: process.cwd(), loader: 'ts',
}, bundle: true, write: false, format: 'iife' });
const fixtureHashes = {};
const menuFlowBundle = withMenuFlow ? await buildMenuFlowHarness() : null;
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
        // 확장의 isolated world처럼 실행합니다. 원본 CSP·동결 fixture는 변경하지 않습니다.
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Page.enable');
        const { frameTree } = await cdp.send('Page.getFrameTree');
        const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'easyweb-offline-evaluation' });
        const injected = await cdp.send('Runtime.evaluate', { expression: bundle.outputFiles[0].text, contextId: executionContextId });
        if (injected.exceptionDetails) throw new Error(`Engine injection failed: ${injected.exceptionDetails.text}`);
        const observed = await cdp.send('Runtime.evaluate', { expression: 'JSON.stringify(window.evaluateEasyWeb())', contextId: executionContextId, returnByValue: true });
        if (observed.exceptionDetails || typeof observed.result.value !== 'string') throw new Error('Engine result serialization failed');
        const actual = JSON.parse(observed.result.value);
        const destinations = await page.locator('a[data-eval-id][href]').evaluateAll(elements => Object.fromEntries(elements.map(el => [el.dataset.evalId, el.href])));
        const menuFlow = menuFlowBundle ? await observeMenuFlow(page, cdp, executionContextId, menuFlowBundle, target, destinations, Math.max(1, actual.candidateCount)) : null;
        await cdp.detach();
        results.push({ siteId: site.siteId, pageId: target.id, split: target.split, url: target.finalUrl || target.url, ...actual,
          ...scorePage(actual, target, destinations),
          ...(menuFlow ? { menuFlow } : {}),
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
const report = { checkedAt: new Date().toISOString(), engine, suite, split,
  evaluationPhase: phase,
  freezeVerification,
  toolHashes,
  evaluationWorld: 'CDP isolated world on offline routed fixtures. CSP and frozen data remain unchanged; no browser security bypass or native extension user gesture.',
  environment,
  scope: '독립적으로 작성한 공개 메뉴 재구성 fixture의 오프라인 평가. 실제 전체 페이지·실제 Chrome 실행·과제 완료 결과가 아님.',
  engineHash: sha(bundle.outputFiles[0].text), datasetHash: sha(JSON.stringify(sites)), fixtureHashes,
  summary: summarize(results), sites: sites.map(site => ({ siteId: site.siteId, ...summarize(results.filter(row => row.siteId === site.siteId)) })), results };
report.quality = qualityGate(report.summary, report.sites);
for (const path of toolPaths) if (sha(await readFile(path)) !== toolHashes[path]) throw new Error(`Evaluation tool changed during run: ${path}`);
if (withMenuFlow) report.menuFlow = {
  scope: 'Separate additional-menu display coverage. Does not replace or alter original first-screen accuracy/recall acceptance.',
  summary: summarize(results.map(row => row.menuFlow)),
  sites: sites.map(site => ({ siteId: site.siteId, ...summarize(results.filter(row => row.siteId === site.siteId).map(row => row.menuFlow)) })),
  unresolvedMappings: results.reduce((sum, row) => sum + row.menuFlow.unresolvedMappings.length, 0),
  repeatedCards: results.reduce((sum, row) => sum + row.menuFlow.repeatedCards.length, 0),
};
if (phase === 'fresh-blind-validation') {
  await verifyFrozenFiles(value('engine-freeze'));
  await verifyFrozenFiles(value('dataset-freeze'));
  report.freezeVerification.stableThroughEvaluation = true;
}
await mkdir(outputDir, { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n', phase === 'fresh-blind-validation' ? { flag: 'wx' } : undefined);
console.log(JSON.stringify({ output, summary: report.summary, sites: report.sites, quality: report.quality }, null, 2));
if (args.includes('--require-quality') && report.quality.status !== 'PASS') process.exitCode = 1;
