import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
const outputDir = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'docs/evidence/run005';

const targets = ['https://www.smu.ac.kr/'];
const bundle = await build({
  stdin: {
    contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {rank} from './src/ranker'; window.easywebInspect=()=>{ const raw=analyzePage(); const classified=classify(raw); const selected=rank(classified); return {candidateCount:raw.length, classifiedCount:classified.length, selected:selected.map(({element,snapshot,...item})=>item)}; };`,
    resolveDir: process.cwd(), loader: 'ts',
  }, bundle: true, write: false, format: 'iife',
});
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const target of targets) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 });
      // 외부 사이트를 업무 조작 없이 읽기 전용으로 관찰합니다.
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await page.screenshot({ path: `${outputDir}/smu-original.png`, fullPage: false });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const analysis = await page.evaluate(() => window.easywebInspect());
      await page.addScriptTag({ path: 'dist/content.js' });
      const visible = await page.getByRole('dialog').isVisible();
      if (visible) await page.screenshot({ path: `${outputDir}/smu-easy-mode.png`, fullPage: false });
      results.push({ target, finalUrl: page.url(), title: await page.title(), httpStatus: response?.status(), overlayVisible: visible, ...analysis, pageErrors: errors });
    } catch (error) {
      results.push({ target, error: String(error) });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
const report = { checkedAt: new Date().toISOString(), note: '공개 페이지의 탐지·표시 확인. 실제 기능 클릭, 로그인, 과제 성공 및 사용자 도구 모음 실행은 별도 확인 필요.', results };
await writeFile(`${outputDir}/live-check.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (results.some(r => r.error || !r.overlayVisible)) process.exitCode = 1;
