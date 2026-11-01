import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let engine;
test.beforeAll(async()=>{
  const result=await build({stdin:{contents:`export {analyzePage,sourceSnapshot} from './src/analyzer';export {classify} from './src/classifier';export {isCandidateCurrent} from './src/page-session';export {openEasyMode} from './src/easy-mode';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'IntegratedInstitution',loader:{'.css':'text'}});
  engine=result.outputFiles[0].text;
});
const urls={government:'https://www.safekorea.go.kr/safekorea-kor/edtr/research/fieldGuide.do',pension:'https://www.nps.or.kr/pnsinfo/ntpsklg/independentOverview.do',university:'https://www.smu.ac.kr/kor/life/laboratoryGuide.do'};
async function setup(page,url,html){
  await page.route('**/*',route=>route.request().isNavigationRequest()?route.fulfill({contentType:'text/html; charset=utf-8',body:html}):route.abort());
  await page.goto(url);await page.addScriptTag({content:engine});
}
async function compare(page){return page.evaluate(()=>{
  window.sources=IntegratedInstitution.analyzePage();
  window.generic=IntegratedInstitution.classify(sources,{mode:'generic'});
  window.institution=IntegratedInstitution.classify(sources,{mode:'institution'});
  const brief=item=>({id:item.element.id,label:item.label,category:item.category,score:item.score,action:item.action,href:item.href,target:item.target,adapter:item.institutionEvidence?.adapter});
  return {generic:generic.map(brief),institution:institution.map(brief)};
});}
const governmentMenu=(links)=>`<main id="contents"><h2 id="training-title">연구시설 구조훈련</h2><div id="lnbmenu"><ul>${links}</ul></div></main>`;
const menuLink=(id,href,label='해양구조 훈련자료',extra='')=>`<li><a id="${id}" href="${href}" ${extra}>${label}</a></li>`;
const governmentPanels=(extra='')=>`<main id="contents"><h2>연구시설 교육훈련</h2><form id="external-owner"></form><div class="tab-area"><button id="panel-button-a" class="tab-list" type="button" aria-expanded="true" ${extra}>실험교육 개요</button><div class="tab-content"><h3>실습 구성</h3></div><button id="panel-button-b" class="tab-list" type="button" aria-expanded="false">해양훈련 개요</button><div class="tab-content" hidden><h3>훈련 구성</h3></div></div></main>`;
const pension=()=>`<main><div id="pension-wrap" class="tabWrap con-tab"><ul id="pension-nav" class="tabNav"><li><a id="pension-topic-a" href="#independent-panel-r27">국민연금과 생활보장</a></li><li><a id="pension-topic-b" href="#independent-panel-z94">노후소득과 사회보장</a></li></ul><div class="tabContents"><div id="independent-panel-z94" class="tabPage" hidden><h4>노후소득과 사회보장</h4></div><div id="independent-panel-r27" class="tabPage"><h4>국민연금과 생활보장</h4></div></div></div></main>`;
const board=(count=2)=>`<main><div id="document-board" class="common-board"><h2 id="document-heading">IT지원 게시판</h2><ul class="board-thumb-wrap">${Array.from({length:count},(_,i)=>`<li><dl><dt class="board-thumb-content-title"><a id="instruction-${i}" href="?mode=view&articleId=independent-${i*19+71}">[수강실험] ${i===0?'가상실습 도구 설치 절차 안내':i===1?'실습 네트워크 일시중단 안내':`도구 ${i} 설치 절차 안내`}</a></dt></dl></li>`).join('')}</ul></div></main>`;
async function open(page,mode){await page.evaluate(mode=>{const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);window.closeIntegration=IntegratedInstitution.openEasyMode(host,{mode});},mode);}
const noEvidence=items=>items.every(item=>!item.adapter);

test('동일 소스의 generic/institution 모드를 비교하며 문서 목적이 학사 주제 배지보다 우선한다',async({page})=>{
  await setup(page,urls.university,board());const result=await compare(page);
  expect(result.generic.map(i=>i.category)).toEqual(['academic','academic']);
  expect(noEvidence(result.generic)).toBe(true);
  expect(result.institution.map(i=>[i.category,i.adapter])).toEqual([['help','smu-it-documents'],['notice','smu-it-documents']]);
  expect(result.institution.map(i=>[i.id,i.label,i.action,i.href,i.target])).toEqual(result.generic.map(i=>[i.id,i.label,i.action,i.href,i.target]));
});

test('교육 메뉴의 일반 이동·명시 handler 위치 안내와 원본 URL을 변경하지 않는다',async({page})=>{
  await setup(page,urls.government,governmentMenu(menuLink('ordinary','/safekorea-kor/edtr/research/notes.do')+menuLink('located','/safekorea-kor/edtr/research/briefing.do','합동교육 계획','onclick="return false"')));
  const result=await compare(page);
  expect(result.institution.map(i=>[i.id,i.category,i.action,!!i.href])).toEqual([['ordinary','help','navigate',true],['located','help','locate',false]]);
  expect(await page.evaluate(()=>institution.every(item=>{const source=sources.find(source=>source.element===item.element);return source.action===item.action&&source.href===item.href&&source.target===item.target&&source.snapshot===item.snapshot;}))).toBe(true);
});

test('href 없는 명시적 교육 패널 버튼은 그대로 locate이며 form 제출로 승격하지 않는다',async({page})=>{
  await setup(page,urls.government,governmentPanels());const result=await compare(page);
  expect(result.institution.filter(i=>i.adapter).map(i=>[i.id,i.category,i.action,i.href])).toEqual([['panel-button-a','help','locate',undefined],['panel-button-b','help','locate',undefined]]);
});

test('locate여서 href가 생략돼도 원본 HTTP 위험 명령·onclick·javascript 위험을 되살리지 않는다',async({page})=>{
  const rows=[['query','/safekorea-kor/edtr/research/notes.do?CMD=view&CMD=payment','onclick="return false"'],['path','/safekorea-kor/edtr/%64elete','onclick="return false"'],['handler','/safekorea-kor/edtr/research/notes.do','onclick="openPayment()"'],['javascript','javascript:deleteRecord()','']];
  await setup(page,urls.government,governmentMenu(rows.map(([id,url,extra])=>menuLink(id,url,'해양구조 훈련자료',extra)).join('')));
  const result=await compare(page);expect(result.institution).toEqual([]);expect(result.generic).toEqual([]);
});

test('login 경로 충돌·비HTTP·잘못된 URL에는 기관 근거를 붙이지 않는다',async({page})=>{
  const badURLs=['/safekorea-kor/edtr/login','mailto:public@example.invalid','data:text/plain,public','javascript:void(0)','http://[invalid'];
  await setup(page,urls.government,governmentMenu(badURLs.map((url,index)=>menuLink(`ineligible-${index}`,url,'국제훈련 자료','onclick="return false"')).join('')));
  const result=await compare(page);expect(noEvidence(result.institution)).toBe(true);
});

test('외부 소유 submit·form 내부 제어·입력과 편집 역할은 adapter를 얻지 않는다',async({page})=>{
  for(const type of ['button','submit']){
    await setup(page,urls.government,governmentPanels('form="external-owner"').replace('type="button" aria-expanded="true"',`type="${type}" aria-expanded="true"`));const result=await compare(page);
    expect(result.institution.find(i=>i.id==='panel-button-a')?.adapter).toBeUndefined();
  }
  const html=governmentPanels().replace('<div class="tab-area">','<form><div class="tab-area">').replace('</main>','</form><input id="query" type="search" aria-label="검색어"><div id="editor" role="textbox" contenteditable="true" aria-label="검색어">PRIVATE_TYPED</div></main>');
  await setup(page,urls.government,html);const result=await compare(page);
  expect(noEvidence(result.institution)).toBe(true);
  expect(result.institution.find(i=>i.id==='query')?.category).toBe('search');
  expect(result.institution.find(i=>i.id==='editor')?.category).toBe('search');
});

test('기사·숨김·비활성 제어와 무관한 기관 경계는 adapter로 확대하지 않는다',async({page})=>{
  const links=menuLink('article','/safekorea-kor/edtr/research/notes.do');
  await setup(page,urls.government,governmentMenu(links).replace('<div id="lnbmenu">','<article><div id="lnbmenu">').replace('</main>','</article></main>'));
  expect(noEvidence((await compare(page)).institution)).toBe(true);
  await setup(page,urls.government,governmentMenu(menuLink('hidden','/safekorea-kor/edtr/research/notes.do','훈련자료','hidden')+menuLink('disabled','/safekorea-kor/edtr/research/notes.do','훈련자료','aria-disabled="true"')));
  expect((await compare(page)).institution).toEqual([]);
  await setup(page,'https://www.smu.ac.kr/kor/research/laboratoryGuide.do',board());const result=await compare(page);
  expect(result.institution).toEqual(result.generic);
});

test('국민연금 설명 탭은 낯선 fragment·역순 패널에서도 위치 안내를 보존한다',async({page})=>{
  await setup(page,urls.pension,pension());const result=await compare(page);
  expect(result.institution.map(i=>[i.id,i.category,i.action,i.href])).toEqual([['pension-topic-a','help','locate',undefined],['pension-topic-b','help','locate',undefined]]);
  expect(result.institution.every(i=>i.adapter==='nps-explanation')).toBe(true);
});

test('제목·컨테이너·패널을 같은 내용으로 교체해도 기존 기관 후보는 stale이다',async({page})=>{
  for(const kind of ['heading','board','panel']){
    await setup(page,kind==='panel'?urls.pension:urls.university,kind==='panel'?pension():board());await compare(page);
    const result=await page.evaluate(kind=>{
      const candidate=institution.find(i=>i.element.id===(kind==='panel'?'pension-topic-a':'instruction-0'));
      const old=kind==='heading'?document.querySelector('#document-heading'):kind==='board'?document.querySelector('#document-board'):document.querySelector('#independent-panel-r27');
      const replacement=old.cloneNode(kind!=='board');
      if(kind==='board')while(old.firstChild)replacement.append(old.firstChild);
      old.replaceWith(replacement);
      return {sameSnapshot:IntegratedInstitution.sourceSnapshot(candidate.element,candidate.label).attributes===candidate.snapshot.attributes,current:IntegratedInstitution.isCandidateCurrent(candidate)};
    },kind);
    expect(result,kind).toEqual({sameSnapshot:true,current:false});
  }
});

test('동일 fragment 대상의 추가·설명 제목 변경도 후보를 무효화한다',async({page})=>{
  for(const kind of ['duplicate','title']){
    await setup(page,urls.pension,pension());await compare(page);
    expect(await page.evaluate(kind=>{
      const candidate=institution.find(i=>i.element.id==='pension-topic-a');const panel=document.querySelector('#independent-panel-r27');
      if(kind==='duplicate')document.body.append(panel.cloneNode(true));else panel.querySelector('h4').replaceChildren('다른 자료의 설명');
      return IntegratedInstitution.isCandidateCurrent(candidate);
    },kind),kind).toBe(false);
  }
});

test('동일 프레임의 의존 제목 교체는 이동 카드의 기본 동작을 취소하고 원본을 실행하지 않는다',async({page})=>{
  await setup(page,urls.university,board());await open(page,'institution');
  const result=await page.evaluate(()=>{
    let activations=0,blocked=false;document.querySelector('#instruction-0').addEventListener('click',()=>activations++);
    const card=document.querySelector('[data-easyweb-host]').shadowRoot.querySelector('.card');
    card.addEventListener('click',e=>{blocked=e.defaultPrevented;e.preventDefault();},{once:true});
    const heading=document.querySelector('#document-heading');heading.replaceWith(heading.cloneNode(true));card.click();
    return {blocked,activations};
  });expect(result).toEqual({blocked:true,activations:0});await expect(page.locator('.change-notice')).toBeVisible();
});

test('원본 초점 중 패널 교체는 성공 안내와 원본 활성화를 거절한다',async({page})=>{
  await setup(page,urls.pension,pension());
  await page.evaluate(()=>{window.activations=0;const source=document.querySelector('#pension-topic-a');source.addEventListener('click',e=>{activations++;e.preventDefault();});source.addEventListener('focus',()=>{const panel=document.querySelector('#independent-panel-r27');panel.replaceWith(panel.cloneNode(true));},{once:true});});
  await open(page,'institution');
  await page.locator('.card').filter({has:page.locator('.card-source',{hasText:'찾은 메뉴 · 국민연금과 생활보장'})}).click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason','changed');
  expect(await page.evaluate(()=>activations)).toBe(0);
});

test('UI의 모드는 다른 메뉴·이전 메뉴·다시 찾기에서 계속 유지된다',async({page})=>{
  for(const mode of ['generic','institution']){
    await setup(page,urls.university,board(8).replace('실습 네트워크 일시중단 안내','도구 칠 설치 절차 안내'));await open(page,mode);const category=mode==='generic'?'academic':'help';
    const categories=()=>page.locator('.card').evaluateAll(cards=>cards.map(c=>c.dataset.category));
    expect(await categories()).toEqual(Array(6).fill(category));
    await page.getByRole('button',{name:'다른 기능 보기',exact:true}).last().click();expect(await categories()).toEqual(Array(2).fill(category));
    await page.getByRole('button',{name:'이전 기능',exact:true}).click();expect(await categories()).toEqual(Array(6).fill(category));
    await page.getByRole('button',{name:'다시 찾기',exact:true}).click();expect(await categories()).toEqual(Array(6).fill(category));
  }
});

test('연결된 고정 제목의 편집 자식과 입력값 getter는 수집하지 않는다',async({page})=>{
  const html=pension().replace('국민연금과 생활보장</h4>','국민연금과 생활보장<span role="textbox">PRIVATE_EDITOR</span><input value="PRIVATE_INPUT"></h4>');
  await setup(page,urls.pension,html);
  await page.evaluate(()=>{window.privateReads=0;const trap=()=>{privateReads++;throw Error('private getter read');};for(const node of document.querySelectorAll('input,[role="textbox"]'))for(const key of ['value','textContent','innerText'])Object.defineProperty(node,key,{get:trap});});
  const result=await compare(page);expect(result.institution.filter(i=>i.adapter)).toHaveLength(2);expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  expect(await page.evaluate(()=>({reads:privateReads,metadata:JSON.stringify(institution.map(i=>({label:i.label,snapshot:i.snapshot,fingerprint:i.institutionEvidence?.fingerprint})))}))).toEqual({reads:0,metadata:expect.not.stringContaining('PRIVATE_')});
});

const extensionContexts=[{
  kind:'academic',url:'https://www.smu.ac.kr/kor/life/fieldStudies.do',source:'subject-entry',heading:'subject-heading',
  html:`<main class="contents-wrap"><div class="tab-outer"><ul class="tab-ul"><li class="active"><a href="/kor/life/fieldStudies.do">융합전공</a></li><li><a id="subject-entry" href="/kor/life/academicRecords.do">학적증명서</a></li><li><a href="/kor/life/independentMajor.do">자유전공</a></li></ul></div><section class="content-wrap"><div class="content"><h4 id="subject-heading">융합전공</h4><h5>제도 설명</h5></div></section></main>`,
}, {
  kind:'library',url:'https://www.nl.go.kr/NL/contents/fieldReference.do',source:'reading-entry',heading:'reading-heading',
  html:`<main id="sub_content"><div class="content_info"><h3>문헌검색</h3><div class="depth4-menu__slider"><div class="swiper-wrapper"><div role="group"><a id="reading-entry" href="/NL/contents/fieldIndex.do" onclick="return false">색인정보</a></div><div role="group"><a href="/NL/contents/fieldResults.do" onclick="return false">검색결과</a></div></div></div></div><div class="link_api_cont"><h4 class="tit" id="reading-heading"><button class="download_btn" type="button" onclick="return false">문헌 활용 가이드 다운로드</button></h4></div></main>`,
}];
for(const context of extensionContexts)test(`새 ${context.kind} 관계의 동일 표제 교체·의미 변경은 저장된 후보를 무효화한다`,async({page})=>{
  for(const mutation of ['identity','meaning']){
    await setup(page,context.url,context.html);const result=await compare(page);
    const item=result.institution.find(item=>item.id===context.source);expect(item?.adapter).toBeTruthy();
    expect(await page.evaluate(id=>IntegratedInstitution.isCandidateCurrent(institution.find(item=>item.element.id===id)),context.source)).toBe(true);
    const outcome=await page.evaluate(({source,heading,mutation})=>{
      const candidate=institution.find(item=>item.element.id===source),node=document.getElementById(heading);
      if(mutation==='identity'){
        const replacement=node.cloneNode(false);while(node.firstChild)replacement.append(node.firstChild);node.replaceWith(replacement);
      }else if(node.querySelector('button'))node.querySelector('button').replaceChildren('프로그램 다운로드');
      else node.replaceChildren('다른 서비스 소개');
      return {sameSnapshot:IntegratedInstitution.sourceSnapshot(candidate.element,candidate.label).attributes===candidate.snapshot.attributes,current:IntegratedInstitution.isCandidateCurrent(candidate)};
    },{...context,mutation});
    expect(outcome).toEqual({sameSnapshot:true,current:false});
  }
});
