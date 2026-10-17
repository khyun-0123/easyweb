import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
let engine;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer'; export {classify} from './src/classifier'; export {isCandidateCurrent,areCandidatesCurrent} from './src/page-session';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'StructuralEngine' });
  engine = result.outputFiles[0].text;
});
async function inspect(page, html) {
  await page.route('https://structure.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto('https://structure.test/opaque');
  await page.addScriptTag({ content: engine });
  return page.evaluate(() => {
    window.items = StructuralEngine.classify(StructuralEngine.analyzePage());
    return items.map(({ element, ...item }) => ({ ...item, id: element.id }));
  });
}
test('중첩 카드의 고정 제목을 날짜·장소·상태와 분리하고 원본 이름과 액션은 보존한다', async ({ page }) => {
  const items = await inspect(page, `<main><div><a id="booking" href="/service/81"><div><strong>예약 문화 공방 프로그램</strong></div><div><span>운영기간 2030년 4월 1일부터 12월 31일까지</span><span>장소 시민문화실 별관 2층</span><span>운영중</span></div></a></div><div><a id="estimate" href="#" onclick="return false"><div><h3>기초생활 간단계산</h3></div><div><span>대상에 맞는 예상 범위를 확인합니다.</span></div></a></div></main>`);
  expect(items.filter(i => ['booking','estimate'].includes(i.id)).map(i => [i.id,i.category,i.action])).toEqual([['booking','apply','navigate'],['estimate','search','locate']]);
  expect(items.find(i => i.id === 'booking').label).toContain('시민문화실');
});
test('단일 제어 카드의 형제 제목을 일반 상세보기와 연결한다', async ({ page }) => {
  const items = await inspect(page, `<main><div><div><strong id="card-title">시설 이용 기록 조회</strong><p>본인이 이용한 시설의 기록을 확인합니다.</p></div><div><a id="details" href="/service/82">상세보기</a></div></div></main>`);
  expect(items.find(i => i.id === 'details')).toMatchObject({ label:'상세보기', relatedLabel:'시설 이용 기록 조회', category:'apply', action:'navigate' });
});
test('일반 div 안의 펼침 단계 버튼도 명시된 사용 설명서 안에서는 읽기 주제다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>장비 사용 설명서</h2><div><button id="ready" type="button" aria-expanded="false">준비 단계</button><button id="during" type="button" aria-expanded="false">가동 중</button><button id="after" type="button" aria-expanded="false">종료 이후</button></div><a id="other" href="/opaque/92">기관 소개</a></main>`);
  expect(items.filter(i => ['ready','during','after'].includes(i.id)).map(i => [i.category,i.pageTask])).toEqual([['help','reading'],['help','reading'],['help','reading']]);
  expect(items.find(i => i.id === 'other')).toBeUndefined();
});
test('안내 탭의 검색·신청 주제는 실제 실행 제어와 구별한다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>전자 자료 사용 설명서</h2><div><button id="topic-search" type="button" aria-controls="p1">검색 결과</button><button id="topic-apply" type="button" aria-controls="p2">이용 신청</button><button id="topic-detail" type="button" aria-controls="p3">상세정보</button></div><div id="p1"><h3>검색 결과 읽기</h3><p>도표와 아이콘을 설명합니다.</p></div><div id="p2" hidden><h3>이용 신청 읽기</h3></div><div id="p3" hidden><h3>상세정보 읽기</h3></div><form role="search"><input id="query" type="search" aria-label="검색어"><button id="real-search" type="submit">검색</button></form><a id="real-apply" href="/apply">이용 신청</a></main>`);
  expect(items.filter(i => i.id.startsWith('topic')).map(i => [i.category,i.pageTask,i.action])).toEqual([['help','reading','locate'],['help','reading','locate'],['help','reading','locate']]);
  expect(items.find(i => i.id === 'query')?.category).toBe('search');
  expect(items.find(i => i.id === 'real-search')?.category).toBe('search');
  expect(items.find(i => i.id === 'real-apply')?.category).toBe('apply');
});
test('뒤쪽의 같은 지역 학위 제목이 교육 개념 목록을 설명한다', async ({ page }) => {
  const items = await inspect(page, `<main><div><ul><li><a id="track" href="/curriculum/second#details">세부전공</a></li><li><a id="course" href="/curriculum/general#details">교양과정</a></li></ul><div><h4>학위 이수 제도</h4><p>교육 과정의 구성을 설명합니다.</p></div></div></main>`);
  expect(items.filter(i => ['track','course'].includes(i.id)).map(i => [i.category,i.pageTask,i.action])).toEqual([['academic','reading','navigate'],['academic','reading','navigate']]);
});
test('가이드 제목 아래 그룹 주제와 button 다운로드를 읽기로 다룬다', async ({ page }) => {
  const items = await inspect(page, `<main><section><h2>열람실 사용 가이드</h2><div><div role="group"><button id="index" type="button">색인 구성</button></div><div role="group"><button id="record" type="button">기록 항목</button></div></div><button id="guide-file" type="button">전체 가이드 다운로드</button><button id="installer" type="button">프로그램 다운로드</button></section></main>`);
  expect(items.filter(i => ['index','record','guide-file'].includes(i.id)).map(i => [i.category,i.pageTask,i.action])).toEqual([['help','reading','locate'],['help','reading','locate'],['help','reading','locate']]);
  expect(items.find(i => i.id === 'installer')).toBeUndefined();
});
test('새 구조 근거도 기사·명령·폼·다른 section의 제목·여러 제어 카드에는 적용하지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>장비 사용 설명서</h2><article><a id="article" href="/opaque/83"><div><strong>기초생활 간단계산</strong></div><div>설명</div></a></article><a id="news" href="/news/83"><div><strong>상담 예약 프로그램</strong></div><div>설명</div></a><a id="danger" href="/opaque?cmd=delete"><div><strong>기초생활 간단계산</strong></div><div>설명</div></a><div><button id="script" type="button" onclick="openPayment()" aria-controls="unsafe">준비 단계</button><button type="button" aria-controls="unsafe">가동 중</button></div><div id="unsafe"><h3>장비 사용 설명서</h3></div><form><button id="submit" type="submit" aria-expanded="false">준비 단계</button><button type="button" aria-expanded="false">가동 중</button></form><div><div><a id="unrelated" href="/opaque/84">세부전공</a><a href="/opaque/85">교양과정</a></div><section><h4>학위 이수 제도</h4></section></div><div><strong>기초생활 간단계산</strong><a id="ambiguous" href="/opaque/86">상세보기</a><a href="/opaque/87">별도 항목</a></div></main>`);
  expect(items.filter(i => ['article','news','danger','script','submit','unrelated','ambiguous'].includes(i.id))).toEqual([]);
});
test('고정 문맥은 사용자 입력 하위 트리를 읽지 않으며 실제 값 getter를 호출하지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><div><a id="private" href="/opaque/88"><div><strong contenteditable="true">PRIVATE_TITLE</strong></div><div>기초생활 간단계산</div></a></div><div><div role="textbox" contenteditable="true"><h4>PRIVATE_HEADING 학위 이수 제도</h4></div><ul><li><a id="private-tab" href="/opaque/89">세부전공</a></li><li><a href="/opaque/90">교양과정</a></li></ul></div><section><h2>열람실 사용 가이드</h2><div><div role="group"><button id="safe" type="button" aria-controls="private-panel">색인 구성</button></div><div role="group"><button type="button">기록 항목</button></div></div><div id="private-panel"><div contenteditable="true"><h3>PRIVATE_PANEL</h3></div><input value="PRIVATE_INPUT"></div></section><script>document.querySelectorAll('input,textarea,select').forEach(e=>Object.defineProperty(e,'value',{get(){throw Error('value read')}}));</script></main>`);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
  expect(items.find(i => i.id === 'private')).toBeUndefined();
  expect(items.find(i => i.id === 'private-tab')).toBeUndefined();
  expect(items.find(i => i.id === 'safe')?.category).toBe('help');
});
test('연결된 바깥 제목 또는 제어 패널 관계가 바뀌면 원본 이름이 같아도 낡은 후보를 거절한다', async ({ page }) => {
  await inspect(page, `<main><div><div><strong id="title">시설 이용 기록 조회</strong><p>기록을 확인합니다.</p></div><div><a id="details" href="/service/82">상세보기</a></div></div><section><h2>전자 자료 사용 설명서</h2><div><button id="topic" type="button" aria-controls="panel">검색 결과</button><button id="peer" type="button" aria-controls="peer-panel">색인 구성</button></div><div id="panel"><h3>검색 결과 읽기</h3></div><div id="peer-panel"><h3>색인 구성 읽기</h3></div></section></main>`);
  expect(await page.evaluate(() => StructuralEngine.areCandidatesCurrent(items))).toBe(true);
  expect(await page.evaluate(() => { document.querySelector('#title').textContent='시설 홍보'; return StructuralEngine.isCandidateCurrent(items.find(i => i.element.id==='details')); })).toBe(false);
  expect(await page.evaluate(() => { document.querySelector('#panel').remove(); return StructuralEngine.isCandidateCurrent(items.find(i => i.element.id==='topic')); })).toBe(false);
});

test('패널 관계는 body·상호작용 제어와 내부 기사·폼·다른 지역의 제목을 빌리지 않는다', async ({ page }) => {
  const items = await inspect(page, `<body id="whole-page"><main><div><button id="body-target" type="button" aria-controls="whole-page" aria-expanded="false">구성 항목</button><button type="button" aria-controls="whole-page" aria-expanded="false">일반 설명</button></div><div><button id="article-heading" type="button" aria-controls="wrapped-article">세부전공</button><button type="button" aria-controls="wrapped-article">교양과정</button></div><div id="wrapped-article"><article><h3>학위 이수 제도</h3></article><form><h3>전자 자료 사용 설명서</h3></form></div><div><ul><li><a id="region-heading" href="/opaque/91">세부전공</a></li><li><a href="/opaque/92">교양과정</a></li></ul><div><section><h4>학위 이수 제도</h4></section></div></div><div><button id="interactive-target" type="button" aria-controls="other-control" aria-expanded="false">구성 항목</button><button type="button" aria-controls="other-control" aria-expanded="false">일반 설명</button></div><button id="other-control" type="button"><span role="heading">열람실 사용 가이드</span></button></main><article><h3>전자 자료 사용 설명서</h3></article></body>`);
  expect(items.filter(i => ['body-target','article-heading','region-heading','interactive-target'].includes(i.id))).toEqual([]);
});

test('같은 상세보기 두 개는 각자의 제목을 보존하고 authored 이름·숨은 제목을 대신하지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><div><div><strong>시설 이용 기록 조회</strong></div><div><a id="first" href="/opaque/93">상세보기</a></div></div><div><div><strong>상담 예약</strong></div><div><a id="second" href="/opaque/94">상세보기</a></div></div><div><strong hidden>기초생활 간단계산</strong><a id="hidden-title" href="/opaque/95">상세보기</a></div><a id="authored" aria-label="자유 자료" href="/opaque/96"><div><strong>기초생활 간단계산</strong></div><div>고정 설명</div></a></main>`);
  expect(items.filter(i => ['first','second'].includes(i.id)).map(i => [i.label,i.relatedLabel,i.category])).toEqual([['상세보기','시설 이용 기록 조회','apply'],['상세보기','상담 예약','apply']]);
  expect(items.find(i => i.id === 'hidden-title')).toBeUndefined();
  expect(items.find(i => i.id === 'authored')).toBeUndefined();
});

for (const [name, wrapper] of [
  ['aside', '<aside>CONTROL</aside>'],
  ['complementary', '<div role="complementary">CONTROL</div>'],
  ['form-role', '<div role="form">CONTROL</div>'],
  ['document-body', 'CONTROL'],
]) {
  test(`상세보기 카드 제목은 ${name} 경계 밖에서 빌리지 않는다`, async ({ page }) => {
    const control = '<div><a id="separate-detail" href="/opaque/93">상세보기</a></div>';
    const html = '<strong>시설 이용 기록 조회</strong>' + wrapper.replace('CONTROL', control);
    const items = await inspect(page, name === 'document-body' ? html : `<main><div>${html}</div></main>`);
    expect(items.find(item => item.id === 'separate-detail')).toBeUndefined();
  });
}

test('발급 준비 안내의 재발급 제어는 같은 그룹의 사진 규격 읽기와 구분한다', async ({ page }) => {
  const items = await inspect(page, `<main><section><h2>수료증 발급 안내</h2><div><div role="group"><a id="issue-preparation" href="/service/11" onclick="return false">수료증 재발급 안내 바로가기</a></div><div role="group"><a id="photo-reading" href="/service/12" onclick="return false">사진 크기 기준</a></div></div></section></main>`);
  expect(items.find(i => i.id === 'issue-preparation')).toMatchObject({ category:'apply', action:'locate' });
  expect(items.find(i => i.id === 'photo-reading')).toMatchObject({ category:'help', pageTask:'reading', action:'locate' });
});

test('명시적 절차 아래 재발급 준비와 실제 검색 안내 탭의 읽기 목적을 보존한다', async ({ page }) => {
  const items = await inspect(page, `<main><section><h2>입장권 발급 절차</h2><div><div role="group"><a id="ticket-preparation" href="/service/13">입장권 재발급 방법</a></div><div role="group"><a href="/service/14" onclick="return false">인쇄 품질 기준</a></div></div></section><section><h2>자료 검색 사용 설명서</h2><div><button id="search-topic" type="button" aria-controls="search-panel">검색 결과</button><button type="button" aria-controls="detail-panel">상세정보</button></div><div id="search-panel"><h3>검색 결과 읽기</h3></div><div id="detail-panel"><h3>상세정보 읽기</h3></div></section></main>`);
  expect(items.find(i => i.id === 'ticket-preparation')).toMatchObject({ category:'apply', action:'navigate' });
  expect(items.find(i => i.id === 'search-topic')).toMatchObject({ category:'help', pageTask:'reading', action:'locate' });
});

test('발급 준비의 우선순위도 위험 URL·스크립트·기사·입력 내용의 예외가 아니다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>수료증 발급 안내</h2><div><div role="group"><a id="unsafe-issue" href="/service?cmd=delete">수료증 재발급 안내</a></div><div role="group"><a id="script-issue" href="javascript:openPayment()">수료증 재발급 방법</a></div><div role="group"><a id="news-issue" href="/news/51">수료증 재발급 안내</a></div><div role="group"><a id="editable-issue" href="/service/18"><span contenteditable="true">PRIVATE_ISSUE 수료증 재발급 안내</span></a></div></div></main>`);
  expect(items.filter(i => ['unsafe-issue','script-issue','news-issue','editable-issue'].includes(i.id))).toEqual([]);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_ISSUE');
});

test('학사일정 페이지의 calendar/list view는 일반 안내 그룹보다 구체적인 학사 보기 제어다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>학사일정</h2><section><h3>교육과정 안내</h3><div><div role="group"><button id="calendar-mode" type="button">calendar view</button></div><div role="group"><button id="list-mode" type="button">list view</button></div></div></section></main>`);
  expect(items.filter(i => ['calendar-mode','list-mode'].includes(i.id)).map(i => [i.category,i.pageTask,i.action])).toEqual([['academic','control','locate'],['academic','control','locate']]);
});

test('교육과정의 개념 탭은 학사 읽기이며 명시적 FAQ 목적은 도움말 읽기로 구분한다', async ({ page }) => {
  const tabs = `<section><h3>교육과정 안내</h3><div role="tablist"><button id="concept-track" type="button" role="tab" aria-controls="track-panel">세부전공</button><button id="concept-course" type="button" role="tab" aria-controls="course-panel">교양과정</button></div><div id="track-panel"><h4>학위 이수 구성</h4></div><div id="course-panel"><h4>교양과정 구성</h4></div></section>`;
  const academic = await inspect(page, `<main>${tabs}</main>`);
  expect(academic.filter(i => i.id.startsWith('concept')).map(i => [i.category,i.pageTask])).toEqual([['academic','reading'],['academic','reading']]);
  const faq = await inspect(page, `<main><h2>자주 묻는 질문</h2>${tabs}</main>`);
  expect(faq.filter(i => i.id.startsWith('concept')).map(i => [i.category,i.pageTask])).toEqual([['help','reading'],['help','reading']]);
});

test('원본 위치 안내 링크도 명시적 HTTP 위험 명령을 일반 발급 문구로 되살리지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>수료증 발급 안내</h2><a id="located-delete" href="/service?cmd=delete" onclick="return false">수료증 재발급 방법</a><a id="located-payment" href="/payment" onclick="return false">수료증 재발급 안내</a><a id="safe-located" href="/service/21" onclick="return false">수료증 재발급 방법</a></main>`);
  expect(items.filter(i => ['located-delete','located-payment'].includes(i.id))).toEqual([]);
  expect(items.find(i => i.id === 'safe-located')).toMatchObject({ category:'apply', action:'locate' });
});
