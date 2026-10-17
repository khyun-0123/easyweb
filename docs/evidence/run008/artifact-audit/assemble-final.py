from pathlib import Path
import json, hashlib, datetime
ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT/'docs/evidence/run008'
OUT = BASE/'artifact-audit'
def load(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def rel(p): return str(p.relative_to(ROOT))
core=load(OUT/'core-audit.json'); history=load(OUT/'historical-audit/report.json'); docs=load(OUT/'document-audit/report.json')
freeze=load(BASE/'v0.9-engine-freeze.json'); diagnosis=load(BASE/'post-first-diagnosis/diagnosis.json')
assert core['result']=='PASS' and history['artifactPreservationStatus']=='PASS' and docs['status']=='PASS'
checks=[]
for area,report in [('core',core),('historical',history),('documents',docs)]:
    for item in report['checks']:
        passed=item.get('passed',item.get('status')=='PASS')
        assert passed, item
        checks.append({**item,'passed':passed,'reviewArea':area})
source={p:sha(ROOT/p) for p in dict(freeze['sourceFiles'],**freeze['toolFiles'])}
assert source==dict(freeze['sourceFiles'],**freeze['toolFiles'])
report={
 'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'version':'0.9.0','reviewerTask':'v09_integration_safety/final_artifact_audit',
 'artifactStatus':'PASS','overallAcceptance':'NOT_MET','completedStages':5,'totalStages':10,
 'automaticSignoff':False,'integrationOwner':'root','sourceStable':True,
 'scope':'Independent read-only artifact/document consistency audit after the preserved first independent evaluation. Earlier focused behavior tests are a separate artifact; artifact auditors ran no product/build/test/benchmark/browser/network actions.',
 'checks':checks,'checkSummary':{'core':len(core['checks']),'historical':len(history['checks']),'documents':len(docs['checks']),'total':len(checks),'failed':0},'findings':[],
 'subAudits':{rel(p):{'sha256':sha(p),'result':'PASS'} for p in [OUT/'core-audit.json',OUT/'historical-audit/report.json',OUT/'document-audit/report.json']},
 'hashComparisons':{'coreSHA256':core['hashComparisons'],'historicalSHA256':history['sha256Comparisons'],'totalSHA256Comparisons':core['hashComparisons']+history['sha256Comparisons'],'mismatches':0,'note':'Repeated references are included; this is not a unique-file count.','coreDetail':rel(OUT/'hash-checks.json'),'historicalDetail':rel(OUT/'historical-audit/hash-checks.json')},
 'historicalGitPreservation':{'gitBlobComparisons':history['gitBlobComparisons'],'uniqueHistoricalPaths':history['uniqueGitPathsCompared'],'refs':['38f37d4','run-004-v0.5.0-dev','run-005-v0.6.0-dev','run-006-v0.7.0-dev','run-007-v0.8.0-dev'],'mismatches':0,'report':rel(OUT/'historical-audit/report.json')},
 'finalFrozenInputs':{'engineFreeze':rel(BASE/'v0.9-engine-freeze.json'),'engineFreezeSHA256':sha(BASE/'v0.9-engine-freeze.json'),'productFiles':18,'toolFiles':13,'frozenArchive':freeze['archive'],'originalDatasetFreeze':rel(BASE/'blind-v10-freeze.json'),'originalDatasetFreezeSHA256':sha(BASE/'blind-v10-freeze.json'),'protocolDatasetFreeze':rel(BASE/'blind-v10-freeze-protocol.json'),'protocolDatasetFreezeSHA256':sha(BASE/'blind-v10-freeze-protocol.json'),'identicalDatasetPathHashPairs':388,'staticQAArtifacts':17,'earlierPreExecutionErrorRetained':True,'firstActualReport':rel(BASE/'blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json'),'firstActualReportSHA256':'e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131'},
 'candidateArchive':{'path':'output/run008/EasyWeb-0.9.0-candidate.zip','bytes':478876,'sha256':'23e6f3e03d3aee061a2cd1912bed6612dce18853579ba8f85e41b1a39ed68c08','exactDistEntries':5,'zipContentEqualsCurrentDist':True,'manifestSourceDistZipIdentical':True,'deterministicMetadataVerified':True,'savedDoubleBuildDoubleArchiveRecordVerified':True,'reviewerRebuilt':False,'entryDetail':rel(OUT/'zip-entries.json')},
 'currentEvidence':{'localTests':'409/409;unexpected/flaky/skipped0','automaticAccessibility':'21 conditions;error/violation/incomplete0','coreDevelopment':'72/74 precision counts;45/45 recall counts;15 task recommendations','known55Development':'institution257/260;153/155;55/55 recommendations;individual failures preserved','knownV8Regression':'15/15 previous to14/15 current;local IT board search outside first six','freshFirst':'26/28;2/15;0/5 recommendations;all five institutionsFAIL','freshAdditionalMenusSeparate':'32/40;3/15;0/5;unresolved mappings9/fallback repeated keys4;same-source duplication not established','publicLiveArrival':'15/15;HTTP9/original guidance6;not business completion or human success','syntheticPerformance':'existing analyzer/overlay thresholdsPASS;separate full pipeline300ms diagnosticFAIL(institution575.9ms,generic437.9ms)','nativeInstallVoiceOverActualZoom':'NOT_RUN','pretestAndFormalObservations':'0 and0','exposedSourcePagesAfterFirst':60},
 'postFirstDiagnosis':{'path':rel(BASE/'post-first-diagnosis/diagnosis.json'),'sha256':sha(BASE/'post-first-diagnosis/diagnosis.json'),'staticBeforeTrace':rel(BASE/'post-first-diagnosis/static-diagnosis-before-trace.json'),'developmentTrace':rel(BASE/'post-first-trace/trace.json'),'traceSHA256':sha(BASE/'post-first-trace/trace.json'),'confirmedPartition':diagnosis['partition'],'scope':'Separate post-exposure development diagnosis only;the first quality result is not overwritten or rescored.'},
 'markdownLinks':{'filesScanned':26,'localReferencesChecked':539,'brokenCount':0,'detail':rel(OUT/'document-audit/markdown-links.json'),'externalURLsAndAnchorsNotChecked':True,'finalReviewSelfHashExcludedToAvoidCircularity':True},
 'auditedDocumentSHA256':docs['documentHashesAtCheck'],
 'resolvedDuringAudit':[
  {'file':'docs/PRETEST.md','issue':'Product acceptance NOT_EVALUATED conflicted with current NOT_MET','resolution':'Separate pretest NOT_EVALUATED from global5/10 NOT_MET.'},
  {'file':'docs/SUPPORT_MATRIX.md','issue':'Category-first summary omitted current content relevance tiers','resolution':'State content tier precedence and diversity within a tier.'},
  {'file':'docs/INSTALL.md','issue':'Category-first summary omitted current content relevance tiers','resolution':'State content tier precedence and diversity within a tier.'},
  {'file':'docs/SUPPORT_MATRIX.md','issue':'Fragment guidance did not distinguish another-document fragment','resolution':'Same-document fragment locate;different-document fragment normal navigation.'}],
 'auditHarnessCorrections':{'scope':'Auditor procedure assumptions only,not artifact/product mismatches','historicalReport':rel(OUT/'historical-audit/report.json'),'historicalPreservedAttempts':history['auditProcedureAttempts'],'finalAssembly':{'firstAttempt':'The merger expected every child check to use passed;the document audit uses status=PASS. It stopped before overwriting the pending final report.','resolution':'Normalize child check status to an explicit passed boolean;original child reports are unchanged.'}},
 'closingSourceToolSHA256':source,
 'limits':[
  'Artifact consistency is separate from original quality/performance/accessibility/native/human acceptance;overall result remains5/10 NOT_MET.',
  'This audit did not rebuild or rerun product/test/benchmark/live/native/browser actions.Saved source-bound validation records and exact artifact bytes were checked.',
  'The first preproduct schema error is retained as execution setup failure,separate from the first actual quality FAIL.Protocol conversion retains identical388path/hash pairs.',
  'Fresh evaluation results are development-exposed now.Diagnosis and the root stage trace are not new independent quality samples.',
  'Menu-flow unresolved9/repeated4 retain text-based source ambiguity;they do not establish unsafe execution or repeated same-source activation.',
  'Read-only bits are filesystem permission observations,not proof against privileged future modification.',
  'Git checks cover explicit baseline/tag historical paths.Current product sources are checked against their own final freeze,not historical versions.',
  'Markdown local-file existence is checked;external URLs,section anchors and browser outcomes are not.',
  'Usage snapshot is a partial1449.073-second boundary;whole-run elapsed and account billing/input/output/cache/cost remainUNKNOWN.',
  'No inference of authentication/application/payment/download execution,installed-extension behavior or human success is added.']}
for p in [BASE/'final-review.json',OUT/'audit.json']:p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
paths=[BASE/'final-review.json']+sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='evidence-sha256.json')
(OUT/'evidence-sha256.json').write_text(json.dumps({rel(p):sha(p) for p in paths},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'artifactStatus':report['artifactStatus'],'acceptance':report['overallAcceptance'],'checks':report['checkSummary'],'sha256Comparisons':report['hashComparisons']['totalSHA256Comparisons'],'finalReviewSHA256':sha(BASE/'final-review.json'),'evidenceFilesHashed':len(paths)}))
