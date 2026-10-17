import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

if (process.argv.includes('--help')) {
  console.log('node scripts/benchmark-institution.mjs [--output-dir=docs/evidence/run007/institution-performance]\nSynthetic supported-origin SMU board, 1,000 controls; one excluded warmup and ten runs per mode. Active institution evidence must cover at least 900 controls. No real HTTP responses or native/user-profile interaction.');
  process.exit(0);
}
for (const arg of process.argv.slice(2)) if (!/^--output-dir=.+$/.test(arg)) throw new Error(`Unknown or incomplete option: ${arg}`);
const outputDir = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length) ?? 'docs/evidence/run007/institution-performance';
const fixtureURL = 'https://www.smu.ac.kr/kor/life/technical.do';
const sha256 = data => createHash('sha256').update(data).digest('hex');
async function sourceHashes(dir = 'src') {
  const result = {};
  for (const entry of (await readdir(dir, { withFileTypes:true })).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file = path.join(dir,entry.name);
    if (entry.isDirectory()) Object.assign(result,await sourceHashes(file));
    else if (entry.isFile()) result[file]=sha256(await readFile(file));
  }
  return result;
}
const startedAt=new Date().toISOString();
const sourceBefore=await sourceHashes();
const bundle=await build({stdin:{contents:`export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {rank} from './src/ranker';export {areCandidatesCurrent} from './src/page-session';export {openEasyMode} from './src/easy-mode';`,resolveDir:process.cwd(),sourcefile:'institution-performance-entry.ts'},bundle:true,write:false,format:'iife',globalName:'InstitutionPerformance',target:'chrome120',loader:{'.css':'text'}});
const sourceAfterBundle=await sourceHashes();
if(JSON.stringify(sourceBefore)!==JSON.stringify(sourceAfterBundle))throw new Error('Source changed during bundle build. Do not compare unfrozen inputs.');
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><title>EasyWeb synthetic institution performance fixture</title><style>body{margin:0;font:16px sans-serif}main{padding:12px}.board-thumb-wrap{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0;list-style:none}.board-thumb-wrap li{padding:6px}a{display:inline-block;min-height:36px}h2{margin:12px 0}</style><main><div class="common-board"><h2>IT 서비스 게시판</h2><ul class="board-thumb-wrap">${Array.from({length:1000},(_,i)=>`<li><dl><dt class="board-thumb-content-title"><a id="synthetic-control-${i+1}" href="?mode=view&amp;articleId=synthetic-report-${i*37+103}">[수강실험] 합성 도구 ${i+1} 설치 절차 안내</a></dt></dl></li>`).join('')}</ul></div></main></html>`;
await mkdir(outputDir,{recursive:true});
await writeFile(path.join(outputDir,'fixture.html'),html);
const browser=await chromium.launch({headless:true});
const routing={fulfilledSyntheticNavigations:0,abortedRequests:0};
try {
  const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
  await page.route('**/*',route=>{
    if(route.request().isNavigationRequest()&&route.request().url()===fixtureURL){routing.fulfilledSyntheticNavigations++;return route.fulfill({contentType:'text/html; charset=utf-8',body:html});}
    routing.abortedRequests++;return route.abort();
  });
  await page.goto(fixtureURL);await page.addScriptTag({content:bundle.outputFiles[0].text});
  const observations=await page.evaluate(async()=>{
    const sample=async(mode,run)=>{
      const pipelineStart=performance.now();
      const candidates=InstitutionPerformance.analyzePage();const afterAnalyze=performance.now();
      const classified=InstitutionPerformance.classify(candidates,{mode});const afterClassify=performance.now();
      const selected=InstitutionPerformance.rank(classified);const afterRank=performance.now();
      const currentStart=performance.now();const allCurrent=InstitutionPerformance.areCandidatesCurrent(classified);const afterCurrent=performance.now();
      const readyStart=performance.now();const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);
      const close=InstitutionPerformance.openEasyMode(host,{mode});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const dialog=host.shadowRoot?.querySelector('dialog');const cards=[...(host.shadowRoot?.querySelectorAll('.card')??[])];
      const ready=!!dialog?.open&&cards.length>0&&cards.length<=6&&cards.every(card=>card.getBoundingClientRect().width>0&&card.getBoundingClientRect().height>0)&&host.shadowRoot?.activeElement===host.shadowRoot?.querySelector('.close');
      const overlayReadyMilliseconds=performance.now()-readyStart;
      close();await new Promise(resolve=>requestAnimationFrame(resolve));
      return {mode,run,candidateCount:candidates.length,classifiedCount:classified.length,institutionEvidenceCount:classified.filter(item=>!!item.institutionEvidence).length,selectedCount:selected.length,overlayCardCount:cards.length,analyzerMilliseconds:afterAnalyze-pipelineStart,classifierMilliseconds:afterClassify-afterAnalyze,rankMilliseconds:afterRank-afterClassify,analysisPipelineMilliseconds:afterRank-pipelineStart,currentnessBatchMilliseconds:afterCurrent-currentStart,allCurrent,overlayReadyMilliseconds,ready};
    };
    const warmup={generic:await sample('generic',0),institution:await sample('institution',0)};
    const measures={generic:[],institution:[]};const order=[];
    for(let run=1;run<=10;run++)for(const mode of run%2?['generic','institution']:['institution','generic']){order.push({mode,run});measures[mode].push(await sample(mode,run));}
    return {warmup,measures,order};
  });
  const sourceAfter=await sourceHashes();const sourceStable=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
  const p95=values=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*.95)-1];
  const timingNames=['analyzerMilliseconds','classifierMilliseconds','rankMilliseconds','analysisPipelineMilliseconds','currentnessBatchMilliseconds','overlayReadyMilliseconds'];
  const modes=Object.fromEntries(['generic','institution'].map(mode=>{
    const rows=observations.measures[mode];const timings=Object.fromEntries(timingNames.map(name=>[name.replace('Milliseconds','P95Milliseconds'),p95(rows.map(row=>row[name]))]));
    const validity={exactlyTenRuns:rows.length===10,allCandidatesCount1000:rows.every(row=>row.candidateCount===1000),allClassifiedCount1000:rows.every(row=>row.classifiedCount===1000),allOverlaysReady:rows.every(row=>row.ready),allBatchCurrent:rows.every(row=>row.allCurrent),activeBranch:rows.every(row=>mode==='institution'?row.institutionEvidenceCount>=900:row.institutionEvidenceCount===0)};
    return [mode,{status:sourceStable&&Object.values(validity).every(Boolean)&&timings.analysisPipelineP95Milliseconds<=300&&timings.overlayReadyP95Milliseconds<=1000?'PASS':'FAIL',validity,...timings,warmup:observations.warmup[mode],measures:rows}];
  }));
  const report={schemaVersion:1,startedAt,checkedAt:new Date().toISOString(),status:sourceStable&&Object.values(modes).every(mode=>mode.status==='PASS')?'PASS':'FAIL',scope:'Synthetic supported-origin institution adapter performance, same source in both modes. No real institution response, native browser operation, user profile or file execution.',environment:{platform:process.platform,architecture:process.arch,osRelease:os.release(),node:process.version,cpuModel:os.cpus()[0]?.model??'UNKNOWN',logicalCpus:os.cpus().length,memoryBytes:os.totalmem(),chromium:browser.version(),headless:true,viewport:{width:1440,height:1080},deviceScaleFactor:1,coordination:process.env.EASYWEB_PERFORMANCE_COORDINATION??'UNKNOWN'},fixture:{url:fixtureURL,controls:1000,structure:'One common-board, fixed IT services heading, 1,000 list items containing dt.board-thumb-content-title source anchors and unfamiliar synthetic article references.',sha256:sha256(html),minimumInstitutionEvidenceCount:900},measurement:{analysisPipeline:'analyzePage + classify(mode) + rank; phase timings also recorded. The 300ms numeric analysis budget applies to the complete pipeline here, stricter than the older analyze-only benchmark.',overlayReady:'append host, openEasyMode(mode) including analysis/classification/ranking/render/focus/watchers, then two requestAnimationFrame callbacks and layout/focus readiness check; identical ready semantics to benchmark.mjs.',currentnessBatch:'areCandidatesCurrent(all classified candidates), separately timed; not part of the analysis/overlay budget.',warmupExcluded:true,runsPerMode:10,order:observations.order,percentile:'nearest-rank p95 with n=10 is the maximum observed sample; not a population estimate',limitations:'Small synthetic headless sample on this machine. Other unobserved background OS load may affect timings; actual site/network/native startup excluded.'},thresholds:{analysisPipelineP95Milliseconds:300,overlayReadyP95Milliseconds:1000},modes,routing,validity:{sourceStable,sourceStableDuringBundle:JSON.stringify(sourceBefore)===JSON.stringify(sourceAfterBundle)},bundleSha256:sha256(bundle.outputFiles[0].contents),sourceSha256Before:sourceBefore,sourceSha256After:sourceAfter};
  await writeFile(path.join(outputDir,'performance.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,sourceStable,routing,modes:Object.fromEntries(Object.entries(modes).map(([mode,data])=>[mode,{status:data.status,analysisPipelineP95Milliseconds:data.analysisPipelineP95Milliseconds,overlayReadyP95Milliseconds:data.overlayReadyP95Milliseconds,currentnessBatchP95Milliseconds:data.currentnessBatchP95Milliseconds,institutionEvidenceCount:data.measures.map(row=>row.institutionEvidenceCount),validity:data.validity}])),output:path.join(outputDir,'performance.json')},null,2));
  if(report.status!=='PASS')process.exitCode=1;
}finally{await browser.close();}
