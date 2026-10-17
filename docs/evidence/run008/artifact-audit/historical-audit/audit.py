from pathlib import Path
import datetime
import hashlib
import json
import os
import subprocess
import zipfile

ROOT = Path('/Users/khyun_03/easyweb')
OUT = ROOT / 'docs/evidence/run008/artifact-audit/historical-audit'
START = datetime.datetime.now(datetime.timezone.utc).isoformat()
checks, hashes, findings = [], [], []

def load(path):
    return json.loads((ROOT / path).read_text())

def write(name, value):
    target = OUT / name
    if target.exists(): raise RuntimeError('Refusing to overwrite audit output: ' + str(target))
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def current_bytes(path):
    p = ROOT / path
    if p.is_symlink(): return os.fsencode(os.readlink(p))
    return p.read_bytes() if p.is_file() else None

def sha(data):
    return hashlib.sha256(data).hexdigest() if data is not None else None

def check(name, passed, **detail):
    checks.append({'name': name, 'passed': bool(passed), **detail})
    if not passed: findings.append({'severity': 'ARTIFACT_PRESERVATION', 'check': name, 'detail': detail})

def match_hash(path, expected, scope, expected_bytes=None):
    data = current_bytes(path)
    actual = sha(data)
    row = {'path': path, 'scope': scope, 'expectedSHA256': expected, 'actualSHA256': actual,
           'expectedBytes': expected_bytes, 'actualBytes': len(data) if data is not None else None,
           'passed': actual == expected and (expected_bytes is None or data is not None and len(data) == expected_bytes)}
    hashes.append(row)
    return row['passed']

def git(cmd):
    return subprocess.check_output(['git', *cmd], cwd=ROOT)

object_format = git(['rev-parse', '--show-object-format']).decode().strip()
if object_format not in ['sha1', 'sha256']: raise RuntimeError('Unsupported Git object hash format')

def blob_hash(data):
    if data is None: return None
    h = hashlib.new(object_format)
    h.update(b'blob ' + str(len(data)).encode() + b'\0' + data)
    return h.hexdigest()

historical_scopes = ['docs/evidence', 'evaluation', 'output'] + ['docs/RUN_%03d_REPORT.md' % n for n in range(1, 8)]
excluded_paths = ['evaluation/README.md', 'evaluation/protocol-tests.mjs']
comparisons = [
    ('baseline-38f37d4', '38f37d4', historical_scopes, excluded_paths),
    ('run-004-v0.5.0-dev', 'run-004-v0.5.0-dev', ['docs/evidence/run004', 'evaluation/blind-v7', 'evaluation/blind-v7-v2', 'output/run004'], []),
    ('run-005-v0.6.0-dev', 'run-005-v0.6.0-dev', ['docs/evidence/run005', 'evaluation/blind-v8', 'evaluation/development-v7-corrected', 'output/run005'], []),
    ('run-006-v0.7.0-dev', 'run-006-v0.7.0-dev', ['docs/evidence/run006', 'output/run006'], []),
    ('run-007-v0.8.0-dev', 'run-007-v0.8.0-dev', ['docs/evidence/run007', 'evaluation/blind-v9', 'evaluation/blind-v9-v2', 'evaluation/development-v7-corrected-v2', 'output/run007'], [])
]
git_results = []
unique_paths = set()
baseline_paths = set()
for label, ref, scopes, excludes in comparisons:
    commit = git(['rev-parse', ref + '^{commit}']).decode().strip()
    tree = git(['ls-tree', '-r', '-z', ref, '--', *scopes])
    entries = []
    for record in tree.split(b'\0'):
        if not record: continue
        meta, rawpath = record.split(b'\t', 1)
        mode, kind, oid = meta.decode().split()
        path = os.fsdecode(rawpath)
        if path in excludes: continue
        if kind != 'blob':
            entries.append({'path': path, 'kind': kind, 'passed': False, 'reason': 'not a Git blob'})
            continue
        data = current_bytes(path)
        actual_blob = blob_hash(data)
        entries.append({'path': path, 'expectedMode': mode, 'expectedGitBlob': oid,
                        'actualGitBlob': actual_blob, 'actualSHA256': sha(data),
                        'bytes': len(data) if data is not None else None, 'matches': actual_blob == oid})
        unique_paths.add(path)
        if label == 'baseline-38f37d4': baseline_paths.add(path)
    mismatches = [row for row in entries if not row.get('matches', False)]
    detail_name = label + '-preservation.json'
    write(detail_name, entries)
    result = {'label': label, 'ref': ref, 'resolvedCommit': commit, 'scopes': scopes, 'excludedPaths': excludes,
              'filesCompared': len(entries), 'mismatchCount': len(mismatches), 'allPreserved': not mismatches,
              'detail': str((OUT / detail_name).relative_to(ROOT)), 'mismatches': mismatches}
    git_results.append(result)
    check(label + '_historical_git_blobs_preserved', not mismatches, count=len(entries), mismatches=mismatches)

# Inventory historical files absent from the chosen baseline. This is a coverage limit, not proof of loss.
filesystem_roots = [ROOT / 'docs/evidence' / ('run%03d' % n) for n in range(1, 8)]
filesystem_roots += [ROOT / 'evaluation' / p.name for p in (ROOT / 'evaluation').iterdir() if p.is_dir() and p.name != 'blind-v10']
filesystem_roots += [ROOT / 'output' / ('run%03d' % n) for n in range(1, 8)]
not_in_baseline = []
seen = set()
for directory in filesystem_roots:
    if not directory.exists(): continue
    for p in directory.rglob('*'):
        if not (p.is_file() or p.is_symlink()): continue
        path = str(p.relative_to(ROOT))
        if path in seen or path in baseline_paths: continue
        seen.add(path)
        data = current_bytes(path)
        not_in_baseline.append({'path': path, 'bytes': len(data), 'sha256': sha(data)})
write('historical-files-outside-baseline.json', not_in_baseline)

# Verify original raw datasets and declared correction ancestry, without re-evaluation.
dataset_freezes = []
for path in ['docs/evidence/run003/blind-v6-freeze.json', 'docs/evidence/run004/blind-v7-freeze.json',
             'docs/evidence/run004/blind-v7-v2-freeze.json', 'docs/evidence/run007/blind-v9-freeze.json',
             'docs/evidence/run007/blind-v9-v2-freeze.json']:
    freeze = load(path)
    entries = freeze['files'] + freeze.get('supportingFiles', [])
    ok = [match_hash(e['path'], e['sha256'], path, e.get('bytes')) for e in entries]
    dataset_freezes.append({'path': path, 'entryCount': len(entries), 'allMatch': all(ok)})
    check(path + '_all_declared_hashes_preserved', all(ok), entries=len(entries))

versions = []
for path in ['evaluation/development-v6-corrected/VERSION.json', 'evaluation/development-v6-corrected-v2/VERSION.json',
             'evaluation/development-v7-corrected/VERSION.json', 'evaluation/development-v7-corrected-v2/VERSION.json']:
    version = load(path)
    initial = len(hashes)
    for entry in version['files']:
        for path_key, hash_key, bytes_key in [('path', 'sha256', 'bytes'), ('basePath', 'baseSha256', 'baseBytes'), ('parentPath', 'parentSha256', 'parentBytes')]:
            if path_key in entry:
                match_hash(entry[path_key], entry[hash_key], path + ':' + path_key, entry.get(bytes_key))
    for entry in version.get('originalFrozenFiles', []):
        match_hash(entry['path'], entry['sha256'], path + ':originalFrozenFiles', entry.get('bytes'))
    for hash_key in version:
        if not hash_key.endswith('Sha256'): continue
        path_key = hash_key[:-6]
        candidate = version.get(path_key) or version.get(path_key + 'Path')
        if hash_key == 'originalV7FreezeSha256': candidate = 'docs/evidence/run004/blind-v7-freeze.json'
        if isinstance(candidate, str) and (ROOT / candidate).is_file():
            match_hash(candidate, version[hash_key], path + ':provenance:' + hash_key)
        else:
            check(path + '_provenance_path_for_' + hash_key, False, pathKey=path_key)
    rows = hashes[initial:]
    result = {'path': path, 'classification': version['classification'], 'freshHoldout': version['freshHoldout'],
              'declaredFiles': len(version['files']), 'hashComparisons': len(rows), 'allMatch': all(r['passed'] for r in rows)}
    versions.append(result)
    check(path + '_version_current_original_parent_hashes_preserved', result['allMatch'], comparisons=len(rows))
    check(path + '_remains_adjudicated_development', version['classification'] == 'ADJUDICATED_DEVELOPMENT' and version['freshHoldout'] is False)

v7_manifest_path = 'docs/evidence/run007/v7-contract-static-review/v2/artifact-manifest.json'
v7_manifest = load(v7_manifest_path)
v7_manifest_rows = [v7_manifest['version']] + v7_manifest['newDataFiles'] + v7_manifest['evidence']
check('v7_v2_separate_artifact_manifest_hashes', all([match_hash(e['path'], e['sha256'], v7_manifest_path, e.get('bytes')) for e in v7_manifest_rows]), comparisons=len(v7_manifest_rows))
before = load('docs/evidence/run007/v7-contract-static-review/v2/source-hashes-before.json')
after = load('docs/evidence/run007/v7-contract-static-review/v2/source-hashes-after.json')
check('v7_original_parent_21_before_after_unchanged', before == after and len(before) == 21 and all([match_hash(p, h if isinstance(h, str) else h['sha256'], 'v7 original parent before/after', None if isinstance(h, str) else h.get('bytes')) for p, h in before.items()]), count=len(before))

# Historical source metadata is checked against archived bytes or the appropriate Git tag, never current source.
source_archive_results = []
for freeze_path in ['docs/evidence/run004/v0.5-engine-freeze.json', 'docs/evidence/run005/v0.6-engine-freeze-v2.json',
                    'docs/evidence/run007/v0.8-engine-freeze.json', 'docs/evidence/run007/v0.8-engine-freeze-v2.json']:
    freeze = load(freeze_path)
    entries = [{'path': str(Path(freeze['archive']) / path), 'sha256': h} for path, h in freeze['sourceFiles'].items()]
    ok = all([match_hash(e['path'], e['sha256'], freeze_path + ':source archive') for e in entries])
    source_archive_results.append({'freeze': freeze_path, 'archive': freeze['archive'], 'sourceFiles': len(entries), 'allMatch': ok})
    check(freeze_path + '_archived_source_hashes', ok, count=len(entries))

v1 = load('docs/evidence/run007/v0.8-engine-freeze.json')
v2 = load('docs/evidence/run007/v0.8-engine-freeze-v2.json')
check('v0_8_original_and_v2_15_sources_identical', len(v1['sourceFiles']) == len(v2['sourceFiles']) == 15 and v1['sourceFiles'] == v2['sourceFiles'])
check('v0_8_original_freeze_identity_preserved', match_hash(v2['previousFreeze']['path'], v2['previousFreeze']['sha256'], 'v0.8 v2 previousFreeze'))
changed_tools = [p for p in v1['toolFiles'] if v1['toolFiles'][p] != v2['toolFiles'].get(p)]
check('v0_8_only_evaluator_tool_changed_in_v2', changed_tools == ['scripts/evaluate.mjs'], changedTools=changed_tools)
proof = load('docs/evidence/run007/tool-revision-proof.json')
check('v0_8_original_evaluator_archive', match_hash(proof['beforeArchive'], v1['toolFiles']['scripts/evaluate.mjs'], 'v0.8 original evaluator archive'))
check('v0_8_corrected_evaluator_archive', match_hash(proof['afterArchive'], v2['toolFiles']['scripts/evaluate.mjs'], 'v0.8 corrected evaluator archive'))

source_tag_rows = []
for path, ref in [('docs/evidence/run006/source-snapshot.json', 'run-006-v0.7.0-dev')]:
    snapshot = load(path)
    for source, expected in snapshot['sourceFiles'].items():
        actual = sha(git(['show', ref + ':' + source]))
        source_tag_rows.append({'metadata': path, 'tag': ref, 'path': source, 'expectedSHA256': expected, 'tagSHA256': actual, 'matches': actual == expected})
check('v0_7_source_snapshot_matches_historical_tag', all(e['matches'] for e in source_tag_rows), count=len(source_tag_rows))

packages = []
for run, version, tag in [('run004', '0.5.0', 'run-004-v0.5.0-dev'), ('run005', '0.6.0', 'run-005-v0.6.0-dev'),
                          ('run006', '0.7.0', 'run-006-v0.7.0-dev'), ('run007', '0.8.0', 'run-007-v0.8.0-dev')]:
    path = 'output/' + run + '/EasyWeb-' + version + '-candidate.json'
    package = load(path)
    archive = package['archive']
    zip_path = str(Path(path).parent / archive['file'])
    zip_ok = match_hash(zip_path, archive['sha256'], path + ':ZIP', archive['bytes'])
    source_rows = []
    for source, value in package['sourceFiles'].items():
        expected = value if isinstance(value, str) else value['sha256']
        actual = sha(git(['show', tag + ':' + source]))
        source_rows.append({'path': source, 'expectedSHA256': expected, 'tagSHA256': actual, 'matches': actual == expected})
    zip_rows = []
    with zipfile.ZipFile(ROOT / zip_path) as z:
        for entry in z.infolist():
            relative = Path(entry.filename).relative_to(archive['installFolder'])
            dist_path = 'dist/' + str(relative)
            expected_value = package['packagedFiles'].get(dist_path)
            expected = expected_value if isinstance(expected_value, str) else expected_value.get('sha256') if isinstance(expected_value, dict) else None
            actual = sha(z.read(entry))
            zip_rows.append({'path': entry.filename, 'metadataPath': dist_path, 'bytes': entry.file_size,
                             'expectedSHA256': expected, 'actualSHA256': actual, 'matches': actual == expected})
    source_ok = all(r['matches'] for r in source_rows)
    entries_ok = len(zip_rows) == len(package['packagedFiles']) and all(r['matches'] for r in zip_rows)
    packages.append({'metadata': path, 'archive': zip_path, 'archiveMatch': zip_ok, 'tag': tag,
                     'sourceMetadataMatchesTag': source_ok, 'sourceComparisons': source_rows, 'zipEntriesMatchSavedMetadata': entries_ok, 'zipEntries': zip_rows})
    check(run + '_original_zip_matches_saved_metadata', zip_ok)
    check(run + '_package_source_metadata_matches_tag', source_ok, count=len(source_rows))
    check(run + '_zip_entries_match_historical_metadata', entries_ok, count=len(zip_rows))

# Keep error attempt and quality first failure as distinct artifacts.
error_completion_path = 'docs/evidence/run007/blind-v9-v2-first/command-completion.json'
error = load(error_completion_path)
error_report_absent = not (ROOT / error['report']).exists()
check('v9_v2_first_error_retains_no_report', error['exitCode'] == 1 and error['reportExists'] is False and error_report_absent)
check('v9_v2_first_error_original_engine_and_dataset_identities',
      match_hash('docs/evidence/run007/v0.8-engine-freeze.json', error['engineFreezeSha256'], 'v9 first error engine') and
      match_hash('docs/evidence/run007/blind-v9-v2-freeze.json', error['datasetFreezeSha256'], 'v9 first error dataset'))
log = (ROOT / 'docs/evidence/run007/blind-v9-v2-first/command.log').read_text()
check('v9_v2_first_error_log_retains_ENOENT', 'ENOENT' in log)
first_completion_path = 'docs/evidence/run007/blind-v9-v2-first-evaluated/command-completion.json'
first = load(first_completion_path)
first_report = load(first['report'])
check('v9_v2_first_actual_report_hash', match_hash(first['report'], first['reportSha256'], 'v9 first actual report'))
check('v9_v2_first_actual_engine_and_dataset_identities',
      match_hash('docs/evidence/run007/v0.8-engine-freeze-v2.json', first['engineFreezeSha256'], 'v9 first actual engine') and
      match_hash('docs/evidence/run007/blind-v9-v2-freeze.json', first['datasetFreezeSha256'], 'v9 first actual dataset'))
keys = ['correct', 'recommended', 'matched', 'expected', 'tasksRecommended']
check('v9_v2_first_FAIL_26_30_2_15_0', [first_report['summary'][k] for k in keys] == [26, 30, 2, 15, 0] and first_report['quality']['status'] == 'FAIL')
check('v9_v2_first_additional_60_73_5_15_2_still_separate', [first_report['menuFlow']['summary'][k] for k in keys] == [60, 73, 5, 15, 2] and first_report['menuFlow']['unresolvedMappings'] == first_report['menuFlow']['repeatedCards'] == 0)
for path, expected in [('docs/evidence/run005/blind-v8-first/evaluation-current-blind-v8-holdout.json', [10, 17, 4, 15, 1]),
                       ('docs/evidence/run004/blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json', [6, 12, 4, 15, 1])]:
    old = load(path)
    check(path + '_first_FAIL_still_present', [old['summary'][k] for k in keys] == expected and old['quality']['status'] == 'FAIL')

readonly = []
for path in ['docs/evidence/run007/blind-v9-freeze.json', 'docs/evidence/run007/blind-v9-v2-freeze.json']:
    freeze = load(path)
    for entry in freeze['files'] + freeze['supportingFiles']:
        p = ROOT / entry['path']
        readonly.append({'scope': path, 'path': entry['path'], 'mode': oct(p.stat().st_mode & 0o777), 'noWriteBits': not bool(p.stat().st_mode & 0o222)})
for directory in ['docs/evidence/run007/blind-v9-v2-first', 'docs/evidence/run007/blind-v9-v2-first-evaluated']:
    for p in (ROOT / directory).rglob('*'):
        if p.is_file(): readonly.append({'scope': directory, 'path': str(p.relative_to(ROOT)), 'mode': oct(p.stat().st_mode & 0o777), 'noWriteBits': not bool(p.stat().st_mode & 0o222)})
check('v9_original_v2_inputs_and_first_attempt_results_readonly', all(r['noWriteBits'] for r in readonly), entries=len(readonly), failures=[r for r in readonly if not r['noWriteBits']])

write('hash-checks.json', hashes)
write('hash-mismatches.json', [h for h in hashes if not h['passed']])
write('git-preservation-mismatches.json', [{'comparison': r['label'], **e} for r in git_results for e in r['mismatches']])
write('dataset-provenance-checks.json', {'freezes': dataset_freezes, 'versions': versions})
write('source-archives-and-tags.json', {'archives': source_archive_results, 'tagSnapshots': source_tag_rows})
write('historical-packages.json', packages)
write('readonly-inventory.json', readonly)
report = {
    'startedAtUtc': START, 'checkedAtUtc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'task': 'RUN008 independent historical preservation audit',
    'auditProcedureAttempts': [{'attempt': 1, 'result': 'AUDIT_HARNESS_PATH_ERROR', 'preservedAt': 'docs/evidence/run008/artifact-audit/historical-audit/attempt-001-package-path-assumption', 'reason': 'Historical archive.file is a basename; resolved relative to package metadata directory for the completed audit.', 'artifactMismatchConfirmed': False}, {'attempt': 2, 'result': 'AUDIT_HARNESS_RECORD_SHAPE_ERROR', 'preservedAt': 'docs/evidence/run008/artifact-audit/historical-audit/attempt-002-version-map-assumption', 'reason': '21 hash records were compared as objects instead of extracting sha256 and bytes; recorded actual hashes equal every declared hash field.', 'artifactMismatchConfirmed': False}, {'attempt': 3, 'result': 'COMPLETED'}],
    'artifactPreservationStatus': 'PASS' if not findings else 'NEEDS_FIX',
    'overallAcceptance': 'NOT_MET', 'completedStages': 5, 'totalStages': 10, 'automaticSignoff': False,
    'scope': 'Read-only byte and declared-provenance audit of historical evidence, evaluation datasets, reports and packages; writes only this audit directory.',
    'gitObjectFormat': object_format, 'gitPreservation': git_results, 'uniqueGitPathsCompared': len(unique_paths),
    'gitBlobComparisons': sum(r['filesCompared'] for r in git_results),
    'sha256Comparisons': len(hashes), 'sha256Mismatches': sum(not h['passed'] for h in hashes),
    'checks': checks, 'findings': findings, 'datasetFreezes': dataset_freezes, 'adjudicatedVersions': versions,
    'historicalFilesOutsideBaselineCount': len(not_in_baseline),
    'historicalFilesOutsideBaselineDetail': str((OUT / 'historical-files-outside-baseline.json').relative_to(ROOT)),
    'prohibitedActionsPerformed': {'sourceOrToolOrExistingEvidenceWrites': 0, 'tests': 0, 'builds': 0, 'browsers': 0, 'CUA': 0, 'network': 0, 'serverOperations': 0},
    'limits': [
        'Git comparison covers the explicit tracked paths at each named ref and working bytes. Arbitrary untracked or ignored historical files do not have a Git baseline; listed files outside baseline are inventory only.',
        'Excluded current evaluation README and protocol-tests are implementation/documentation rather than immutable historical inputs.',
        'Historical product/tool source is checked against explicit archives or the matching old Git tag. It is not expected to equal current v0.9 source or dist.',
        'No historical script, product, evaluator, test, build, browser, network operation, CUA or server operation was executed.',
        'Read-only permission bits describe the observed filesystem permissions and do not prevent privileged future changes.',
        'Artifact preservation does not establish product quality, accessibility, installation, business completion or overall acceptance.'
    ]
}
write('report.json', report)
print(json.dumps({'artifactPreservationStatus': report['artifactPreservationStatus'], 'checks': len(checks), 'failedChecks': [c['name'] for c in checks if not c['passed']], 'gitBlobComparisons': report['gitBlobComparisons'], 'uniqueGitPathsCompared': len(unique_paths), 'sha256Comparisons': len(hashes), 'sha256Mismatches': report['sha256Mismatches'], 'historicalFilesOutsideBaseline': len(not_in_baseline)}, ensure_ascii=False))
