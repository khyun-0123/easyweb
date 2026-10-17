import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const base='docs/evidence/run008';
const sha=b=>createHash('sha256').update(b).digest('hex');
const freeze=JSON.parse(await readFile(`${base}/v0.9-engine-freeze.json`,'utf8'));
const before={};for(const [p,h] of Object.entries({...freeze.sourceFiles,...freeze.toolFiles})){before[p]=sha(await readFile(p));if(before[p]!==h)throw Error(`Source changed: ${p}`);}
const firstPath=`${base}/blind-v10-first-evaluated/evaluation-current-institution-blind-v10-holdout.json`;
const firstBytes=await readFile(firstPath);const first=JSON.parse(firstBytes);
if(sha(firstBytes)!=='e469fe25011392ea61be795a00d552e02ef7aa7d23789c1e9db08973c5a1c131')throw Error('First result changed');
const startedAtUtc=new Date().toISOString();
const bundle=await build({stdin:{contents:`import {analyzePage} from './src/analyzer';import {classify} from './src/classifier';import {rank} from './src/ranker';window.traceEasyWeb=(ids)=>{const raw=analyzePage();const serialize=c=>({sourceId:c.element.dataset.evalId??null,label:c.label,action:c.action,category:c.category??null,pageTask:c.pageTask??null,score:c.score,context:c.context,sectionLabel:c.sectionLabel??null,relatedLabel:c.relatedLabel??null,reasons:c.reasons??[],institutionRule:c.institutionEvidence?.rule??null,contentRule:c.contentEvidence?.rule??null});const rawSources=raw.filter(c=>ids.includes(c.element.dataset.evalId)).map(serialize);const classified=classify(raw,{mode:'institution'});return {rawSources,classifiedSources:classified.filter(c=>ids.includes(c.element.dataset.evalId)).map(serialize),selectedSources:rank(classified).filter(c=>ids.includes(c.element.dataset.evalId)).map(serialize)};};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife'});
const browser=await chromium.launch({headless:true});const results=[];let requestsAborted=0,fixtureNavigations=0;
try{
 for(const filename of (await readdir('evaluation/blind-v10/sites')).filter(x=>x.endsWith('.json')).sort()){
  const site=JSON.parse(await readFile(`evaluation/blind-v10/sites/${filename}`,'utf8'));
  for(const target of site.pages){
   const ids=[...new Set(target.expected.flatMap(x=>x.sourceIds))];
   const html=await readFile(target.fixture,'utf8');const page=await browser.newPage({viewport:target.observation.viewport,serviceWorkers:'block'});
   try{
    await page.route('**/*',route=>{if(route.request().isNavigationRequest()){fixtureNavigations++;return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html});}requestsAborted++;return route.abort();});
    await page.goto(target.finalUrl||target.url);
    const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');const {frameTree}=await cdp.send('Page.getFrameTree');const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'easyweb-post-first-trace'});
    const injected=await cdp.send('Runtime.evaluate',{expression:bundle.outputFiles[0].text,contextId:executionContextId});if(injected.exceptionDetails)throw Error('Injection failed');
    const r=await cdp.send('Runtime.evaluate',{expression:`JSON.stringify(window.traceEasyWeb(${JSON.stringify(ids)}))`,contextId:executionContextId,returnByValue:true});if(r.exceptionDetails)throw Error('Trace failed');
    const observed=JSON.parse(r.result.value);const original=first.results.find(p=>p.pageId===target.id);
    const groups=target.expected.map(truth=>{const raw=observed.rawSources.filter(c=>truth.sourceIds.includes(c.sourceId));const classified=observed.classifiedSources.filter(c=>truth.sourceIds.includes(c.sourceId));const selected=observed.selectedSources.filter(c=>truth.sourceIds.includes(c.sourceId));return {id:truth.id,expectedCategory:truth.category,expectedAction:truth.action,firstMissed:original.missed.includes(truth.id),stage:selected.some(c=>c.category===truth.category&&c.action===truth.action)?'FIRST_SCREEN':classified.some(c=>c.category===truth.category&&c.action===truth.action)?'CLASSIFIED_NOT_FIRST':classified.length?'CLASSIFIED_WRONG_CONTRACT':raw.length?'RAW_BUT_UNCLASSIFIED':'NOT_EXTRACTED',raw,classified,selected};});
    results.push({pageId:target.id,fixture:target.fixture,fixtureSha256:sha(Buffer.from(html)),groups});await cdp.detach();
   }finally{await page.close();}
  }
 }
}finally{await browser.close();}
const sourceStable=(await Promise.all(Object.entries(before).map(async([p,h])=>sha(await readFile(p))===h))).every(Boolean);
const counts={};for(const p of results)for(const g of p.groups)if(g.firstMissed)counts[g.stage]=(counts[g.stage]??0)+1;
const report={startedAtUtc,completedAtUtc:new Date().toISOString(),classification:'POST_FIRST_EXPOSED_DEVELOPMENT_TRACE',scope:'New diagnostic only: frozen v0.9 source, five already-exposed offline v10 pages, actual raw/classified/selected source membership for required controls. Does not rerun or alter first quality report, infer live/native/user success, or activate a source/form/card.',firstReport:firstPath,firstReportSha256:sha(firstBytes),firstReportUnchanged:sha(await readFile(firstPath))===sha(firstBytes),sourceStable,sourceHashes:before,bundleSha256:sha(bundle.outputFiles[0].contents),environment:{node:process.version,headless:true,isolatedWorld:true},network:{fixtureNavigations,subrequestsAborted:requestsAborted,externalRequests:0},missingStageCounts:counts,results};
await writeFile(`${base}/post-first-trace/trace.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sourceStable,firstReportUnchanged:report.firstReportUnchanged,missingStageCounts:counts,groups:results.reduce((n,p)=>n+p.groups.length,0),report:`${base}/post-first-trace/trace.json`},null,2));
