import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// 2026-10-31 live review (docs/reviews/live_first6_review_20261031.md, P2):
// on a home page, individual board posts took first-screen cards although the
// same board's list link was present. The list link represents the board; the
// posts stay reachable through additional menus.
let bundle;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {rank, remainingMenus} from './src/ranker';
window.firstScreen=()=>{const classified=classify(analyzePage());const selected=rank(classified);
return {first:selected.map(c=>c.href??c.label),more:[...remainingMenus(classified,selected)].map(c=>c.href??c.label)};};`,
    resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife',
  });
  bundle = result.outputFiles[0].text;
});

const posts = [11, 12, 13, 14, 15].map(n => `<li><a href="/life/notice.do?mode=view&articleNo=${n}">[학사] 2026학년도 계절수업 운영 안내 ${n}</a></li>`).join('');
const page = (listLink) => `<!doctype html><html lang="ko"><body>
<header><nav><ul>
  <li><a href="/life/academicCalendar.do">학사안내</a></li>
  <li><button type="button">수강신청</button></li>
  <li><a href="/login.do">로그인</a></li>
</ul></nav></header>
<main>
  <form action="/search.do"><input type="search" aria-label="통합검색"><button>검색</button></form>
  <section><h2>통합공지</h2><ul>${posts}</ul>${listLink}</section>
</main></body></html>`;

async function open(browserPage, url, html) {
  await browserPage.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }) : route.abort());
  await browserPage.goto(url);
  await browserPage.addScriptTag({ content: bundle });
  return browserPage.evaluate(() => window.firstScreen());
}

test('home page shows the board list link instead of individual posts', async ({ page: browserPage }) => {
  const result = await open(browserPage, 'https://univ.example/index.do', page('<a href="/life/notice.do">통합공지 더보기</a>'));
  expect(result.first).toContain('https://univ.example/life/notice.do');
  expect(result.first.filter(href => String(href).includes('articleNo'))).toEqual([]);
  expect(result.more.filter(href => String(href).includes('articleNo')).length).toBeGreaterThan(0);
});

test('without a separate list link, posts keep the existing reading policy', async ({ page: browserPage }) => {
  const result = await open(browserPage, 'https://univ.example/index.do', page(''));
  expect(result.first.some(href => String(href).includes('articleNo'))).toBe(true);
});

test('on the board page itself, a link back to the same list does not displace posts', async ({ page: browserPage }) => {
  // Whether a board page should show posts or its filters is an open product
  // decision (docs/07_todo.md). Keep the current behaviour until it is made.
  const result = await open(browserPage, 'https://univ.example/life/notice.do', page('<a href="/life/notice.do">통합공지 더보기</a>'));
  expect(result.first.some(href => String(href).includes('articleNo'))).toBe(true);
});
