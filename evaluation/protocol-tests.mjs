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
  assert.doesNotThrow(() => validateFreshMode({ ...valid, suite: 'blind-v8' }));
  for (const override of [{ suite: 'development-v7-corrected-v2' }, { engine: 'baseline' }, { suite: 'core' }, { suite: 'development-v4-corrected' }, { suite: 'development-v6-corrected' }, { suite: 'development-v6-corrected-v2' }, { suite: 'development-v7-corrected' }, { split: 'all' }, { explicitOutput: false }, { engineFreeze: undefined }, { datasetFreeze: undefined }]) {
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
    for (const [suite, phase] of [['development-v6-corrected', 'fresh-blind-validation'], ['development-v7-corrected', 'fresh-blind-validation'], ['development-v7-corrected', 'frozen-baseline']]) {
      const result = spawnSync(process.execPath, [script, `--suite=${suite}`, `--phase=${phase}`], { cwd: root, encoding: 'utf8', timeout: 15_000 });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Adjudicated data is development only/);
    }
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
    for (const mode of ['generic', 'institution']) {
      const result = spawnSync(process.execPath, [script, '--suite=blind-v5', '--engine=current', `--classification-mode=${mode}`, '--split=holdout', '--phase=fresh-blind-validation', '--output-dir=first', '--engine-freeze=engine.json', '--dataset-freeze=data.json'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /First independent evaluation already exists/);
    }
    assert.equal(await readFile(report, 'utf8'), 'preserved first failure\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('new suite names are recognized and reject invalid inputs before reading data or running product', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-v7-corrected-options-'));
  try {
    const script = fileURLToPath(new URL('../scripts/evaluate.mjs', import.meta.url));
    for (const suite of ['development-v7-corrected', 'development-v7-corrected-v2', 'blind-v8', 'blind-v9', 'blind-v9-v2']) {
      const result = spawnSync(process.execPath, [script, `--suite=${suite}`, '--split=invalid'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /engine=current\|baseline, split=calibration\|holdout\|all/);
    }
    assert.deepEqual(await readdir(root), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('v7 development suite permits retained v2 fixture references before the adjudication gate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'easyweb-v7-fixture-schema-'));
  const project = fileURLToPath(new URL('../', import.meta.url));
  try {
    const relativeRoot = 'evaluation/development-v7-corrected';
    await mkdir(join(root, relativeRoot, 'sites'), { recursive: true });
    for (const file of await readdir(join(project, relativeRoot, 'sites')))
      await writeFile(join(root, relativeRoot, 'sites', file), await readFile(join(project, relativeRoot, 'sites', file)));
    // A deliberate invalid manifest stops execution immediately after the actual
    // annotation/fixture schema check. No fixture, product source or browser is
    // available in this temporary project, and no product evaluation is run.
    await writeFile(join(root, relativeRoot, 'VERSION.json'), JSON.stringify({ classification: 'INVALID', freshHoldout: false }));
    const script = fileURLToPath(new URL('../scripts/evaluate.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, '--suite=development-v7-corrected', '--split=holdout'], { cwd: root, encoding: 'utf8', timeout: 15_000 });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Corrected annotations must be adjudicated development data/);
    assert.deepEqual(await readdir(root), ['evaluation']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

function semanticDiff(before, after, path = '') {
  if (Object.is(before, after)) return [];
  if (before === null || after === null || typeof before !== 'object' || typeof after !== 'object')
    return [{ path, before, after }];
  if (Array.isArray(before) !== Array.isArray(after)) return [{ path, before, after }];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
    .flatMap(key => semanticDiff(before[key], after[key], `${path}/${key}`));
}

test('v7 development correction changes exactly the eleven authorized action and task fields', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dataRoot = 'evaluation/development-v7-corrected';
  const versionPath = `${dataRoot}/VERSION.json`;
  const version = JSON.parse(await readFile(join(root, versionPath), 'utf8'));
  assert.equal(version.classification, 'ADJUDICATED_DEVELOPMENT');
  assert.equal(version.freshHoldout, false);
  assert.equal(version.product, 'NOT_RUN');
  assert.equal(version.baseDataset, 'blind-v7-v2');
  const instruction = '부전공 제도 안내 문서로 바로 이동하는 링크를 찾으세요. 본인 신청은 수행하지 마세요.';
  const action = (path, before, after) => ({ path, before, after });
  const allowed = {
    'city.json': [action('/pages/0/accepted/4/action', 'navigate', 'locate')],
    'government.json': [],
    'library.json': [],
    'public-agency.json': [],
    'smu.json': [
      ...[1, 2, 3, 4, 5].map(i => action(`/pages/0/accepted/${i}/action`, 'locate', 'navigate')),
      ...[0, 1, 2].map(i => action(`/pages/0/expected/${i}/action`, 'locate', 'navigate')),
      action('/pages/0/task/action', 'locate', 'navigate'),
      action('/pages/0/task/instruction', '부전공 제도 안내로 가는 원본 탭을 찾으세요. 본인 신청은 수행하지 마세요.', instruction),
    ],
  };
  const sorted = rows => rows.toSorted((a, b) => a.path.localeCompare(b.path));
  const files = (await readdir(join(root, dataRoot, 'sites'))).sort();
  assert.deepEqual(files, Object.keys(allowed).sort());
  let differences = 0;
  for (const file of files) {
    const original = JSON.parse(await readFile(join(root, 'evaluation/blind-v7-v2/sites', file), 'utf8'));
    const corrected = JSON.parse(await readFile(join(root, dataRoot, 'sites', file), 'utf8'));
    const actual = semanticDiff(original, corrected);
    assert.deepEqual(sorted(actual), sorted(allowed[file]), file);
    const declared = version.onlySemanticChanges.siteChanges.find(row => row.sourceFile === `sites/${file}`)?.changes ?? [];
    assert.deepEqual(sorted(declared.map(({ path, before, after }) => ({ path, before, after }))), sorted(actual), `VERSION diff ${file}`);
    assert.ok(declared.every(row => row.auditFindingId && row.rationale), `Correction rationale ${file}`);
    differences += actual.length;
    assert.equal(corrected.pages[0].fixture, original.pages[0].fixture);
  }
  assert.equal(differences, 11);
  assert.equal(version.changeSummary.totalSiteSemanticFieldChanges, differences);
  assert.deepEqual(version.onlySemanticChanges.fixtureChanges, []);
  const smu = JSON.parse(await readFile(join(root, dataRoot, 'sites/smu.json'), 'utf8')).pages[0];
  assert.equal(smu.accepted.find(row => row.sourceId === 'smu-second').action, 'locate');
  for (const [file, sourceId] of [['city.json', 'city-login'], ['public-agency.json', 'nps-login']]) {
    const page = JSON.parse(await readFile(join(root, dataRoot, 'sites', file), 'utf8')).pages[0];
    assert.equal(page.accepted.find(row => row.sourceId === sourceId).action, 'locate');
  }
  assert.deepEqual(version.unresolved[0].sourceIds, ['city-login', 'nps-login']);
  assert.equal(version.unresolved[1].status, 'UNRESOLVED_ACCEPTED_COVERAGE');
});

test('v7 correction retains byte-identical fixtures and all eleven original frozen inputs', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dataRoot = 'evaluation/development-v7-corrected';
  const version = JSON.parse(await readFile(join(root, dataRoot, 'VERSION.json'), 'utf8'));
  const freezeRaw = await readFile(join(root, version.baseFreeze));
  const originalFreeze = JSON.parse(freezeRaw);
  assert.equal(sha(freezeRaw), version.baseFreezeSha256);
  assert.equal(originalFreeze.files.length, 11);
  assert.deepEqual(version.originalFrozenFiles, originalFreeze.files);
  assert.equal((await verifyFrozenFiles(version.baseFreeze, version.originalFrozenFiles.map(row => row.path), root)).checkedFiles, 11);
  for (const [pathKey, hashKey] of [['annotationAudit', 'annotationAuditSha256'], ['annotationRootReview', 'annotationRootReviewSha256']])
    assert.equal(sha(await readFile(join(root, version[pathKey]))), version[hashKey]);
  assert.equal(version.files.length, 10);
  const verified = await verifyAdjudicatedDataset(`${dataRoot}/VERSION.json`, version.files.map(row => row.path), root);
  assert.equal(verified.originals.length, 10);
  for (const entry of version.files.filter(row => row.path.includes('/fixtures/'))) {
    assert.equal(entry.byteIdenticalToBase, true);
    assert.deepEqual(await readFile(join(root, entry.path)), await readFile(join(root, entry.basePath)));
  }
  assert.equal(version.files.filter(row => row.path.includes('/fixtures/')).length, 5);
  for (const file of ['government.json', 'library.json', 'public-agency.json'])
    assert.deepEqual(await readFile(join(root, dataRoot, 'sites', file)), await readFile(join(root, 'evaluation/blind-v7-v2/sites', file)));
});
