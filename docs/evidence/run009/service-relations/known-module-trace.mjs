import fs from 'node:fs';
import crypto from 'node:crypto';
import { build } from 'esbuild';
import { chromium } from 'playwright';
const result=await build({stdin:{contents:`export {analyzePage}from'./src/analyzer';export{serviceRelation}from'./src/service-relations';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Relations'});
const bundle=result.outputFiles[0].text;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
let aborted=0;
const output={scope:'Direct module trace on previously exposed v10 offline material only; no classifier/ranker/quality/independent/native evaluation.',bundleSha256:crypto.createHash('sha256').update(bundle).digest('hex'),world:'fresh isolated CDP world; original fixture and CSP unchanged',results:[]};
try {
for(const[name,ids]of [['city',['city-c0822','city-c0823','city-c0824']],['government',['government-c0201','government-c0202','government-c0203']],['public-agency',['public-agency-c0545','public-agency-c0546','public-agency-c0547']]]){
 const site=JSON.parse(fs.readFileSync(`evaluation/blind-v10/sites/${name}.json`));const url=site.pages[0].url;
 const html=fs.readFileSync(`evaluation/blind-v10/fixtures/${name}.html`,'utf8');
 await page.unroute('**/*');await page.route('**/*',route=>{if(route.request().isNavigationRequest()&&route.request().url()===url)return route.fulfill({body:html,contentType:'text/html; charset=utf-8'});aborted++;return route.abort();});await page.goto(url);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');const{frameTree}=await cdp.send('Page.getFrameTree');const{executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'service-module-development-trace'});
 const injected=await cdp.send('Runtime.evaluate',{expression:bundle,contextId:executionContextId});if(injected.exceptionDetails)throw Error(JSON.stringify(injected.exceptionDetails));
 const observed=await cdp.send('Runtime.evaluate',{expression:`JSON.stringify((ids=>{const raw=Relations.analyzePage();return ids.map(id=>{const c=raw.find(c=>c.element.getAttribute('data-eval-id')===id);if(!c)return{id,collected:false};const p=Relations.serviceRelation(c,new WeakMap());return{id,collected:true,label:c.label,action:c.action,relation:p?{rule:p.rule,category:p.category,pageTask:p.pageTask,relatedLabel:p.relatedLabel,dependencyCount:p.dependencies.length}:null};});})(${JSON.stringify(ids)}))`,contextId:executionContextId,returnByValue:true});
 if(observed.exceptionDetails)throw Error(JSON.stringify(observed.exceptionDetails));output.results.push({name,items:JSON.parse(observed.result.value)});await cdp.detach();
}
}finally{await browser.close();}
output.abortedFixtureSubrequests=aborted;output.externalNetworkRequests=0;
fs.writeFileSync('docs/evidence/run009/service-relations/known-module-trace.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
