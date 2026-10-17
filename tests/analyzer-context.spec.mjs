import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let code;
test.beforeAll(async () => {
  const bundle = await build({ stdin: { contents: "import {analyzePage} from './src/analyzer';import {classify} from './src/classifier';import {isCandidateCurrent} from './src/page-session';window.ContextEngine={analyzePage,classify,isCandidateCurrent};", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife' });
  code = bundle.outputFiles[0].text;
});
const inspect = async page => {
  await page.addScriptTag({ content: code });
  return page.evaluate(() => ContextEngine.analyzePage().map(({ element, snapshot, ...candidate }) => ({ id: element.id, ...candidate })));
};

test('가까운 제목과 상위 제목을 함께 수집하고 사용자 입력·문서 title은 읽지 않는다', async ({ page }) => {
  await page.setContent('<main><h2>Q&A <span role="TEXTBOX">PRIVATE_SENTINEL</span></h2><section><h3>외부 상담 창구</h3><button id="source">홈페이지 바로가기</button></section></main>');
  await page.evaluate(() => Object.defineProperty(document, 'title', { get() { throw Error('제목의 검색어 읽기 금지'); } }));
  const actual = await inspect(page);
  expect(actual[0].contextLabels).toEqual(['외부 상담 창구', 'Q&A']);
  expect(actual[0].pagePurpose).toBe('help');
  expect(JSON.stringify(actual)).not.toContain('PRIVATE_SENTINEL');
});

test('전역 FAQ 링크는 본문의 목적이 아니고 가까운 영역의 로컬 FAQ 목차만 근거가 된다', async ({ page }) => {
  await page.setContent('<header><nav><a href="/faq">FAQ</a></nav></header><main><button id="ordinary">바로가기</button><section><nav><a href="javascript:;">자주찾는 질문(FAQ)</a></nav><div><button id="local-question">질문 보기</button></div></section></main>');
  const actual = await inspect(page);
  expect(actual.find(x => x.id === 'ordinary').pagePurpose).toBeUndefined();
  expect(actual.find(x => x.id === 'local-question').pagePurpose).toBe('help');
});

test('href 없는 일정 항목은 학사 페이지의 표·그리드 안에서만 수집한다', async ({ page }) => {
  const fixture = title => `<main><h1>${title}</h1><table><tr><td><a id="event">중간고사</a></td><td><span role="textbox"><a id="editing">PRIVATE_SENTINEL</a></span></td></tr></table><a id="ordinary">일반 장식</a><div role="grid"><a id="grid-event">수강 변경 기간</a></div></main>`;
  await page.setContent(fixture('학사일정'));
  const academic = await inspect(page);
  expect(academic.map(x => x.id)).toEqual(['event', 'grid-event']);
  expect(academic.every(x => x.action === 'locate' && x.pagePurpose === 'academic-calendar')).toBe(true);
  await page.setContent(fixture('일반 행사'));
  expect(await inspect(page)).toEqual([]);
});

test('숨겨진 페이지 표제와 로컬 FAQ는 보이는 기능의 목적 근거로 쓰지 않는다', async ({ page }) => {
  await page.setContent('<main><h1 hidden>학사일정</h1><table><tr><td><a id="unlinked">중간고사</a></td></tr></table><section><nav aria-hidden="TRUE"><a href="/faq">FAQ</a></nav><button id="source">질문 보기</button></section></main>');
  const actual = await inspect(page);
  expect(actual.map(x => x.id)).toEqual(['source']);
  expect(actual[0].pagePurpose).toBeUndefined();
});

test('표제·목적 문맥이 바뀌면 기존 카드의 유효성이 사라진다', async ({ page }) => {
  await page.setContent('<main><h1>학사일정</h1><table><tr><td><a id="source">중간고사</a></td></tr></table></main>');
  await page.addScriptTag({ content: code });
  expect(await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; return ContextEngine.isCandidateCurrent(saved); })).toBe(true);
  await page.locator('h1').evaluate(e => { e.textContent = '일반 문서'; });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('질문 의미 표식과 전역·로컬 메뉴 구조 변화도 기존 후보에서 무효화한다', async ({ page }) => {
  await page.setContent('<section><nav><ul><li><a id="source" href="javascript:;"><abbr title="질문">Q</abbr>도움말</a></li></ul></nav></section>');
  await page.addScriptTag({ content: code });
  expect(await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; return ContextEngine.isCandidateCurrent(saved); })).toBe(true);
  await page.locator('abbr').evaluate(e => e.title = '일반 표식');
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; document.querySelector('abbr').style.display = 'none'; });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; const header = document.createElement('header'); document.body.append(header); header.append(document.querySelector('nav')); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('대문자 aria 숨김·비활성을 제외하고 공백 있는 대상 창 이름을 그대로 해석한다', async ({ page }) => {
  await page.setContent('<nav><a href="/notice" aria-hidden="TRUE">공지사항</a><div aria-disabled="TRUE"><a href="/search">검색</a></div><a id="named" href="https://account.example.test/login?code=SYNTHETIC_QUERY" target="_self ">로그인</a></nav>');
  const actual = await inspect(page);
  expect(actual.map(x => x.id)).toEqual(['named']);
  expect(actual[0].destinationHost).toBe('account.example.test');
  expect(actual[0].opensNewWindow).toBe(true);
});

test('현재 메뉴·펼침 상태·하위 메뉴 구조 변화는 추천 우선순위의 이전 근거를 무효화한다', async ({ page }) => {
  await page.setContent('<main><nav><ul><li id="group"><a id="source" href="/apply">신청 안내</a></li></ul></nav></main>');
  await page.addScriptTag({ content: code });
  for (const attribute of ['aria-current', 'aria-expanded']) {
    await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; });
    await page.locator('#source').evaluate((e, name) => e.setAttribute(name, 'true'), attribute);
    expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  }
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; document.querySelector('#group').append(document.createElement('ul')); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('중첩된 본문 목록은 앞선 한 겹 표제 문맥만 사용하고 전역 메뉴 제목은 제외한다', async ({ page }) => {
  await page.setContent('<main><header><div><h2>로그인 안내</h2></div></header><div><section><h3>새소식</h3></section></div><div><div><div><table><tbody><tr><td><a id="source" href="/article?id=1">공개 운영 변경 알림</a></td></tr></tbody></table></div></div></div><div><h2>뒤의 다른 제목</h2></div></main>');
  const actual = await inspect(page);
  expect(actual[0].contextLabels).toEqual(['새소식']);
  await page.locator('h3').evaluate(e => { e.innerHTML = '<span role="textbox">PRIVATE_SENTINEL</span>'; });
  expect((await inspect(page))[0].contextLabels).toEqual([]);
});

test('여러 질문 표식·목록 역할·문서 영역·형제 질문 변경의 이전 의미를 무효화한다', async ({ page }) => {
  await page.setContent('<main><nav><div role="listitem" id="group"><a id="menu" href="/notice">공지사항</a></div></nav><section><ul><li><button id="source"><abbr title="표식">X</abbr><abbr id="marker" title="Question">Q</abbr> 이용 절차를 알려주세요</button></li><li id="peer"><button><abbr title="질문">Q</abbr> 운영 시간을 알려주세요</button></li></ul></section><article id="article"></article></main>');
  await page.addScriptTag({ content: code });
  const save = id => page.evaluate(id => { window.saved = ContextEngine.analyzePage().find(c => c.element.id === id); }, id);
  const current = () => page.evaluate(() => ContextEngine.isCandidateCurrent(saved));
  await save('menu');
  await page.locator('#group').evaluate(e => e.append(document.createElement('ul')));
  expect(await current()).toBe(false);
  await save('source');
  await page.locator('#marker').evaluate(e => e.title = 'Decoration');
  expect(await current()).toBe(false);
  await page.locator('#marker').evaluate(e => e.title = 'Question');
  await save('source');
  await page.locator('#peer').evaluate(e => e.hidden = true);
  expect(await current()).toBe(false);
  await save('menu');
  await page.locator('#article').evaluate(e => e.append(document.querySelector('#menu')));
  expect(await current()).toBe(false);
});

test('서식 읽기의 표 행·순서 있는 절차 목록 근거가 사라지면 이전 후보를 막는다', async ({ page }) => {
  await page.setContent('<main><h1>서식자료</h1><div role="grid"><div role="row"><a id="form" href="/forms/1">내용변경신고서</a></div><div id="outside-row"></div></div><ol><li id="step"><button id="download">위임장 다운받기</button></li></ol><ul id="unordered"></ul></main>');
  await page.addScriptTag({ content: code });
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage().find(c => c.element.id === 'form'); document.querySelector('#outside-row').append(document.querySelector('#form')); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage().find(c => c.element.id === 'download'); document.querySelector('#unordered').append(document.querySelector('#step')); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('고정 제목과 검색 placeholder를 함께 판단하되 값은 읽지 않고 변경 뒤 무효화한다', async ({ page }) => {
  await page.setContent('<main><input id="source" type="text" title="지사찾기" placeholder="검색어를 입력하세요."><div id="custom" role="textbox" title="문서 찾기" placeholder="Search documents" contenteditable="true">PRIVATE_SENTINEL</div><input id="ordinary" type="text" title="전화번호"><input id="machine-name" type="text" aria-label="SEARCH_TIP"><input id="lookalike" type="text" aria-label="researcher"></main>');
  await page.evaluate(() => { Object.defineProperty(document.querySelector('#source'), 'value', { get() { throw Error('입력값 접근'); } }); });
  const actual = await inspect(page);
  expect(actual.map(c => c.id)).toEqual(['source', 'custom', 'machine-name']);
  expect(JSON.stringify(actual)).not.toContain('PRIVATE_SENTINEL');
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; document.querySelector('#source').setAttribute('placeholder', '전화번호'); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('질문·답변 목록의 제어 title과 정의 목록 의미 변경도 실행 전에 막는다', async ({ page }) => {
  await page.setContent('<main><dl><dt id="question" title="답변 보기"><a id="source" href="#" title="답변 열기">질문 이용 절차를 알려주세요.</a></dt></dl><div id="ordinary"></div></main>');
  await page.addScriptTag({ content: code });
  const save = () => page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; });
  const current = () => page.evaluate(() => ContextEngine.isCandidateCurrent(saved));
  await save();
  await page.locator('#source').evaluate(e => e.title = '일반 링크');
  expect(await current()).toBe(false);
  await save();
  await page.locator('#question').evaluate(e => e.title = '일반 항목');
  expect(await current()).toBe(false);
  await save();
  await page.locator('#ordinary').evaluate(e => e.append(document.querySelector('#question')));
  expect(await current()).toBe(false);
});

test('정보 패널 버튼이 폼 제출 제어로 연결되면 이전 카드의 의미를 무효화한다', async ({ page }) => {
  await page.setContent('<main><h1>교육 안내</h1><button id="source" aria-expanded="false">운영 개요</button><form id="target"></form></main>');
  await page.addScriptTag({ content: code });
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; document.querySelector('#source').setAttribute('form', 'target'); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; document.querySelector('#target').id = 'renamed'; });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('다른 의미 영역의 국소 제목은 넘어오지 않고 공통 페이지 제목은 보존한다', async ({ page }) => {
  await page.setContent('<main><h1>공공 서비스</h1><section><h2>공지사항</h2><p>최근 소식</p></section><article><h2>학사정보</h2><p>기사 내용</p></article><aside><h2>도움말</h2></aside><div role="region"><h2>예약</h2></div><section><ul><li><a id="source" href="/service/reserve">체육관 예약</a></li></ul></section></main>');
  const actual = await inspect(page);
  expect(actual[0].contextLabels).toEqual(['공공 서비스']);
  expect(actual[0].pagePurpose).toBeUndefined();
});

test('h4부터 h6과 heading 역할의 안전한 제목도 문맥으로 사용한다', async ({ page }) => {
  for (const title of ['<h4>채용공고</h4>', '<h5>채용공고</h5>', '<h6>채용공고</h6>', '<div role="heading" aria-level="4">채용공고 <span role="textbox">PRIVATE_SENTINEL</span></div>']) {
    await page.setContent(`<main><h1>기관 소식</h1><section>${title}<ul><li><a id="source" href="/post/view?id=33">기간제 근로자 모집 안내</a></li></ul></section></main>`);
    const actual = await inspect(page);
    expect(actual[0].contextLabels).toEqual(['채용공고', '기관 소식']);
    expect(JSON.stringify(actual)).not.toContain('PRIVATE_SENTINEL');
  }
});

test('낮은 표제와 heading 역할의 페이지 목적도 고정 제목으로만 확인한다', async ({ page }) => {
  for (const title of ['<h6>학사일정</h6>', '<div role="heading" aria-level="2">학사일정</div>']) {
    await page.setContent(`<main>${title}<table><tr><td><a id="source">중간고사</a></td></tr></table></main>`);
    const actual = await inspect(page);
    expect(actual.map(c => c.id)).toEqual(['source']);
    expect(actual[0].pagePurpose).toBe('academic-calendar');
  }
});

test('원본 제어가 다른 의미 영역으로 이동하면 이전 제목 문맥을 무효화한다', async ({ page }) => {
  await page.setContent('<main><section><h2>공지사항</h2><ul><li><a id="source" href="/service/item">안내</a></li></ul></section><section id="target"><h2>체육 시설</h2></section></main>');
  await page.addScriptTag({ content: code });
  await page.evaluate(() => { window.saved = ContextEngine.analyzePage()[0]; document.querySelector('#target').append(document.querySelector('#source')); });
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  expect((await inspect(page))[0].contextLabels).toEqual(['체육 시설']);
});

test('동료 정보 개념과 목록의 보이는 항목 수 변경은 원래 주제 후보를 무효화한다', async ({ page }) => {
  await page.setContent('<main><ul><li><a id="source" href="#home">가정</a></li><li id="peer"><a href="#tips">행동요령</a></li></ul></main>');
  await page.addScriptTag({ content: code });
  const save = () => page.evaluate(() => { window.saved = ContextEngine.classify(ContextEngine.analyzePage()).find(c => c.element.id === 'source'); });
  await save();
  await page.locator('#peer a').evaluate(e => e.textContent = '일반 개요');
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await page.locator('#peer a').evaluate(e => { e.textContent = '행동요령'; e.setAttribute('href', '#tips'); });
  await save();
  await page.locator('#peer').evaluate(e => e.hidden = true);
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('목록 역할·탭 대상 존재·원본 폼 영역이 바뀌면 주제 제어의 근거를 무효화한다', async ({ page }) => {
  await page.setContent('<main><div id="list" role="list"><div role="listitem"><button id="source" aria-controls="panel">가정</button></div><div role="listitem"><button>안전수칙</button></div></div><section id="panel"></section><form id="form"></form></main>');
  await page.addScriptTag({ content: code });
  const save = () => page.evaluate(() => { window.saved = ContextEngine.classify(ContextEngine.analyzePage()).find(c => c.element.id === 'source'); });
  await save();
  await page.locator('#list').evaluate(e => e.removeAttribute('role'));
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await page.locator('#list').evaluate(e => e.setAttribute('role', 'list'));
  await save();
  await page.locator('#panel').evaluate(e => e.remove());
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
  await save();
  await page.locator('#form').evaluate(e => e.append(document.querySelector('#list')));
  expect(await page.evaluate(() => ContextEngine.isCandidateCurrent(saved))).toBe(false);
});

test('동료의 편집 텍스트는 정보 개념·목록 후보·snapshot으로 읽지 않는다', async ({ page }) => {
  await page.setContent('<main><h1>생활 정보</h1><div role="tablist"><div id="source" role="tab">가정</div><div role="tab" contenteditable="true">PRIVATE_SENTINEL 행동요령</div><div role="textbox">PRIVATE_SENTINEL 안전수칙</div></div></main>');
  const actual = await inspect(page);
  expect(actual.map(c => c.id)).toEqual(['source']);
  const snapshots = await page.evaluate(() => ContextEngine.analyzePage().map(c => c.snapshot));
  expect(JSON.stringify(snapshots)).not.toContain('PRIVATE_SENTINEL');
});
