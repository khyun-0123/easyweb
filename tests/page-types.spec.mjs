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
