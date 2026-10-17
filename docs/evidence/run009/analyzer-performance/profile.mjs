import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const output=process.argv[2];
if(!output)throw Error('Pass fresh output path');
const files=['src/analyzer.ts','src/navigation-utility.ts'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const before=await hashes();
const bundle=await build({stdin:{contents:`export {analyzePage,contextLabels,sourceSnapshot} from './src/analyzer';export * from './src/navigation-utility';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'BatchProfile'});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}});await page.route('**/*',route=>route.abort());
 const counts=[250,1000];const samples=[];
 for(const shape of ['nested-board','flat-list'])for(const size of counts){
  await page.setContent(`<base href="https://example.test/manual"><main><div><h2>공개 도구 안내</h2><ul>${Array.from({length:size},(_,i)=>shape==='nested-board'?`<li><dl><dt><a href="/guide/${i}">합성 도구 ${i} 설치 절차 안내</a></dt></dl></li>`:`<li><a href="/guide/${i}">합성 도구 ${i} 설치 절차 안내</a></li>`).join('')}</ul></div></main>`);await page.addScriptTag({content:bundle.outputFiles[0].text});
  samples.push(await page.evaluate(({size,shape})=>{
   const counts={childrenGets:0,childrenEnumeratedUpperBound:0,computedStyle:0,clientRects:0,queries:{}};
   const descriptors={children:Object.getOwnPropertyDescriptor(Element.prototype,'children'),rects:Element.prototype.getClientRects,qsa:Element.prototype.querySelectorAll,style:window.getComputedStyle};
   Object.defineProperty(Element.prototype,'children',{configurable:true,get(){const value=descriptors.children.get.call(this);counts.childrenGets++;counts.childrenEnumeratedUpperBound+=value.length;return value;}});
   Element.prototype.getClientRects=function(...args){counts.clientRects++;return descriptors.rects.apply(this,args)};
   Element.prototype.querySelectorAll=function(selector){const result=descriptors.qsa.call(this,selector);const group=counts.queries[selector]??={calls:0,matched:0};group.calls++;group.matched+=result.length;return result;};
   window.getComputedStyle=function(...args){counts.computedStyle++;return descriptors.style.apply(this,args)};
   const start=performance.now();const candidates=BatchProfile.analyzePage();const ms=performance.now()-start;
   return {shape,size,candidateCount:candidates.length,milliseconds:ms,counts};
  },{size,shape}));
 }
 const after=await hashes();
 const report={classification:'DEVELOPMENT_OPERATION_COUNTS_NOT_FINAL_PERFORMANCE_ACCEPTANCE',scope:'Fresh isolated headless synthetic fixture; no web server, user profile, external HTTP, native UI or quality evaluation. Wall timings are diagnostic only while other workers may be active.',createdAt:new Date().toISOString(),sourceBefore:before,sourceAfter:after,sourceStable:JSON.stringify(before)===JSON.stringify(after),chromium:browser.version(),samples};await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,sourceStable:report.sourceStable,samples:samples.map(({shape,size,candidateCount,milliseconds,counts})=>({shape,size,candidateCount,milliseconds,childrenGets:counts.childrenGets,childrenEnumeratedUpperBound:counts.childrenEnumeratedUpperBound,computedStyle:counts.computedStyle,clientRects:counts.clientRects,fallbackControls:counts.queries['a, button, input']}))},null,2));
}finally{await browser.close()}
