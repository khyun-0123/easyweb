import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
let engine;
test.beforeAll(async()=>{
 const base=process.env.EASYWEB_QUERY_BASELINE==='1'?'./docs/evidence/run008/v0.9-before-blind-v10-engine/src':'./src';
 const bundle=await build({stdin:{contents:`export {analyzePage} from '${base}/analyzer';export {classify} from '${base}/classifier';export {rank,remainingMenus} from '${base}/ranker';export {isCandidateCurrent,areCandidatesCurrent} from '${base}/page-session';export {institutionEvidence} from '${base}/institution-evidence';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'V10Query'});engine=bundle.outputFiles[0].text;
});
const url='https://www.smu.ac.kr/kor/life/unfamiliar.do';
const docs=Array.from({length:9},(_,i)=>`<li><dl><dt class="board-thumb-content-title"><a id="doc-${i}" href="?mode=view&articleId=unknown-${i}">${i%2?'원격 서버 패치 작업 일시중단 안내':'새 도구 설치 절차 안내'} ${i+1}</a></dt></dl></li>`).join('');
const fixture=(method='get')=>`<header><form><input id="global-query" type="search" aria-label="통합검색"></form></header><main><div class="common-board"><h2 id="heading"><span>IT 서비스 게시판</span></h2><form id="query-form" method="${method}" action="?"><fieldset id="fields"><legend>게시글 검색</legend><input id="query" type="search" aria-label="게시글 검색어"><button id="submit" type="submit">검색</button></fieldset></form><div><ul class="board-thumb-wrap">${docs}</ul></div><ul class="pagination"><li><a href="?page=1">1</a></li><li><a href="?page=2">2</a></li></ul><ul class="buttons"></ul></div></main>`;
async function setup(page,html=fixture()){
 await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html; charset=utf-8',body:html}):r.abort());await page.goto(url);await page.addScriptTag({content:engine});
}
async function classify(page){return page.evaluate(()=>{window.candidates=V10Query.classify(V10Query.analyzePage());return candidates.map(c=>({id:c.element.id,category:c.category,rule:c.contentEvidence?.rule,group:!!c.contentEvidence?.taskGroup}));});}
test('@positive a verified query for the same board keeps one first-screen slot beside its documents',async({page})=>{
 await setup(page);const all=await classify(page);expect(all.find(c=>c.id==='query')?.rule).toBe('same-content-query-form');expect(all.find(c=>c.id==='global-query')?.rule).toBeUndefined();
 const result=await page.evaluate(()=>{const first=V10Query.rank(candidates);const rest=[...V10Query.remainingMenus(candidates,first)];return {first:first.map(c=>c.element.id),all:[...first,...rest].map(c=>c.element.id)};});
 expect(result.first).toHaveLength(6);expect(result.first).toContain('query');expect(result.first).not.toContain('submit');expect(result.first.filter(id=>id.startsWith('doc-')).length).toBe(5);expect(new Set(result.all).size).toBe(result.all.length);expect(result.all).toContain('submit');
});
test('@positive batch institution summaries avoid rereading a shared fixed heading and fresh checks still detect replacement',async({page})=>{
 await setup(page);expect(await page.evaluate(()=>{
 const raw=V10Query.analyzePage().filter(c=>c.element.id.startsWith('doc-'));const heading=document.getElementById('heading');let reads=0;const original=heading.getClientRects.bind(heading);heading.getClientRects=()=>{reads++;return original();};
 const cache=new WeakMap();V10Query.institutionEvidence(raw[0],cache);const first=reads;V10Query.institutionEvidence(raw[1],cache);const additional=reads-first;
 const full=V10Query.classify(V10Query.analyzePage());const old=full.find(c=>c.element.id==='doc-0');const before=V10Query.areCandidatesCurrent([old]);heading.firstElementChild.replaceWith(heading.firstElementChild.cloneNode(true));return {first,additional,before,after:V10Query.areCandidatesCurrent([old])};
 })).toMatchObject({additional:0,before:true,after:false});
});
test('same-frame changes to form method/action/handler, field owner or heading invalidate the old query proof',async({page})=>{
 for(const change of ['method','action','handler','fieldset','heading','form','second-field']){
  await setup(page);await classify(page);expect(await page.evaluate(change=>{const c=candidates.find(c=>c.element.id==='query');const before=V10Query.isCandidateCurrent(c);const f=document.getElementById('query-form');
   if(change==='method')f.method='post';if(change==='action')f.setAttribute('action','?mode=search');if(change==='handler')f.setAttribute('onsubmit','return false');
   if(change==='second-field'){const input=document.createElement('input');input.type='search';f.append(input);}
   if(change==='fieldset'||change==='form'){const n=change==='form'?f:document.getElementById('fields');const clone=n.cloneNode(false);while(n.firstChild)clone.append(n.firstChild);n.replaceWith(clone);}
   if(change==='heading'){const h=document.getElementById('heading').firstElementChild;h.replaceWith(h.cloneNode(true));}
   return {before,after:V10Query.isCandidateCurrent(c)};
  },change)).toEqual({before:true,after:false});
 }
});
test('private field values and checked state are absent from query proof, snapshots and UI metadata',async({page})=>{
 await setup(page);expect(await page.evaluate(()=>{let reads=0;const input=document.getElementById('query');for(const p of ['value','checked'])Object.defineProperty(input,p,{get(){reads++;throw Error('PRIVATE_QUERY_CANARY');},configurable:true});const all=V10Query.classify(V10Query.analyzePage());const current=V10Query.areCandidatesCurrent(all);const text=JSON.stringify(all,(key,value)=>['element','dependencies','taskGroup'].includes(key)?undefined:value);return {reads,current,canary:text.includes('PRIVATE_QUERY_CANARY'),query:all.find(c=>c.element.id==='query')?.contentEvidence?.rule};
 })).toEqual({reads:0,current:true,canary:false,query:'same-content-query-form'});
});
for(const variant of ['post','unrelated-heading','no-content','foreign-action','dangerous-action','dangerous-handler'])test(`${variant} cannot acquire the new same-content query proof`,async({page})=>{
 let html=fixture(variant==='post'?'post':'get');if(variant==='unrelated-heading')html=html.replace('IT 서비스 게시판','다른 지역 설명');if(variant==='no-content')html=html.replace(`<div><ul class="board-thumb-wrap">${docs}</ul></div>`,'');if(variant==='foreign-action')html=html.replace('action="?"','action="https://elsewhere.invalid/"');if(variant==='dangerous-action')html=html.replace('action="?"','action="?delete=1"');if(variant==='dangerous-handler')html=html.replace('action="?"','action="?" onsubmit="deleteRecord()"');
 await setup(page,html);const all=await classify(page);expect(all.find(c=>c.id==='query')?.rule).toBeUndefined();
});

test('POST query requires an explicit non-submit button and a selected topic matching the fixed content heading',async({page})=>{
 const list=Array.from({length:4},(_,i)=>`<li><strong>증명자료 ${i+1}</strong><a href="/details-${i}">상세보기</a><a href="#issue-${i}">발급하기</a><a href="#preview-${i}">미리보기</a></li>`).join('');
 const html=`<main><h2>증명서 발급</h2><div><ul><li><a class="active" href="javascript:void(0)">증명서 발급</a></li><li><a href="javascript:void(0)">이용 안내</a></li></ul><form id="query-form" method="post" action=""><fieldset><legend>서비스 검색</legend><input id="query" type="text" title="검색어 입력"><input id="submit" type="button" value="검색"></fieldset></form><div><ul>${list}</ul></div></div></main>`;
 await setup(page,html);let all=await classify(page);expect(all.find(c=>c.id==='query')?.rule).toBe('same-content-query-form');
 expect(await page.evaluate(()=>{const c=candidates.find(c=>c.element.id==='query');const before=V10Query.isCandidateCurrent(c);document.querySelector('.active').classList.remove('active');return{before,after:V10Query.isCandidateCurrent(c)};})).toEqual({before:true,after:false});
});
