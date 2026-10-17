"""Offline saved-artifact audit only. Never executes product/build/browser/tests."""
from pathlib import Path, PurePosixPath
import datetime, hashlib, json, os, subprocess, zipfile

ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent
E=Path('docs/evidence/run009')
checks=[]; findings=[]; hashes=[]
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def load(p): return json.loads((ROOT/p).read_text())
def sha(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()
def write(n,v): (OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
def check(name,passed,**detail):
    checks.append({'name':name,'passed':bool(passed),**detail})
    if not passed: findings.append({'check':name,**detail})
def match(p,h,scope,size=None):
    actual=sha(p) if (ROOT/p).is_file() else None
    ok=actual==h and (size is None or (ROOT/p).stat().st_size==size)
    hashes.append({'path':str(p),'scope':scope,'expectedSHA256':h,'actualSHA256':actual,'expectedBytes':size,'passed':ok})
    return ok
def hash_map(m,scope): return all([match(p,h,scope) for p,h in m.items()])
def git(*args): return subprocess.check_output(['git',*args],cwd=ROOT)

started=now(); freeze_path=E/'v0.10-engine-freeze.json'; freeze=load(freeze_path)
frozen={**freeze['sourceFiles'],**freeze['toolFiles'],**freeze['testFiles']}
opening={p:sha(p) for p in frozen}
check('final_freeze_expected_sha256',match(freeze_path,'4ebebfe1dca0ffa10e6bab2481f83b90640a6b07ff73bfb71f8bff37b59b7b89','root supplied final freeze'))
check('final_freeze_21_product_17_tool_42_tests',len(freeze['sourceFiles'])==21 and len(freeze['toolFiles'])==17 and len(freeze['testFiles'])==42)
surface={str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.is_file()}|{'extension/manifest.json'}
check('freeze_exact_product_surface',set(freeze['sourceFiles'])==surface)
check('freeze_exact_test_surface',set(freeze['testFiles'])=={str(p.relative_to(ROOT)) for p in (ROOT/'tests').glob('*.spec.mjs')})
check('current_frozen_product_tool_test_bytes_match',hash_map(frozen,'final frozen product/tool/test'))
archive=Path(freeze['archive'])
archived={**freeze['sourceFiles'],**freeze['toolFiles']}
check('all38_declared_product_tool_archive_bytes_match',all([match(archive/p,h,'final frozen archive') for p,h in archived.items()]),count=len(archived),tests='42 test files are hash-frozen in place, not claimed as copied into the 38-file engine archive')
modified_tools=set(git('diff','--name-only','bdc3e1c','--','scripts','package.json','package-lock.json','tsconfig.json','playwright.config.mjs','evaluation/protocol-tests.mjs').decode().splitlines())
unfrozen=sorted(modified_tools-set(freeze['toolFiles']))
check('modified_validation_tools_covered_or_explicitly_nonexecuted_default_path_only',unfrozen==['scripts/check-live.mjs'],unfrozenModifiedTools=unfrozen,exception='check-live.mjs only changes output default run008→run009 and was not the final 15-task runner')
old_live=git('show','bdc3e1c:scripts/check-live.mjs')
check('unfrozen_check_live_is_exact_output_path_only_change',old_live.replace(b"'docs/evidence/run008'",b"'docs/evidence/run009'",1)==(ROOT/'scripts/check-live.mjs').read_bytes())

# Git blob equality covers every prior dataset, evidence file, freeze and ZIP.
baseline='bdc3e1c851807efe23cb25f695888f70406fd2dd'
scopes=['docs/evidence','evaluation','output']+[f'docs/RUN_{n:03d}_REPORT.md' for n in range(1,9)]
excluded=['evaluation/README.md','evaluation/protocol-tests.mjs']
history=[]
format=git('rev-parse','--show-object-format').decode().strip()
for record in git('ls-tree','-r','-z',baseline,'--',*scopes).split(b'\0'):
    if not record: continue
    metadata,rawpath=record.split(b'\t',1); mode,kind,oid=metadata.decode().split(); path=os.fsdecode(rawpath)
    if path in excluded: continue
    p=ROOT/path; data=os.fsencode(os.readlink(p)) if p.is_symlink() else p.read_bytes() if p.is_file() else None
    actual=hashlib.new(format,b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() if data is not None else None
    history.append({'path':path,'expectedMode':mode,'expectedGitBlob':oid,'actualGitBlob':actual,'actualSHA256':hashlib.sha256(data).hexdigest() if data is not None else None,'bytes':len(data) if data is not None else None,'passed':kind=='blob' and actual==oid})
mismatches=[r for r in history if not r['passed']]
write('historical-preservation.json',{'baselineCommit':baseline,'scopes':scopes,'excludedCurrentDocumentationOrTools':excluded,'filesCompared':len(history),'mismatches':mismatches,'entries':history})
check('all_baseline_original_data_evidence_output_report_blobs_preserved',not mismatches,count=len(history),mismatches=mismatches)
first_path=Path('docs/evidence/run008/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json')
check('original_v10_first_report_expected_hash',match(first_path,'e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131','original independent first report'))
first=load(first_path);keys=['correct','recommended','matched','expected','tasksRecommended']
check('original_first_FAIL_and_separate_menu_counts_retained',[first['summary'][k] for k in keys]==[26,28,2,15,0] and first['quality']['status']=='FAIL' and all(not s['passed'] for s in first['quality']['sites']) and [first['menuFlow']['summary'][k] for k in keys]==[32,40,3,15,0] and first['menuFlow']['unresolvedMappings']==9 and first['menuFlow']['repeatedCards']==4)
old=load('docs/evidence/run008/blind-v10-freeze.json');protocol=load('docs/evidence/run008/blind-v10-freeze-protocol.json')
pairs=lambda entries:sorted((e['path'],e['sha256']) for e in entries)
check('original_and_protocol_same388_pairs',len(old['entries'])==len(protocol['files'])==388 and pairs(old['entries'])==pairs(protocol['files']))
check('all388_dataset_payload_hashes_preserved',all([match(e['path'],e['sha256'],'original v10 dataset',e.get('bytes')) for e in old['entries']]))
readonly=[{'path':e['path'],'noWriteBits':not bool((ROOT/e['path']).stat().st_mode&0o222)} for e in old['entries']]
write('dataset-readonly.json',readonly);check('all388_dataset_payloads_remain_readonly',all(r['noWriteBits'] for r in readonly))

# Package checks read existing bytes; no rebuild or repackage is performed.
package_path=Path('output/run009/EasyWeb-0.10.0-candidate.json');package=load(package_path);zip_path=package_path.parent/package['archive']['file']
check('zip_expected_bytes_sha_metadata',match(zip_path,'ce0650d3a747da1c9b157a77db7fbaae11a99cda2a40f7d46ef22662cfdf403b','current candidate ZIP',605239) and package['archive']['sha256']=='ce0650d3a747da1c9b157a77db7fbaae11a99cda2a40f7d46ef22662cfdf403b' and package['archive']['bytes']==605239)
check('package_source_files_current',hash_map(package['sourceFiles'],'package source'))
check('package_dist_files_current',hash_map(package['packagedFiles'],'package dist'))
digest=lambda m:hashlib.sha256(''.join(p+'\0'+h+'\n' for p,h in m.items()).encode()).hexdigest()
check('package_source_and_dist_digests_recompute',digest(package['sourceFiles'])==package['sourceDigestSha256'] and digest(package['packagedFiles'])==package['buildDigestSha256'])
check('saved_double_build_double_zip_source_stable',all(package['reproducibility'][k] for k in ['twoBuildsIdentical','twoArchivesIdentical','sourceStable']))
entries=[]
with zipfile.ZipFile(ROOT/zip_path) as z:
    check('zip_integrity',z.testzip() is None)
    names=z.namelist();check('zip_names_unique_sorted',len(names)==len(set(names)) and names==sorted(names))
    prefix=package['archive']['installFolder']
    for entry in z.infolist():
        name=PurePosixPath(entry.filename);safe=not name.is_absolute() and '..' not in name.parts and name.parts[0]==prefix
        relative=PurePosixPath(*name.parts[1:]);dist=ROOT/'dist'/str(relative);blob=z.read(entry)
        entries.append({'path':entry.filename,'bytes':entry.file_size,'sha256':hashlib.sha256(blob).hexdigest(),'safePath':safe,'equalsDist':dist.is_file() and blob==dist.read_bytes(),'stored':entry.compress_type==zipfile.ZIP_STORED,'fixedTimestamp':entry.date_time==(1980,1,1,0,0,0),'regular0644':entry.external_attr>>16==0o100644})
    zipped_manifest=json.loads(z.read(prefix+'/manifest.json'))
write('zip-entries.json',entries)
check('zip_exact_five_dist_entries_and_deterministic_metadata',len(entries)==5 and {str(PurePosixPath(e['path']).relative_to(prefix)) for e in entries}=={str(p.relative_to(ROOT/'dist')) for p in (ROOT/'dist').rglob('*') if p.is_file()} and all(all(e[k] for k in ['safePath','equalsDist','stored','fixedTimestamp','regular0644']) for e in entries))
manifest=load('extension/manifest.json')
check('manifest_source_dist_zip_equal',manifest==load('dist/manifest.json')==zipped_manifest)
check('version0_10_manifest_minimal_permissions',manifest['version']==load('package.json')['version']==package['version']=='0.10.0' and manifest['manifest_version']==3 and sorted(manifest.get('permissions',[]))==['activeTab','scripting'] and not any(manifest.get(k) for k in ['host_permissions','optional_host_permissions','optional_permissions','content_scripts']))
sums={line.split(None,1)[1].strip():line.split(None,1)[0] for line in (ROOT/package_path.parent/'SHA256SUMS').read_text().splitlines() if line.strip()}
check('sha256sums_exact_zip_and_report',set(sums)=={zip_path.name,package_path.name} and all(sums[p.name]==sha(p) for p in [zip_path,package_path]))

local=load(E/'local-verification.json');pw=load(E/'playwright-local.json');start=load(E/'verification-command-start.json');end=load(E/'verification-command-completion.json')
check('493_local_raw_stats_and_stages_PASS',local['requestedChecksStatus']==local['localRegressionStatus']=='PASS' and local['tests']['expected']==pw['stats']['expected']==493 and all(local['tests'][k]==pw['stats'][k]==0 for k in ['unexpected','flaky','skipped']) and not pw.get('errors') and all(s['status']=='PASS' and s['exitCode']==0 for s in local['stages']))
check('full_verify_bound_to_final_source',start['sourceFiles']==end['sourceFiles']==freeze['sourceFiles'] and end['sourceStable'] and end['exitCode']==0)
def specs(suite):
    return suite.get('specs',[])+[s for child in suite.get('suites',[]) for s in specs(child)]
integration=[s for suite in pw['suites'] if suite.get('file')=='final-v10-integration.spec.mjs' for s in specs(suite)]
check('all10_independent_integration_cases_in_final493',len(integration)==10 and all(s['ok'] and all(t['status']=='expected' and all(r['status']=='passed' and not r['errors'] for r in t['results']) for t in s['tests']) for s in integration),titles=[s['title'] for s in integration])
check('core72_of74_45_of45_15_tasks_development',[local['coreQuality']['summary'][k] for k in keys]==[72,74,45,45,15] and local['coreQuality']['status']=='PASS' and local['coreQuality']['evaluationPhase']=='post-holdout-development')
for name in ['performance.json','performance-flat.json','performance-table.json']:
    p=load(E/name)
    check(name+'_existing_thresholds_and_source_current',p['status']=='PASS' and len(p['measures'])==10 and all(p['validity'][k] for k in ['sourceStable','exactlyTenRuns','allCandidatesCount1000','allOverlaysReady']) and p['analyzerP95Milliseconds']<=300 and p['overlayReadyP95Milliseconds']<=1000 and hash_map(p['sourceSha256'],name))
institution=load(E/'institution-performance-final/performance.json')
check('institution_benchmark_frozen_source_stable',institution['sourceSha256Before']==institution['sourceSha256After'] and hash_map(institution['sourceSha256Before'],'institution benchmark') and all(institution['validity'].values()))
check('sequential_institution_pipelinePASS_genericFAIL_not_hidden',institution['status']==institution['additionalPipelineDiagnosticStatus']=='FAIL' and institution['existingBenchmarkStatus']=='PASS' and institution['modes']['institution']['additionalPipelineDiagnosticStatus']=='PASS' and institution['modes']['generic']['additionalPipelineDiagnosticStatus']=='FAIL' and round(institution['modes']['institution']['analysisPipelineP95Milliseconds'],1)==284.2 and round(institution['modes']['generic']['analysisPipelineP95Milliseconds'],1)==327.1 and 'Sequential' in institution['environment']['coordination'])
check('both_modes10_valid_samples_existing_thresholds',all(len(m['measures'])==10 and all(m['validity'].values()) and m['analyzerP95Milliseconds']<=300 and m['overlayReadyP95Milliseconds']<=1000 for m in institution['modes'].values()))
a11y=load(E/'a11y-automated.json');live=load(E/'tasks-live.json')
check('a11y21_zero_errors_violations_incomplete_current_source',a11y['sourceStable'] and a11y['summary']['cases']==21 and all(a11y['summary'][k]==0 for k in ['errors','violations','seriousOrCritical','incomplete']) and not a11y['errors'] and hash_map(a11y['sourceHashes'],'a11y source'))
check('live15_HTTP9_guidance6_no_errors_current_source',[live['summary'][k] for k in ['observedTasks','passed','actualCardLinksClicked','destinationReached','originalGuidanceReached','guidanceRetries','observationErrors']]==[15,15,9,9,6,0,0] and live['summary']['allDatasetTasksAttempted'] and hash_map(live['sourceHashes'],'live task source'))
closing=load(E/'closing-source-check.json')
check('closing_source_tool_test_a11y_correspondence_declared',all(closing[k] for k in ['sourceStable','toolsStable','testsStable','a11yMatchesClosingSource','firstV10Unchanged']) and closing['sourceFiles']==21 and closing['toolFiles']==17 and closing['testFiles']==42 and 'ignores' in closing['a11yCommandNote'])

development=load(E/'closing-development-comparison/summary.json')
check('closing28_rows60_unique_same21_sources',len(development['rows'])==28 and development['uniqueExposedPages']==60 and development['classification']=='EXPOSED_DEVELOPMENT_ONLY' and development['stableBeforeAndAfter'] and development['sourceFiles']==development['sourceAfter']==freeze['sourceFiles'])
reports=[]
for row in development['rows']:
    report=load(row['report']);reports.append({'mode':row['mode'],'suite':row['suite'],'path':row['report'],'sha256':sha(row['report']),'passed':report['classificationMode']==row['mode'] and report['suite']==row['suite'] and report['summary']==row['summary'] and report['quality']==row['quality'] and all(freeze['toolFiles'].get(p)==h for p,h in report['toolHashes'].items())})
write('comparison-report-bindings.json',reports);check('all28_saved_suite_reports_agree_with_summary_and_tools',all(r['passed'] for r in reports))
aggregates=[]
for aggregate in development['uniquePageAggregates']:
    rows=[r for r in development['rows'] if r['mode']==aggregate['mode'] and r['suite'] in aggregate['suites']]
    totals={k:sum(r['summary'][k] for r in rows) for k in ['pages']+keys}
    aggregates.append({'mode':aggregate['mode'],'totals':totals,'passed':len(rows)==10 and all(totals[k]==aggregate['summary'][k] for k in totals)})
check('60_unique_aggregate_arithmetic',all(a['passed'] for a in aggregates),aggregates=aggregates)
known={a['mode']:a['summary'] for a in development['uniquePageAggregates']}
check('institution286_290_169_170_60_generic263_272_148_170_53',[known['institution'][k] for k in keys]==[286,290,169,170,60] and [known['generic'][k] for k in keys]==[263,272,148,170,53])
failures=[{'mode':r['mode'],'suite':r['suite'],'summary':r['summary'],'status':r['quality']['status'],'exitCode':r['exitCode']} for r in development['rows'] if r['quality']['status']!='PASS']
write('individual-failures-preserved.json',failures)
check('institution_five_individual_suite_FAILs_retained',len([r for r in failures if r['mode']=='institution'])==5 and all(r['exitCode']==0 for r in failures),institutionFailedSuites=[r['suite'] for r in failures if r['mode']=='institution'])
v8=next(r for r in development['rows'] if r['mode']=='institution' and r['suite']=='blind-v8');v10=next(r for r in development['rows'] if r['mode']=='institution' and r['suite']=='blind-v10')
check('known_v8_recovered15_of15',v8['summary']['matched']==v8['summary']['expected']==15 and v8['quality']['status']=='PASS')
check('known_v10_development29_30_15_15_5_mapping0_repeat0',[v10['summary'][k] for k in keys]==[29,30,15,15,5] and v10['quality']['status']=='PASS' and v10['menuFlow']['unresolvedMappings']==v10['menuFlow']['repeatedCards']==0)
gate=load(E/'release-gate.json');usage=load(E/'goal-usage-snapshot.json');stop=load(E/'user-stop-boundary.json')
check('gate5_of10_NOT_MET_matches_current_and_original_evidence',gate['overallAcceptance']=='NOT_MET' and gate['completedStages']==5 and gate['totalStages']==10 and gate['localTests']==493 and gate['knownV10Development']['firstScreen']==v10['summary'] and gate['priorIndependentV10']['summary']==first['summary'] and gate['priorIndependentV10']['status']=='FAIL' and not gate['newIndependentValidationThisVersion'])
check('native_speech_zoom_NOT_RUN_human0_CUA0',all(gate[k]=='NOT_RUN' for k in ['currentNativeInstall','actualVoiceOverSpeech','actualBrowserZoom']) and gate['pretestActualObservations']==gate['formalStudyActualObservations']==gate['CUAOrNativeAutomationCount']==0)
dt=lambda value:datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
check('partial_usage_boundary_unknown_billing_and_user_pause_not_complete',round((dt(usage['observedBoundaryEndUtc'])-dt(usage['observedBoundaryStartUtc'])).total_seconds(),3)==usage['boundaryElapsedSeconds']==1147.893 and usage['wholeRunElapsed']=='UNKNOWN' and all(v=='UNKNOWN' for v in usage['billing'].values()) and 'PAUSE' in usage['afterClosingDisposition'] and 'not completion' in freeze['afterClosing'] and stop['newIndependentDatasetCollectionStarted'] is False and gate['goalStatusAtRecord']=='active')
closing_hashes={p:sha(p) for p in frozen}
check('closing_source_tool_test_bytes_stable',opening==closing_hashes==frozen)
write('source-stability.json',{'openingAtUtc':started,'closingAtUtc':now(),'opening':opening,'closing':closing_hashes,'stable':opening==closing_hashes})
write('hash-checks.json',hashes)
write('core-audit.json',{'checkedAtUtc':now(),'result':'PASS' if not findings else 'FAIL','checks':checks,'findings':findings,'hashComparisons':len(hashes),'hashMismatches':sum(not h['passed'] for h in hashes),'historicalGitBlobComparisons':len(history),'scope':'Offline saved-record/source/archive/ZIP/Git byte audit only. No product, build, test, benchmark, browser, network or native operation was executed.','savedEvidence':{'localTests':493,'sourceFiles':21,'toolFiles':17,'testFiles':42,'comparisonRows':28,'uniqueExposedDevelopmentPages':60,'institutionCurrentPipelineMs':284.2,'genericCurrentPipelineMs':327.1}})
print(json.dumps({'result':'PASS' if not findings else 'FAIL','checks':len(checks),'findings':findings,'hashComparisons':len(hashes),'historicalGitBlobComparisons':len(history)},ensure_ascii=False))
