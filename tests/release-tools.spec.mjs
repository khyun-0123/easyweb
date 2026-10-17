import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/package.mjs', import.meta.url));
const sha256 = value => createHash('sha256').update(value).digest('hex');
async function fixture(version = '0.3.0') {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'easyweb-release-test-'));
  await Promise.all(['src', 'extension', 'scripts'].map(name => mkdir(path.join(dir, name))));
  await writeFile(path.join(dir, 'src', 'content.ts'), 'export const fixture = true;\n');
  await writeFile(path.join(dir, 'extension', 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Synthetic EasyWeb fixture', version, permissions: ['activeTab', 'scripting'], background: { service_worker: 'background.js' }, action: {} }));
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'synthetic-fixture', version: '0.3.0', type: 'module' }));
  await writeFile(path.join(dir, 'package-lock.json'), '{}\n');
  await writeFile(path.join(dir, 'tsconfig.json'), '{}\n');
  await writeFile(path.join(dir, 'scripts', 'build.mjs'), "import {mkdir,copyFile,writeFile} from 'node:fs/promises'; await mkdir('dist',{recursive:true}); await copyFile('extension/manifest.json','dist/manifest.json'); await writeFile('dist/background.js','/* fixture background */\\n'); await writeFile('dist/content.js','/* fixture content */\\n');\n");
  return dir;
}
const run = cwd => spawnSync(process.execPath, [script, '--output-dir=artifacts'], { cwd, encoding: 'utf8', timeout: 30_000 });

test('candidate archive reproduces bytes, contains installable root, and has verifiable checksums', async () => {
  const dir = await fixture();
  try {
    const first = run(dir);
    expect(first.status, first.stderr).toBe(0);
    const zipPath = path.join(dir, 'artifacts', 'EasyWeb-0.3.0-candidate.zip');
    const zip = await readFile(zipPath);
    const second = run(dir);
    expect(second.status, second.stderr).toBe(0);
    expect(await readFile(zipPath)).toEqual(zip);
    const report = JSON.parse(await readFile(path.join(dir, 'artifacts', 'EasyWeb-0.3.0-candidate.json'), 'utf8'));
    expect(report.archive.sha256).toBe(sha256(zip));
    expect(report.classification).toBe('DEVELOPMENT_CANDIDATE');
    expect(report.reproducibility).toMatchObject({ twoBuildsIdentical: true, twoArchivesIdentical: true, sourceStable: true });
    const inspect = spawnSync('python3', ['-c', "import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({'names':z.namelist(),'manifest':json.loads(z.read('EasyWeb-0.3.0-candidate/manifest.json')),'dates':[list(i.date_time) for i in z.infolist()]}))", zipPath], { encoding: 'utf8' });
    expect(inspect.status, inspect.stderr).toBe(0);
    const archive = JSON.parse(inspect.stdout);
    expect(archive.names).toEqual(['EasyWeb-0.3.0-candidate/background.js', 'EasyWeb-0.3.0-candidate/content.js', 'EasyWeb-0.3.0-candidate/manifest.json']);
    expect(archive.manifest.permissions).toEqual(['activeTab', 'scripting']);
    expect(archive.dates.every(date => JSON.stringify(date) === '[1980,1,1,0,0,0]')).toBe(true);
    const sums = (await readFile(path.join(dir, 'artifacts', 'SHA256SUMS'), 'utf8')).trim().split('\n');
    for (const sum of sums) {
      const [hash, name] = sum.split('  ');
      expect(hash).toBe(sha256(await readFile(path.join(dir, 'artifacts', name))));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('package refuses mismatched versions and source changes during build', async () => {
  const mismatch = await fixture('0.2.0');
  const unstable = await fixture();
  try {
    const badVersion = run(mismatch);
    expect(badVersion.status).not.toBe(0);
    expect(badVersion.stderr).toContain('Manifest and package versions must match');
    const buildFile = path.join(unstable, 'scripts', 'build.mjs');
    await writeFile(buildFile, (await readFile(buildFile, 'utf8')) + "await writeFile('src/content.ts',String(Date.now()));\n");
    const changed = run(unstable);
    expect(changed.status).not.toBe(0);
    expect(changed.stderr).toContain('Source changed during packaging');
  } finally { await Promise.all([mismatch, unstable].map(dir => rm(dir, { recursive: true, force: true }))); }
});

test('local verification reports counts and stops when a required stage fails', async () => {
  const dir = await fixture();
  const verify = fileURLToPath(new URL('../scripts/verify.mjs', import.meta.url));
  try {
    await mkdir(path.join(dir, 'node_modules', 'typescript', 'bin'), { recursive: true });
    await mkdir(path.join(dir, 'node_modules', '@playwright', 'test'), { recursive: true });
    const tsc = path.join(dir, 'node_modules', 'typescript', 'bin', 'tsc');
    await writeFile(tsc, "console.log('Synthetic typecheck stage');\n");
    await writeFile(path.join(dir, 'node_modules', '@playwright', 'test', 'cli.js'), "import {writeFileSync} from 'node:fs'; writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE,JSON.stringify({stats:{expected:4,unexpected:0,flaky:0,skipped:0,duration:12},errors:[]}));\n");
    const invoke = () => spawnSync(process.execPath, [verify, '--output-dir=verification'], { cwd: dir, encoding: 'utf8', timeout: 30_000 });
    const passed = invoke();
    expect(passed.status, passed.stderr).toBe(0);
    let report = JSON.parse(await readFile(path.join(dir, 'verification', 'local-verification.json'), 'utf8'));
    expect(report.localRegressionStatus).toBe('PASS');
    expect(report.tests.expected).toBe(4);
    expect(report.stages.map(stage => stage.name)).toEqual(['typecheck', 'build', 'playwright']);
    await writeFile(tsc, "console.error('Synthetic required-stage failure'); process.exit(9);\n");
    const failed = invoke();
    expect(failed.status).not.toBe(0);
    report = JSON.parse(await readFile(path.join(dir, 'verification', 'local-verification.json'), 'utf8'));
    expect(report.localRegressionStatus).toBe('FAIL');
    expect(report.stages.map(stage => stage.name)).toEqual(['typecheck']);
    expect(report.stages[0].exitCode).toBe(9);
    expect(report.tests).toBeNull();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('optional core verification stays offline, summarizes quality/timing, and rejects unmet timing', async () => {
  const dir = await fixture();
  const verify = fileURLToPath(new URL('../scripts/verify.mjs', import.meta.url));
  try {
    await mkdir(path.join(dir, 'node_modules', 'typescript', 'bin'), { recursive: true });
    await mkdir(path.join(dir, 'node_modules', '@playwright', 'test'), { recursive: true });
    await writeFile(path.join(dir, 'node_modules', 'typescript', 'bin', 'tsc'), "console.log('Synthetic typecheck');\n");
    await writeFile(path.join(dir, 'node_modules', '@playwright', 'test', 'cli.js'), "import {writeFileSync} from 'node:fs'; writeFileSync(process.env.PLAYWRIGHT_JSON_OUTPUT_FILE,JSON.stringify({stats:{expected:4,unexpected:0,flaky:0,skipped:0,duration:12},errors:[]}));\n");
    const counts = { pages: 3, correct: 12, recommended: 12, matched: 9, expected: 9, tasksRecommended: 3 };
    const quality = { engine: 'current', suite: 'core', split: 'all', evaluationPhase: 'post-holdout-development', summary: { pages: 15, correct: 60, recommended: 60, matched: 45, expected: 45, tasksRecommended: 15 }, sites: Array.from({ length: 5 }, (_, index) => ({ siteId: `synthetic-${index}`, ...counts })) };
    await writeFile(path.join(dir, 'scripts', 'evaluate.mjs'), `import {writeFileSync} from 'node:fs'; import path from 'node:path'; if(!process.argv.includes('--suite=core')||!process.argv.includes('--split=all')) throw new Error('Only explicit offline core all is allowed'); const out=process.argv.find(arg=>arg.startsWith('--output-dir=')).slice('--output-dir='.length); writeFileSync(path.join(out,'evaluation-current-all.json'),JSON.stringify(${JSON.stringify(quality)}));\n`);
    const perf = { status: 'PASS', validity: { sourceStable: true, exactlyTenRuns: true, allCandidatesCount1000: true, allOverlaysReady: true }, analyzerP95Milliseconds: 123, overlayReadyP95Milliseconds: 456, measures: Array.from({ length: 10 }, (_, run) => ({ run })) };
    const benchmark = path.join(dir, 'scripts', 'benchmark.mjs');
    const writeBenchmark = async (value, overrides = {}) => writeFile(benchmark, `import {writeFileSync} from 'node:fs'; import path from 'node:path'; const out=process.argv.find(arg=>arg.startsWith('--output-dir=')).slice('--output-dir='.length); const shape=process.argv.find(arg=>arg.startsWith('--shape='))?.slice('--shape='.length)??'mixed'; const report={...${JSON.stringify(value)},...(${JSON.stringify(overrides)}[shape]??{}),fixture:{shape}}; writeFileSync(path.join(out,shape==='mixed'?'performance.json':'performance-'+shape+'.json'),JSON.stringify(report));\n`);
    await writeBenchmark(perf);
    const invoke = () => spawnSync(process.execPath, [verify, '--with-core', '--output-dir=verification'], { cwd: dir, encoding: 'utf8', timeout: 30_000 });
    const passed = invoke();
    expect(passed.status, passed.stderr).toBe(0);
    let report = JSON.parse(await readFile(path.join(dir, 'verification', 'local-verification.json'), 'utf8'));
    expect(report.requestedChecksStatus).toBe('PASS');
    expect(report.stages.map(stage => stage.name)).toEqual(['typecheck', 'build', 'playwright', 'core-evaluation', 'performance', 'performance-flat', 'performance-table']);
    expect(report.coreQuality.summary).toMatchObject({ pages: 15, correct: 60, recommended: 60, matched: 45, expected: 45, tasksRecommended: 15, precision: 1, recall: 1 });
    expect(report.coreQuality.evaluationPhase).toBe('post-holdout-development');
    expect(report.excluded).toContain('fresh blind evaluation');
    expect(report.excluded).toContain('live public-site observations and task completion');
    expect(report.performance.analyzerP95Milliseconds).toBe(123);
    expect(report.performance.overlayReadyP95Milliseconds).toBe(456);
    expect(report.structuralPerformance.status).toBe('PASS');
    expect(report.structuralPerformance.shapes.map(row => row.shape)).toEqual(['flat', 'table']);
    await writeBenchmark({ ...perf, overlayReadyP95Milliseconds: 1001 });
    const failed = invoke();
    expect(failed.status).not.toBe(0);
    report = JSON.parse(await readFile(path.join(dir, 'verification', 'local-verification.json'), 'utf8'));
    expect(report.localRegressionStatus).toBe('PASS');
    expect(report.requestedChecksStatus).toBe('FAIL');
    expect(report.coreQuality.status).toBe('PASS');
    expect(report.performance.status).toBe('FAIL');
    await writeBenchmark(perf, { table: { analyzerP95Milliseconds: 301 } });
    const tableFailure = invoke();
    expect(tableFailure.status).not.toBe(0);
    report = JSON.parse(await readFile(path.join(dir, 'verification', 'local-verification.json'), 'utf8'));
    expect(report.performance.status).toBe('PASS');
    expect(report.structuralPerformance.status).toBe('FAIL');
    expect(report.structuralPerformance.shapes.find(row => row.shape === 'table').status).toBe('FAIL');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
