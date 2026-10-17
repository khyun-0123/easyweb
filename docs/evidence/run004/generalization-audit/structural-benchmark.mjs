import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const result = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer'; export {classify} from './src/classifier'; export {areCandidatesCurrent} from './src/page-session';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'Engine' });
const browser = await chromium.launch({headless:true});
try {
 const report = {checkedAt:new Date().toISOString(),scope:'One measured synthetic structural sample after one excluded warmup per case. Not the required mixed 10-run performance acceptance. Other headless activity may coexist.',sourceHashes:Object.fromEntries(await Promise.all(['analyzer','classifier','page-session','types'].map(async n=>[n,createHash('sha256').update(await readFile(`src/${n}.ts`)).digest('hex')]))),cases:[]};
 for (const [name,markup] of [['flat-information-panels',`<main><h2>생활 지원</h2><div>${Array.from({length:1000},(_,i)=>`<button type="button" aria-expanded="false">지원 ${i+1} 안내</button>`).join('')}</div></main>`],['material-table',`<main><h2>민원 편람</h2><table><thead><tr><th>제목</th><th>첨부</th></tr></thead><tbody>${Array.from({length:500},(_,i)=>`<tr><td><a href="#view${i}">시설 ${i+1} 관련 서식</a></td><td><button type="button">자료받기</button></td></tr>`).join('')}</tbody></table></main>`]]) {
  const page = await browser.newPage();await page.setContent(`<meta charset="utf-8">${markup}`);await page.addScriptTag({content:result.outputFiles[0].text});
  const samples=await page.evaluate(()=>{
   const sample=()=>{let start=performance.now();const raw=Engine.analyzePage();const analyzeMs=performance.now()-start;start=performance.now();const classified=Engine.classify(raw);const classifyMs=performance.now()-start;start=performance.now();const current=Engine.areCandidatesCurrent(classified);return{candidateCount:raw.length,classifiedCount:classified.length,analyzeMs,classifyMs,allCurrentMs:performance.now()-start,current};};sample();return sample();
  });report.cases.push({name,...samples});await page.close();
 }
 await writeFile('/tmp/controls-v5-structural-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
