import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let engine;
test.beforeAll(async()=>{
  const result=await build({stdin:{contents:`export {navigationUtility} from './src/navigation-utility';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'NavigationUtility'});
  engine=result.outputFiles[0].text;
});
async function setup(page,html){
  await page.route('**/*',route=>route.abort());
  await page.setContent(`<base href="http://127.0.0.1:4173/">${html}`);await page.addScriptTag({content:engine});
}
const inspect=(page,pairs)=>page.evaluate(pairs=>pairs.map(([id,label])=>NavigationUtility.navigationUtility(document.getElementById(id),label)??null),pairs);
const children='<li><a href="/public/field-guide">현장 문서</a></li><li><a href="/public/workshop-guide">작업장 안내</a></li>';

test('명시된 breadcrumb navigation과 정확한 구조 표식은 위치 경로다',async({page})=>{
  await setup(page,`<nav aria-label="Breadcrumb"><ol><li><a id="semantic" href="/public/start">문서 입구</a></li><li><a href="/public/handbook" aria-current="page">장비 안내</a></li></ol></nav><div role="navigation" class="breadcrumbs"><ol><li><a id="structured" href="/public/lobby">첫 화면</a></li><li><a href="/public/instructions">사용 지침</a></li></ol></div><nav aria-label="현재 위치"><ol><li><a id="korean" href="/public/archives">공개 문서함</a></li></ol></nav>`);
  expect(await inspect(page,[['semantic','문서 입구'],['structured','첫 화면'],['korean','공개 문서함']])).toEqual(['position','position','position']);
});

test('breadcrumb 유사 class·일반 navigation 목록·본문 설명 링크는 보존한다',async({page})=>{
  await setup(page,`<nav class="breadcrumbish not-breadcrumb breadcrumb-guide" aria-label="문서 안내"><ol><li><a id="guide" href="/public/manual">장비 사용안내</a></li><li><a href="/public/support">지원 안내</a></li></ol></nav><section class="breadcrumbs"><ul><li><a id="content" href="/public/policy">정책 안내</a></li><li><a href="/public/forms">신청서식</a></li></ul></section>`);
  expect(await inspect(page,[['guide','장비 사용안내'],['content','정책 안내']])).toEqual([null,null]);
});

test('rel의 정확한 home token만 위치 이동 표식으로 취급한다',async({page})=>{
  await setup(page,'<a id="home" href="/public/entry" rel="nofollow home">우리 안내 입구</a><a id="lookalike" href="/public/manual" rel="homecoming">사용 안내</a><button id="button" rel="home" type="button">문서 창구</button>');
  expect(await inspect(page,[['home','우리 안내 입구'],['lookalike','사용 안내'],['button','문서 창구']])).toEqual(['position',null,null]);
});

test('명확한 skip 이름과 유일한 실제 main·navigation target을 연결한다',async({page})=>{
  await setup(page,`<a id="english" href="#reading-zone">Jump to main content</a><a id="korean" href="#topics-zone">메뉴로 이동</a><a id="contents" href="#article-zone">주요 내용으로 바로가기</a><a id="menu" href="#services-zone">Skip to navigation</a><main id="reading-zone"><h2>공개 문서</h2></main><nav id="topics-zone"><ul>${children}</ul></nav><div id="article-zone"><div><h3>장비 이용 지침</h3></div><p>고정 설명</p></div><div id="services-zone"><ul>${children}</ul></div>`);
  expect(await inspect(page,[['english','Jump to main content'],['korean','메뉴로 이동'],['contents','주요 내용으로 바로가기'],['menu','Skip to navigation']])).toEqual(['position','position','position','position']);
});

test('없는·중복·상호작용·편집 target과 모호한 skip 이름은 위치 기능으로 단정하지 않는다',async({page})=>{
  await setup(page,`<a id="missing" href="#not-there">Skip to content</a><a id="duplicate" href="#same">본문 바로가기</a><a id="interactive" href="#action">Jump to content</a><a id="editor" href="#draft">본문 바로가기</a><a id="plain" href="#empty">Jump to content</a><a id="ambiguous" href="#page">다음 보기</a><main id="same"></main><main id="same"></main><button id="action">확인</button><div id="draft" contenteditable="true"><h2>PRIVATE_EDITOR</h2></div><div id="empty">표제가 없는 일반 문장</div><main id="page"><h2>문서</h2></main>`);
  expect(await inspect(page,[['missing','Skip to content'],['duplicate','본문 바로가기'],['interactive','Jump to content'],['editor','본문 바로가기'],['plain','Jump to content'],['ambiguous','다음 보기']])).toEqual(Array(6).fill(null));
});

test('실제 readonly fragment 설명과 일반 링크는 breadcrumb나 skip으로 바꾸지 않는다',async({page})=>{
  await setup(page,'<main><ul><li><a id="explanation" href="#explain" aria-controls="explain">요금 산정 설명</a></li><li><a id="normal" href="/public/manual">장비 사용안내</a></li></ul><section id="explain"><h2>요금 산정 설명</h2><p>고정 설명문</p></section></main>');
  expect(await inspect(page,[['explanation','요금 산정 설명'],['normal','장비 사용안내']])).toEqual([null,null]);
});

test('의미 있는 자식 메뉴가 있는 순수 JS·fragment 부모만 branch로 표시한다',async({page})=>{
  await setup(page,`<ul><li><a id="noop" href="javascript:void(0);">현장 정보</a><span aria-hidden="true"></span><ul>${children}</ul></li><li><a id="empty-hash" href="#">자료 구분</a><ol>${children}</ol></li></ul>`);
  expect(await inspect(page,[['noop','현장 정보'],['empty-hash','자료 구분']])).toEqual(['branch','branch']);
});

test('명시적인 disclosure는 같은 지역의 실제 menu/list만 가리켜야 한다',async({page})=>{
  await setup(page,`<nav><button id="sibling" type="button" aria-expanded="false">기관 목록</button><ul>${children}</ul></nav><div><button id="controlled" type="button" aria-expanded="false" aria-controls="local-menu">문서 구분</button><ul id="local-menu">${children}</ul></div><div><div id="role-button" role="button" aria-expanded="true" aria-controls="role-menu" aria-haspopup="menu">지원 문서</div><div id="role-menu" role="menu"><a role="menuitem" href="/public/contact">연락처</a></div></div>`);
  expect(await inspect(page,[['sibling','기관 목록'],['controlled','문서 구분'],['role-button','지원 문서']])).toEqual(['branch','branch','branch']);
});

test('독립 문서 목적지·leaf JS·내용 없는 submenu는 branch로 만들지 않는다',async({page})=>{
  await setup(page,`<ul><li><a id="document" href="/public/help" aria-expanded="true">공개 안내</a><ul>${children}</ul></li><li><a id="leaf" href="javascript:openGuide();">기관 지침</a></li><li><a id="not-noop" href="javascript:openGuide();">안내 진입</a><ul>${children}</ul></li><li><a id="empty" href="#">소식 분류</a><ul><li>고정 설명문</li></ul></li></ul>`);
  expect(await inspect(page,[['document','공개 안내'],['leaf','기관 지침'],['not-noop','안내 진입'],['empty','소식 분류']])).toEqual([null,null,null,null]);
});

test('FAQ 답변과 readonly 패널은 aria-expanded나 목록이 있어도 보존한다',async({page})=>{
  await setup(page,`<main><button id="answer" type="button" aria-expanded="false" aria-controls="answer-panel">사용 방법은 무엇인가요?</button><div id="answer-panel"><h2>사용 설명</h2><ul>${children}</ul></div><button id="citations" type="button" aria-expanded="false">이용 가능한가요?</button><ul>${children}</ul><button id="tab" role="tab" type="button" aria-expanded="true" aria-controls="topic">구성 안내</button><ul id="topic" role="tabpanel">${children}</ul></main>`);
  expect(await inspect(page,[['answer','사용 방법은 무엇인가요?'],['citations','이용 가능한가요?'],['tab','구성 안내']])).toEqual([null,null,null]);
});

test('form·editor·외부 form 소유 제어와 숨은 제어는 관계에서 제외한다',async({page})=>{
  await setup(page,`<form id="owner"><ul><li><a id="form-anchor" href="#">자료 구분</a><ul>${children}</ul></li></ul></form><button id="external" type="button" form="owner" aria-expanded="true" aria-controls="external-menu">문서 목록</button><ul id="external-menu">${children}</ul><div contenteditable="true"><a id="editor-source" href="#">편집 메뉴</a><ul>${children}</ul></div><ul><li><a id="hidden-source" href="javascript:;" hidden>자료 목록</a><ul>${children}</ul></li></ul>`);
  expect(await inspect(page,[['form-anchor','자료 구분'],['external','문서 목록'],['editor-source','편집 메뉴'],['hidden-source','자료 목록']])).toEqual([null,null,null,null]);
});

test('입력·checked·편집 내용의 getter를 호출하거나 결과로 내보내지 않는다',async({page})=>{
  await setup(page,`<input id="private" value="PRIVATE_VALUE"><input id="check" type="checkbox" checked><textarea>PRIVATE_TEXT</textarea><div role="textbox" id="draft">PRIVATE_EDITOR</div><ul><li><a id="menu" href="javascript:;">문서 분류</a><ul>${children}</ul></li></ul>`);
  const result=await page.evaluate(()=>{
    document.querySelectorAll('input,textarea').forEach(element=>{for(const key of ['value','checked'])Object.defineProperty(element,key,{get(){throw Error('private getter '+key);}});});
    for(const key of ['textContent','innerText'])Object.defineProperty(document.querySelector('#draft'),key,{get(){throw Error('private editor getter');}});
    return {kind:NavigationUtility.navigationUtility(document.querySelector('#menu'),'문서 분류'),privateKind:NavigationUtility.navigationUtility(document.querySelector('#draft'),'고정 편집 이름')??null};
  });
  expect(result).toEqual({kind:'branch',privateKind:null});expect(JSON.stringify(result)).not.toContain('PRIVATE_');
});

test('아래쪽 무관한 list·article heading은 직접 제어 관계를 대신하지 않는다',async({page})=>{
  await setup(page,`<ul><li><a id="unrelated-list" href="javascript:;">문서 구분</a><div><ol>${children}</ol></div></li></ul><a id="deep-heading" href="#ambiguous-target">Jump to content</a><div id="ambiguous-target"><section><article><h3>별도 자료 설명</h3></article></section></div>`);
  expect(await inspect(page,[['unrelated-list','문서 구분'],['deep-heading','Jump to content']])).toEqual([null,null]);
});
