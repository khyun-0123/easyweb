import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import fs from 'node:fs';
import crypto from 'node:crypto';
let engine;
// RUN-009 evidence is preserved; later runs write their own copy.
const evidenceDir = 'docs/evidence/run010/service-relations';
test.beforeAll(async () => {
  const result = await build({stdin:{contents:`export { analyzePage } from './src/analyzer';export { serviceRelation } from './src/service-relations';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ServiceRelations'});
  engine=result.outputFiles[0].text;
  fs.mkdirSync(evidenceDir,{recursive:true});
  fs.writeFileSync(`${evidenceDir}/last-test-bundle.json`,JSON.stringify({sha256:crypto.createHash('sha256').update(engine).digest('hex'),scope:'Direct serviceRelation module + current analyzer bundle; no classifier/ranker/integration/quality/native claims.',headless:true,externalRequests:0},null,2));
});
const tabs = `<div id="local"><div><ul id="tasks"><li class="current"><a id="selected" href="/fresh">시설이용 신청</a></li><li><a id="own" href="/jasmine">나의 시설이용 보기</a></li><li><a id="public" href="/violet">시설이용 공개</a></li></ul></div><div id="description"><strong id="task-title"><span>시설이용 신청</span></strong><div><p>공개 서비스 설명</p><a id="entry" target="_blank" href="https://entry.other.test/new">시설이용 신청(시민 창구) 바로가기</a></div></div></div>`;
const views = `<div id="center"><div><h3 id="center-title"><span>생활회복 지원센터</span></h3></div><div id="views"><button type="button" id="news" class="active" onclick="openShelf(this)">센터소식</button><button type="button" id="photo" onclick="openShelf(this)">사진자료</button><button type="button" id="video" onclick="openShelf(this)">영상자료</button></div><div id="content"><form role="search"><input id="query" type="search" aria-label="검색어" value="PRIVATE_QUERY"></form><table><thead><tr><th>제목</th></tr></thead><tbody><tr><td><a href="/elm">현장 활동 기록</a></td></tr><tr><td><a href="/ash">회복 지원 자료집</a></td></tr></tbody></table></div></div>`;
const card = `<ul><li id="card"><div><strong id="card-title"><span>지역 활동 확인서</span></strong><p>공개 설명입니다.</p></div><div id="actions"><a id="details" href="/juniper" target="_blank">상세보기</a><a id="issue" href="javascript:openService('unfamiliar')">발급하기</a><p><a id="preview" download href="/oak.pdf" target="_blank">미리보기</a></p></div></li></ul>`;
async function inspect(page,html) {
  await page.route('**/*',route=>route.request().url()==='https://unfamiliar.test/fresh'?route.fulfill({contentType:'text/html; charset=utf-8',body:`<main>${html}</main>`}):route.abort());
  await page.goto('https://unfamiliar.test/fresh');await page.addScriptTag({content:engine});
  return page.evaluate(()=>{
    window.sources=ServiceRelations.analyzePage();window.proofs=new Map();
    return sources.flatMap(source=>{const before=[source.label,source.href,source.target,source.action];const proof=ServiceRelations.serviceRelation(source,new WeakMap());if(!proof)return[];proofs.set(source.element.id,proof);const{dependencies,...item}=proof;return[{id:source.element.id,...item,label:source.label,action:source.action,href:source.href,target:source.target,preserved:JSON.stringify(before)===JSON.stringify([source.label,source.href,source.target,source.action]),dependencies:dependencies.length}]});
  });
}
function find(items,id){return items.find(item=>item.id===id);}
test('현재 문서와 같은 고정 제목의 지역 업무 탭은 각자의 역할을 구분한다',async({page})=>{
  const items=await inspect(page,tabs);expect(find(items,'own')).toMatchObject({category:'apply',pageTask:'control',action:'navigate'});expect(find(items,'public')).toMatchObject({category:'help',pageTask:'reading',action:'navigate'});expect(find(items,'entry')).toMatchObject({category:'apply',pageTask:'control',action:'navigate',target:'_blank'});expect(items.every(item=>item.preserved)).toBe(true);
});
test('실제 지원센터 게시물 목록과 인접한 보기 버튼은 읽기로 연결한다',async({page})=>{
  const items=await inspect(page,views);for(const id of ['news','photo','video'])expect(find(items,id)).toMatchObject({category:'help',pageTask:'reading',action:'locate'});
});
test('한 고정 서비스 제목의 세 행동은 label과 원본 실행 계약을 보존한다',async({page})=>{
  const items=await inspect(page,card);expect(find(items,'details')).toMatchObject({category:'help',pageTask:'reading',action:'navigate',label:'상세보기',target:'_blank',relatedLabel:'지역 활동 확인서'});expect(find(items,'issue')).toMatchObject({category:'apply',pageTask:'control',action:'locate',label:'발급하기'});expect(find(items,'preview')).toMatchObject({category:'help',pageTask:'reading',action:'locate',label:'미리보기'});expect(items.every(item=>item.preserved)).toBe(true);
});
for(const[name,mutate]of[
 ['선택문서 불일치',s=>s.replace('href="/fresh"','href="/elsewhere"')],
 ['선택 2개',s=>s.replace('<li><a id="own"','<li class="current"><a id="own"')],
 ['제목 없음',s=>s.replace('<strong id="task-title"><span>시설이용 신청</span></strong>','')],
 ['다른 지역 제목',s=>s.replace('<div id="description">','<section id="description">').replace('</div></div></div>','</div></section></div>')],
 ['위험한 동료',s=>s.replace('href="/violet"','href="/violet?cmd=delete"')],
 ['중첩 편집 동료',s=>s.replace('시설이용 공개</a>','<span contenteditable="true">PRIVATE_PEER 시설이용 공개</span></a>')],
 ['업무 주제 충돌',s=>s.replace('나의 시설이용 보기','나의 배송 보기')],
])test(`지역 업무 근거 반례: ${name}`,async({page})=>{expect(find(await inspect(page,mutate(tabs)),'own')).toBeUndefined();});
for(const[name,mutate]of[
 ['고정 지원 제목 없음',s=>s.replace('생활회복 지원센터','지역 사진 갤러리')],
 ['실제 목록 없음',s=>s.replace(/<table>[\s\S]*?<\/table>/,'<p>자료가 없습니다.</p>')],
 ['제목 열 없음',s=>s.replace('<th>제목</th>','<th>작성자</th>')],
 ['위험한 동료',s=>s.replace('openShelf(this)\">영상자료','deleteRecord(this)\">영상자료')],
 ['상태/업무 버튼 혼합',s=>s.replace('영상자료','상담 예약')],
 ['목록의 원본 업무 명령',s=>s.replace('href="/elm"','href="/elm?operation=checkout"')],
])test(`지원센터 보기 반례: ${name}`,async({page})=>{expect(find(await inspect(page,mutate(views)),'photo')).toBeUndefined();});
for(const[name,mutate]of[
 ['제목 2개',s=>s.replace('</strong>','</strong><strong>별도 발급 확인서</strong>')],
 ['제목 입력영역',s=>s.replace('<span>지역 활동 확인서</span>','<span contenteditable="true">PRIVATE_TITLE 지역 활동 확인서</span>')],
 ['다른 카드 제목',s=>s.replace('<strong id="card-title"><span>지역 활동 확인서</span></strong>','')+'<li><strong>별도 확인서</strong></li>'],
 ['업무 양식',s=>`<form>${s}</form>`],
 ['내부 업무 양식',s=>s.replace('</li>','<form><button type="button">추가 작업</button></form></li>')],
 ['메뉴 펼침 제어',s=>s.replace('id="issue"','id="issue" aria-controls="popup"')],
 ['위험 명령 title',s=>s.replace('id="issue"','id="issue" title="최종 제출"')],
 ['숨긴 동료',s=>s.replace('id="issue"','id="issue" hidden')],
 ['위험한 버튼',s=>s.replace("openService('unfamiliar')","deleteAccount('unfamiliar')")],
 ['추가 동작',s=>s.replace('</li>','<button type="button">별도 작업</button></li>')],
 ['제목과 무관한 링크 제목',s=>s.replace('id="details"','id="details" title="다른 확인서 상세보기"')],
])test(`다중 행동 카드 반례: ${name}`,async({page})=>{expect(find(await inspect(page,mutate(card)),'details')).toBeUndefined();});
test('전역 메뉴·기사·사이드바는 지역 서비스 근거를 얻지 않는다',async({page})=>{for(const tag of ['nav','header','footer','aside','article']){const items=await inspect(page,`<${tag}>${tabs}${views}${card}</${tag}>`);expect(items).toEqual([]);}});
test('사적 getter와 편집 노드는 읽지 않으며 결과에도 포함하지 않는다',async({page})=>{
  const trap=`<script>window.reads=0;for(const e of document.querySelectorAll('input,textarea,select,[contenteditable],[role="textbox"]'))for(const p of ['value','checked','textContent','innerText'])Object.defineProperty(e,p,{get(){window.reads++;throw Error('private access')}});</script>`;
  const items=await inspect(page,views+card+`<div role="textbox">PRIVATE_EDITOR</div><textarea>PRIVATE_TEXTAREA</textarea>`+trap);expect(find(items,'photo')).toBeDefined();expect(find(items,'details')).toBeDefined();expect(await page.evaluate(()=>window.reads)).toBe(0);expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});
for(const[name,html,id,target]of[['탭 고정제목',tabs,'own','task-title'],['지원센터 제목',views,'photo','center-title'],['카드 제목',card,'details','card-title']])test(`${name} 하위노드 동일 문구 교체는 실제 의존 노드를 교체한다`,async({page})=>{
  await inspect(page,html);expect(await page.evaluate(({id,target})=>{const source=sources.find(s=>s.element.id===id);const before=proofs.get(id);const old=document.getElementById(target).firstElementChild;old.replaceWith(old.cloneNode(true));const after=ServiceRelations.serviceRelation(source,new WeakMap());return !!before&&!!after&&before.dependencies.includes(old)&&!after.dependencies.includes(old)&&after.dependencies.includes(document.getElementById(target).firstElementChild);},{id,target})).toBe(true);
});
test('같은 batch cache를 전달해도 관계 변경 뒤 새 고정 근거를 재검사한다',async({page})=>{
  await inspect(page,card);expect(await page.evaluate(()=>{const c=sources.find(s=>s.element.id==='details');const cache=new WeakMap();const before=ServiceRelations.serviceRelation(c,cache);document.getElementById('issue').setAttribute('href','/unknown?task=delete');return !!before&&!ServiceRelations.serviceRelation(c,cache);})).toBe(true);
});

test('고정 제목의 하위노드 순회 한도를 넘으면 근거를 포기한다',async({page})=>{const html=card.replace('<span>지역 활동 확인서</span>','<span>지역 활동 확인서</span>'+Array.from({length:65},()=>'<i></i>').join(''));expect(find(await inspect(page,html),'details')).toBeUndefined();});
