import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sourcePaths = ['src/action-policy.ts', 'src/analyzer.ts'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const before = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, sha(await readFile(path))])));
const cases = [
  { title: 'Do not download', expected: 'navigate' },
  { title: 'No download', expected: 'navigate' },
  { title: 'Never download now', expected: 'navigate' },
  { title: '금지된 다운로드', expected: 'navigate' },
  { title: 'Do not download now', expected: 'navigate' },
  { title: '공개 문서 pdf 다운로드', expected: 'locate' },
  { title: 'Public document download', expected: 'locate' },
  { title: 'DOWNLOAD', expected: 'locate' },
  { title: 'No download', downloadAttribute: true, expected: 'locate' },
];
const bundle = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'TitleReview' });
const browser = await chromium.launch({ headless: true });
let requests = 0, rows;
try {
  const page = await browser.newPage();
  await page.route('**/*', route => { requests++; return route.abort(); });
  await page.setContent('<base href="https://independent.invalid/public/"><main></main>');
  await page.evaluate(cases => {
    for (const [i, row] of cases.entries()) {
      const a = document.createElement('a');
      a.id = `title-${i}`; a.href = `/opaque?public-document=${i}`;
      a.title = row.title; a.textContent = '공개 양식';
      if (row.downloadAttribute) a.setAttribute('download', 'public.pdf');
      document.querySelector('main').append(a);
    }
  }, cases);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  rows = await page.evaluate(() => TitleReview.analyzePage().map(({ element, action }) => ({ id: element.id, action })));
  const after = Object.fromEntries(await Promise.all(sourcePaths.map(async path => [path, sha(await readFile(path))])));
  const outcomes = cases.map((row, i) => ({ ...row, id: `title-${i}`, actual: rows.find(value => value.id === `title-${i}`)?.action }));
  const stable = JSON.stringify(before) === JSON.stringify(after);
  const status = stable && requests === 0 && outcomes.every(row => row.actual === row.expected) ? 'PASS' : 'FAIL';
  const report = { checkedAt: new Date().toISOString(), status, scope: 'Independent synthetic legacy-title branch probe; ordinary opaque routes isolate title behavior. No native UI, actual download, response observation or user data.', browser: browser.version(), sourceHashes: before, sourceStable: stable, cases: outcomes, total: outcomes.length, passed: outcomes.filter(row => row.actual === row.expected).length, pageRequests: requests };
  await writeFile('docs/evidence/run006/independent-review/title-branch-results.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status, cases: report.total, passed: report.passed, pageRequests: requests, sourceStable: stable }));
  if (status !== 'PASS') process.exitCode = 1;
} finally { await browser.close(); }
