import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const outputDir = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'docs/evidence/run002';
const sha256 = data => createHash('sha256').update(data).digest('hex');
async function sourceHashes(dir = 'src') {
  const result = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(result, await sourceHashes(file));
    else if (entry.isFile()) result[file] = sha256(await readFile(file));
  }
  return result;
}
const sourceBefore = await sourceHashes();
const bundle = await build({
  stdin: { contents: "export { analyzePage } from './src/analyzer'; export { openEasyMode } from './src/easy-mode';", resolveDir: process.cwd(), sourcefile: 'performance-entry.ts' },
  bundle: true, write: false, format: 'iife', globalName: 'EasyWebBenchmark', target: 'chrome120', loader: { '.css': 'text' },
});
const sourceAfterBundle = await sourceHashes();
if (JSON.stringify(sourceBefore) !== JSON.stringify(sourceAfterBundle)) throw new Error('Source changed while bundling. Rerun on a frozen source tree.');

// Synthetic controls only. No real page, typed value, query, or user text is collected.
const control = index => {
  const n = index + 1;
  switch (index % 10) {
    case 0: return `<a href="https://example.invalid/login/${n}">로그인 ${n}</a>`;
    case 1: return `<input type="search" aria-label="통합 검색 ${n}" placeholder="검색어 입력">`;
    case 2: return `<button type="button">공지사항 ${n}</button>`;
    case 3: return `<a href="https://example.invalid/academic-calendar/${n}">학사일정 ${n}</a>`;
    case 4: return `<a href="https://example.invalid/apply/${n}">이용 신청 ${n}</a>`;
    case 5: return `<div role="button" tabindex="0" aria-label="이용 안내 ${n}"></div>`;
    case 6: return `<input type="button" value="검색 ${n}">`;
    case 7: return `<a href="https://example.invalid/faq/${n}" target="_blank">자주 묻는 질문 ${n}</a>`;
    case 8: return `<button type="button"><span>신청 내역 조회 ${n}</span></button>`;
    default: return `<div role="searchbox" tabindex="0" aria-label="자료 검색 ${n}" contenteditable="true"></div>`;
  }
};
const section = (start, count) => Array.from({ length: count }, (_, offset) => control(start + offset)).join('');
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><title>EasyWeb synthetic performance fixture</title>
<style>body{margin:0;font:16px sans-serif}nav,section,footer{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:12px}a,button,input,[role]{min-height:36px;box-sizing:border-box}h1,h2{grid-column:1/-1}</style>
<header><nav aria-label="전역 메뉴">${section(0, 200)}</nav></header><main><h1>합성 성능 검사</h1>
${Array.from({ length: 6 }, (_, index) => `<section><h2>공개 기능 ${index + 1}</h2>${section(200 + index * 100, 100)}</section>`).join('')}
</main><footer>${section(800, 200)}</footer></html>`;
const percentile = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
  await page.route('**/*', route => route.abort());
  await page.setContent(html);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const observations = await page.evaluate(async () => {
    const sample = async index => {
      const analysisStart = performance.now();
      const count = window.EasyWebBenchmark.analyzePage().length;
      const analyzerMilliseconds = performance.now() - analysisStart;
      const readyStart = performance.now();
      const host = document.createElement('div');
      host.dataset.easywebHost = 'true';
      document.body.append(host);
      const close = window.EasyWebBenchmark.openEasyMode(host);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dialog = host.shadowRoot?.querySelector('dialog');
      const cards = [...(host.shadowRoot?.querySelectorAll('.card') ?? [])];
      const ready = !!dialog?.open && cards.length > 0 && cards.length <= 6 &&
        cards.every(card => card.getBoundingClientRect().width > 0 && card.getBoundingClientRect().height > 0) &&
        host.shadowRoot?.activeElement === host.shadowRoot?.querySelector('.close');
      const overlayReadyMilliseconds = performance.now() - readyStart;
      const selectedCount = cards.length;
      close();
      await new Promise(resolve => requestAnimationFrame(resolve));
      return { run: index, candidateCount: count, selectedCount, analyzerMilliseconds, overlayReadyMilliseconds, ready };
    };
    const warmup = await sample(0);
    const measures = [];
    for (let index = 1; index <= 10; index++) measures.push(await sample(index));
    return { warmup, measures };
  });
  const sourceAfter = await sourceHashes();
  const sourceStable = JSON.stringify(sourceBefore) === JSON.stringify(sourceAfter);
  const analyzerP95 = percentile(observations.measures.map(row => row.analyzerMilliseconds));
  const overlayReadyP95 = percentile(observations.measures.map(row => row.overlayReadyMilliseconds));
  const validSamples = sourceStable && observations.measures.length === 10 && observations.measures.every(row => row.candidateCount === 1000 && row.ready);
  const report = {
    checkedAt: new Date().toISOString(),
    status: validSamples && analyzerP95 <= 300 && overlayReadyP95 <= 1000 ? 'PASS' : 'FAIL',
    scope: 'Synthetic mixed 1,000-control benchmark; 10 measured runs after one excluded warmup. No real site loading or user data. Headless Chromium is recorded and is separate from native extension installation checks.',
    environment: {
      platform: process.platform, architecture: process.arch, osRelease: os.release(), node: process.version,
      cpuModel: os.cpus()[0]?.model ?? 'UNKNOWN', logicalCpus: os.cpus().length, memoryBytes: os.totalmem(),
      chromium: browser.version(), headless: true, viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1,
    },
    fixture: { controls: 1000, distinctControlKinds: 10, regions: { primary: 200, body: 600, footer: 200 }, sha256: sha256(html) },
    measurement: {
      analysis: 'analyzePage() only; includes visibility, safe label, context, action, and source snapshot work',
      overlayReady: 'append host, openEasyMode() (including analysis/classification/ranking/render/focus/watchers), then two requestAnimationFrame callbacks and layout/readiness check',
      percentile: 'nearest-rank p95; with n=10 this is the maximum observed sample, not a population estimate',
      limitations: 'Synthetic local page, headless browser, small sample. Native browser startup, toolbar user gesture, third-party loading, and slow-device variation are excluded.',
      warmupExcluded: true,
    },
    validity: { sourceStable, exactlyTenRuns: observations.measures.length === 10, allCandidatesCount1000: observations.measures.every(row => row.candidateCount === 1000), allOverlaysReady: observations.measures.every(row => row.ready) },
    thresholds: { analyzerP95Milliseconds: 300, overlayReadyP95Milliseconds: 1000 },
    analyzerP95Milliseconds: analyzerP95, overlayReadyP95Milliseconds: overlayReadyP95,
    warmup: observations.warmup, measures: observations.measures,
    bundleSha256: sha256(bundle.outputFiles[0].contents), sourceSha256: sourceBefore,
  };
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'performance.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, runs: observations.measures.length, analyzerP95Milliseconds: analyzerP95, overlayReadyP95Milliseconds: overlayReadyP95, validity: report.validity, output: path.join(outputDir, 'performance.json') }, null, 2));
  if (report.status !== 'PASS') process.exitCode = 1;
} finally { await browser.close(); }
