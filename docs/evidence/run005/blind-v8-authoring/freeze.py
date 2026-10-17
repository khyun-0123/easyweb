import hashlib,json
from datetime import datetime,timezone
from pathlib import Path
base=Path('/Users/khyun_03/easyweb')
def row(relative):
 p=base/relative;b=p.read_bytes();return {'path':relative,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
qa=json.load(open(base/'docs/evidence/run005/blind-v8-authoring/structural-qa.json'))
independent=json.load(open(base/'docs/evidence/run005/blind-v8-authoring/independent-static-qa.json'))
assert qa['status']=='PASS'
assert independent['status']=='PASS'
obs_path=base/'docs/evidence/run005/blind-v8-observations.json';obs=json.load(open(obs_path))
assert len(obs['pages'])==5
obs['qaStatus']='PASS_BEFORE_FREEZE'
obs['qaEvidence']={'observerStructural':'docs/evidence/run005/blind-v8-authoring/structural-qa.json','independentStatic':'docs/evidence/run005/blind-v8-authoring/independent-static-qa.json','productLoadedOrExecuted':False,'fixtureDomRenderingAtRecordedUrl':True,'allRetainedControlsReviewed':True,'actionCategoryConsensus':True}
obs_path.write_text(json.dumps(obs,ensure_ascii=False,indent=2)+'\n')
files=sorted([str(p.relative_to(base)) for p in (base/'evaluation/blind-v8/sites').glob('*.json')]+[str(p.relative_to(base)) for p in (base/'evaluation/blind-v8/fixtures').glob('*.html')])+['docs/evidence/run005/blind-v8-observations.json']
assert len(files)==11
freeze={'datasetId':'blind-v8','createdAt':datetime.now(timezone.utc).isoformat(),'status':'FROZEN_BEFORE_FIRST_PRODUCT_EVALUATION','pages':5,'siteJsonFiles':5,'fixtureHtmlFiles':5,'observationFiles':1,'expectedCoreFunctions':15,'inputFileCount':11,'files':[row(p) for p in files],'selectedPagePlan':row('docs/evidence/run005/blind-v8-authoring/selected-page-plan.json'),'qaEvidence':[row('docs/evidence/run005/blind-v8-authoring/structural-qa.json'),row('docs/evidence/run005/blind-v8-authoring/independent-static-qa.json')],'authoringEvidence':[row('docs/evidence/run005/blind-v8-authoring/collect.mjs'),row('docs/evidence/run005/blind-v8-authoring/annotate.py'),row('docs/evidence/run005/blind-v8-authoring/capture-observations.json')],'fidelityStatus':'PASS_BOUNDED_DOM_STRUCTURE_VISIBILITY_AND_ANNOTATION','fidelityScope':'Source-selected full subtrees plus original ancestor shells and actual ID-reference targets; tags/roles/ids/classes/form boundaries/list/heading placement/node order/inline-handler metadata and observed default visibility preserved. Presentation-only display/visibility/opacity styles preserve effective visibility after omitting external assets. No claim of pixel-layout or delegated JavaScript reproduction.','independenceDeclaration':{'productSourceFilesRead':False,'productDistFilesRead':False,'productTestsRead':False,'priorDatasetsFixturesAuditsRead':False,'priorEvaluationResultFilesRead':False,'productExecutionOrEvaluation':False,'onlyInitialRepositoryData':'/tmp/easyweb-v8-excluded-pages.json','sourceSelectionAndGoldBasedOn':'Public source DOM metadata and semantic functions only; no product behavior','existingBrowserProfileUsed':False,'visibleOrNativeUIUsed':False,'userInputValuesRead':False,'authDownloadOrBusinessActionsExecuted':False},'freezeRule':'Stop writes to the 11 frozen inputs and freeze document after this snapshot. Any later confirmed source-fidelity issue must be explicit and versioned; never silently patch after product results.'}
fp=base/'docs/evidence/run005/blind-v8-freeze.json';assert not fp.exists(),'freeze already exists';fp.write_text(json.dumps(freeze,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'files':11,'pages':5,'expectedCoreFunctions':15,'fidelityStatus':freeze['fidelityStatus'],'freezeSha256':hashlib.sha256(fp.read_bytes()).hexdigest()},indent=2))
