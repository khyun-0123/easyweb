from pathlib import Path, PurePosixPath
import datetime
import hashlib
import json
import stat
import zipfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
E = 'docs/evidence/run008/'
checks, hashes, findings = [], [], []
def load(path): return json.loads((ROOT/path).read_text())
def sha(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def check(name, passed, **details):
    checks.append({'name':name,'passed':bool(passed),**details})
    if not passed: findings.append({'check':name,**details})
def match(path, expected, scope, size=None):
    p=ROOT/path; actual=sha(path) if p.is_file() else None
    ok=actual==expected and (size is None or p.stat().st_size==size)
    hashes.append({'path':str(path),'expectedSHA256':expected,'actualSHA256':actual,'expectedBytes':size,'scope':scope,'passed':ok})
    return ok
def hash_map(mapping, scope): return all([match(p,h,scope) for p,h in mapping.items()])
def write(name, value): (OUT/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

opening_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
freeze=load(E+'v0.9-engine-freeze.json')
opening={p:sha(p) for p in dict(freeze['sourceFiles'],**freeze['toolFiles'])}
check('freeze_18_product_13_tool_files',len(freeze['sourceFiles'])==18 and len(freeze['toolFiles'])==13)
required={str(p.relative_to(ROOT)) for p in (ROOT/'src').iterdir() if p.is_file()}|{'extension/manifest.json'}
check('freeze_covers_exact_current_product_surface',set(freeze['sourceFiles'])==required)
check('current_product_matches_final_freeze',hash_map(freeze['sourceFiles'],'final product freeze'))
check('current_tools_match_final_freeze',hash_map(freeze['toolFiles'],'final tool freeze'))
archive=Path(freeze['archive'])
archive_checks=[match(str(archive/p),h,'frozen archive') for p,h in dict(freeze['sourceFiles'],**freeze['toolFiles']).items()]
check('frozen_archive_matches_all_31_declared_entries',all(archive_checks),count=len(archive_checks))

original=load(E+'blind-v10-freeze.json'); protocol=load(E+'blind-v10-freeze-protocol.json')
pairs=lambda entries: sorted((e['path'],e['sha256']) for e in entries)
check('original_and_protocol_same_388_path_hash_pairs',len(original['entries'])==388 and len(protocol['files'])==388 and pairs(original['entries'])==pairs(protocol['files']))
check('protocol_binds_unchanged_original_freeze',match(protocol['sourceFreeze']['path'],protocol['sourceFreeze']['sha256'],'original dataset freeze') and protocol['sourceFreeze']['entriesSha256']==original['entriesSha256'])
dataset_ok=[match(e['path'],e['sha256'],'new dataset original frozen bytes',e.get('bytes')) for e in original['entries']]
check('all_388_original_dataset_bytes_match',all(dataset_ok),count=len(dataset_ok))
readonly=[{'path':e['path'],'mode':oct((ROOT/e['path']).stat().st_mode & 0o777),'noWriteBits':not bool((ROOT/e['path']).stat().st_mode & 0o222)} for e in original['entries']]
write('dataset-readonly.json',readonly)
check('all_388_dataset_entries_have_no_write_bits',all(e['noWriteBits'] for e in readonly))
check('dataset_original_declares_preproduct_five_pages_fifteen_groups',original['productExecutions']==0 and [original[k] for k in ['siteCount','pageCount','expectedGroupCount','publicReadOnlyTaskCount','visibleControlCount']]==[5,5,15,5,333])

qa_path=E+'blind-v10-independent-static-qa/artifacts-manifest.json';qa_manifest=load(qa_path)
check('qa_manifest_has_17_total_files',len(qa_manifest['entries'])+1==qa_manifest['fileCountIncludingThisManifest']==17)
check('qa_16_declared_payloads_preserved',all([match(e['path'],e['sha256'],'independent static QA payload',e.get('bytes')) for e in qa_manifest['entries']]))
check('qa_manifest_expected_sha256',match(qa_path,'b32fd24918c3ab19cfcc45cbd34ae388d0aec6fdcc0a088f8cce14df3f889391','independently supplied QA manifest hash'))
qa=load(E+'blind-v10-independent-static-qa/report.json')
check('qa_preproduct_execution_zero',qa_manifest['productExecutions']==0)

error_start=load(E+'blind-v10-first/command-start.json');error_end=load(E+'blind-v10-first/command-completion.json')
start=load(E+'blind-v10-first-evaluated/command-start.json');end=load(E+'blind-v10-first-evaluated/command-completion.json')
first_path=end['report'];first=load(first_path)
expected_first='e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131'
check('first_preexecution_error_retained_without_quality_report',error_end['exitCode']==1 and error_end['reportExists'] is False and error_end['reportSha256'] is None and not (ROOT/error_end['report']).exists() and 'Freeze record has no files' in (ROOT/(E+'blind-v10-first/command.log')).read_text())
check('first_actual_report_expected_hash',match(first_path,expected_first,'first independent report') and end['reportSha256']==expected_first)
check('first_actual_phase_and_stability',first['evaluationPhase']=='fresh-blind-validation' and first['freezeVerification']['stableThroughEvaluation'] and end['sourceStable'] and end['toolsStable'])
check('first_actual_start_unexposed_zero_prior_product_one_preproduct_error',start['priorIndependentProductExecutions']==0 and start['priorPreProductCommandFailures']==1 and start['rootImplementationSemanticExposureBeforeFirst'] is False)
for record_name,record in [('first-error-start',error_start),('first-error-end',error_end),('first-actual-start',start),('first-actual-end',end)]:
    check(record_name+'_engine_freeze_bound',match(E+'v0.9-engine-freeze.json',record['engineFreezeSha256'],record_name))
    data_path=E+('blind-v10-freeze-protocol.json' if 'actual' in record_name else 'blind-v10-freeze.json')
    check(record_name+'_dataset_freeze_bound',match(data_path,record['datasetFreezeSha256'],record_name))
check('first_actual_static_qa_bound',match(E+'blind-v10-independent-static-qa/report.json',start['staticQASha256'],'first actual static QA'))
check('first_actual_source_before_equal_freeze',start['sourceBefore']==freeze['sourceFiles'])
check('first_report_tool_hashes_bound',all(first['toolHashes'].get(p)==h for p,h in freeze['toolFiles'].items() if p in first['toolHashes']))
first_readonly=[]
for directory in ['blind-v10-first','blind-v10-first-evaluated']:
    for p in (ROOT/E/directory).rglob('*'):
        if p.is_file():first_readonly.append({'path':str(p.relative_to(ROOT)),'noWriteBits':not bool(p.stat().st_mode & 0o222)})
write('first-records-readonly.json',first_readonly)
check('first_error_and_first_actual_files_readonly',all(e['noWriteBits'] for e in first_readonly),files=len(first_readonly))
summary_keys=['correct','recommended','matched','expected','tasksRecommended']
check('first_screen_26_28_2_15_0_all_sites_fail',[first['summary'][k] for k in summary_keys]==[26,28,2,15,0] and first['quality']['status']=='FAIL' and len(first['quality']['sites'])==5 and all(not row['passed'] for row in first['quality']['sites']))
check('menu_32_40_3_15_0_unresolved9_repeat4_separate',[first['menuFlow']['summary'][k] for k in summary_keys]==[32,40,3,15,0] and first['menuFlow']['unresolvedMappings']==9 and first['menuFlow']['repeatedCards']==4)

package=load('output/run008/EasyWeb-0.9.0-candidate.json');zip_path='output/run008/'+package['archive']['file']
expected_zip='23e6f3e03d3aee061a2cd1912bed6612dce18853579ba8f85e41b1a39ed68c08'
check('zip_bytes_sha_and_package_metadata',match(zip_path,expected_zip,'final candidate ZIP',478876) and package['archive']['sha256']==expected_zip and package['archive']['bytes']==478876)
check('package_source_metadata_current',hash_map(package['sourceFiles'],'package source metadata'))
check('package_dist_metadata_current',hash_map(package['packagedFiles'],'package dist metadata'))
digest=lambda mapping:hashlib.sha256(''.join(p+'\0'+h+'\n' for p,h in mapping.items()).encode()).hexdigest()
check('package_source_and_dist_digest_recomputed',digest(package['sourceFiles'])==package['sourceDigestSha256'] and digest(package['packagedFiles'])==package['buildDigestSha256'])
check('saved_reproducibility_checks_true',all(package['reproducibility'][k] for k in ['twoBuildsIdentical','twoArchivesIdentical','sourceStable']))
zip_entries=[]
with zipfile.ZipFile(ROOT/zip_path) as z:
    check('zip_testzip_integrity',z.testzip() is None)
    names=z.namelist();check('zip_names_unique_sorted',len(names)==len(set(names)) and names==sorted(names))
    for entry in z.infolist():
        path=PurePosixPath(entry.filename);safe=not path.is_absolute() and '..' not in path.parts and path.parts[0]==package['archive']['installFolder']
        relative=PurePosixPath(*path.parts[1:]);dist=ROOT/'dist'/str(relative);blob=z.read(entry)
        zip_entries.append({'path':entry.filename,'bytes':entry.file_size,'sha256':hashlib.sha256(blob).hexdigest(),'safePath':safe,'equalsDist':dist.is_file() and blob==dist.read_bytes(),'stored':entry.compress_type==zipfile.ZIP_STORED,'fixedTimestamp':entry.date_time==(1980,1,1,0,0,0),'regular0644':entry.external_attr>>16==0o100644})
    manifest_zip=json.loads(z.read(package['archive']['installFolder']+'/manifest.json'))
write('zip-entries.json',zip_entries)
relative_zip={str(PurePosixPath(e['path']).relative_to(package['archive']['installFolder'])) for e in zip_entries}
relative_dist={str(p.relative_to(ROOT/'dist')) for p in (ROOT/'dist').rglob('*') if p.is_file()}
check('zip_exact_five_dist_entries_and_deterministic_metadata',len(zip_entries)==5 and relative_zip==relative_dist and all(all(e[k] for k in ['safePath','equalsDist','stored','fixedTimestamp','regular0644']) for e in zip_entries))
manifest=load('extension/manifest.json');check('manifest_source_dist_zip_same',manifest==load('dist/manifest.json')==manifest_zip)
check('manifest_version_minimal_permissions',manifest['version']==load('package.json')['version']==package['version']=='0.9.0' and manifest['manifest_version']==3 and sorted(manifest.get('permissions',[]))==['activeTab','scripting'] and all(not manifest.get(k) for k in ['host_permissions','optional_host_permissions','optional_permissions','content_scripts']))
sum_entries={line.split(None,1)[1].strip():line.split(None,1)[0] for line in (ROOT/'output/run008/SHA256SUMS').read_text().splitlines() if line.strip()}
check('sha256sums_zip_and_report_entries_exact',all(sum_entries.get(name)==sha('output/run008/'+name) for name in ['EasyWeb-0.9.0-candidate.zip','EasyWeb-0.9.0-candidate.json']))

local=load(E+'local-verification.json');pw=load(E+'playwright-local.json')
check('local_409_expected_no_fail_flaky_skip',local['localRegressionStatus']=='PASS' and local['requestedChecksStatus']=='PASS' and local['tests']['expected']==pw['stats']['expected']==409 and all(local['tests'][k]==pw['stats'][k]==0 for k in ['unexpected','flaky','skipped']) and not pw.get('errors'))
check('recorded_verify_stages_pass',all(s['status']=='PASS' and s['exitCode']==0 for s in local['stages']))
check('core_saved_72_74_45_45_15_development',[local['coreQuality']['summary'][k] for k in summary_keys]==[72,74,45,45,15] and local['coreQuality']['evaluationPhase']=='post-holdout-development')
a11y=load(E+'a11y-automated.json')
check('a11y_21_zero_errors_violations_incomplete',a11y['sourceStable'] and a11y['summary']['cases']==21 and all(a11y['summary'][k]==0 for k in ['errors','violations','seriousOrCritical','incomplete']) and not a11y['errors'])
check('a11y_source_hashes_current',hash_map(a11y['sourceHashes'],'automatic accessibility source'))
live=load(E+'tasks-live.json')
check('live_record_15_9_http_6_guidance_not_business',[live['summary'][k] for k in ['observedTasks','passed','actualCardLinksClicked','destinationReached','originalGuidanceReached','guidanceRetries','observationErrors']]==[15,15,9,9,6,0,0])
check('live_source_hashes_current',hash_map(live['sourceHashes'],'live task recorded source'))
for name in ['performance.json','performance-flat.json','performance-table.json']:
    perf=load(E+name)
    check(name+'_ten_valid_existing_thresholds',perf['status']=='PASS' and len(perf['measures'])==10 and all(perf['validity'][k] for k in ['sourceStable','exactlyTenRuns','allCandidatesCount1000','allOverlaysReady']) and perf['analyzerP95Milliseconds']<=300 and perf['overlayReadyP95Milliseconds']<=1000)
    for key in ['sourceHashes','sourceSha256Before']:
        if key in perf:check(name+'_'+key+'_current',hash_map(perf[key],name+' source'))
institution_perf=load(E+'institution-performance-first/performance.json')
check('institution_perf_existing_PASS_additional_FAIL_preserved',institution_perf['existingBenchmarkStatus']=='PASS' and institution_perf['additionalPipelineDiagnosticStatus']=='FAIL' and round(institution_perf['modes']['institution']['analysisPipelineP95Milliseconds'],1)==575.9 and round(institution_perf['modes']['generic']['analysisPipelineP95Milliseconds'],1)==437.9)
check('institution_performance_source_stable_current',institution_perf['sourceSha256Before']==institution_perf['sourceSha256After'] and hash_map(institution_perf['sourceSha256Before'],'institution benchmark source'))

development=load(E+'first-development-comparison/summary.json')
check('development_26_rows_55_unique_same_18_sources',len(development['rows'])==26 and development['uniqueExposedPages']==55 and development['stableBeforeAndAfter'] and development['sourceFiles']==development['sourceAfter']==freeze['sourceFiles'] and hash_map(development['sourceFiles'],'development same source'))
aggregate_checks=[]
for aggregate in development['uniquePageAggregates']:
    rows=[r for r in development['rows'] if r['mode']==aggregate['mode'] and r['suite'] in aggregate['suites']]
    keys=['pages']+summary_keys;totals={k:sum(r['summary'][k] for r in rows) for k in keys}
    aggregate_checks.append({'mode':aggregate['mode'],'canonicalRows':len(rows),'totals':totals,'matches':all(totals[k]==aggregate['summary'][k] for k in keys)})
check('known55_aggregate_arithmetic',all(a['matches'] for a in aggregate_checks),aggregates=aggregate_checks)
known={a['mode']:a['summary'] for a in development['uniquePageAggregates']}
check('known55_expected_generic_and_institution_totals',[known['institution'][k] for k in summary_keys]==[257,260,153,155,55] and [known['generic'][k] for k in summary_keys]==[234,242,133,155,48])
v8=next(r for r in development['rows'] if r['mode']=='institution' and r['suite']=='blind-v8')
check('known_v8_recall_14_of_15_FAIL_retained',v8['summary']['matched']==14 and v8['summary']['expected']==15 and v8['quality']['status']=='FAIL')

gate=load(E+'release-gate.json')
check('release_remains_5_of_10_NOT_MET',gate['completedStages']==5 and gate['totalStages']==10 and gate['overallAcceptance']=='NOT_MET' and gate['uniqueExposedPagesAfterFirst']==60)
check('gate_fresh_counts_and_failure_equal_first',gate['freshIndependent']['firstScreen']==first['summary'] and gate['freshIndependent']['status']=='FAIL' and gate['freshIndependent']['menuFlowSeparate']==first['menuFlow'])
check('manual_native_human_not_inferred',all(gate[k]=='NOT_RUN' for k in ['currentNativeInstall','actualVoiceOverSpeech','actualBrowserZoom']) and gate['pretestActualObservations']==gate['formalStudyActualObservations']==0 and gate['CUAOrNativeAutomationCount']==0)
usage=load(E+'goal-usage-snapshot.json');dt=lambda x:datetime.datetime.fromisoformat(x.replace('Z','+00:00'))
duration=(dt(usage['observedBoundaryEndUtc'])-dt(usage['observedBoundaryStartUtc'])).total_seconds()
check('usage_partial_boundary_elapsed_and_unknown_billing',round(duration,3)==usage['boundaryElapsedSeconds']==1449.073 and usage['wholeRunElapsed']=='UNKNOWN' and all(v=='UNKNOWN' for v in usage['billing'].values()))
closing={p:sha(p) for p in opening}
check('closing_source_and_tools_byte_stable',opening==closing and all(closing[p]==h for p,h in dict(freeze['sourceFiles'],**freeze['toolFiles']).items()))
write('source-stability.json',{'openingAtUtc':opening_at,'closingAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'opening':opening,'closing':closing,'stable':opening==closing})
write('hash-checks.json',hashes)
write('core-audit.json',{'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'result':'PASS' if not findings else 'FAIL','checks':checks,'findings':findings,'hashComparisons':len(hashes),'hashMismatches':sum(not h['passed'] for h in hashes),'scope':'Read-only artifact records/hash/archive audit; no browser/product/build/test/benchmark/network execution. Historical and documentation audits are separate linked outputs.','reproducibilityLimit':'Saved double-build/double-ZIP record and current ZIP/dist bytes verified; this reviewer did not rebuild.'})
print(json.dumps({'result':'PASS' if not findings else 'FAIL','checks':len(checks),'failedChecks':findings,'hashComparisons':len(hashes)},ensure_ascii=False))
