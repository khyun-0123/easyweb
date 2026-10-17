from pathlib import Path
import datetime
import hashlib
import html
import json
import re
import stat
import subprocess
import urllib.parse
import zipfile

ROOT = Path('/Users/khyun_03/easyweb')
OUT = ROOT / 'docs/evidence/run007/final-source-review/artifact-audit'
EVIDENCE = ROOT / 'docs/evidence/run007'
checks = []
hashes = []
findings = []

def load(path):
    return json.loads((ROOT / path).read_text())

def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()

def check(name, passed, **detail):
    checks.append({'name': name, 'passed': bool(passed), **detail})

def match_hash(path, expected, scope, expected_bytes=None):
    p = ROOT / path
    actual = sha(path) if p.is_file() else None
    ok = actual == expected and (expected_bytes is None or p.stat().st_size == expected_bytes)
    hashes.append({'path': str(path), 'expectedSHA256': expected, 'actualSHA256': actual,
                   'expectedBytes': expected_bytes, 'scope': scope, 'passed': ok})
    return ok

def hash_map(mapping, scope):
    return all([match_hash(p, h if isinstance(h, str) else h['sha256'], scope,
                           None if isinstance(h, str) else h.get('bytes')) for p, h in mapping.items()])

f1 = load('docs/evidence/run007/v0.8-engine-freeze.json')
f2 = load('docs/evidence/run007/v0.8-engine-freeze-v2.json')
check('freeze_v1_v2_same_15_product_files', len(f2['sourceFiles']) == 15 and f1['sourceFiles'] == f2['sourceFiles'])
check('current_product_equals_v2_freeze', hash_map(f2['sourceFiles'], 'final product freeze'))
archive_ok = []
for path, expected in f2['sourceFiles'].items():
    archive_ok.append(match_hash(str(Path(f2['archive']) / path), expected, 'final frozen product archive'))
check('archive_product_equals_v2_freeze', all(archive_ok), count=len(archive_ok))
check('current_tools_equal_v2_freeze', hash_map(f2['toolFiles'], 'final tools freeze'))
check('original_freeze_bytes_preserved', match_hash(f2['previousFreeze']['path'], f2['previousFreeze']['sha256'], 'original product freeze'))
changed = [p for p in f1['toolFiles'] if f1['toolFiles'][p] != f2['toolFiles'][p]]
check('only_evaluator_tool_changed_between_freezes', changed == ['scripts/evaluate.mjs'], changed=changed)
proof = load('docs/evidence/run007/tool-revision-proof.json')
check('tool_before_archive_matches_v1', match_hash(proof['beforeArchive'], f1['toolFiles']['scripts/evaluate.mjs'], 'before evaluator archive'))
check('tool_after_archive_matches_v2', match_hash(proof['afterArchive'], f2['toolFiles']['scripts/evaluate.mjs'], 'after evaluator archive'))

dataset_freezes = []
for name in ['blind-v9-freeze.json', 'blind-v9-v2-freeze.json']:
    freeze = load('docs/evidence/run007/' + name)
    entries = freeze['files'] + freeze['supportingFiles']
    results = [match_hash(e['path'], e['sha256'], name, e.get('bytes')) for e in entries]
    dataset_freezes.append({'path': name, 'entries': len(entries), 'allMatch': all(results), 'counts': freeze['counts']})
    check(name + '_frozen_hashes', all(results), entries=len(entries))
    readonly = [{'path': e['path'], 'mode': oct((ROOT/e['path']).stat().st_mode & 0o777),
                 'noWriteBits': not bool((ROOT/e['path']).stat().st_mode & 0o222)} for e in entries]
    (OUT / (name + '-readonly.json')).write_text(json.dumps(readonly, ensure_ascii=False, indent=2)+'\n')
    check(name + '_readonly_bits', all(e['noWriteBits'] for e in readonly), entries=len(readonly))

v7 = load('evaluation/development-v7-corrected-v2/VERSION.json')
v7_hash_ok = []
for entry in v7['files']:
    for pathkey, hashkey, byteskey in [('path','sha256','bytes'), ('basePath','baseSha256','baseBytes'), ('parentPath','parentSha256','parentBytes')]:
        v7_hash_ok.append(match_hash(entry[pathkey], entry[hashkey], 'v7 v2 current/base/parent', entry.get(byteskey)))
for pathkey, hashkey in [('baseFreeze','baseFreezeSha256'), ('parentVersionPath','parentVersionSha256'),
                          ('annotationAudit','annotationAuditSha256'), ('annotationProposals','annotationProposalsSha256')]:
    v7_hash_ok.append(match_hash(v7[pathkey], v7[hashkey], 'v7 v2 provenance'))
manifest = load('docs/evidence/run007/v7-contract-static-review/v2/artifact-manifest.json')
for entry in [manifest['version']] + manifest['newDataFiles'] + manifest['evidence']:
    v7_hash_ok.append(match_hash(entry['path'], entry['sha256'], 'v7 v2 artifact manifest', entry.get('bytes')))
before = load('docs/evidence/run007/v7-contract-static-review/v2/source-hashes-before.json')
after = load('docs/evidence/run007/v7-contract-static-review/v2/source-hashes-after.json')
check('v7_original_parent_21_files_still_equal_before_after', before == after and len(before) == 21 and hash_map(before, 'v7 original and parent preserved'))
check('v7_v2_all_declared_hashes_match', all(v7_hash_ok), comparisons=len(v7_hash_ok))
check('v7_v2_explicitly_development_not_fresh', v7['classification']=='ADJUDICATED_DEVELOPMENT' and v7['freshHoldout'] is False)

package = load('output/run007/EasyWeb-0.8.0-candidate.json')
zip_path = 'output/run007/EasyWeb-0.8.0-candidate.zip'
expected_zip = '0efe9a229db5622d4e41a1369ac99b7ddc3ac3590666b2a997998b1d244a9982'
check('zip_size_and_expected_hash', match_hash(zip_path, expected_zip, 'v0.8 final ZIP', 375030))
check('package_metadata_sources_match', hash_map(package['sourceFiles'], 'package source metadata'))
check('package_metadata_dist_match', hash_map(package['packagedFiles'], 'package dist metadata'))
check('package_reproducibility_recorded', all(package['reproducibility'][k] for k in ['twoBuildsIdentical','twoArchivesIdentical','sourceStable']))
zip_entries = []
with zipfile.ZipFile(ROOT / zip_path) as z:
    for entry in z.infolist():
        relative = Path(entry.filename).relative_to(package['archive']['installFolder'])
        dist = ROOT / 'dist' / relative
        blob = z.read(entry)
        zip_entries.append({'path':entry.filename,'bytes':entry.file_size,'sha256':hashlib.sha256(blob).hexdigest(),
                            'equalsDist':dist.is_file() and blob==dist.read_bytes()})
    zip_manifest = json.loads(z.read(package['archive']['installFolder']+'/manifest.json'))
check('zip_exact_5_dist_entries',len(zip_entries)==5 and all(e['equalsDist'] for e in zip_entries)
      and {str(Path(e['path']).relative_to(package['archive']['installFolder'])) for e in zip_entries}
      == {str(p.relative_to(ROOT/'dist')) for p in (ROOT/'dist').rglob('*') if p.is_file()}, entries=zip_entries)
source_manifest = load('extension/manifest.json')
dist_manifest = load('dist/manifest.json')
check('minimal_manifest_identical_source_dist_zip', source_manifest==dist_manifest==zip_manifest
      and source_manifest['version']=='0.8.0' and source_manifest['manifest_version']==3
      and sorted(source_manifest.get('permissions',[]))==['activeTab','scripting']
      and not source_manifest.get('host_permissions') and not source_manifest.get('content_scripts')
      and not source_manifest.get('optional_host_permissions') and not source_manifest.get('optional_permissions'))
check('sha256sums_final_zip_entry', expected_zip in (ROOT/'output/run007/SHA256SUMS').read_text())

local = load('docs/evidence/run007/local-verification.json')
check('local_311_no_fail_flaky_skip', local['tests']['expected']==311 and all(local['tests'][k]==0 for k in ['unexpected','flaky','skipped'])
      and local['localRegressionStatus']=='PASS' and local['requestedChecksStatus']=='PASS')
playwright = load('docs/evidence/run007/playwright-local.json')
check('playwright_raw_311_no_fail_flaky_skip', playwright['stats']['expected']==311 and all(playwright['stats'][k]==0 for k in ['unexpected','flaky','skipped']))
check('core_summary_72_74_45_45_15', [local['coreQuality']['summary'][k] for k in ['correct','recommended','matched','expected','tasksRecommended']]==[72,74,45,45,15])
a11y = load('docs/evidence/run007/a11y-automated.json')
check('a11y_21_error_violation_incomplete_zero', a11y['summary']['cases']==21 and all(a11y['summary'][k]==0 for k in ['errors','violations','seriousOrCritical','incomplete']) and not a11y['errors'])
check('a11y_source_hashes_current', hash_map(a11y['sourceHashes'], 'a11y final source hashes') and a11y['sourceStable'])
live = load('docs/evidence/run007/tasks-live-final.json')
check('public_live_15_is_9_http_6_guidance', [live['summary'][k] for k in ['observedTasks','passed','actualCardLinksClicked','destinationReached','originalGuidanceReached','guidanceRetries','observationErrors']]==[15,15,9,9,6,0,0])
check('live_source_hashes_current', hash_map(live['sourceHashes'], 'live final source hashes'))
performance = load('docs/evidence/run007/institution-performance-final/performance.json')
institution = performance['modes']['institution']
generic = performance['modes']['generic']
check('institution_performance_preserves_existing_PASS_extra_FAIL', performance['existingBenchmarkStatus']=='PASS'
      and performance['additionalPipelineDiagnosticStatus']=='FAIL'
      and [round(institution[k], 1) for k in ['analyzerP95Milliseconds','overlayReadyP95Milliseconds',
          'analysisPipelineP95Milliseconds','currentnessBatchP95Milliseconds']]==[203.4,437.1,413.8,376.1]
      and round(generic['analysisPipelineP95Milliseconds'],1)==256.8)
check('institution_performance_source_hashes_current', performance['sourceSha256Before']==performance['sourceSha256After']
      and hash_map(performance['sourceSha256Before'], 'institution synthetic performance source hashes'))
manual = load('docs/evidence/run007/manual-fixture-final.json')
check('manual_fixture_record_is_only_3_HTTP200_not_manual',len(manual['routes'])==3 and manual['actualManualChecks']=='NOT_RUN'
      and all(route['status']==200 and route['equalsLocalFile'] for route in manual['routes']))
check('manual_fixture_recorded_local_bytes_match',all([match_hash(route['localFile'],route['sha256'], 'saved manual fixture HTTP/local evidence') for route in manual['routes']]))

development = load('docs/evidence/run007/final-development/summary.json')
check('development_same_15_sources_before_after', development['stableBeforeAndAfter'] and development['sourceFiles']==development['sourceAfter'] and hash_map(development['sourceFiles'], 'development final source hashes'))
check('development_24_rows_50_unique', len(development['rows'])==24 and development['uniqueExposedPages']==50)
report_text = (ROOT/'docs/RUN_007_REPORT.md').read_text()
suite_labels = {'core':'core','blind-v2':'v2','blind-v3':'v3','development-v4-corrected':'정정v4',
 'blind-v5':'v5','blind-v6':'rawv6','development-v6-corrected':'정정v6-1','development-v6-corrected-v2':'정정v6-2',
 'blind-v7-v2':'rawv7-v2','development-v7-corrected':'정정v7-1','development-v7-corrected-v2':'정정v7-2','blind-v8':'v8'}
table_checks=[]
for suite,label in suite_labels.items():
    rows = {row['mode']:row for row in development['rows'] if row['suite']==suite}
    line = next((line for line in report_text.splitlines() if re.match(r'^\|\s*'+re.escape(label)+r'\s*\|',line)), '')
    cells = [c.strip() for c in line.strip('|').split('|')]
    expected = []
    for mode in ['generic','institution']:
        s = rows[mode]['summary']; expected.append(f"{s['correct']}/{s['recommended']} ·{s['matched']}/{s['expected']}")
    same = len(cells)>=4 and all(re.sub(r'\s+','',cells[i+1])==re.sub(r'\s+','',expected[i]) for i in range(2)) and cells[3].startswith(rows['institution']['quality']['status'])
    table_checks.append({'suite':suite,'reportLabel':label,'matches':same})
check('run007_development_table_matches_all_12_suites',all(x['matches'] for x in table_checks), rows=table_checks)
aggregates = {row['mode']:row for row in development['uniquePageAggregates']}
check('known50_aggregate_counts', [aggregates['generic']['summary'][k] for k in ['correct','recommended','matched','expected','tasksRecommended']]==[206,215,126,140,46]
      and [aggregates['institution']['summary'][k] for k in ['correct','recommended','matched','expected','tasksRecommended']]==[227,231,139,140,50])

first_path='docs/evidence/run007/blind-v9-v2-first-evaluated/evaluation-current-institution-blind-v9-v2-holdout.json'
first=load(first_path)
completion=load('docs/evidence/run007/blind-v9-v2-first-evaluated/command-completion.json')
check('fresh_first_report_completion_hash',match_hash(first_path,completion['reportSha256'],'fresh first report preserved'))
check('fresh_first_26_30_2_15_0_fail_all_sites', [first['summary'][k] for k in ['correct','recommended','matched','expected','tasksRecommended']]==[26,30,2,15,0]
      and first['quality']['status']=='FAIL' and all(not site['passed'] for site in first['quality']['sites']))
check('fresh_extra_60_73_5_15_2_no_unresolved_repeated', [first['menuFlow']['summary'][k] for k in ['correct','recommended','matched','expected','tasksRecommended']]==[60,73,5,15,2]
      and first['menuFlow']['unresolvedMappings']==0 and first['menuFlow']['repeatedCards']==0)
check('first_execution_exit1_source_tools_stable',completion['exitCode']==1 and completion['sourceStable'] and completion['toolsStable'])
for key,path in [('engineFreezeSha256','docs/evidence/run007/v0.8-engine-freeze-v2.json'),('datasetFreezeSha256','docs/evidence/run007/blind-v9-v2-freeze.json')]:
    check('first_completion_'+key,match_hash(path,completion[key],'first execution freeze identity'))
first_readonly = [{'path':str(p.relative_to(ROOT)),'mode':oct(p.stat().st_mode & 0o777),'noWriteBits':not bool(p.stat().st_mode & 0o222)}
                  for p in (EVIDENCE/'blind-v9-v2-first-evaluated').rglob('*') if p.is_file()]
check('first_result_files_readonly',all(p['noWriteBits'] for p in first_readonly),count=len(first_readonly))
(OUT/'first-result-readonly.json').write_text(json.dumps(first_readonly,indent=2)+'\n')

historical = []
for tag, scopes in [
 ('run-004-v0.5.0-dev',['docs/evidence/run004','evaluation/blind-v7','evaluation/blind-v7-v2','output/run004']),
 ('run-005-v0.6.0-dev',['docs/evidence/run005','evaluation/blind-v8','output/run005']),
 ('run-006-v0.7.0-dev',['docs/evidence/run006','output/run006'])]:
    tree=subprocess.check_output(['git','ls-tree','-r','-z',tag,'--',*scopes],cwd=ROOT)
    entries=[]
    for record in tree.split(b'\0'):
        if not record: continue
        meta,rawpath=record.split(b'\t',1); mode,kind,object_id=meta.decode().split()
        path=rawpath.decode(); p=ROOT/path; data=p.read_bytes() if p.is_file() else None
        actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() if data is not None else None
        entries.append({'path':path,'expectedGitBlob':object_id,'actualGitBlob':actual,'matches':actual==object_id})
    historical.append({'tag':tag,'scopes':scopes,'filesCompared':len(entries),'allPreserved':all(e['matches'] for e in entries),'mismatches':[e for e in entries if not e['matches']]})
    (OUT/(tag+'-preservation.json')).write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
    check(tag+'_historical_artifacts_preserved',all(e['matches'] for e in entries),count=len(entries))
for name,expected in [('docs/evidence/run005/blind-v8-first/evaluation-current-blind-v8-holdout.json',[10,17,4,15,1]),
                      ('docs/evidence/run004/blind-v7-v2-first/evaluation-current-blind-v7-v2-holdout.json',[6,12,4,15,1])]:
    old=load(name)
    check(name+'_first_fail_counts_unchanged',[old['summary'][k] for k in ['correct','recommended','matched','expected','tasksRecommended']]==expected and old['quality']['status']=='FAIL')
old7=load('docs/evidence/run006/source-snapshot.json')
tag7ok=[]
for path,expected in old7['sourceFiles'].items():
    blob=subprocess.check_output(['git','show','run-006-v0.7.0-dev:'+path],cwd=ROOT)
    tag7ok.append({'path':path,'expectedSHA256':expected,'tagSHA256':hashlib.sha256(blob).hexdigest()})
check('v0_7_source_snapshot_matches_tag',all(e['expectedSHA256']==e['tagSHA256'] for e in tag7ok),count=len(tag7ok))
for freeze_path in ['docs/evidence/run005/v0.6-engine-freeze-v2.json','docs/evidence/run004/v0.5-engine-freeze.json']:
    old=load(freeze_path)
    check(freeze_path+'_archive_preserved',all([match_hash(str(Path(old['archive'])/p),h,'historical explicit source archive') for p,h in old['sourceFiles'].items()]))

doc_paths=['README.md','AGENTS.md','docs/WORK_SPEC.md','docs/PROGRESS.md','docs/RUN_007_REPORT.md','docs/INSTALL.md',
           'docs/PRETEST.md','docs/SUPPORT_MATRIX.md','docs/ACCESSIBILITY.md','docs/VALIDATION.md','evaluation/README.md']
doc_hashes={p:sha(p) for p in doc_paths}
for p in doc_paths:
    text=(ROOT/p).read_text()
    check(p+'_current_v0_8_pointer',bool(re.search(r'(?:v?0\.8(?:\.0)?|RUN-007)',text[:1500])))
check('release_acceptance_remains_5_of_10_NOT_MET',load('docs/evidence/run007/release-gate.json')['overallAcceptance']=='NOT_MET'
      and load('docs/evidence/run007/release-gate.json')['completedStages']==5)

# Parse file references in actual Markdown, excluding fenced/inline code,
# URLs, same-document anchors, template placeholders, and external targets.
md_paths=subprocess.check_output(['rg','--files','-g','*.md','-g','!node_modules/**','-g','!.git/**'],cwd=ROOT,text=True).splitlines()
links=[]; skipped={}; broken=[]
def skip(kind):skipped[kind]=skipped.get(kind,0)+1
def target_of(raw):
    raw=raw.strip()
    if raw.startswith('<'):
        end=raw.find('>'); return raw[1:end] if end>=0 else raw
    return re.split(r'\s+[\"\']',raw,maxsplit=1)[0].strip()
for mdpath in md_paths:
    text=(ROOT/mdpath).read_text(errors='replace')
    text=re.sub(r'(?ms)^\s*(```|~~~).*?^\s*\1[^\n]*$',lambda m:'\n'*m.group(0).count('\n'),text)
    text=re.sub(r'`+[^`\n]*`+',lambda m:' '*len(m.group(0)),text)
    found=[]
    for m in re.finditer(r'!?\[[^\]\n]*\]\(',text):
        start=m.end(); depth=1; i=start
        while i<len(text) and depth:
            if text[i]=='\\':i+=2;continue
            if text[i]=='(':depth+=1
            elif text[i]==')':depth-=1
            if depth:i+=1
        if depth==0:found.append((m.start(),target_of(text[start:i])))
    for m in re.finditer(r'^\s*\[[^\]\n]+\]:\s*(\S+)',text,re.M):found.append((m.start(),target_of(m.group(1))))
    for pos,target in found:
        target=html.unescape(target)
        if not target or target.startswith('#'):skip('anchor_or_empty');continue
        if re.match(r'^[a-z][a-z0-9+.-]*:',target,re.I) or target.startswith('//'):skip('url_or_scheme');continue
        if re.search(r'[{}<>]|\$|…|\.\.\.|YOUR_|실제|새[_ -]?빈|filename',target,re.I):skip('template_placeholder');continue
        target=urllib.parse.unquote(target.split('#',1)[0].split('?',1)[0]).replace('\\(', '(').replace('\\)',')')
        path=(ROOT/mdpath).parent/target
        if target.startswith('/'):skip('absolute_path');continue
        row={'markdown':mdpath,'line':text.count('\n',0,pos)+1,'target':target,'resolved':str(path.resolve().relative_to(ROOT)) if path.resolve().is_relative_to(ROOT) else str(path.resolve()),'exists':path.exists()}
        links.append(row)
        if not row['exists']:broken.append(row)
check('markdown_relative_local_links_resolve',not broken,filesScanned=len(md_paths),localReferencesChecked=len(links),brokenCount=len(broken),skipped=skipped)
(OUT/'markdown-links.json').write_text(json.dumps({'filesScanned':len(md_paths),'localReferencesChecked':len(links),'skipped':skipped,'broken':broken,'links':links},ensure_ascii=False,indent=2)+'\n')

hashes_mismatched=[e for e in hashes if not e['passed']]
for failure in [c for c in checks if not c['passed']]:findings.append({'severity':'ARTIFACT_REVIEW','name':failure['name'],'evidence':failure})
closing_stable=all(sha(p)==h for p,h in f2['sourceFiles'].items()) and all(sha(p)==h for p,h in f2['toolFiles'].items())
check('closing_product_and_tool_source_stable',closing_stable)
result={
 'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':'0.8.0','reviewerTask':'v8_final_source_review',
 'artifactStatus':'PASS' if not findings and closing_stable else 'NEEDS_FIX','overallAcceptance':'NOT_MET','completedStages':5,'totalStages':10,
 'automaticSignoff':False,'integrationOwner':'root','scope':'Independent read-only artifact and documentation audit; no product or network execution.',
 'sourceStable':closing_stable,'checks':checks,'findings':findings,
 'sha256Comparisons':{'count':len(hashes),'mismatches':len(hashes_mismatched),'detail':'docs/evidence/run007/final-source-review/artifact-audit/hash-checks.json'},
 'historicalGitPreservation':historical,'datasetFreezeChecks':dataset_freezes,
 'markdownLinks':{'filesScanned':len(md_paths),'localReferencesChecked':len(links),'brokenCount':len(broken),'broken':broken,'skipped':skipped,
                  'detail':'docs/evidence/run007/final-source-review/artifact-audit/markdown-links.json'},
 'auditedDocumentSHA256':doc_hashes,
 'resolvedDuringAudit':[{'finding':'Mixed current0.7/RUN006/50-page and unimplemented-plan pointers in WORK_SPEC/evaluation README','resolution':'Root updated current pointers to0.8/RUN007/55 and marked historical0.7 results; reread final bytes. No historical result counts changed.'}],
 'limits':['Artifact consistency is separate from product acceptance. Fresh independent quality remains FAIL and acceptance remains NOT_MET.',
 'No product, test, benchmark, native, CUA, browser or network execution was performed by this reviewer.',
 'Fresh evaluation aggregates and freeze metadata were read; fresh data content was only binary-hashed, never used for source tuning.',
 'Read-only bits are filesystem permission evidence, not proof against privileged future modification.',
 'Packaging reproducibility is verified against saved metadata and exact ZIP/current dist bytes; the reviewer did not rebuild.',
 'Markdown scan covers repository Markdown reported by rg, with file-existence checks only; external URLs and section anchors were not requested or tested.',
 'Historical sources are compared with their explicit archives or named Git tags, not expected to equal current source.',
 'No claim of native installation, VoiceOver speech, actual browser zoom, pretest, formal user study, business success, file download or execution is added.']}
(OUT/'hash-checks.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/evidence/run007/final-review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'artifactStatus':result['artifactStatus'],'checks':len(checks),'failedChecks':[c['name'] for c in checks if not c['passed']],
                  'sha256Comparisons':len(hashes),'hashMismatches':len(hashes_mismatched),'historicalFiles':sum(x['filesCompared'] for x in historical),
                  'markdownFiles':len(md_paths),'localLinks':len(links),'broken':broken},ensure_ascii=False))
