import {test,expect} from '@playwright/test';
import {buildMenuFlowHarness,observeMenuFlow} from '../scripts/menu-flow-evaluation.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
test('same-named source buttons retain actual source identity over multiple menu pages',async({page})=>{
 const target={id:'source-identity',expected:Array.from({length:8},(_,i)=>({id:`purpose-${i}`,sourceIds:[`distinct-${i}`],category:'apply',action:'locate'})),accepted:Array.from({length:8},(_,i)=>({sourceId:`distinct-${i}`,category:'apply',action:'locate'})),task:{expectedSourceIds:['distinct-7']}};
 const html=`<main><h2>공개 기록</h2>${Array.from({length:8},(_,i)=>`<button id="button-${i}" data-eval-id="distinct-${i}" type="button">조회</button>`).join('')}</main>`;
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html; charset=utf-8',body:html}):r.abort());await page.goto('https://identity.example.invalid/records');
 let build=buildMenuFlowHarness;
 if(process.env.EASYWEB_MENU_IDENTITY_BASELINE==='1'){
  const old=await readFile('docs/evidence/run009/root-integration/before-menu-flow-evaluation.mjs','utf8');const oldPath='docs/evidence/run009/root-integration/menu-before-resolved.mjs';await writeFile(oldPath,old.replace("'./evaluation-metrics.mjs'",JSON.stringify(pathToFileURL(path.resolve('scripts/evaluation-metrics.mjs')).href)));build=(await import(pathToFileURL(path.resolve(oldPath)).href)).buildMenuFlowHarness;
 }
 const bundle=await build({mode:'institution'});const cdp=await page.context().newCDPSession(page);await cdp.send('Page.enable');const {frameTree}=await cdp.send('Page.getFrameTree');const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'menu-source-identity'});
 const report=await observeMenuFlow(page,cdp,executionContextId,bundle,target,{},8);await cdp.detach();
 expect(report.pages.map(p=>p.cards.length)).toEqual([6,2]);expect(report.unresolvedMappings).toEqual([]);expect(report.repeatedCards).toEqual([]);expect(report.matched).toBe(8);expect(new Set(report.selected.map(c=>c.sourceId)).size).toBe(8);expect(report.firstReachedPage['purpose-7']).toBe(2);
});
