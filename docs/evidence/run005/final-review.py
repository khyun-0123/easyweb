"""Read-only checkpoint integrity audit; writes only final-review.json."""
from pathlib import Path
from urllib.parse import unquote
import datetime
import hashlib
import json
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'docs/evidence/run005'
checks = []


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_hashes(label, entries, prefix=ROOT):
    for name, expected in entries.items():
        path = prefix / name
        assert sha(path) == expected, (label, str(path))
        checks.append({'scope': label, 'file': str(path.relative_to(ROOT)), 'sha256': expected})


freeze = json.loads((BASE / 'v0.6-engine-freeze-v2.json').read_text())
check_hashes('final source', freeze['sourceFiles'])
check_hashes('final archived source', freeze['sourceFiles'], ROOT / freeze['archive'])
for run, name, archive in [('run003', 'v0.3-engine-freeze.json', 'docs/evidence/run003/v0.3-before-blind-v5-engine'),
                          ('run003', 'v0.4-engine-freeze.json', 'docs/evidence/run003/v0.4-before-blind-v6-engine'),
                          ('run004', 'v0.5-engine-freeze.json', 'docs/evidence/run004/v0.5-before-blind-v7-engine'),
                          ('run005', 'v0.6-engine-freeze.json', 'docs/evidence/run005/v0.6-before-blind-v8-engine')]:
    record = json.loads((ROOT / 'docs/evidence' / run / name).read_text())
    check_hashes('preserved earlier engine archive', record['sourceFiles'], ROOT / archive)
for manifest in [ROOT / 'docs/evidence/run003/blind-v6-freeze.json',
                 ROOT / 'docs/evidence/run004/blind-v7-freeze.json',
                 ROOT / 'docs/evidence/run004/blind-v7-v2-freeze.json', BASE / 'blind-v8-freeze.json']:
    record = json.loads(manifest.read_text())
    check_hashes('preserved frozen dataset', {f['path']: f['sha256'] for f in record['files']})
for version in ['development-v6-corrected', 'development-v6-corrected-v2', 'development-v7-corrected']:
    record = json.loads((ROOT / 'evaluation' / version / 'VERSION.json').read_text())
    check_hashes('adjudicated development inputs', {f['path']: f['sha256'] for f in record['files']})
    check_hashes('preserved adjudication originals', {f['basePath']: f['baseSha256'] for f in record['files']})
    check_hashes('preserved adjudication parents', {f['parentPath']: f['parentSha256'] for f in record['files'] if 'parentPath' in f})
    check_hashes('complete original adjudication freeze', {f['path']: f['sha256'] for f in record.get('originalFrozenFiles', [])})

first_path = BASE / 'blind-v8-first/evaluation-current-blind-v8-holdout.json'
first = json.loads(first_path.read_text())
command = json.loads((first_path.parent / 'first-command.json').read_text())
assert command['firstProductEvaluationOfV8SourcePages'] and command['sourceFreezeMatched']
assert first['summary']['pages'] == 5 and first['summary']['expected'] == 15
assert first['quality']['status'] in ['PASS', 'FAIL']
assert command['exitCode'] == (0 if first['quality']['status'] == 'PASS' else 1)
assert first['freezeVerification']['stableThroughEvaluation'] is True
for kind in ['engine', 'dataset']:
    frozen = first['freezeVerification'][kind]
    check_hashes('first independent evaluation freeze', {frozen['path']: frozen['sha256']})
check_hashes('first independent evaluation tools', first['toolHashes'])

package_dir = ROOT / 'output/run005'
pkg = json.loads((package_dir / 'EasyWeb-0.6.0-candidate.json').read_text())
check_hashes('package source', pkg['sourceFiles'])
check_hashes('package built files', pkg['packagedFiles'])
report_text = (ROOT / 'docs/RUN_005_REPORT.md').read_text()
assert pkg['archive']['sha256'] in report_text
for report, key in [('a11y-automated.json', 'sourceHashes'),
                    ('performance.json', 'sourceSha256'), ('performance-flat.json', 'sourceSha256'),
                    ('performance-table.json', 'sourceSha256'), ('tasks-live-final.json', 'sourceHashes')]:
    check_hashes('final verification source: ' + report, json.loads((BASE / report).read_text())[key])
for line in (package_dir / 'SHA256SUMS').read_text().splitlines():
    expected, name = line.split('  ', 1)
    check_hashes('package checksum file', {str(Path('output/run005') / name): expected})
assert sha(package_dir / pkg['archive']['file']) == pkg['archive']['sha256']
assert all(pkg['reproducibility'][key] for key in ['twoBuildsIdentical', 'twoArchivesIdentical', 'sourceStable'])
zip_entries = 0
with zipfile.ZipFile(package_dir / pkg['archive']['file']) as archive:
    assert archive.testzip() is None
    prefix = pkg['archive']['installFolder'] + '/'
    for name in archive.namelist():
        assert name.startswith(prefix) and '..' not in Path(name).parts
        assert archive.read(name) == (ROOT / 'dist' / name[len(prefix):]).read_bytes(), name
        zip_entries += 1
    manifest = json.loads(archive.read(prefix + 'manifest.json'))
    assert manifest['version'] == '0.6.0' and sorted(manifest['permissions']) == ['activeTab', 'scripting']
    assert not manifest.get('host_permissions') and not manifest.get('content_scripts')
assert (ROOT / 'dist/manifest.json').read_bytes() == (ROOT / 'extension/manifest.json').read_bytes()
assert not subprocess.check_output(['git', 'diff', '--name-only', 'HEAD', '--',
    'docs/evidence/run002', 'output/run002', 'docs/evidence/run003', 'output/run003',
    'docs/evidence/run004', 'output/run004', 'docs/RUN_004_REPORT.md',
    'evaluation/blind-v6', 'evaluation/blind-v7', 'evaluation/blind-v7-v2'], cwd=ROOT).strip()

links, broken = [], []
for document in [ROOT / 'README.md', ROOT / 'AGENTS.md', ROOT / 'evaluation/README.md', *sorted((ROOT / 'docs').glob('*.md'))]:
    for match in re.finditer(r'\[[^\]]*\]\(([^)]+)\)', document.read_text()):
        target = match.group(1).strip().strip('<>')
        if re.match(r'^[a-z][a-z0-9+.-]*:', target, re.I) or target.startswith('#'):
            continue
        target = unquote(target.split('#', 1)[0])
        links.append({'document': str(document.relative_to(ROOT)), 'target': target})
        resolved = (document.parent / target).resolve()
        if not resolved.exists() and resolved != BASE / 'final-review.json': broken.append(links[-1])
assert not broken, broken
result = {'reviewedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'PASS',
          'scope': 'Local links, source/archive/dataset/build checksums, preserved prior checkpoints and ZIP bytes; no browser or product execution.',
          'localMarkdownLinks': len(links), 'brokenLinks': broken, 'hashComparisons': len(checks),
          'hashMismatches': 0, 'hashChecks': checks, 'zipIntegrity': 'PASS', 'zipEntriesMatchedDist': zip_entries,
          'priorCheckpointsUnchanged': True,
          'firstIndependentEvaluationPreserved': {'report': str(first_path.relative_to(ROOT)), 'sha256': sha(first_path),
              'quality': first['quality']['status'], 'commandExitCode': command['exitCode']},
          'releaseAcceptance': 'NOT_ASSERTED'}
(BASE / 'final-review.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert all((ROOT / link['document']).parent.joinpath(link['target']).resolve().exists() for link in links)
print(json.dumps({k: v for k, v in result.items() if k != 'hashChecks'}, ensure_ascii=False))
