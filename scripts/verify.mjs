import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log('node scripts/verify.mjs [--with-core] [--output-dir=docs/evidence/run005]\nRuns typecheck, build, and local Playwright regression tests. --with-core also runs the post-development core fixture suite and mixed, flat and table synthetic performance benchmarks. Never runs live sites, blind evaluation, native UI checks, or a user study.');
  process.exit(0);
}
const withCore = process.argv.includes('--with-core');
const outputDir = path.resolve(process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'docs/evidence/run005');
await mkdir(outputDir, { recursive: true });
const startedAt = new Date().toISOString();
const stages = [];
const run = async (name, args, env = {}) => {
  const start = performance.now();
  let log = '';
  const result = await new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const capture = (stream, chunk) => { const text = chunk.toString(); log += text; stream.write(chunk); };
    child.stdout.on('data', chunk => capture(process.stdout, chunk));
    child.stderr.on('data', chunk => capture(process.stderr, chunk));
    child.once('error', error => resolve({ exitCode: null, signal: null, error: error.message }));
    child.once('exit', (exitCode, signal) => resolve({ exitCode, signal }));
  });
  const logFile = path.join(outputDir, `verify-${name}.log`);
  await writeFile(logFile, log);
  const stage = { name, command: [process.execPath, ...args], status: result.exitCode === 0 ? 'PASS' : 'FAIL', ...result, elapsedMilliseconds: performance.now() - start, log: logFile };
  stages.push(stage);
  return stage.status === 'PASS';
};
let ok = await run('typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']);
if (ok) ok = await run('build', ['scripts/build.mjs']);
const testReport = path.join(outputDir, 'playwright-local.json');
if (ok) {
  await rm(testReport, { force: true });
  ok = await run('playwright', ['node_modules/@playwright/test/cli.js', 'test', '--reporter=list,json'], { PLAYWRIGHT_JSON_OUTPUT_FILE: testReport });
}
let tests = null;
if (stages.some(stage => stage.name === 'playwright')) {
  try {
    const report = JSON.parse(await readFile(testReport, 'utf8'));
    if (!report.stats || !['expected', 'unexpected', 'flaky', 'skipped'].every(key => Number.isInteger(report.stats[key]) && report.stats[key] >= 0) || report.stats.expected < 1 || !Number.isFinite(report.stats.duration) || report.stats.duration < 0) throw new Error('Missing or invalid Playwright statistics');
    tests = { expected: report.stats.expected, unexpected: report.stats.unexpected, flaky: report.stats.flaky, skipped: report.stats.skipped, durationMilliseconds: report.stats.duration, report: testReport };
    if (tests.unexpected > 0 || tests.flaky > 0 || tests.skipped > 0 || (report.errors?.length ?? 0) > 0) ok = false;
  } catch (error) {
    tests = { error: `Cannot read Playwright JSON report: ${error.message}`, report: testReport };
    ok = false;
  }
}
const localRegressionStatus = ok ? 'PASS' : 'FAIL';
let coreQuality = null;
let performanceSummary = null;
let structuralPerformance = null;
if (withCore && ok) {
  const coreDir = path.join(outputDir, 'core-regression');
  const coreFile = path.join(coreDir, 'evaluation-current-all.json');
  const performanceFile = path.join(outputDir, 'performance.json');
  await mkdir(coreDir, { recursive: true });
  await Promise.all([coreFile, performanceFile].map(file => rm(file, { force: true })));
  const coreRan = await run('core-evaluation', ['scripts/evaluate.mjs', '--engine=current', '--suite=core', '--split=all', `--output-dir=${coreDir}`]);
  // Keep the independent synthetic timing check available even when core quality fails.
  const performanceRan = await run('performance', ['scripts/benchmark.mjs', `--output-dir=${outputDir}`]);
  try {
    if (!coreRan) throw new Error('Core evaluation command failed');
    const quality = JSON.parse(await readFile(coreFile, 'utf8'));
    if (quality.engine !== 'current' || quality.suite !== 'core' || quality.split !== 'all' || quality.evaluationPhase !== 'post-holdout-development') throw new Error('Expected current core post-development evaluation, not an independent holdout result');
    const validCounts = row => !!row && ['pages', 'correct', 'recommended', 'matched', 'expected', 'tasksRecommended'].every(key => Number.isInteger(row[key]) && row[key] >= 0) && row.correct <= row.recommended && row.matched <= row.expected && row.expected > 0 && row.tasksRecommended <= row.pages;
    if (!validCounts(quality.summary) || quality.summary.pages !== 15 || quality.summary.expected < 30 || !Array.isArray(quality.sites) || quality.sites.length !== 5 || new Set(quality.sites.map(site => site.siteId)).size !== 5 || !quality.sites.every(site => validCounts(site) && site.pages === 3)) throw new Error('Incomplete or invalid core quality counts');
    const rates = row => ({ ...row, precision: row.recommended ? row.correct / row.recommended : null, recall: row.matched / row.expected });
    const summary = rates(quality.summary);
    const sites = quality.sites.map(site => { const value = rates(site); return { ...value, status: value.precision !== null && value.precision >= .80 && value.recall >= .75 ? 'PASS' : 'FAIL' }; });
    const status = summary.precision !== null && summary.precision >= .90 && summary.recall >= .85 && summary.tasksRecommended === 15 && sites.every(site => site.status === 'PASS') ? 'PASS' : 'FAIL';
    coreQuality = { status, suite: 'core', evaluationPhase: 'post-holdout-development', summary, sites, thresholds: { overallPrecision: .90, overallRecall: .85, sitePrecision: .80, siteRecall: .75, offlineTasksRecommended: 15 }, scope: 'Offline fixtures already used during development. Tasks recommended are not live task completion. This is not independent blind validation.', report: coreFile };
  } catch (error) { coreQuality = { status: 'FAIL', error: error.message, report: coreFile }; }
  try {
    if (!performanceRan) throw new Error('Performance command failed');
    const perf = JSON.parse(await readFile(performanceFile, 'utf8'));
    const valid = perf.status === 'PASS' && ['sourceStable', 'exactlyTenRuns', 'allCandidatesCount1000', 'allOverlaysReady'].every(key => perf.validity?.[key] === true) && Array.isArray(perf.measures) && perf.measures.length === 10 && [perf.analyzerP95Milliseconds, perf.overlayReadyP95Milliseconds].every(value => Number.isFinite(value) && value >= 0);
    const status = valid && perf.analyzerP95Milliseconds <= 300 && perf.overlayReadyP95Milliseconds <= 1000 ? 'PASS' : 'FAIL';
    performanceSummary = { status, runs: perf.measures?.length ?? null, analyzerP95Milliseconds: perf.analyzerP95Milliseconds, overlayReadyP95Milliseconds: perf.overlayReadyP95Milliseconds, thresholds: { analyzerP95Milliseconds: 300, overlayReadyP95Milliseconds: 1000 }, scope: 'Synthetic mixed 1,000-control page; headless Chromium; excludes real site loading and native toolbar activation.', report: performanceFile };
  } catch (error) { performanceSummary = { status: 'FAIL', error: error.message, report: performanceFile }; }
  const structures = [];
  for (const shape of ['flat', 'table']) {
    const file = path.join(outputDir, `performance-${shape}.json`);
    await rm(file, { force: true });
    const ran = await run(`performance-${shape}`, ['scripts/benchmark.mjs', `--shape=${shape}`, `--output-dir=${outputDir}`]);
    try {
      if (!ran) throw new Error(`${shape} performance command failed`);
      const perf = JSON.parse(await readFile(file, 'utf8'));
      const valid = perf.status === 'PASS' && perf.fixture?.shape === shape && perf.validity?.sourceStable === true
        && perf.validity?.exactlyTenRuns === true && perf.validity?.allCandidatesCount1000 === true && perf.validity?.allOverlaysReady === true
        && Array.isArray(perf.measures) && perf.measures.length === 10
        && [perf.analyzerP95Milliseconds, perf.overlayReadyP95Milliseconds].every(value => Number.isFinite(value) && value >= 0);
      structures.push({ shape, status: valid && perf.analyzerP95Milliseconds <= 300 && perf.overlayReadyP95Milliseconds <= 1000 ? 'PASS' : 'FAIL',
        runs: perf.measures?.length ?? null, analyzerP95Milliseconds: perf.analyzerP95Milliseconds,
        overlayReadyP95Milliseconds: perf.overlayReadyP95Milliseconds, report: file });
    } catch (error) { structures.push({ shape, status: 'FAIL', error: error.message, report: file }); }
  }
  structuralPerformance = { status: structures.every(row => row.status === 'PASS') ? 'PASS' : 'FAIL',
    thresholds: { analyzerP95Milliseconds: 300, overlayReadyP95Milliseconds: 1000 }, shapes: structures,
    scope: 'Additional 1,000-control structures: one flat information-panel parent and 500 two-control table rows; ten samples per shape. Same thresholds; separate from the original mixed case and real sites.' };
  ok = coreQuality.status === 'PASS' && performanceSummary.status === 'PASS' && structuralPerformance.status === 'PASS';
}
const report = {
  startedAt, completedAt: new Date().toISOString(), localRegressionStatus, requestedChecksStatus: ok ? 'PASS' : 'FAIL', requestedMode: withCore ? 'local-with-core' : 'local',
  scope: withCore ? 'Local regression, post-development core offline fixture quality, and synthetic performance. This is not independent blind validation, live task completion, or a full release/S07/S08/S09/S10 acceptance decision.' : 'Local typecheck, build, and Playwright regression only. This is not a full release or S07/S08/S09/S10 acceptance decision.',
  excluded: ['live public-site observations and task completion', 'fresh blind evaluation', ...(withCore ? [] : ['performance benchmark']), 'native extension installation and activeTab gesture', 'actual VoiceOver speech', 'real user study'],
  stages, tests, coreQuality, performance: performanceSummary, structuralPerformance,
};
const summaryFile = path.join(outputDir, 'local-verification.json');
await writeFile(summaryFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ localRegressionStatus: report.localRegressionStatus, requestedChecksStatus: report.requestedChecksStatus, stages: stages.map(stage => ({ name: stage.name, status: stage.status })), tests, coreQuality, performance: performanceSummary, structuralPerformance, summary: summaryFile }, null, 2));
if (!ok) process.exitCode = 1;
