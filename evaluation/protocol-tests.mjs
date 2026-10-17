import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateFreshMode, verifyFrozenFiles, verifyAdjudicatedDataset } from '../scripts/evaluation-protocol.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
test('help and invalid options never run evaluation or write output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-evaluator-help-'));
  try {
    const script = fileURLToPath(new URL('../scripts/evaluate.mjs', import.meta.url));
    for (const [arg, status, output] of [['--help', 0, /node scripts\/evaluate.mjs/], ['--unknown', 1, /Unknown or incomplete option/]]) {
      const result = spawnSync(process.execPath, [script, arg], { cwd: root, encoding: 'utf8', timeout: 15_000 });
      assert.equal(result.status, status);
      assert.match(result.stdout + result.stderr, output);
      assert.deepEqual(await readdir(root), []);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('fresh mode requires current blind holdout and explicit frozen inputs', () => {
  const valid = { engine: 'current', suite: 'blind-v5', split: 'holdout', outputDir: 'new-first', explicitOutput: true, engineFreeze: 'engine.json', datasetFreeze: 'data.json' };
  assert.doesNotThrow(() => validateFreshMode(valid));
  assert.doesNotThrow(() => validateFreshMode({ ...valid, suite: 'blind-v7-v2' }));
  for (const override of [{ engine: 'baseline' }, { suite: 'core' }, { suite: 'development-v4-corrected' }, { suite: 'development-v6-corrected' }, { suite: 'development-v6-corrected-v2' }, { split: 'all' }, { explicitOutput: false }, { engineFreeze: undefined }, { datasetFreeze: undefined }]) {
    assert.throws(() => validateFreshMode({ ...valid, ...override }));
  }
});

test('corrected annotations require unchanged original and corrected bytes and never qualify as fresh data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-adjudication-'));
  try {
    await writeFile(join(root, 'original.json'), 'original category');
    await writeFile(join(root, 'corrected.json'), 'corrected category');
    const version = { version: 'annotation-v2', classification: 'ADJUDICATED_DEVELOPMENT', freshHoldout: false,
      files: [{ path: 'corrected.json', sha256: sha('corrected category'), basePath: 'original.json', baseSha256: sha('original category') }] };
    await writeFile(join(root, 'VERSION.json'), JSON.stringify(version));
    assert.equal((await verifyAdjudicatedDataset('VERSION.json', ['corrected.json'], root)).originals.length, 1);
    await writeFile(join(root, 'parent.json'), 'previous correction');
    const chained = { ...version, files: version.files.map(file => ({ ...file, parentPath: 'parent.json', parentSha256: sha('previous correction') })) };
    await writeFile(join(root, 'VERSION.json'), JSON.stringify(chained));
    assert.equal((await verifyAdjudicatedDataset('VERSION.json', [], root)).parents.length, 1);
    await writeFile(join(root, 'parent.json'), 'changed parent correction');
    await assert.rejects(verifyAdjudicatedDataset('VERSION.json', [], root), /Parent adjudication input changed/);
    await writeFile(join(root, 'VERSION.json'), JSON.stringify(version));
    await writeFile(join(root, 'original.json'), 'changed original');
    await assert.rejects(verifyAdjudicatedDataset('VERSION.json', [], root), /Original adjudication input changed/);
    await writeFile(join(root, 'original.json'), 'original category');
    await writeFile(join(root, 'corrected.json'), 'changed correction');
    await assert.rejects(verifyAdjudicatedDataset('VERSION.json', [], root), /Frozen file changed/);
    await writeFile(join(root, 'corrected.json'), 'corrected category');
    await writeFile(join(root, 'VERSION.json'), JSON.stringify({ ...version, freshHoldout: true }));
    await assert.rejects(verifyAdjudicatedDataset('VERSION.json', [], root), /must be adjudicated development/);
    const script = fileURLToPath(new URL('../scripts/evaluate.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, '--suite=development-v6-corrected', '--phase=fresh-blind-validation'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Adjudicated data is development only/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('freeze verification checks every byte and required annotation coverage', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-freeze-'));
  try {
    await mkdir(join(root, 'data'));
    await writeFile(join(root, 'data', 'fixture.html'), '<a>fixed public label</a>');
    const entries = [{ path: 'data/fixture.html', sha256: sha(await readFile(join(root, 'data', 'fixture.html'))) }];
    await writeFile(join(root, 'freeze.json'), JSON.stringify({ files: entries }));
    assert.equal((await verifyFrozenFiles('freeze.json', ['data/fixture.html'], root)).checkedFiles, 1);
    await assert.rejects(verifyFrozenFiles('freeze.json', ['data/missing.json'], root), /missing required file/);
    await writeFile(join(root, 'data', 'fixture.html'), '<a>changed label</a>');
    await assert.rejects(verifyFrozenFiles('freeze.json', [], root), /Frozen file changed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('source freeze map is verified and malformed, duplicate or outside paths are refused', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-freeze-map-'));
  try {
    await writeFile(join(root, 'source.ts'), 'frozen');
    const entry = { path: 'source.ts', sha256: sha('frozen') };
    await writeFile(join(root, 'freeze.json'), JSON.stringify({ sourceFiles: { 'source.ts': entry.sha256 } }));
    assert.equal((await verifyFrozenFiles('freeze.json', ['source.ts'], root)).checkedFiles, 1);
    for (const files of [[], [entry, entry], [{ ...entry, path: '../outside.ts' }], [{ ...entry, sha256: 'unknown' }]]) {
      await writeFile(join(root, 'freeze.json'), JSON.stringify({ files }));
      await assert.rejects(verifyFrozenFiles('freeze.json', [], root));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('real evaluator refuses to overwrite a first independent result before launching a browser', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-first-result-'));
  try {
    await mkdir(join(root, 'first'));
    const report = join(root, 'first', 'evaluation-current-blind-v5-holdout.json');
    await writeFile(report, 'preserved first failure\n');
    const script = fileURLToPath(new URL('../scripts/evaluate.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, '--suite=blind-v5', '--engine=current', '--split=holdout', '--phase=fresh-blind-validation', '--output-dir=first', '--engine-freeze=engine.json', '--dataset-freeze=data.json'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /First independent evaluation already exists/);
    assert.equal(await readFile(report, 'utf8'), 'preserved first failure\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});
