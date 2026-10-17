import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Explicitly exposed sources only. A new blind suite must never be added here
// until its first frozen evaluation is preserved and exposure is documented.
const suites = ['core','blind-v2','blind-v3','development-v4-corrected','blind-v5','blind-v6','development-v6-corrected','development-v6-corrected-v2','blind-v7-v2','development-v7-corrected','development-v7-corrected-v2','blind-v8','blind-v9-v2'];
const uniqueSuites = ['core','blind-v2','blind-v3','development-v4-corrected','blind-v5','development-v6-corrected-v2','development-v7-corrected-v2','blind-v8','blind-v9-v2'];
if (process.argv.includes('--help')) {
  console.log('node scripts/compare-development.mjs [--output-dir=docs/evidence/run008/final-development-comparison]\nSame-source generic/institution exposed-data comparison, including initial-six and separate menu-flow results. Keeps raw and corrected suite rows; the 55-page aggregate counts each source page once using explicitly named corrected versions. Never executes fresh holdouts or live sites.');
  process.exit(0);
}
for (const arg of process.argv.slice(2)) if (!/^--output-dir=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const outputDir=path.resolve(process.argv.find(arg=>arg.startsWith('--output-dir='))?.slice('--output-dir='.length)??'docs/evidence/run008/final-development-comparison');
await mkdir(outputDir,{recursive:true});
if ((await readdir(outputDir)).length) throw Error('Comparison requires an empty output directory; keep previous source comparisons intact');
async function hashes(dir='src') {
  const result={};
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory())Object.assign(result,await hashes(file));
    else if(entry.isFile())result[file]=createHash('sha256').update(await readFile(file)).digest('hex');
  }
  return result;
}
const sourceBefore=await hashes();
sourceBefore['extension/manifest.json']=createHash('sha256').update(await readFile('extension/manifest.json')).digest('hex');
await writeFile(path.join(outputDir,'source-before.json'),JSON.stringify(sourceBefore,null,2)+'\n');
const startedAt=new Date().toISOString(), rows=[];
for(const mode of ['generic','institution'])for(const suite of suites) {
  const directory=path.join(outputDir,mode,suite);await mkdir(directory,{recursive:true});
  const args=['scripts/evaluate.mjs','--engine=current',`--classification-mode=${mode}`,`--suite=${suite}`,'--split=all','--phase=post-holdout-development',`--output-dir=${directory}`,'--with-menu-flow'];
  let log='';const exitCode=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',bytes=>log+=bytes);child.stderr.on('data',bytes=>log+=bytes);
    child.once('error',reject);child.once('exit',code=>resolve(code));
  });
  await writeFile(path.join(directory,'command.log'),log);
  const reportFile=path.join(directory,`evaluation-current-${mode}-${suite==='core'?'':`${suite}-`}all.json`);
  const report=JSON.parse(await readFile(reportFile,'utf8'));
  rows.push({mode,suite,exitCode,summary:report.summary,quality:report.quality,sites:report.sites,menuFlow:report.menuFlow,report:path.relative(process.cwd(),reportFile)});
  console.log(`${mode} ${suite}: ${report.summary.correct}/${report.summary.recommended} precision, ${report.summary.matched}/${report.summary.expected} recall; ${report.quality.status}`);
  if(exitCode!==0)throw Error(`Evaluation execution failed: ${mode}/${suite}; preserved log`);
}
const sourceAfter=await hashes();sourceAfter['extension/manifest.json']=createHash('sha256').update(await readFile('extension/manifest.json')).digest('hex');
const stableBeforeAndAfter=JSON.stringify(sourceBefore)===JSON.stringify(sourceAfter);
const fields=['pages','correct','recommended','matched','expected','tasksRecommended'];
function aggregate(input) {
  const counts=Object.fromEntries(fields.map(key=>[key,input.reduce((sum,row)=>sum+row[key],0)]));
  return {...counts,precision:counts.recommended?counts.correct/counts.recommended:null,recall:counts.expected?counts.matched/counts.expected:null};
}
const siteAliases={cheonan:'city',nl:'library',nps:'public-agency',safekorea:'government'};
const normalizedSiteId=id=>siteAliases[id]??id;
const uniquePageAggregates=['generic','institution'].map(mode=>{
  const chosen=rows.filter(row=>row.mode===mode&&uniqueSuites.includes(row.suite));
  const summary=aggregate(chosen.map(row=>row.summary));
  const ids=[...new Set(chosen.flatMap(row=>row.sites.map(site=>normalizedSiteId(site.siteId))))];
  const sites=ids.map(siteId=>({siteId,...aggregate(chosen.flatMap(row=>row.sites.filter(site=>normalizedSiteId(site.siteId)===siteId)))}));
  if(summary.pages!==55 || sites.length!==5 || sites.some(site=>site.pages!==11)) throw Error('Expected55unique pages and11pages for each of the same5institutions after ID normalization');
  const status=summary.precision>=.9&&summary.recall>=.85&&sites.every(site=>site.precision>=.8&&site.recall>=.75)?'PASS':'FAIL';
  return {mode,suites:uniqueSuites,summary,sites,quality:{status,thresholds:{overallPrecision:.9,overallRecall:.85,sitePrecision:.8,siteRecall:.75}},scope:'Exposed 55-source-page aggregate only; each source counted once. All individual/raw suite failures stay in rows. This aggregate does not replace first independent results, live task completion, or full S07 acceptance.'};
});
const report={startedAt,checkedAt:new Date().toISOString(),classification:'EXPOSED_DEVELOPMENT_ONLY',uniqueExposedPages:55,sourceFiles:sourceBefore,sourceAfter,stableBeforeAndAfter,siteAliases,rows,uniquePageAggregates};
await writeFile(path.join(outputDir,'summary.json'),JSON.stringify(report,null,2)+'\n');
if(!stableBeforeAndAfter)throw Error('Product source changed while comparing modes; results cannot be treated as a same-source comparison');
console.log(JSON.stringify({stableBeforeAndAfter,uniquePageAggregates,report:path.join(outputDir,'summary.json')},null,2));
