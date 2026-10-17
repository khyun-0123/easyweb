"""Read-only checkpoint integrity checks; writes only final-review.json."""
from pathlib import Path
from urllib.parse import unquote
import datetime
import hashlib
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'docs/evidence/run004'
checks = []


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_hashes(label, entries, prefix=ROOT):
    for name, expected in entries.items():
        path = prefix / name
        assert sha(path) == expected, (label, str(path))
        checks.append({'scope': label, 'file': str(path.relative_to(ROOT)), 'sha256': expected})


freeze = json.loads((BASE / 'v0.5-engine-freeze.json').read_text())
check_hashes('final source', freeze['sourceFiles'])
check_hashes('final archived source', freeze['sourceFiles'], BASE / 'v0.5-before-blind-v7-engine')
for manifest, archive in [('v0.3-engine-freeze.json', 'v0.3-before-blind-v5-engine'),
                          ('v0.4-engine-freeze.json', 'v0.4-before-blind-v6-engine')]:
    previous = ROOT / 'docs/evidence/run003'
    record = json.loads((previous / manifest).read_text())
    check_hashes('preserved first independent engine archive', record['sourceFiles'], previous / archive)
for manifest in [ROOT / 'docs/evidence/run003/blind-v6-freeze.json',
                 BASE / 'blind-v7-freeze.json', BASE / 'blind-v7-v2-freeze.json']:
    record = json.loads(manifest.read_text())
    check_hashes('original frozen dataset', {f['path']: f['sha256'] for f in record['files']})
for version in ['development-v6-corrected', 'development-v6-corrected-v2']:
    record = json.loads((ROOT / 'evaluation' / version / 'VERSION.json').read_text())
    check_hashes('adjudicated development version', {f['path']: f['sha256'] for f in record['files']})
    check_hashes('preserved original adjudication inputs', {f['basePath']: f['baseSha256'] for f in record['files']})
    parents = {f['parentPath']: f['parentSha256'] for f in record['files'] if 'parentPath' in f}
    check_hashes('preserved parent adjudication inputs', parents)

first_path = BASE / 'blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json'
first = json.loads(first_path.read_text())
command = json.loads((first_path.parent / 'first-command.json').read_text())
assert command['firstProductEvaluationOfV7SourcePages'] and command['sourceFreezeMatched']
assert command['exitCode'] == 1 and first['quality']['status'] == 'FAIL'
assert first['summary'] == {'pages': 5, 'correct': 6, 'recommended': 12, 'matched': 4,
                           'expected': 15, 'precision': 0.5,
                           'recall': 4 / 15, 'tasksRecommended': 1}
assert first['freezeVerification']['stableThroughEvaluation'] is True
for kind in ['engine', 'dataset']:
    frozen = first['freezeVerification'][kind]
    check_hashes('first independent evaluation freeze', {frozen['path']: frozen['sha256']})
check_hashes('first independent evaluation tools', first['toolHashes'])
adjudication = json.loads((BASE / 'v7-v2-action-root-review.json').read_text())
check_hashes('post-first action adjudication audit', {adjudication['audit']: adjudication['auditSha256']})
check_hashes('preserved first report after action adjudication',
             {adjudication['firstReport']: adjudication['firstReportSha256']})
assert not adjudication['rawMetricsRecomputed'] and not adjudication['productOrFrozenDatasetChanged']

package_dir = ROOT / 'output/run004'
pkg = json.loads((package_dir / 'EasyWeb-0.5.0-candidate.json').read_text())
report_text = (ROOT / 'docs/RUN_004_REPORT.md').read_text()
for label, key in [('sourceDigest', 'sourceDigestSha256'), ('buildDigest', 'buildDigestSha256')]:
    assert re.search(label + r': `([^`]+)`', report_text).group(1) == pkg[key]
assert pkg['archive']['sha256'] in report_text
check_hashes('package source', pkg['sourceFiles'])
check_hashes('package built files', pkg['packagedFiles'])
for report, key in [('a11y-automated.json', 'sourceHashes'),
                    ('performance.json', 'sourceSha256'), ('performance-flat.json', 'sourceSha256'), ('performance-table.json', 'sourceSha256'),
                    ('tasks-live-final.json', 'sourceHashes')]:
    check_hashes('final verification source: ' + report,
                 json.loads((BASE / report).read_text())[key])
for line in (package_dir / 'SHA256SUMS').read_text().splitlines():
    expected, name = line.split('  ', 1)
    check_hashes('package checksum file', {str(Path('output/run004') / name): expected})
assert sha(package_dir / pkg['archive']['file']) == pkg['archive']['sha256']

zip_entries = 0
with zipfile.ZipFile(package_dir / pkg['archive']['file']) as archive:
    assert archive.testzip() is None
    prefix = pkg['archive']['installFolder'] + '/'
    for name in archive.namelist():
        assert name.startswith(prefix) and '..' not in Path(name).parts
        local = ROOT / 'dist' / name[len(prefix):]
        assert archive.read(name) == local.read_bytes(), name
        zip_entries += 1
    manifest = json.loads(archive.read(prefix + 'manifest.json'))
    assert manifest['version'] == '0.5.0'
    assert sorted(manifest['permissions']) == ['activeTab', 'scripting']
    assert not manifest.get('host_permissions') and not manifest.get('content_scripts')
assert (ROOT / 'dist/manifest.json').read_bytes() == (ROOT / 'extension/manifest.json').read_bytes()
assert not subprocess.check_output(['git', 'diff', '--name-only', 'HEAD', '--',
                                    'docs/evidence/run002', 'output/run002', 'docs/evidence/run003', 'output/run003', 'evaluation/blind-v6'], cwd=ROOT).strip()

local_links = []
broken = []
documents = [ROOT / 'README.md', ROOT / 'AGENTS.md', ROOT / 'evaluation/README.md',
             *sorted((ROOT / 'docs').glob('*.md'))]
for document in documents:
    for match in re.finditer(r'\[[^\]]*\]\(([^)]+)\)', document.read_text()):
        target = match.group(1).strip().strip('<>')
        if re.match(r'^[a-z][a-z0-9+.-]*:', target, re.I) or target.startswith('#'):
            continue
        target = unquote(target.split('#', 1)[0])
        path = (document.parent / target).resolve()
        local_links.append({'document': str(document.relative_to(ROOT)), 'target': target})
        if not path.exists():
            broken.append(local_links[-1])
assert not broken, broken

result = {'reviewedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'status': 'PASS', 'scope': 'Local document targets, frozen/source/build hashes, original RUN-002/RUN-003 preservation and ZIP bytes. No browser or product execution.',
          'localMarkdownLinks': len(local_links), 'brokenLinks': broken,
          'hashComparisons': len(checks), 'hashMismatches': 0, 'hashChecks': checks,
          'zipIntegrity': 'PASS', 'zipEntriesMatchedDist': zip_entries,
          'priorCheckpointsUnchanged': True,
          'firstIndependentEvaluationPreserved': {'report': str(first_path.relative_to(ROOT)),
                                                 'sha256': sha(first_path),
                                                 'quality': first['quality']['status'],
                                                 'commandExitCode': command['exitCode']},
          'releaseAcceptance': 'NOT_ASSERTED'}
(BASE / 'final-review.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k != 'hashChecks'}, ensure_ascii=False))
