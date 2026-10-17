const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo=path.resolve(__dirname,'../../..');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const file=p=>{const b=fs.readFileSync(path.join(repo,p));return {path:p,bytes:b.length,sha256:sha(b)}};
const read=p=>JSON.parse(fs.readFileSync(path.join(repo,p)));
const oldPath='docs/evidence/run007/blind-v9-freeze.json',old=read(oldPath);
for(const r of [...old.files,...old.supportingFiles])if(file(r.path).sha256!==r.sha256)throw Error('Original frozen evidence changed '+r.path);
const qaPath='docs/evidence/run007/blind-v9-v2-independent-static-qa.json',qa=read(qaPath);
if(qa.status!=='PASS')throw Error('Independent V2 recheck is not PASS: '+qa.status);
const ids=['cheonan','safekorea','nl','nps','smu'];let accepted=0,rejected=0,expected=0,tasks=0;
for(const id of ids){
 const d=read('evaluation/blind-v9-v2/'+id+'.json'),p=d.pages[0];
 if(p.fixture!=='evaluation/blind-v9-v2/'+id+'.html')throw Error('Escaping V2 fixture reference');
 if(file(p.fixture).sha256!==file('evaluation/blind-v9/'+id+'.html').sha256)throw Error('Fixture bytes changed');
 const source=read('docs/evidence/run007/blind-v9-raw/'+id+'-controls.json').filter(c=>c.visible);
 const labels=[...p.accepted,...p.rejected],seen=new Set(labels.map(c=>c.sourceId));
 if(labels.length!==source.length||seen.size!==source.length||source.some(c=>!seen.has(c.sourceId)))throw Error('Incomplete V2 annotation');
 accepted+=p.accepted.length;rejected+=p.rejected.length;expected+=p.expected.length;tasks+=p.task?1:0;
}
if(accepted!==132||rejected!==159||expected!==15||tasks!==5)throw Error('Unexpected corrected counts');
const obsPath='docs/evidence/run007/blind-v9-v2-observation.json',observation=read(obsPath);
const files=ids.flatMap(id=>['evaluation/blind-v9-v2/'+id+'.json','evaluation/blind-v9-v2/'+id+'.html']).concat(obsPath);
const support=Array.from(new Set([...old.files.map(f=>f.path),...old.supportingFiles.map(f=>f.path),oldPath,'docs/evidence/run007/blind-v9-independent-static-qa.json',qaPath,'docs/evidence/run007/blind-v9-v2-provenance.json','docs/evidence/run007/blind-v9-v2-create.cjs','docs/evidence/run007/blind-v9-v2-freeze.cjs']));
const manifest={version:'2.0',dataset:'blind-v9-v2',stage:'FROZEN_BEFORE_FIRST_PRODUCT_EVALUATION',frozenAt:new Date().toISOString(),productEverExecuted:false,originalFrozenDataset:file(oldPath),originalFrozenEntriesVerified:old.files.length+old.supportingFiles.length,independentQa:{...file(qaPath),status:qa.status},provenance:file('docs/evidence/run007/blind-v9-v2-provenance.json'),files:files.map(file),supportingFiles:support.map(file),counts:{annotationFiles:5,fixtures:5,pages:5,expectedGroups:expected,readOnlyTasks:tasks,visibleControls:accepted+rejected,acceptedControls:accepted,rejectedControls:rejected,confirmedAccessibleNameCorrections:3,confirmedCategoryErrors:0,preFirstScopeAdjudications:1,actionCorrections:0,expectedGroupCorrections:0,taskCorrections:0,fixtureByteChanges:0},policy:'Original v9 remains immutable. V2 is the independently rechecked pre-first version. Do not change any frozen V2 or supporting file based on product output. Preserve first product evaluation. Any later disagreement requires a separately versioned development/adjudication artifact.'};
const manifestPath='docs/evidence/run007/blind-v9-v2-freeze.json';fs.writeFileSync(path.join(repo,manifestPath),JSON.stringify(manifest,null,2)+'\n');
for(const p of [...files,...support,manifestPath])fs.chmodSync(path.join(repo,p),0o444);
const entries=[...manifest.files,...manifest.supportingFiles];let mismatch=0;for(const r of entries){const f=file(r.path);if(f.sha256!==r.sha256||f.bytes!==r.bytes||(fs.statSync(path.join(repo,r.path)).mode&0o222))mismatch++;}
if(mismatch)throw Error('Final freeze integrity failure');
console.log(JSON.stringify({manifest:file(manifestPath),observation:file(obsPath),independentQa:file(qaPath),provenance:file('docs/evidence/run007/blind-v9-v2-provenance.json'),frozenFileCount:files.length,supportingFileCount:support.length,allEntriesVerified:entries.length,hashOrReadonlyMismatches:mismatch,counts:manifest.counts},null,2));
