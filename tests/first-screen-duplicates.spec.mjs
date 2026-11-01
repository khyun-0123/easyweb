import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// 2026-10-31 live review (docs/reviews/live_first6_review_20261031.md, P3):
// one function took several first-screen cards. The first screen keeps one
// card per function; the others remain in additional menus.
let bundle;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {rank, remainingMenus} from './src/ranker';
window.firstScreen=()=>{const classified=classify(analyzePage());const selected=rank(classified);
const show=c=>c.category+':'+c.label+(c.href?'@'+new URL(c.href).pathname:'');
return {first:selected.map(show),more:[...remainingMenus(classified,selected)].map(show)};};`,
    resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife',
  });
  bundle = result.outputFiles[0].text;
});

async function open(page, url, body) {
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="ko"><body>${body}</body></html>` })
    : route.abort());
  await page.goto(url);
  await page.addScriptTag({ content: bundle });
  return page.evaluate(() => window.firstScreen());
}

const header = `<header><nav><ul><li><a href="/login.do">로그인</a></li><li><a href="/notice/list.do">공지사항</a></li></ul></nav></header>`;

test('a search field and its own submit button make one first-screen card', async ({ page }) => {
  const result = await open(page, 'https://library.example/index.do', `${header}
    <main><form action="/search.do"><input type="text" aria-label="검색어 입력"><button type="submit">검색</button></form>
    <a href="/guide.do">이용 안내</a></main>`);
  expect(result.first.filter(card => card.startsWith('search:'))).toHaveLength(1);
  expect(result.more.some(card => card.startsWith('search:'))).toBe(true);
});

test('a search field and an adjacent unowned submit button make one card', async ({ page }) => {
  const result = await open(page, 'https://safety.example/search.do', `${header}
    <main><div class="search"><input type="text" aria-label="검색어를 입력하세요"><button type="submit">검색</button></div></main>`);
  expect(result.first.filter(card => card.startsWith('search:'))).toHaveLength(1);
});

test('two links with the same name and category make one first-screen card', async ({ page }) => {
  const result = await open(page, 'https://pension.example/main.do', `${header}
    <main><a href="/office/find.do">지사찾기</a><a href="/office/map.do">지사찾기</a><a href="/faq.do">자주 묻는 질문</a></main>`);
  expect(result.first.filter(card => card.includes(':지사찾기'))).toHaveLength(1);
  expect(result.more.some(card => card.includes(':지사찾기'))).toBe(true);
});

test('a link to the page being viewed is not a first-screen card', async ({ page }) => {
  const result = await open(page, 'https://safety.example/search.do', `${header}
    <main><a href="/search.do">검색</a><a href="/guide.do">이용 안내</a></main>`);
  expect(result.first.some(card => card.endsWith('@/search.do'))).toBe(false);
});

test('different functions in one category are not merged', async ({ page }) => {
  const result = await open(page, 'https://library.example/index.do', `${header}
    <main><form action="/search.do"><input type="text" aria-label="검색어 입력"><button type="submit">검색</button></form>
    <a href="/advanced.do">고급검색</a></main>`);
  expect(result.first).toEqual(expect.arrayContaining([expect.stringMatching(/^search:고급검색/)]));
  expect(result.first.filter(card => card.startsWith('search:'))).toHaveLength(2);
});
