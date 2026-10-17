import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import fs from 'node:fs';
import crypto from 'node:crypto';

const evidenceDir='docs/evidence/run009/final-integration-review';
const sourceFiles=['src/types.ts','src/classifier.ts','src/page-session.ts','src/content-evidence.ts','src/institution-evidence.ts','src/easy-mode.ts','src/relations.ts','src/service-relations.ts','src/document-relations.ts','src/navigation-utility.ts','src/analyzer.ts','src/action-bridge.ts','src/action-policy.ts','src/evidence-nodes.ts'];
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
let engine;
test.beforeAll(async()=>{
  const sourceHashes=Object.fromEntries(sourceFiles.map(path=>[path,hash(fs.readFileSync(path))]));
  const built=await build({stdin:{contents:`export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {isCandidateCurrent,areCandidatesCurrent} from './src/page-session';export {openEasyMode,cardSource} from './src/easy-mode';export {locateOriginal} from './src/action-bridge';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'FinalIntegration',loader:{'.css':'text'}});
  engine=built.outputFiles[0].text;
  fs.writeFileSync(`${evidenceDir}/test-bundle.js`,engine);
  fs.writeFileSync(`${evidenceDir}/test-bundle.json`,JSON.stringify({createdAtUtc:new Date().toISOString(),sha256:hash(engine),sourceHashes,scope:'Focused integrated synthetic headless safety/currentness checks, no live/native/quality/performance claim.'},null,2));
});

const service=`<main><ul><li id="service"><div><strong id="service-title"><span id="service-title-text">지역 활동 확인서</span></strong><p>공개 설명</p></div><div id="actions"><a id="details" href="/juniper" target="_blank">상세보기</a><a id="issue" href="javascript:openService('opaque')">발급하기</a><a id="preview" download href="/oak.pdf" target="_blank">미리보기</a></div></li></ul></main>`;
const documentTable=`<main><section><h2>공개 업무자료</h2><div id="table-wrap"><table id="table"><caption id="caption"><span id="caption-text">공개 자료실</span></caption><thead id="header"><tr id="header-row"><th>번호</th><th id="title-header"><span id="title-header-text">제목</span></th><th>작성일</th><th>부서</th><th>첨부</th></tr></thead><tbody id="body"><tr id="row"><td>8</td><td><a id="document" href="javascript:openDocument('opaque')"><span>산림 관측 장비 실무자 가이드북</span></a></td><td>2026/07/16</td><td>자료지원팀</td><td><img alt="file"></td></tr></tbody></table></div></section></main>`;
const pension=`<main><div class="tabWrap con-tab"><ul class="tabNav"><li><a id="reading" href="#benefit" onclick="return false">노후 생활의 사회보장</a></li><li><a href="#fund" onclick="return false">새로운 국민연금의 구성</a></li></ul><div class="tabContents"><div class="tabPage" id="fund" hidden><h4>새로운 국민연금의 구성</h4></div><div class="tabPage" id="benefit"><h4 id="panel-title"><span id="panel-title-text">노후 생활의 사회보장</span></h4></div></div></div></main>`;

async function setup(page,html,url='https://unfamiliar.test/current'){
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/*',route=>route.request().isNavigationRequest()&&route.request().url()===url?route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body>${html}</body></html>`}):route.abort());
  await page.goto(url);await page.evaluate(engine);
  await page.evaluate(()=>{
    window.sourceActivations=0;window.sourceSubmits=0;
    window.openService=window.openDocument=()=>{window.sourceActivations++};
    document.addEventListener('click',event=>{if(!event.composedPath().some(node=>node instanceof Element&&node.matches('[data-easyweb-host]'))&&event.target.closest('a,button'))window.sourceActivations++},true);
    document.addEventListener('submit',event=>{window.sourceSubmits++;event.preventDefault()},true);
    window.raw=FinalIntegration.analyzePage();window.items=FinalIntegration.classify(raw,{mode:'generic'});
    window.findSource=id=>items.find(candidate=>candidate.element.id===id);
    window.openReview=()=>{const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);window.closeReview=FinalIntegration.openEasyMode(host,{mode:'generic'});return host.shadowRoot};
    window.findCard=id=>[...document.querySelector('[data-easyweb-host]').shadowRoot.querySelectorAll('.card')].find(card=>FinalIntegration.cardSource(card)?.element.id===id);
    window.safeCandidate=candidate=>candidate?{label:candidate.label,href:candidate.href??null,target:candidate.target??null,action:candidate.action,category:candidate.category,relatedLabel:candidate.relatedLabel??null,relation:candidate.relationEvidence?.rule??null,content:candidate.contentEvidence?.rule??null,current:FinalIntegration.isCandidateCurrent(candidate)}:null;
  });
}

test('new relationships reach classified content evidence with original label/action/href/target and actual cards',async({page})=>{
  await setup(page,service+documentTable);
  const result=await page.evaluate(()=>{
    const ids=['details','issue','preview','document'];openReview();
    return ids.map(id=>{const c=findSource(id),source=raw.find(raw=>raw.element===c?.element),card=findCard(id);return {id,...safeCandidate(c),preserved:!!source&&JSON.stringify([c.label,c.href,c.target,c.action])===JSON.stringify([source.label,source.href,source.target,source.action]),cardPresent:!!card,cardAction:card?.tagName==='A'?'navigate':'locate',cardOwnName:card?.querySelector('.card-source')?.textContent}});
  });
  expect(result).toHaveLength(4);expect(result.every(item=>item.preserved&&item.current&&item.cardPresent&&item.content==='verified-current-content-relation'&&item.cardAction===item.action&&item.cardOwnName===`찾은 메뉴 · ${item.label}`)).toBe(true);
  expect(result.find(item=>item.id==='details')).toMatchObject({action:'navigate',href:'https://unfamiliar.test/juniper',target:'_blank',label:'상세보기',relatedLabel:'지역 활동 확인서'});
  expect(result.find(item=>item.id==='document')).toMatchObject({action:'locate',category:'help',relation:'listed-fixed-document-kind'});
});

test('service locate card focuses source without source activation or form submission',async({page})=>{
  await setup(page,service);await page.evaluate(()=>{openReview();findCard('issue').click()});
  expect(await page.evaluate(()=>({focused:document.activeElement.id,activations:sourceActivations,submits:sourceSubmits,host:!!document.querySelector('[data-easyweb-host]'),notice:document.querySelector('[data-easyweb-notice]')?.shadowRoot?.querySelector('p')?.textContent,noticeReason:document.querySelector('[data-easyweb-notice]')?.dataset.easywebNoticeReason}))).toMatchObject({focused:'issue',activations:0,submits:0,host:false});
});

test('document danger mutation immediately before actual card click blocks locate before focus',async({page})=>{
  await setup(page,documentTable);
  const result=await page.evaluate(()=>{openReview();const source=findSource('document');document.getElementById('document').setAttribute('href','/read?cmd=delete');const current=FinalIntegration.isCandidateCurrent(source);findCard('document').click();return {current,focused:document.activeElement.id,host:!!document.querySelector('[data-easyweb-host]'),disabled:findCard('document').getAttribute('aria-disabled'),activations:sourceActivations,submits:sourceSubmits}});
  expect(result).toMatchObject({current:false,host:true,disabled:'true',activations:0,submits:0});expect(result.focused).not.toBe('document');
});

test('service peer danger introduced by focus invalidates after-focus check and does not activate',async({page})=>{
  await setup(page,service);
  const result=await page.evaluate(()=>{const source=findSource('issue');source.element.addEventListener('focus',()=>document.getElementById('preview').setAttribute('href','/read?operation=checkout'),{once:true});openReview();findCard('issue').click();return {current:FinalIntegration.isCandidateCurrent(source),activations:sourceActivations,submits:sourceSubmits,outline:source.element.style.outline,notice:document.querySelector('[data-easyweb-notice]')?.shadowRoot?.querySelector('p')?.textContent,noticeReason:document.querySelector('[data-easyweb-notice]')?.dataset.easywebNoticeReason}});
  expect(result).toMatchObject({current:false,activations:0,submits:0,outline:'',noticeReason:'changed'});expect(result.notice).toMatch(/바뀌|변경|다시/);
});

test('document equal-markup header replacement during focus invalidates locate result',async({page})=>{
  await setup(page,documentTable);
  const result=await page.evaluate(()=>{const source=findSource('document');source.element.addEventListener('focus',()=>{const old=document.getElementById('title-header-text');old.replaceWith(old.cloneNode(true))},{once:true});return {result:FinalIntegration.locateOriginal(source,()=>{}),current:FinalIntegration.isCandidateCurrent(source),activations:sourceActivations,submits:sourceSubmits,outline:source.element.style.outline}});
  expect(result).toEqual({result:{ok:false,reason:'changed'},current:false,activations:0,submits:0,outline:''});
});

test('equal markup row/header/service title/peer replacements invalidate old integrated sources',async({page})=>{
  for(const [html,id,replace]of[[service,'issue','service-title-text'],[service,'issue','details'],[documentTable,'document','title-header-text'],[documentTable,'document','row'],[documentTable,'document','table-wrap']]){
    await setup(page,html);
    const result=await page.evaluate(({id,replace})=>{const source=findSource(id),old=document.getElementById(replace);const wasCurrent=FinalIntegration.areCandidatesCurrent([source]);old.replaceWith(old.cloneNode(true));return {wasCurrent,single:FinalIntegration.isCandidateCurrent(source),batch:FinalIntegration.areCandidatesCurrent([source])}},{id,replace});
    expect(result,replace).toEqual({wasCurrent:true,single:false,batch:false});
  }
});

test('nested private getters remain unread through classify/currentness/cards/locate',async({page})=>{
  await setup(page,service+documentTable+`<section id="private-card" role="group"><strong>지역 연구 확인서</strong><a id="private-details" href="/x">상세보기<input type="search" aria-label="검색" value="PRIVATE_NESTED"></a><a href="/y">발급하기</a><a download href="/z">미리보기</a></section><form><input type="password" value="PRIVATE_PASSWORD"><input type="search" aria-label="검색" value="PRIVATE_QUERY"><textarea>PRIVATE_TEXTAREA</textarea><div role="textbox">PRIVATE_EDITOR</div></form>`);
  const result=await page.evaluate(()=>{
    window.privateReads=0;
    for(const node of document.querySelectorAll('input,textarea,[role="textbox"]')){
      for(const property of ['value','checked','textContent','innerText'])Object.defineProperty(node,property,{configurable:true,get(){privateReads++;throw Error('private getter read')}});
      for(const child of node.childNodes)if(child.nodeType===Node.TEXT_NODE)Object.defineProperty(child,'nodeValue',{configurable:true,get(){privateReads++;throw Error('private text read')}});
    }
    raw=FinalIntegration.analyzePage();items=FinalIntegration.classify(raw,{mode:'generic'});const current=FinalIntegration.areCandidatesCurrent(items);openReview();const ui=document.querySelector('[data-easyweb-host]').shadowRoot.textContent;findCard('issue').click();
    return {nestedPromoted:items.some(candidate=>candidate.element.id==='private-details'&&!!candidate.relationEvidence),reads:privateReads,current,safe:JSON.stringify(items.map(safeCandidate)),ui,activations:sourceActivations,submits:sourceSubmits};
  });
  expect(result.nestedPromoted).toBe(false);expect(result.reads).toBe(0);expect(result.current).toBe(true);expect(result.safe+result.ui).not.toContain('PRIVATE_');expect(result.activations+result.submits).toBe(0);
});

test('form ownership default submits and role form never acquire new service relationships',async({page})=>{
  const variants=[`<form>${service}</form>`,service.replace('<li id="service">','<li id="service" role="form">'),service.replace('<a id="issue" href="javascript:openService(\'opaque\')">발급하기</a>','<button id="issue" form="external">발급하기</button>')+'<form id="external" action="/final" method="post"></form>'];
  for(const html of variants){await setup(page,html);expect(await page.evaluate(()=>items.some(item=>['details','issue','preview'].includes(item.element.id)&&!!item.relationEvidence))).toBe(false);}
  await setup(page,service);
  expect(await page.evaluate(()=>{const c=findSource('issue'),card=document.getElementById('service');const form=document.createElement('form');c.element.closest('ul').replaceWith(form);form.append(card);return FinalIntegration.isCandidateCurrent(c)})).toBe(false);
});

test('dangerous fixed metadata and interactive table roles do not revive relation classification',async({page})=>{
  for(const [html,id,absent]of[[service.replace('id="preview"','id="preview" title="최종 제출"'),'details',false],[service.replace("openService('opaque')","deleteAccount('opaque')"),'issue',true],[documentTable.replace("javascript:openDocument('opaque')",'/read?operation=delete'),'document',true],[documentTable.replace("openDocument('opaque')","deleteRecord('opaque')"),'document',true],[documentTable.replace('id="title-header"','id="title-header" role="checkbox"'),'document',false]]){
    await setup(page,html);const result=await page.evaluate(id=>safeCandidate(findSource(id)),id);if(absent)expect(result).toBeNull();else expect(result?.relation??null).toBeNull();
  }
});

test('institution and content evidence use a fresh currentness batch after same-turn mutation',async({page})=>{
  await setup(page,pension,'https://www.nps.or.kr/pnsinfo/ntpsklg/futureExplanation.do');
  const result=await page.evaluate(()=>{
    items=FinalIntegration.classify(FinalIntegration.analyzePage(),{mode:'institution'});const c=findSource('reading');const before={institution:c?.institutionEvidence?.rule,content:c?.contentEvidence?.rule,current:FinalIntegration.areCandidatesCurrent([c])};const old=document.getElementById('panel-title-text');old.replaceWith(old.cloneNode(true));const after=FinalIntegration.areCandidatesCurrent([c]);const rebuilt=FinalIntegration.classify(FinalIntegration.analyzePage(),{mode:'institution'}).find(candidate=>candidate.element.id==='reading');const rebuiltCurrent=FinalIntegration.areCandidatesCurrent([rebuilt]);document.getElementById('benefit').insertAdjacentHTML('beforeend','<span role="checkbox">고정 선택 제어</span>');return {before,after,rebuiltCurrent,afterInteractive:FinalIntegration.areCandidatesCurrent([rebuilt])};
  });
  expect(result).toEqual({before:{institution:'named-local-explanation-panel',content:'institution-current-content',current:true},after:false,rebuiltCurrent:true,afterInteractive:false});
});
