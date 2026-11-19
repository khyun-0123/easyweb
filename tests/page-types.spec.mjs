import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// 2026-11-01 site survey (docs/reviews/site_survey_20261101.md): list, post and
// gate pages fill their first cards from the page's own structure.
let bundle;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {composeFirstScreen} from './src/page-types';
window.screen1=()=>{const raw=analyzePage();const s=composeFirstScreen(raw,classify(raw));
return {type:s.type,common:s.common.map(c=>c.kind+':'+c.candidate.label),cards:s.cards.map(c=>(c.title??c.label)+'|'+c.action),pool:s.pool.map(c=>c.title??c.label)};};`,
    resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife' });
  bundle = result.outputFiles[0].text;
});

async function open(page, url, body) {
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="ko"><body>${body}</body></html>` })
    : route.abort());
  await page.goto(url);
  await page.addScriptTag({ content: bundle });
  return page.evaluate(() => window.screen1());
}

const header = `<header><a href="/">예시시청</a><nav><ul><li><a href="/member/login.do">로그인</a></li><li><a href="/notice/list.do">공지사항</a></li><li><a href="/guide.do">이용안내</a></li></ul></nav></header>`;
const footer = `<footer><a href="/privacy.do">개인정보처리방침</a> <a href="tel:1588-0000">대표전화 1588-0000</a></footer>`;
const rows = (titles, pinned = 0) => titles.map((title, n) => `<tr><td>${n < pinned ? '공지' : 100 - n}</td><td><a href="/notice/view.do?id=${n}">${title}</a></td><td>2026-10-${10 + n}</td></tr>`).join('');
const titles = ['겨울철 한파 대비 행동요령 안내', '2026년 하반기 주민세 납기 안내', '시청 민원실 점심시간 운영 변경', '노인 일자리 참여자 추가 모집 공고', '무료 법률 상담 일정 안내 드립니다', '도서관 휴관일 변경 안내 드립니다', '버스 노선 임시 변경 안내 드립니다'];
const board = (body = rows(titles)) => `${header}<main><h2>공지사항</h2><form action="/notice/list.do"><input type="text" aria-label="검색어 입력"><button type="submit">검색</button></form>
  <table><tbody>${body}</tbody></table><a href="/notice/list.do?page=2">2</a></main>${footer}`;

test('a board list shows its search and the latest posts, and the rest stays reachable', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/list.do', board());
  expect(result.type).toBe('list');
  expect(result.cards[0]).toMatch(/^검색/);
  expect(result.cards.slice(1).map(card => card.split('|')[0])).toEqual(titles.slice(0, 5));
  expect(result.pool).toEqual(expect.arrayContaining(titles.slice(5)));
});

test('pinned notices follow the numbered posts and a repeated title appears once', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/list.do', board(rows(['시스템 점검 안내 (고정 공지)', titles[0], ...titles], 1)));
  const shown = result.cards.slice(1).map(card => card.split('|')[0]);
  expect(shown).toEqual(titles.slice(0, 5));
  expect(result.pool).toContain('시스템 점검 안내 (고정 공지)');
});

test('board badges are dropped from the card title only', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/list.do', board(rows(titles.map((title, n) => n ? title : `${title} 새글 첨부파일 있음`))));
  expect(result.cards[1]).toBe(`${titles[0]}|navigate`);
});

test('a quick menu repeated on every page and a phone list are not a board', async ({ page }) => {
  const quick = ['산재보험료 알아보기 계산기', '고용보험료 알아보기 계산기', '사업장관리번호 찾기 서비스', '사업종류 검색기 바로가기', '건강보험료 알아보기 계산기']
    .map((label, n) => `<li><a href="/calc/tool${String.fromCharCode(97 + n)}.do">${label}</a></li>`).join('');
  expect((await open(page, 'https://city.example/org/intro.do', `${header}<main><ul>${quick}</ul></main>`)).type).toBe('default');
  const phones = Array.from({ length: 6 }, (_, n) => `<li><a href="tel:02-3668-42${n}0">02-3668-42${n}0</a></li>`).join('');
  expect((await open(page, 'https://city.example/org/phone.do', `${header}<main><ul>${phones}</ul></main>`)).type).toBe('default');
});

test('the home page keeps the general rule even with a long news list', async ({ page }) => {
  expect((await open(page, 'https://city.example/index.do', board())).type).toBe('default');
});

test('a post page offers the attachment, back to list and neighbouring posts', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/view.do?id=3', `${header}<main><h2>겨울철 한파 대비 행동요령 안내</h2><p>본문</p>
    <ul class="files"><li><a href="/file/down.do?id=9" download>한파행동요령.pdf</a></li></ul>
    <ul class="neighbour"><li>이전글 <a href="/notice/view.do?id=2">시청 민원실 점심시간 운영 변경</a></li><li>다음글 <a href="/notice/view.do?id=4">노인 일자리 참여자 추가 모집 공고</a></li></ul>
    <a href="/notice/list.do">목록</a></main>${footer}`);
  expect(result.type).toBe('post');
  expect(result.cards.slice(0, 4)).toEqual(['한파행동요령.pdf|locate', '목록으로|navigate', '이전 글|navigate', '다음 글|navigate']);
  expect(result.cards.length).toBeLessThanOrEqual(6);
});

test('a post page reads 이전글/다음글 joined to the title and in a dt/dd list, and a file name with its size', async ({ page }) => {
  const joined = await open(page, 'https://city.example/notice/view.do?id=3', `${header}<main><h2>겨울철 한파 대비 행동요령 안내</h2><p>본문</p>
    <ul class="files"><li><a href="/file/1/get/abc/download.do">한파행동요령.hwpx(59KB)</a></li><li><a href="/file/2/get/def/download.do">대피소 목록.pdf [38.74 KB]</a></li></ul>
    <button type="button" onclick="goList(); return false;">목록</button>
    <ul class="prevnext"><li class="prev"><span>이전글</span><a href="/notice/view.do?id=2">시청 민원실 점심시간 운영 변경</a></li><li class="next"><span>다음글</span><a href="/notice/view.do?id=4">주택공급 현장 애로를 해소해 드립니다</a></li></ul></main>${footer}`);
  expect(joined.type).toBe('post');
  expect(joined.cards).toEqual(['한파행동요령.hwpx(59KB)|locate', '대피소 목록.pdf [38.74 KB]|locate', '목록으로|locate', '이전 글|navigate', '다음 글|navigate']);
  const terms = await open(page, 'https://city.example/notice/view.do?id=3', `${header}<main><h2>겨울철 한파 대비 행동요령 안내</h2><p>본문</p>
    <a href="/notice/list.do">목록보기</a>
    <dl class="page_mov"><dt>이전글</dt><dd><a href="/notice/view.do?id=2">브러싱스캠 대국민 행동요령 안내</a></dd><dt>다음글</dt><dd>다음글이 없습니다.</dd></dl></main>${footer}`);
  expect(terms.cards.slice(0, 2)).toEqual(['목록으로|navigate', '이전 글|navigate']);
});

test('a gate page shows each site to choose', async ({ page }) => {
  const sites = [['대표홈페이지', '/main.do'], ['개인민원', '/minwon/index.do'], ['사업장민원', 'https://edi.example/']]
    .map(([name, href]) => `<a href="${href}"><strong>${name}</strong><p>${name} 서비스를 이용하세요</p> 바로가기</a>`).join('');
  const result = await open(page, 'https://agency.example/gate.do', `<main>${sites}</main>`);
  expect(result.type).toBe('gate');
  expect(result.cards.map(card => card.split('|')[0])).toEqual(['대표홈페이지', '개인민원', '사업장민원']);
});

test('the representative phone number joins the common row and is shown, not dialled', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/list.do', board());
  expect(result.common).toContain('phone:대표전화 1588-0000');
});

test('a dangerous command in a list row is never a card', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/list.do', board(rows(titles).replace('href="/notice/view.do?id=0"', 'href="/notice/delete.do?id=0"')));
  expect(result.cards.some(card => card.startsWith(titles[0]))).toBe(false);
});

test('a list of long links without dates or page numbers is not a board', async ({ page }) => {
  const forms = titles.map((title, n) => `<li><a href="/forms/view.do?id=${n}">${title} 서식</a></li>`).join('');
  expect((await open(page, 'https://city.example/forms/list.do', `${header}<main><ul>${forms}</ul></main>`)).type).toBe('default');
});

// 2026-11-12 survey replay: narrow fixes for page tools, policy links, board
// search periods, attachment rows and carousel buttons.
test('a board search uses the keyword field, not the search period', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/list.do', `${header}<main><h2>공지사항</h2><form action="/notice/list.do"><input type="text" aria-label="검색 시작일"><input type="text" aria-label="검색 종료일"><input type="text" aria-label="검색어 입력"><button type="submit">검색</button></form>
    <table><tbody>${rows(titles)}</tbody></table><a href="/notice/list.do?page=2">2</a></main>${footer}`);
  expect(result.type).toBe('list');
  expect(result.cards[0]).toBe('검색어 입력|locate');
});

test('a board row is represented by its title, not its attachment link', async ({ page }) => {
  const body = titles.map((title, n) => `<tr><td>${100 - n}</td><td><a href="/notice/view.do?id=${n}">${title}</a></td><td><a href="/file/down.do?id=${n}">첨부파일 다운로드 ${title} 상세 자료.hwp</a></td><td>2026-10-${10 + n}</td></tr>`).join('');
  const result = await open(page, 'https://city.example/notice/list.do', board(body));
  expect(result.type).toBe('list');
  expect(result.cards.slice(1)).toEqual(titles.slice(0, 5).map(title => `${title}|navigate`));
});

test('a post page ignores a banner carousel next to 이전/다음 buttons', async ({ page }) => {
  const result = await open(page, 'https://city.example/notice/view.do?id=3', `${header}<main><div class="banner"><button type="button">이전</button> <button type="button">다음</button> <button type="button">상단배너 모두 보기</button></div>
    <h2>겨울철 한파 대비 행동요령 안내</h2><p>본문</p><a href="/notice/list.do">목록</a></main>${footer}`);
  expect(result.type).toBe('post');
  const names = result.cards.map(card => card.split('|')[0]);
  expect(names).not.toContain('이전 글');
  expect(names).not.toContain('다음 글');
});

test('page tools never become cards', async ({ page }) => {
  const tools = ['URL 복사하기', '프린트하기', '점자솔루션', '공지사항 전자점자다운로드', '서브메뉴 바로가기'];
  const result = await open(page, 'https://city.example/guide/faq.do', `${header}<main><h2>자주 묻는 질문</h2><div>${tools.map((name, n) => `<a href="/tool${n}.do">${name}</a>`).join(' ')}</div></main>`);
  for (const tool of tools) {
    expect(result.cards.map(card => card.split('|')[0])).not.toContain(tool);
    expect(result.pool).not.toContain(tool);
  }
});

test('policy links in a sitemap group give way to the group tasks', async ({ page }) => {
  const group = ['개인정보처리방침', '웹접근성안내', '법령정보', '복구진도등록', 'Q&A', '안전신문고', '생활안전지도', '재난훈련관리']
    .map((name, n) => `<li><a href="/footer/info/item${n}.do">${name}</a></li>`).join('');
  const result = await open(page, 'https://city.example/bbs/faq.do', `${header}<main><h2>자주 묻는 질문</h2><p>질문을 고르세요</p></main><div class="sitemap"><span>이용안내</span><div><ul>${group}</ul></div></div>`);
  const names = result.cards.map(card => card.split('|')[0]);
  expect(names.filter(name => /개인정보|웹접근성|법령정보/.test(name))).toEqual([]);
});

test('directions, map links and staff finders are help, but longer titles are not', async ({ page }) => {
  const result = await open(page, 'https://city.example/intro/location.do', `${header}<main><h2>청사 안내</h2>
    <a href="/intro/road.do">찾아오시는 길</a> <a href="https://map.kakao.com/?q=city">Kakao 맵으로 이동(새창열림)</a> <a href="/dept/find.do">담당자 찾기</a> <a href="/intro/floor.do">층별안내</a>
    <a href="/event/42.do">오시는 길 따라 걷는 가을 축제 참가자 모집</a></main>`);
  const all = [...result.cards.map(card => card.split('|')[0]), ...result.pool];
  for (const name of ['찾아오시는 길', 'Kakao 맵으로 이동(새창열림)', '담당자 찾기', '층별안내']) expect(all).toContain(name);
  expect(all).not.toContain('오시는 길 따라 걷는 가을 축제 참가자 모집');
});

test('a home page reads its featured service group, without the group controls', async ({ page }) => {
  const services = ['여권민원', '대형폐기물', '민원서식', '부서안내'].map((name, n) => `<li><a href="/service/${n}.do">${name}</a></li>`).join('');
  const result = await open(page, 'https://city.example/', `${header}<main><section><h2>자주 찾는 서비스</h2><ul>${services}<li><a href="/service/setting.do">설정</a></li></ul></section>
    <section><h2>시정 소식</h2><ul><li><a href="/story/1.do">여권민원 처리 기간 단축 이야기</a></li></ul></section></main>${footer}`);
  const all = [...result.cards.map(card => card.split('|')[0]), ...result.pool];
  for (const name of ['여권민원', '대형폐기물', '민원서식', '부서안내']) expect(all).toContain(name);
  expect(all).not.toContain('설정');
  expect(all).not.toContain('여권민원 처리 기간 단축 이야기');
});

test('an inner page does not promote a featured group by heading alone', async ({ page }) => {
  const services = ['여권민원', '대형폐기물'].map((name, n) => `<li><a href="/service/${n}.do">${name}</a></li>`).join('');
  const result = await open(page, 'https://city.example/intro/history.do', `${header}<main><h2>시의 역사</h2><p>본문</p><section><h2>자주 찾는 서비스</h2><ul>${services}</ul></section></main>`);
  const all = [...result.cards.map(card => card.split('|')[0]), ...result.pool];
  expect(all).not.toContain('여권민원');
});
