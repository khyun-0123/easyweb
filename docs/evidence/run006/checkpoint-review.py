"""Read-only development checkpoint audit. Does not assert release acceptance."""
from pathlib import Path
import datetime
import hashlib
import json
import re
import subprocess
from urllib.parse import unquote
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'docs/evidence/run006'
checks = []


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check(entries, scope):
    for name, expected in entries.items():
        assert sha(ROOT / name) == expected, (scope, name)
        checks.append({'scope': scope, 'path': name, 'sha256': expected})


snapshot = json.loads((BASE / 'source-snapshot.json').read_text())
assert snapshot['freshBlindEvaluation'] is False
check(snapshot['sourceFiles'], 'current development source')
for run, name, archive in [
    ('run005', 'v0.6-engine-freeze.json', 'docs/evidence/run005/v0.6-before-blind-v8-engine'),
    ('run005', 'v0.6-engine-freeze-v2.json', 'docs/evidence/run005/v0.6-before-blind-v8-final-engine')]:
    record = json.loads((ROOT / 'docs/evidence' / run / name).read_text())
    check({str(Path(archive) / name): value for name, value in record['sourceFiles'].items()}, 'preserved v0.6 source archive')
record = json.loads((ROOT / 'docs/evidence/run005/blind-v8-freeze.json').read_text())
check({f['path']: f['sha256'] for f in record['files']}, 'preserved v8 original input')
assert not subprocess.check_output(['git', 'diff', '--name-only', '6129140d131278f8cf5fb0414de8e5e5a9566596', '--',
    'docs/evidence/run002', 'docs/evidence/run003', 'docs/evidence/run004', 'docs/evidence/run005',
    'docs/RUN_005_REPORT.md', 'output/run002', 'output/run003', 'output/run004', 'output/run005',
    'evaluation/blind-v8', 'evaluation/development-v7-corrected'], cwd=ROOT).strip()

verification = json.loads((BASE / 'local-verification.json').read_text())
assert verification['localRegressionStatus'] == verification['requestedChecksStatus'] == 'PASS'
assert verification['tests']['unexpected'] == verification['tests']['flaky'] == verification['tests']['skipped'] == 0
assert verification['coreQuality']['status'] == 'PASS'
known = json.loads((BASE / 'known-download-controls.json').read_text())
assert known['status'] == 'PASS' and known['originalMarkupUnchanged']
assert len(known['controls']) == 2 and all(c['action'] == 'locate' and c['cardHref'] is None for c in known['controls'])
check(known['sourceFiles'], 'original download controls source')
probe = json.loads((BASE / 'independent-review/title-branch-results.json').read_text())
assert probe['status'] == 'PASS' and probe['passed'] == probe['total'] == 9 and probe['sourceStable']
check(probe['sourceHashes'], 'independent title probe source')
resolution = json.loads((BASE / 'independent-review/root-resolution.json').read_text())
check({'tests/independent-download-review.spec.mjs': resolution['resolvedIndependentExecution']['unchangedTestSha256']}, 'unchanged independent test')
for name, key in [('a11y-automated.json', 'sourceHashes'), ('performance.json', 'sourceSha256'),
                  ('performance-flat.json', 'sourceSha256'), ('performance-table.json', 'sourceSha256'),
                  ('tasks-live-final.json', 'sourceHashes')]:
    check(json.loads((BASE / name).read_text())[key], 'final measured source: ' + name)
development = json.loads((BASE / 'development/evaluation-current-blind-v8-all.json').read_text())
assert development['evaluationPhase'] == 'post-holdout-development' and development['suite'] == 'blind-v8'
development_source = json.loads((BASE / 'development/source-verification.json').read_text())
assert development_source['stableBeforeAndAfter'] is True
check(development_source['sourceFiles'], 'development v8 source')

package_dir = ROOT / 'output/run006'
pkg = json.loads((package_dir / 'EasyWeb-0.7.0-candidate.json').read_text())
check(pkg['sourceFiles'], 'packaged source')
check(pkg['packagedFiles'], 'packaged build')
assert all(pkg['reproducibility'][key] for key in ['twoBuildsIdentical', 'twoArchivesIdentical', 'sourceStable'])
assert sha(package_dir / pkg['archive']['file']) == pkg['archive']['sha256']
for line in (package_dir / 'SHA256SUMS').read_text().splitlines():
    expected, name = line.split('  ', 1)
    check({str(Path('output/run006') / name): expected}, 'package checksum file')
with zipfile.ZipFile(package_dir / pkg['archive']['file']) as archive:
    assert archive.testzip() is None
    prefix = pkg['archive']['installFolder'] + '/'
    for name in archive.namelist():
        assert name.startswith(prefix) and '..' not in Path(name).parts
        assert archive.read(name) == (ROOT / 'dist' / name[len(prefix):]).read_bytes()
    manifest = json.loads(archive.read(prefix + 'manifest.json'))
    assert manifest['version'] == '0.7.0'
    assert sorted(manifest['permissions']) == ['activeTab', 'scripting']
    assert not manifest.get('host_permissions') and not manifest.get('content_scripts')
    zip_entries = len(archive.namelist())
assert (ROOT / 'dist/manifest.json').read_bytes() == (ROOT / 'extension/manifest.json').read_bytes()
assert pkg['archive']['sha256'] in (ROOT / 'docs/RUN_006_REPORT.md').read_text()

links, broken = [], []
for document in [ROOT / 'README.md', ROOT / 'AGENTS.md', ROOT / 'evaluation/README.md', *sorted((ROOT / 'docs').glob('*.md'))]:
    for match in re.finditer(r'\[[^\]]*\]\(([^)]+)\)', document.read_text()):
        target = match.group(1).strip().strip('<>')
        if re.match(r'^[a-z][a-z0-9+.-]*:', target, re.I) or target.startswith('#'):
            continue
        resolved = (document.parent / unquote(target.split('#', 1)[0])).resolve()
        links.append(resolved)
        if not resolved.exists() and resolved != BASE / 'final-review.json':
            broken.append({'document': str(document.relative_to(ROOT)), 'target': target})
assert not broken, broken
result = {'reviewedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status': 'PASS',
          'scope': 'Source/package/archive checksums, local links, original v8 data and earlier checkpoint preservation. No product/browser execution or release acceptance.',
          'hashComparisons': len(checks), 'hashMismatches': 0, 'hashChecks': checks,
          'localMarkdownLinks': len(links), 'brokenLinks': broken, 'zipIntegrity': 'PASS',
          'zipEntriesMatchedDist': zip_entries, 'priorCheckpointsUnchanged': True,
          'freshIndependentEvaluation': 'NONE', 'releaseAcceptance': 'NOT_ASSERTED'}
(BASE / 'final-review.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert all(path.exists() for path in links)
print(json.dumps({k: v for k, v in result.items() if k != 'hashChecks'}, ensure_ascii=False))
