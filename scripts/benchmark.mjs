import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';

const bundle = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'Engine' });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  await page.setContent('<header><nav>' + Array.from({ length: 1000 }, (_, i) => `<a href="https://example.test/login?item=${i}">로그인 ${i}</a>`).join('') + '</nav></header>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const measures = await page.evaluate(() => Array.from({ length: 10 }, () => {
    const start = performance.now();
    const count = window.Engine.analyzePage().length;
    return { milliseconds: performance.now() - start, count };
  }));
  const sorted = measures.map(x => x.milliseconds).sort((a, b) => a - b);
  const report = {
    checkedAt: new Date().toISOString(),
    scope: '합성 1000개 제어 분석 10회 smoke. 실제 사이트·전체 화면 준비·대표 성능 검증이 아님.',
    environment: { platform: process.platform, architecture: process.arch, node: process.version, chromium: browser.version(), viewport: { width: 1440, height: 1080 } },
    measures, p95: sorted[Math.ceil(sorted.length * .95) - 1],
  };
  await mkdir('docs/evidence/run001', { recursive: true });
  await writeFile('docs/evidence/run001/analyzer-performance-smoke.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
