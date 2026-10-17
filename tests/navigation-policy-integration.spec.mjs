import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let bundle;
test.beforeAll(async()=>{const root=process.env.EASYWEB_TEST_ENGINE_ROOT??'./src';bundle=(await build({stdin:{contents:`export {analyzePage} from '${root}/analyzer';export {classify} from '${root}/classifier';export {isCandidateCurrent} from '${root}/page-session';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'NavigationPolicyReview',loader:{'.css':'text'}})).outputFiles[0].text;});
async function setup(page,html){await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html; charset=utf-8',body:html}):r.abort());await page.goto('https://unknown.example/public/instructions');await page.addScriptTag({content:bundle});}
async function inspect(page){return page.evaluate(()=>{window.navigationCandidates=NavigationPolicyReview.classify(NavigationPolicyReview.analyzePage());return navigationCandidates.map(c=>({id:c.element.id,category:c.category,action:c.action}));});}
const guide='<main id="workspace"><h1>안전 행동요령</h1><section><h2>시설 안내</h2><a id="valid-guide" href="/public/hours">이용시간 안내</a></section></main>';
test('위치 경로의 Home·안내 이름은 기능 카드로 승격하지 않고 실제 안내 링크는 유지한다',async({page})=>{
  await setup(page,`<nav aria-label="현재 위치"><ol><li><a id="home" href="/">Home</a></li><li><a id="breadcrumb-guide" href="/public/guide">이용 안내</a></li></ol></nav>${guide}`);const rows=await inspect(page);
  expect(rows.some(c=>['home','breadcrumb-guide'].includes(c.id))).toBe(false);expect(rows.find(c=>c.id==='valid-guide')).toMatchObject({category:'help',action:'navigate'});
});
test('실제 landmark로 건너뛰는 링크와 같은 이름의 정보 패널을 구분한다',async({page})=>{
  await setup(page,`<ul><li><a id="skip-main" href="#workspace">주요 내용으로 바로가기</a></li><li><a href="/public/guide">이용 안내</a></li></ul>${guide}<section><h2>시설 이용 안내</h2><ul><li><a id="reading-topic" href="#topic">대피 순서</a></li><li><a href="#another-topic">복구 방법</a></li></ul><div id="topic"><h3>대피 순서</h3></div><div id="another-topic"><h3>복구 방법</h3></div></section>`);const rows=await inspect(page);
  expect(rows.some(c=>c.id==='skip-main')).toBe(false);expect(rows.find(c=>c.id==='reading-topic')).toMatchObject({category:'help',action:'locate'});
});
test('하위 메뉴 펼침에는 넓은 읽기 목적을 전파하지 않고 leaf와 명시 도움말 의미는 유지한다',async({page})=>{
  await setup(page,`${guide}<nav><ul><li><a id="branch" href="javascript:void(0)">분야별 자료</a><ul><li><a id="leaf" href="/public/forest">정원 이용 안내</a></li></ul></li><li><a id="explicit-guide" href="javascript:void(0)">이용 안내</a><ul><li><a href="/public/lab">연구실 안내</a></li></ul></li></ul></nav>`);const rows=await inspect(page);
  expect(rows.some(c=>c.id==='branch')).toBe(false);expect(rows.find(c=>c.id==='leaf')).toMatchObject({category:'help',action:'navigate'});expect(rows.find(c=>c.id==='explicit-guide')).toMatchObject({category:'help',action:'locate'});
});
test('같은 이름의 기능 링크가 위치 링크로 바뀌면 이전 후보는 stale이다',async({page})=>{
  await setup(page,guide);expect((await inspect(page)).find(c=>c.id==='valid-guide')).toBeTruthy();
  expect(await page.evaluate(()=>{const c=navigationCandidates.find(c=>c.element.id==='valid-guide');if(!NavigationPolicyReview.isCandidateCurrent(c))throw Error('baseline should be current');c.element.setAttribute('rel','home');return NavigationPolicyReview.isCandidateCurrent(c);})).toBe(false);
});
