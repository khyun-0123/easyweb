import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
let engine;
test.beforeAll(async () => {
  const result = await build({ stdin:{ contents:`export {analyzePage} from './src/analyzer'; export {classify} from './src/classifier'; export {isCandidateCurrent} from './src/page-session';`, resolveDir:process.cwd() }, bundle:true, write:false, format:'iife', globalName:'RelationshipEngine' });
  engine = result.outputFiles[0].text;
});
async function inspect(page, html) {
  await page.route('https://relations.test/**', route => route.fulfill({ contentType:'text/html; charset=utf-8', body:html }));
  await page.goto('https://relations.test/opaque'); await page.addScriptTag({ content:engine });
  return page.evaluate(() => {
    window.items = RelationshipEngine.classify(RelationshipEngine.analyzePage());
    return items.map(({element,...item}) => ({...item,id:element.id}));
  });
}
const readingGroups = `<div><div role="group"><a id="group-topic" href="#" onclick="return false">검색 항목</a></div><div role="group"><a href="#" onclick="return false">기록 구조</a></div><div role="group"><a href="#" onclick="return false">그림 목록</a></div></div>`;
const educationList = `<ul><li><a id="education-first" href="/info/31">심화전공</a></li><li><a id="education-peer" href="/info/32">교양과정</a></li></ul>`;

test('제어 밖에 다른 업무가 없는 세 단계 div wrapper 뒤의 설명서 다운로드 제목을 읽기 근거로 연결한다', async ({page}) => {
  const items = await inspect(page, `<main><div><div><div><h3>자료 화면</h3><div>${readingGroups}</div></div></div><div><h3>전체 사용 설명서 다운로드</h3></div></div></main>`);
  expect(items.find(i=>i.id==='group-topic')).toMatchObject({category:'help',pageTask:'reading',action:'locate'});
});
test('학사 목록의 여러 고정 교육 개념과 같은 출처 일반 읽기 링크 자체로 의미를 보완한다', async ({page}) => {
  const items = await inspect(page, `<main><div><div><div>${educationList}</div></div></div><section><h4>별도 기관 소개</h4></section></main>`);
  expect(items.filter(i=>i.id.startsWith('education')).map(i=>[i.category,i.pageTask,i.action])).toEqual([['academic','reading','navigate'],['academic','reading','navigate']]);
});
test('교육 개념이 다수여도 명시된 FAQ 페이지는 도움말 주제 읽기를 우선한다', async ({page}) => {
  const items = await inspect(page, `<main><h2>자주 묻는 질문</h2>${educationList}</main>`);
  expect(items.filter(i=>i.id.startsWith('education')).map(i=>i.category)).toEqual(['help','help']);
});
test('단일 개념·동수 혼합 메뉴·외부 목적지·문서 참조·기사·전역 메뉴로 교육 목록을 만들지 않는다', async ({page}) => {
  const items = await inspect(page, `<main><ul><li><a id="single" href="/info/33">심화전공</a></li><li><a href="/info/34">기관 소개</a></li></ul><ul><li><a id="mixed" href="/info/35">심화전공</a></li><li><a href="/info/36">교양과정</a></li><li><a href="/gallery">사진 목록</a></li><li><a href="/news">보도 목록</a></li></ul><ul><li><a id="external" href="https://elsewhere.test/info/37">심화전공</a></li><li><a href="https://elsewhere.test/info/38">교양과정</a></li></ul><ul><li><a id="document" href="/info?mode=view&amp;articleNo=2">심화전공</a></li><li><a href="/info?mode=view&amp;articleNo=3">교양과정</a></li></ul><article>${educationList.replaceAll('education-','article-')}</article></main><header>${educationList.replaceAll('education-','header-')}</header>`);
  expect(items.filter(i=>['single','mixed','external','document','article-first','header-first'].includes(i.id))).toEqual([]);
});
test('wrapper의 다른 제어·semantic 형제·다른 지역의 제목·임의 프로그램 다운로드에서 읽기 근거를 빌리지 않는다', async ({page}) => {
  const cases = [
    `<div><div>${readingGroups}<button type="button">별도 작업</button></div><div><h3>전체 사용 설명서 다운로드</h3></div></div>`,
    `<div><div>${readingGroups}</div><section><h3>사용 가이드</h3></section><div><h3>전체 사용 설명서 다운로드</h3></div></div>`,
    `<div><div>${readingGroups}</div><div><section><h3>사용 가이드</h3></section></div></div>`,
    `<div><div>${readingGroups}</div><div><h3>프로그램 다운로드</h3></div></div>`,
  ];
  for (const html of cases) {
    const items = await inspect(page, `<main>${html}</main>`);
    expect(items.find(i=>i.id==='group-topic')?.category).not.toBe('help');
  }
});
test('편집 peer·검색 form·위험 명령은 교육 개념의 근거가 아니며 실제 입력을 읽지 않는다', async ({page}) => {
  const items = await inspect(page, `<main><ul><li><a id="edited" href="/info/41">심화전공</a></li><li><a href="/info/42"><span contenteditable="true">PRIVATE_PEER 교양과정</span></a></li></ul><form role="search">${educationList.replaceAll('education-','form-')}<input type="search" aria-label="검색어" value="PRIVATE_QUERY"></form><ul><li><a id="unsafe" href="/info?cmd=delete">심화전공</a></li><li><a href="/info/43">교양과정</a></li></ul><script>document.querySelectorAll('input,textarea,select').forEach(e=>Object.defineProperty(e,'value',{get(){throw Error('private value')}}));</script></main>`);
  expect(items.filter(i=>['edited','form-first','unsafe'].includes(i.id))).toEqual([]);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});
test('교육 peer 교체와 wrapper 바깥 제어 추가는 원본 이름이 같아도 연결 근거를 무효화한다', async ({page}) => {
  await inspect(page, `<main>${educationList}<div><div id="wrapper"><div>${readingGroups}</div></div><div><h3>전체 사용 설명서 다운로드</h3></div></div></main>`);
  expect(await page.evaluate(()=>RelationshipEngine.isCandidateCurrent(items.find(i=>i.element.id==='education-first')))).toBe(true);
  expect(await page.evaluate(()=>{document.querySelector('#education-peer').textContent='사진 목록';return RelationshipEngine.isCandidateCurrent(items.find(i=>i.element.id==='education-first'));})).toBe(false);
  expect(await page.evaluate(()=>RelationshipEngine.isCandidateCurrent(items.find(i=>i.element.id==='group-topic')))).toBe(true);
  expect(await page.evaluate(()=>{document.querySelector('#wrapper').append(Object.assign(document.createElement('button'),{textContent:'별도 작업'}));return RelationshipEngine.isCandidateCurrent(items.find(i=>i.element.id==='group-topic'));})).toBe(false);
});

test('편집 영역 또는 별도 semantic 영역과 섞인 지역 상자는 독립적인 교육 목차 근거로 삼지 않는다', async ({page}) => {
  for (const neighbour of ['<div contenteditable="true">PRIVATE_LOCAL</div>','<div><section><h4>무관한 운영 안내</h4></section></div>']) {
    const items = await inspect(page, `<main><div>${educationList}${neighbour}</div></main>`);
    expect(items.filter(i=>i.id.startsWith('education'))).toEqual([]);
    expect(JSON.stringify(items)).not.toContain('PRIVATE_LOCAL');
  }
});
