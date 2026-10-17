const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../../..'),from=path.join(repo,'evaluation/blind-v9'),to=path.join(repo,'evaluation/blind-v9-v2');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const file=p=>{const b=fs.readFileSync(path.join(repo,p));return {path:p,bytes:b.length,sha256:sha(b)}};
const qaPath='docs/evidence/run007/blind-v9-independent-static-qa.json';
const qa=JSON.parse(fs.readFileSync(path.join(repo,qaPath)));
const oldManifestPath='docs/evidence/run007/blind-v9-freeze.json';
const oldManifest=JSON.parse(fs.readFileSync(path.join(repo,oldManifestPath)));
for(const r of [...oldManifest.files,...oldManifest.supportingFiles]){if(file(r.path).sha256!==r.sha256)throw Error('Original frozen file changed '+r.path)}
fs.mkdirSync(to,{recursive:true});
const changes=[];const ids=['cheonan','safekorea','nl','nps','smu'];
for(const id of ids){
 const d=JSON.parse(fs.readFileSync(path.join(from,id+'.json'))),p=d.pages[0];
 p.fixture='evaluation/blind-v9-v2/'+id+'.html';
 p.observation.annotationVersion='blind-v9-v2';
 p.observation.originalFrozenAnnotation='evaluation/blind-v9/'+id+'.json';
 p.observation.annotationVersionProvenance='docs/evidence/run007/blind-v9-v2-provenance.json';
 p.observation.fixedMetadataNameLimit='The original controls proof uses a fixed-metadata heuristic. Separately recorded browser ariaSnapshot evidence resolves substantive accessible-name differences without changing original node metadata.';
 for(const issue of qa.issues.filter(i=>i.siteId===id&&i.disposition==='CONFIRMED_ACCESSIBLE_NAME_DIFFERENCE')){
  const a=[...p.accepted,...p.rejected].find(a=>a.sourceId===issue.sourceId);if(!a)throw Error('Missing correction source '+issue.sourceId);
  const before=JSON.parse(JSON.stringify(a));
  a.label=issue.expectedAccessibleName;a.evidence.fixedMetadataName=a.evidence.name;a.evidence.name=issue.expectedAccessibleName;a.evidence.accessibleName=issue.expectedAccessibleName;a.evidence.accessibleNameProof={report:qaPath,issueId:issue.id,ariaSnapshot:issue.replayAccessibilitySnapshot};
  changes.push({type:'confirmed-accessible-name-correction',issueId:issue.id,sourceId:issue.sourceId,before,after:JSON.parse(JSON.stringify(a)),reason:issue.evidence});
 }
 if(id==='nps'){
  const sourceId='nps-v9-0580',index=p.accepted.findIndex(a=>a.sourceId===sourceId);if(index<0)throw Error('Missing scope adjudication source');
  const before=p.accepted.splice(index,1)[0];
  const after={sourceId,label:before.label,reason:'현재 설명문을 점자 BRF 형식으로 변환·표시하는 보기 형식 제어다. help는 설명·절차를 찾는 기능으로 한정하고 현재 콘텐츠의 보기 형식 변경은 기능 범주를 상속하지 않는다. 따라서 원본 제어는 보존하고 여섯 기능 추천에서는 제외한다.',evidence:before.evidence,scopeAdjudication:'VIEW_FORMAT_DOES_NOT_INHERIT_CONTENT_CATEGORY'};
  p.rejected.push(after);
  p.observation.notes.push('Pre-first-evaluation scope adjudication: a view-format control does not inherit the category of the current content. The Braille/BRF presentation control is retained and explicitly rejected; this resolves an interpretation-dependent boundary, not a confirmed original category error.');
  changes.push({type:'pre-first-scope-adjudication',issueId:'CATEGORY-01',sourceId,before,after,reason:after.reason,confirmedOriginalCategoryError:false});
 }
 fs.writeFileSync(path.join(to,id+'.json'),JSON.stringify(d,null,2)+'\n');
 fs.copyFileSync(path.join(from,id+'.html'),path.join(to,id+'.html'));
}
const provenance={version:'blind-v9-v2',stage:'PRE_FIRST_PRODUCT_EVALUATION_CORRECTION',createdAt:new Date().toISOString(),productExecuted:false,productOutputsReadByIndependentQa:false,originalDatasetManifest:file(oldManifestPath),independentQaReport:file(qaPath),inputs:'Only frozen original v9, independent source/ariaSnapshot proof and category/action contract. No product output informed these changes.',confirmedAccessibleNameCorrections:3,confirmedCategoryCorrections:0,interpretationDependentScopeAdjudications:1,actionCorrections:0,expectedGroupCorrections:0,taskCorrections:0,fixtureByteChanges:0,changes,scopeRule:{name:'VIEW_FORMAT_DOES_NOT_INHERIT_CONTENT_CATEGORY',definition:'A control that changes the representation of the currently open document (e.g. BRF/Braille) does not itself become help merely because the document is explanatory. This is treated consistently with display/font/view-format controls. Genuine separate explanation/instruction destinations remain help.',basis:'The fixed collection contract defines help as explanation/instructions and separately rejects display/environment structural controls. Original handler names and presentation context show a format conversion/viewer control.',appliedBeforeAnyProductEvaluation:true},preservation:'Original blind-v9 annotation/HTML/observation/supporting files and its freeze manifest remain byte-identical and read-only. v2 changes are limited to the listed three accessible names, one independently adjudicated scope judgment and version/fixture reference provenance.'};
const provPath='docs/evidence/run007/blind-v9-v2-provenance.json';fs.writeFileSync(path.join(repo,provPath),JSON.stringify(provenance,null,2)+'\n');
const observation=JSON.parse(fs.readFileSync(path.join(repo,'docs/evidence/run007/blind-v9-observation.json')));
observation.version='2.0';observation.dataset='blind-v9-v2';observation.stage='PRE_FIRST_PRODUCT_EVALUATION_CORRECTION_PENDING_INDEPENDENT_RECHECK';
observation.originalFrozenObservation=file('docs/evidence/run007/blind-v9-observation.json');
observation.versionProvenance=provPath;observation.originalIndependentQa=qaPath;observation.correctedAt=provenance.createdAt;
observation.coverage.acceptedControls=132;observation.coverage.rejectedControls=159;
observation.independence.originalCollectionFrozenBeforeKnownResultMetadata=true;
observation.independence.correctionBasis='An isolated QA observer with no parent history reviewed frozen v9 without product, prior evaluation or observer-judgment script access. Corrections follow its original source/accessibility proof and the pre-product category contract.';
observation.staticCorrections.push({version:'v2',provenance:provPath,independentReport:qaPath,confirmedAccessibleNames:3,confirmedCategoryErrors:0,scopeAdjudications:1,actionsChanged:0,expectedGroupsChanged:0,tasksChanged:0,fixtureBytesChanged:0,productExecuted:false});
observation.replayLimitations.push('Raw controls.json name is explicitly a fixed-metadata heuristic. The three independently confirmed differences are corrected only in v2 annotation labels/evidence, with fixedMetadataName and browser ariaSnapshot retained side by side.');
const obsPath='docs/evidence/run007/blind-v9-v2-observation.json';fs.writeFileSync(path.join(repo,obsPath),JSON.stringify(observation,null,2)+'\n');
console.log(JSON.stringify({created:true,annotationFiles:5,fixtures:5,pages:5,expectedGroups:15,tasks:5,acceptedControls:132,rejectedControls:159,corrections:3,scopeAdjudications:1,originalFrozenFilesVerified:oldManifest.files.length+oldManifest.supportingFiles.length},null,2));
