import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let engine;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer'; export {institutionEvidence,ADAPTER_VERSION} from './src/institution-evidence';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'InstitutionModule' });
  engine = result.outputFiles[0].text;
});
const governmentUrl = 'https://www.safekorea.go.kr/safekorea-kor/edtr/future/overview.do';
const pensionUrl = 'https://www.nps.or.kr/pnsinfo/ntpsklg/futureExplanation.do';
const universityUrl = 'https://www.smu.ac.kr/kor/life/futureManual.do';

async function inspect(page, url, html) {
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto(url);
  await page.addScriptTag({ content: engine });
  return page.evaluate(() => {
    window.sources = InstitutionModule.analyzePage();
    return sources.flatMap(source => {
      const proof = InstitutionModule.institutionEvidence(source);
      if (!proof) return [];
      const { dependencies, ...serializable } = proof;
      return [{ ...serializable, id: source.element.id, label: source.label, action: source.action,
        dependencyCount: dependencies.length }];
    });
  });
}

const educationMenu = `<main id="contents"><h2>지역 대응 교육훈련</h2><div id="lnbmenu"><ul class="ko_portal_left"><li><a id="training" href="/safekorea-kor/edtr/future/plan.do">현장 대응훈련 계획</a></li><li><a id="material" href="/safekorea-kor/cmmn/bbs/futureResources.do?board=unfamiliar">합동훈련 자료</a></li></ul></div><a id="outside" href="/safekorea-kor/edtr/future/other.do">실무교육 안내</a></main>`;
const educationPanels = `<main id="contents"><h2>현장 교육훈련</h2><div class="tab-area"><button class="tab-list" type="button" aria-expanded="true">직원교육 개요</button><div class="tab-content"><h3>교육 운영의 구성</h3></div><button id="overview" class="tab-list" type="button" aria-expanded="false">현장훈련 개요</button><div class="tab-content" hidden><h3>실습 유형</h3><p>공개 설명입니다.</p></div></div></main>`;
const pensionPanels = `<main><div class="tabWrap con-tab"><ul class="tabNav"><li><a id="lifecycle" href="#unfamiliar-benefit" onclick="return false">노후 생활의 사회보장</a></li><li><a id="pension" href="#unfamiliar-fund" onclick="return false">새로운 국민연금의 구성</a></li></ul><div class="tabContents"><div class="tabPage" id="unfamiliar-fund" hidden><h4>새로운 국민연금의 구성</h4></div><div class="tabPage" id="unfamiliar-benefit"><h4>노후 생활의 사회보장</h4></div></div></div></main>`;
const universityBoard = (titles = ['[새 브랜드] 통신 접속 일시중단 공지', '[새 브랜드] 보안 도구 설치 방법 안내']) => `<main><div class="common-board"><h5 id="board-heading">전산서비스 이용안내 게시판</h5><ul class="board-thumb-wrap">${titles.map((title, index) => `<li><dl><dt class="board-thumb-content-title"><a id="document-${index}" href="?mode=view&articleId=synthetic-${index * 17 + 53}">${title}</a></dt></dl></li>`).join('')}</ul></div></main>`;

test('교육 메뉴는 낯선 이름·경로·query에서도 로컬 읽기 근거만 분류한다', async ({ page }) => {
  const items = await inspect(page, governmentUrl, educationMenu);
  expect(items.map(item => [item.id, item.category, item.action, item.pageTask])).toEqual([
    ['training', 'help', 'navigate', 'reading'], ['material', 'help', 'navigate', 'reading'],
  ]);
  expect(items.every(item => item.adapter === 'safekorea-education' && item.version === 3)).toBe(true);
  expect(JSON.stringify(items)).not.toContain('board=');
});

test('교육 펼침 버튼과 인접 내용 패널의 읽기 관계를 보존한다', async ({ page }) => {
  const items = await inspect(page, governmentUrl, educationPanels);
  expect(items.find(item => item.id === 'overview')).toMatchObject({ category: 'help', action: 'locate', rule: 'local-overview-panels' });
});

for (const [name, html] of [
  ['이웃 지역 제목', educationMenu.replace('<h2>지역 대응 교육훈련</h2>', '').replace('</main>', '</main><section><h2>지역 대응 교육훈련</h2></section>')],
  ['펼침 상태 없는 버튼', educationPanels.replaceAll('aria-expanded="true"', '').replaceAll('aria-expanded="false"', '')],
  ['다른 패널 구조', educationPanels.replaceAll('class="tab-content"', 'class="unrelated"')],
  ['실제 폼', educationPanels.replace('<div class="tab-area">', '<form><div class="tab-area">').replace('</main>', '</form></main>')],
]) {
  test(`교육 근거는 ${name}에서 확장되지 않는다`, async ({ page }) => {
    expect(await inspect(page, governmentUrl, html)).toEqual([]);
  });
}

test('연금 fragment는 낯선 ID·역순 패널에서도 같은 지역의 고정 제목으로 연결된다', async ({ page }) => {
  const items = await inspect(page, pensionUrl, pensionPanels);
  expect(items.map(item => [item.id, item.category, item.action])).toEqual([['lifecycle', 'help', 'locate'], ['pension', 'help', 'locate']]);
  expect(items.every(item => item.rule === 'named-local-explanation-panel')).toBe(true);
});

for (const [name, mutate] of [
  ['중복 target ID', html => html + '<div id="unfamiliar-benefit"></div><div id="unfamiliar-fund"></div>'],
  ['다른 지역 패널', html => html.replace('class="tabContents"', 'class="unrelated"')],
  ['잘못된 fragment', html => html.replaceAll('href="#unfamiliar-', 'href="#missing-')],
  ['본문 제목 불일치', html => html.replace('<h4>새로운 국민연금의 구성</h4>', '<h4>다른 공개 설명</h4>').replace('<h4>노후 생활의 사회보장</h4>', '<h4>별도 설명</h4>')],
]) {
  test(`연금 설명 연결은 ${name}에서 중단된다`, async ({ page }) => {
    expect(await inspect(page, pensionUrl, mutate(pensionPanels))).toEqual([]);
  });
}

test('SMU 게시판은 공유 배지 대신 문서의 구체적인 목적을 분류한다', async ({ page }) => {
  const items = await inspect(page, universityUrl, universityBoard());
  expect(items.map(item => [item.category, item.rule, item.action])).toEqual([
    ['notice', 'incident-document', 'navigate'], ['help', 'instruction-document', 'navigate'],
  ]);
  expect(items.every(item => item.score === 70 && item.pageTask === 'reading')).toBe(true);
});

test('SMU 문서 번호·순서·배지 변경은 문서 목적을 바꾸지 않는다', async ({ page }) => {
  const items = await inspect(page, universityUrl, universityBoard([
    '새 기기 연결 설정 절차 안내', '[다른 시스템] 운영 서비스의 변경 공지',
  ]).replaceAll('articleId=', 'article_no='));
  expect(items.map(item => item.category)).toEqual(['help', 'notice']);
});

test('장문 사건 공지를 임의 길이 감점 없이 근거로 다룬다', async ({ page }) => {
  const items = await inspect(page, universityUrl, universityBoard([
    '[다른 브랜드] 정보 자원 운영 기반 교체와 연구소 연결 장치 보수에 따른 학내 네트워크 일시중단 안내',
  ]));
  expect(items).toHaveLength(1);
  expect(items[0].category).toBe('notice');
});

test('모호한 게시글·목적 충돌·실제 포털 링크는 강제 보정하지 않는다', async ({ page }) => {
  const items = await inspect(page, universityUrl, universityBoard([
    '[샘물] 서비스 안내', '[시스템] 네트워크 일시중단 및 설치 방법 안내', '통합 포털 바로가기',
  ]));
  expect(items).toEqual([]);
});

test('SMU 문서 구조·고정 게시판 문맥이 없는 제목은 분류하지 않는다', async ({ page }) => {
  expect(await inspect(page, universityUrl, universityBoard().replaceAll('class="board-thumb-content-title"', 'class="unrelated"'))).toEqual([]);
  expect(await inspect(page, universityUrl, universityBoard().replace('전산서비스 이용안내 게시판', '기관 뉴스'))).toEqual([]);
});

test('사건을 설명하는 해결·대처 지침은 사건 공지로 단정하지 않는다', async ({ page }) => {
  expect(await inspect(page, universityUrl, universityBoard([
    '시스템 장애 해결 방법', '서비스 중단 대처 매뉴얼',
  ]))).toEqual([]);
});

test('같은 지역 제목을 가진 실제 신청·예약 탭은 설명으로 보정하지 않는다', async ({ page }) => {
  expect(await inspect(page, pensionUrl, pensionPanels
    .replaceAll('새로운 국민연금의 구성', '국민연금 신청')
    .replaceAll('노후 생활의 사회보장', '노후 상담 예약'))).toEqual([]);
});

test('교육 신청 메뉴도 안내 읽기와 충돌하면 보정하지 않는다', async ({ page }) => {
  expect(await inspect(page, governmentUrl, educationMenu
    .replace('현장 대응훈련 계획', '현장교육 신청 안내')
    .replace('합동훈련 자료', '직원교육 예약 안내'))).toEqual([]);
});

test('게시판 고정 제목 노드의 동일 문구 교체도 의존 참조를 바꾼다', async ({ page }) => {
  await inspect(page, universityUrl, universityBoard());
  expect(await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'document-0');
    const before = InstitutionModule.institutionEvidence(source);
    const oldHeading = document.getElementById('board-heading');
    oldHeading.replaceWith(oldHeading.cloneNode(true));
    const after = InstitutionModule.institutionEvidence(source);
    return before.dependencies.includes(oldHeading) && !after.dependencies.includes(oldHeading)
      && after.dependencies.includes(document.getElementById('board-heading'));
  })).toBe(true);
});

for (const [name, url, html] of [
  ['위장 접미 호스트', governmentUrl.replace('safekorea.go.kr', 'safekorea.go.kr.attacker.invalid'), educationMenu],
  ['미지원 하위 도메인', pensionUrl.replace('www.nps.or.kr', 'other.nps.or.kr'), pensionPanels],
  ['SMU 다른 경로', universityUrl.replace('/kor/life/', '/kor/research/'), universityBoard()],
  ['정부 다른 기능', governmentUrl.replace('/edtr/', '/payment/'), educationMenu],
  ['연금 다른 기능', pensionUrl.replace('/ntpsklg/', '/application/'), pensionPanels],
]) {
  test(`기관 경계: ${name}`, async ({ page }) => {
    expect(await inspect(page, url, html)).toEqual([]);
  });
}

test('편집 제어·입력 값 getter·사적 문맥을 읽지 않는다', async ({ page }) => {
  const privateContent = `<input value="PRIVATE_INPUT"><textarea>PRIVATE_TEXTAREA</textarea><div contenteditable="true">PRIVATE_EDITABLE</div><div role="textbox">PRIVATE_CUSTOM</div>`;
  const html = pensionPanels.replace('<h4>새로운 국민연금의 구성</h4>', `<h4>새로운 국민연금의 구성${privateContent}</h4>`)
    + `<script>document.querySelectorAll('input,textarea,[contenteditable],[role="textbox"]').forEach(node=>{for(const key of ['value','innerText','textContent'])Object.defineProperty(node,key,{get(){throw Error('private getter read')}})});</script>`;
  const items = await inspect(page, pensionUrl, html);
  expect(items).toHaveLength(2);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});

test('사적 편집 제목은 설명 근거가 아니며 외부 aria-labelledby 제목도 빌리지 않는다', async ({ page }) => {
  const html = pensionPanels.replace('<h4>새로운 국민연금의 구성</h4>', '<div contenteditable="true"><h4>새로운 국민연금의 구성</h4></div>')
    .replace('<h4>노후 생활의 사회보장</h4>', '<h4 aria-labelledby="outside-title"></h4>')
    + '<h4 id="outside-title">노후 생활의 사회보장</h4>';
  expect(await inspect(page, pensionUrl, html)).toEqual([]);
});

test('같은 cache 인자에도 제목 변경·target 교체가 새 근거에 반영된다', async ({ page }) => {
  await inspect(page, pensionUrl, pensionPanels);
  const change = await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'pension');
    const cache = new WeakMap();
    const before = InstitutionModule.institutionEvidence(source, cache);
    const oldPanel = document.getElementById('unfamiliar-fund');
    oldPanel.replaceWith(oldPanel.cloneNode(true));
    const replacement = InstitutionModule.institutionEvidence(source, cache);
    document.getElementById('unfamiliar-fund').querySelector('h4').replaceChildren('변경된 별도 제목');
    const after = InstitutionModule.institutionEvidence(source, cache);
    return { refsChanged: replacement.dependencies.some(node => !before.dependencies.includes(node)),
      stillHasEvidence: !!replacement, rejectedChangedTitle: after === undefined };
  });
  expect(change).toEqual({ refsChanged: true, stillHasEvidence: true, rejectedChangedTitle: true });
});

test('원본 액션·href·안전 snapshot을 모듈이 변경하지 않는다', async ({ page }) => {
  await inspect(page, pensionUrl, pensionPanels);
  expect(await page.evaluate(() => sources.every(source => {
    const before = JSON.stringify({ action: source.action, href: source.href, snapshot: source.snapshot });
    InstitutionModule.institutionEvidence(source);
    return before === JSON.stringify({ action: source.action, href: source.href, snapshot: source.snapshot });
  }))).toBe(true);
});

const academicTabs = `<main class="contents-wrap"><div class="tab-outer"><div class="double-tab-wrap"><ul class="tab-ul"><li><a id="certificate" href="/kor/life/newCertificateTypes.do#unfamiliar-x">증명서발급</a></li><li class="active"><a id="selected-topic" href="/kor/life/novelCourse.do#unfamiliar-y">교육학 복수전공</a></li><li><a id="linked-topic" href="/kor/life/newCourseOptions.do#unfamiliar-z">다전공(새 연계전공)</a></li></ul></div></div><section class="content-wrap"><div class="content"><h4 id="academic-heading">교육학 복수전공</h4><h5>정의</h5><p>공개된 학위 제도 설명입니다.</p></div></section></main>`;
const libraryUrl = 'https://www.nl.go.kr/NL/contents/unknownInstruction.do';
const libraryGuides = `<main id="sub_content"><div class="content_top"><div class="content_info"><h3>연구 자료 통합검색</h3><div class="depth4-menu__slider"><div class="swiper-wrapper"><div role="group" class="on"><a id="function-guide" href="/NL/contents/unfamiliarFunctions.do" onclick="return false">색인검색 기능<span class="sr-only">선택됨</span></a></div><div role="group"><a id="result-guide" href="/NL/contents/unfamiliarResults.do" onclick="return false">정렬결과</a></div><div role="group"><a id="detail-guide" href="/NL/contents/unfamiliarDetails.do" onclick="return false">서지정보</a></div></div></div></div></div><div class="content_wrap"><div class="sub_content"><div class="link_api_cont"><h4 class="tit" id="download-title"><button type="button" class="download_btn" id="download-guide" onclick="return false">확장 검색 매뉴얼 다운로드</button></h4></div></div></div></main>`;

test('학사 탭의 선택 주제와 뒤의 실제 표제가 낯선 문서 링크의 목적을 설명한다', async ({ page }) => {
  const items = await inspect(page, universityUrl, academicTabs);
  expect(items.map(item => [item.id, item.category, item.action])).toEqual([
    ['certificate', 'academic', 'navigate'], ['selected-topic', 'academic', 'navigate'], ['linked-topic', 'academic', 'navigate'],
  ]);
  expect(items.every(item => item.rule === 'selected-topic-following-content' && item.version === 3)).toBe(true);
});

for (const [name, mutate] of [
  ['표제 불일치', html => html.replace('<h4 id="academic-heading">교육학 복수전공</h4>', '<h4 id="academic-heading">다른 전공</h4>')],
  ['선택 주제 없음', html => html.replace('class="active"', '')],
  ['여러 선택 주제', html => html.replace('<li><a id="certificate"', '<li class="active"><a id="certificate"')],
  ['다른 지역 표제', html => html.replace('<section class="content-wrap">', '<aside><h4>별도 학위 제도</h4></aside><section class="content-wrap">')],
  ['편집 표제', html => html.replace('id="academic-heading"', 'id="academic-heading" contenteditable="true"')],
]) {
  test(`학사 문서 근거: ${name}에서는 보정하지 않는다`, async ({ page }) => {
    expect(await inspect(page, universityUrl, mutate(academicTabs))).toEqual([]);
  });
}

test('실제 신청·포털·외부 SSO 링크를 학사 문서로 바꾸지 않는다', async ({ page }) => {
  const html = academicTabs.replace('증명서발급</a>', '증명서 발급하기</a>')
    .replace('<li><a id="linked-topic"', '<li><a id="portal" href="https://sso.smu.ac.kr/authorize">학사 포털</a></li><li><a id="linked-topic"');
  const items = await inspect(page, universityUrl, html);
  expect(items.find(item => item.id === 'certificate' || item.id === 'portal')).toBeUndefined();
});

test('학사 표제를 같은 문구의 새 노드로 바꾸면 근거 참조가 바뀐다', async ({ page }) => {
  await inspect(page, universityUrl, academicTabs);
  expect(await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'certificate');
    const before = InstitutionModule.institutionEvidence(source);
    const heading = document.getElementById('academic-heading');
    heading.replaceWith(heading.cloneNode(true));
    const after = InstitutionModule.institutionEvidence(source);
    return before.dependencies.includes(heading) && !after.dependencies.includes(heading)
      && after.dependencies.includes(document.getElementById('academic-heading'));
  })).toBe(true);
});

test('도서관 자체 표제의 명시적 매뉴얼 버튼과 실제 읽기 탭을 help로 연결한다', async ({ page }) => {
  const items = await inspect(page, libraryUrl, libraryGuides);
  expect(items).toHaveLength(4);
  expect(items.every(item => item.category === 'help' && item.action === 'locate')).toBe(true);
  expect(items.find(item => item.id === 'download-guide')?.rule).toBe('editorial-guide-download');
  expect(items.find(item => item.id === 'function-guide')?.label).toBe('색인검색 기능 선택됨');
});

for (const [name, mutate] of [
  ['가이드 아닌 파일', html => html.replace('확장 검색 매뉴얼 다운로드', '확장 프로그램 다운로드')],
  ['폼 안의 제출 제어', html => html.replace('<div class="link_api_cont">', '<form class="link_api_cont">').replace('</h4></div></div></div></main>', '</h4></form></div></div></main>')],
  ['편집 중인 표제', html => html.replace('id="download-title"', 'id="download-title" contenteditable="true"')],
  ['타 영역의 다운로드', html => html.replace('<main id="sub_content">', '<main>').replace('<div class="content_top">', '<div class="content_top" id="sub_content">')],
]) {
  test(`도서관 가이드 근거: ${name}는 읽기 의미를 만들지 않는다`, async ({ page }) => {
    expect(await inspect(page, libraryUrl, mutate(libraryGuides))).toEqual([]);
  });
}

test('도서관 전역 검색 입력·submit·예약 탭에는 문서 가이드 의미를 주지 않는다', async ({ page }) => {
  const html = libraryGuides.replace('</main>', '<form role="search"><input id="global-query" type="search" aria-label="자료 검색어"><button id="submit-query" type="submit">검색</button></form></main>')
    .replace('정렬결과</a>', '상담 예약</a>');
  const items = await inspect(page, libraryUrl, html);
  expect(items.map(item => item.id)).toEqual(['download-guide']);
});

test('도서관 다운로드 표제 교체·가이드 의미 변경은 읽기 탭 근거도 변경한다', async ({ page }) => {
  await inspect(page, libraryUrl, libraryGuides);
  expect(await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'function-guide');
    const before = InstitutionModule.institutionEvidence(source);
    const heading = document.getElementById('download-title');
    const newHeading = document.createElement('h4');
    newHeading.className = heading.className;
    newHeading.append(document.getElementById('download-guide'));
    heading.replaceWith(newHeading);
    const after = InstitutionModule.institutionEvidence(source);
    document.getElementById('download-guide').replaceChildren('프로그램 다운로드');
    return before.dependencies.includes(heading) && !after.dependencies.includes(heading)
      && after.dependencies.includes(newHeading) && InstitutionModule.institutionEvidence(source) === undefined;
  })).toBe(true);
});

test('새 학사·도서관 관계도 사적 값 getter와 편집 내용을 읽지 않는다', async ({ page }) => {
  const html = libraryGuides.replace('확장 검색 매뉴얼 다운로드</button>', '확장 검색 매뉴얼 다운로드<span contenteditable="true">PRIVATE_EDIT</span><input value="PRIVATE_INPUT"></button>')
    + `<script>document.querySelectorAll('input,[contenteditable]').forEach(node=>{for(const key of ['value','innerText','textContent'])Object.defineProperty(node,key,{get(){throw Error('private getter read')}})});</script>`;
  const items = await inspect(page, libraryUrl, html);
  expect(items).toHaveLength(4);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});

const unfamiliarPension = pensionPanels.replaceAll('새로운 국민연금의 구성', '보험료 납부기한').replaceAll('노후 생활의 사회보장', '기여금 산정 기준');
const copyInstructions = `<main id="sub_content"><div class="content_top"><div class="content_info"><h3>자료 복제·인쇄</h3><div class="depth4-menu__slider"><div class="swiper-wrapper"><div role="group" class="on swiper-slide-active"><a id="copy-topic" href="/NL/contents/newCopyInfo.do" onclick="return false">관내복제<span class="sr-only">선택됨</span></a></div><div role="group"><a id="print-topic" href="/NL/contents/newPrintInfo.do" onclick="return false">원격인쇄</a></div><div role="group"><a id="postal-topic" href="/NL/contents/newPostalInfo.do" onclick="return false">우편복제</a></div></div></div></div></div><div class="content_wrap"><div class="sub_content"><div class="copy_data_wrap"><div class="txt dot_list"><div class="s_tit" id="instruction-title">이용 안내</div><div class="dot_cont">공개된 자료의 복제 방법을 안내합니다.</div></div><h4 class="tit" id="refund-title">예치 잔액 환급 안내</h4><div class="txt dot_list"><p id="refund-method">- 신청 방법: 개인 메뉴의 [<a id="refund-entry" href="/NL/contents/newRefundEntry.do">복제 예치금 환급</a>] 메뉴에서 대상자가 직접 신청</p></div></div></div></div></main>`;
const safetyUrl = 'https://www.safekorea.go.kr/safekorea-kor/acts/asck/future/guide.do';
const safetyGuide = `<main id="contents"><div class="content-right" id="content_area"><h3>이웃 시설 안전점검</h3><div class="cont-area"><button id="checklist-file" type="button" class="btn-down">주변 시설 점검표 다운로드</button><h3>미리 살피는 안전점검</h3><div class="check-listarea"><ul class="check-list"><li><label><input type="radio" checked>시설 안전</label></li><li><label><input type="radio">생활 안전</label></li></ul></div><h3 id="guide-title">재난 대비 체크가이드</h3><ul class="comm-list"><li>준비 상태를 확인하는 안내입니다.</li></ul><div class="button-rightarea"><button id="guided-start" type="button" class="btn-golist" onclick="onSubmit()">시설 점검 리스트 시작</button></div></div></div></main>`;

test('v3 pension unfamiliar topic names prove unique readonly local explanations', async ({ page }) => {
  const items = await inspect(page, pensionUrl, unfamiliarPension);
  expect(items).toHaveLength(2);
  expect(items.every(item => item.category === 'help' && item.pageTask === 'reading' && item.readonlyPanel === true)).toBe(true);
});

test('v3 readonly flag is withheld for editable or interactive panel descendants', async ({ page }) => {
  const items = await inspect(page, pensionUrl, unfamiliarPension.replace('<h4>보험료 납부기한</h4>', '<h4>보험료 납부기한</h4><form><input type="text"><button>실행</button></form>'));
  expect(items.map(item => item.id)).toEqual(['lifecycle']);
  expect(items[0].readonlyPanel).toBe(true);
});

test('v3 legacy safe labels can remain guidance but never assert readonly over editors', async ({ page }) => {
  const items = await inspect(page, pensionUrl, pensionPanels.replace('<h4>새로운 국민연금의 구성</h4>', '<h4>새로운 국민연금의 구성</h4><div contenteditable="true">PRIVATE_PANEL</div>'));
  expect(items).toHaveLength(2);
  expect(items.find(item => item.id === 'pension')?.readonlyPanel).toBeUndefined();
  expect(items.find(item => item.id === 'lifecycle')?.readonlyPanel).toBe(true);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});

test('v3 service/payment commands and duplicate targets never prove readonly panels', async ({ page }) => {
  expect(await inspect(page, pensionUrl, unfamiliarPension.replaceAll('보험료 납부기한', '즉시 납부하기').replaceAll('기여금 산정 기준', '연금 신청'))).toEqual([]);
  expect(await inspect(page, pensionUrl, unfamiliarPension + '<div id="unfamiliar-benefit"></div><div id="unfamiliar-fund"></div>')).toEqual([]);
});

test('v3 copying instruction tabs work without a search heading or manual download', async ({ page }) => {
  const items = await inspect(page, libraryUrl, copyInstructions);
  expect(items.filter(item => item.category === 'help').map(item => item.id)).toEqual(['copy-topic', 'print-topic', 'postal-topic']);
  expect(items.find(item => item.id === 'copy-topic')?.label).toBe('관내복제 선택됨');
});

test('v3 refund entry is a bounded apply control and preserves ordinary navigation', async ({ page }) => {
  const items = await inspect(page, libraryUrl, copyInstructions);
  expect(items.find(item => item.id === 'refund-entry')).toMatchObject({ category: 'apply', pageTask: 'control', action: 'navigate' });
});

test('v3 refund and copy relationships require actual local instruction evidence', async ({ page }) => {
  const items = await inspect(page, libraryUrl, copyInstructions.replace('신청 방법:', '정책 해설:').replace('메뉴에서 대상자가 직접 신청', '제도에 대한 일반 설명').replace('class="on swiper-slide-active"', ''));
  expect(items).toEqual([]);
});

test('v3 copy guide does not borrow editorial titles from an input or another section', async ({ page }) => {
  const items = await inspect(page, libraryUrl, copyInstructions.replace('id="instruction-title"', 'id="instruction-title" contenteditable="true"').replace('id="refund-title"', 'id="refund-title" contenteditable="true"'));
  expect(items).toEqual([]);
});

test('v3 public safety guidance distinguishes a checklist document and guided start', async ({ page }) => {
  const items = await inspect(page, safetyUrl, safetyGuide);
  expect(items.map(item => [item.id, item.category, item.pageTask, item.action])).toEqual([
    ['checklist-file', 'help', 'reading', 'locate'], ['guided-start', 'help', 'control', 'locate'],
  ]);
});

test('v3 safety guide never reads input state or turns arbitrary start/download into guidance', async ({ page }) => {
  const html = safetyGuide + `<button id="random" type="button">시작</button><button id="file-random" type="button">다운로드</button><script>document.querySelectorAll('input').forEach(node=>{for(const key of ['value','checked','innerText','textContent'])Object.defineProperty(node,key,{get(){throw Error('private state read')}})});</script>`;
  const items = await inspect(page, safetyUrl, html);
  expect(items.map(item => item.id)).toEqual(['checklist-file', 'guided-start']);
});

test('v3 safety buttons in a form or unrelated source family abstain', async ({ page }) => {
  expect(await inspect(page, safetyUrl, safetyGuide.replace('<div class="cont-area">', '<form class="cont-area">').replace('</div></div></main>', '</form></div></main>'))).toEqual([]);
  expect(await inspect(page, safetyUrl.replace('/acts/asck/', '/account/'), safetyGuide)).toEqual([]);
});

test('v3 explanation peer and heading replacement changes dependency identity', async ({ page }) => {
  await inspect(page, pensionUrl, unfamiliarPension);
  expect(await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'pension');
    const before = InstitutionModule.institutionEvidence(source);
    const peer = document.getElementById('lifecycle');
    peer.replaceWith(peer.cloneNode(true));
    const after = InstitutionModule.institutionEvidence(source);
    return before.dependencies.includes(peer) && !after.dependencies.includes(peer)
      && after.dependencies.includes(document.getElementById('lifecycle'));
  })).toBe(true);
});

test('v3 instruction headings and refund-method changes invalidate their evidence', async ({ page }) => {
  await inspect(page, libraryUrl, copyInstructions);
  expect(await page.evaluate(() => {
    const tab = sources.find(item => item.element.id === 'print-topic');
    const refund = sources.find(item => item.element.id === 'refund-entry');
    const before = InstitutionModule.institutionEvidence(tab);
    const oldTitle = document.getElementById('instruction-title');
    oldTitle.replaceWith(oldTitle.cloneNode(true));
    const after = InstitutionModule.institutionEvidence(tab);
    document.getElementById('refund-method').firstChild.replaceWith('정책 해설: ');
    return before.dependencies.includes(oldTitle) && !after.dependencies.includes(oldTitle)
      && InstitutionModule.institutionEvidence(refund) === undefined;
  })).toBe(true);
});

for (const [label, attribute] of [['interactive role', 'role="button"'], ['focus target', 'tabindex="0"'], ['event target', 'onclick="return false"']]) {
  test(`v3 panel itself cannot claim readonly as ${label}`, async ({ page }) => {
    const items = await inspect(page, pensionUrl, unfamiliarPension.replace('id="unfamiliar-fund" hidden', `id="unfamiliar-fund" ${attribute} hidden`));
    expect(items.map(item => item.id)).toEqual(['lifecycle']);
    expect(items[0].readonlyPanel).toBe(true);
  });
}

test('v3 source peer destination structure participates in semantic currentness', async ({ page }) => {
  await inspect(page, pensionUrl, unfamiliarPension);
  expect(await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'pension');
    const before = InstitutionModule.institutionEvidence(source);
    document.getElementById('lifecycle').setAttribute('href', '#different-local-topic');
    const after = InstitutionModule.institutionEvidence(source);
    return !!after && before.fingerprint !== after.fingerprint;
  })).toBe(true);
});

test('v3 content provenance separates local explanation/operation from navigation', async ({ page }) => {
  const navigation = await inspect(page, governmentUrl, educationMenu);
  expect(navigation.every(item => item.contentScope === 'navigation')).toBe(true);
  const content = await inspect(page, libraryUrl, copyInstructions);
  expect(content).toHaveLength(4);
  expect(content.every(item => item.contentScope === 'content')).toBe(true);
});

test('v3 refund relation rejects editable method descendants without private getters', async ({ page }) => {
  const html = copyInstructions.replace('메뉴에서 대상자가 직접 신청</p>', '메뉴에서 대상자가 직접 신청<input value="PRIVATE_REFUND"><span contenteditable="true">PRIVATE_METHOD</span></p>')
    + `<script>document.querySelectorAll('input,[contenteditable]').forEach(node=>{for(const key of ['value','innerText','textContent'])Object.defineProperty(node,key,{get(){throw Error('private method read')}})});</script>`;
  const items = await inspect(page, libraryUrl, html);
  expect(items.find(item => item.id === 'refund-entry')).toBeUndefined();
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});

test('v3 guided safety heading replacement changes actual dependency identity', async ({ page }) => {
  await inspect(page, safetyUrl, safetyGuide);
  expect(await page.evaluate(() => {
    const source = sources.find(item => item.element.id === 'guided-start');
    const before = InstitutionModule.institutionEvidence(source);
    const heading = document.getElementById('guide-title');
    heading.replaceWith(heading.cloneNode(true));
    const after = InstitutionModule.institutionEvidence(source);
    document.getElementById('guide-title').replaceChildren('일반 기관 소식');
    return before.dependencies.includes(heading) && !after.dependencies.includes(heading)
      && InstitutionModule.institutionEvidence(source) === undefined;
  })).toBe(true);
});
