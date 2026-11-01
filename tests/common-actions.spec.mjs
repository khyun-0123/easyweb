import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// 2026-10-31 user decision: home, log in and sign up are main tasks only on the
// home page. Elsewhere they leave the six cards and stay in a separate row.
let bundle;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: "export {openEasyMode} from './src/easy-mode';", resolveDir: process.cwd(), loader: 'ts' },
    bundle: true, write: false, format: 'iife', globalName: 'CommonUi', loader: { '.css': 'text' } });
  bundle = result.outputFiles[0].text;
});

async function open(page, url, body) {
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="ko"><body>${body}</body></html>` })
    : route.abort());
  await page.goto(url);
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
    CommonUi.openEasyMode(host);
  });
}
const row = page => page.getByRole('navigation', { name: '자주 쓰는 버튼' });
const cards = page => page.locator('.card-source').filter({ hasText: /^찾은 메뉴 ·/ }).allTextContents();

const header = `<header><a href="/index.do"><img alt="예시시청" src="/logo.png"></a>
  <nav><ul><li><a href="/member/login.do">로그인</a></li><li><a href="/member/join.do">회원가입</a></li></ul></nav></header>`;
const body = `<main><h2>공지사항</h2><ul><li><a href="/notice/list.do">공지사항</a></li><li><a href="/faq.do">자주 묻는 질문</a></li>
  <li><a href="/apply/list.do">민원 신청</a></li></ul><form action="/search.do"><input type="text" aria-label="검색어 입력"><button type="submit">검색</button></form></main>`;

test('outside the home page, home, log in and sign up move to the common row', async ({ page }) => {
  await open(page, 'https://city.example/notice/list.do', header + body);
  await expect(row(page)).toBeVisible();
  const links = row(page).getByRole('link');
  await expect(links).toHaveText(['처음 화면', '로그인', '회원가입']);
  expect(await links.evaluateAll(items => items.map(item => new URL(item.href).pathname))).toEqual(['/index.do', '/member/login.do', '/member/join.do']);
  const shown = await cards(page);
  expect(shown.some(label => /로그인|회원가입/.test(label))).toBe(false);
  // The common row sits above the cards, so it is reached before them.
  expect(await page.evaluate(() => {
    const root = document.querySelector('[data-easyweb-host]').shadowRoot;
    return !!(root.querySelector('.common').compareDocumentPosition(root.querySelector('.grid')) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
});

test('on the home page, log in stays a card and only sign up is in the row', async ({ page }) => {
  await open(page, 'https://city.example/index.do', header + body);
  await expect(row(page).getByRole('link')).toHaveText(['회원가입']);
  expect(await cards(page)).toContain('찾은 메뉴 · 로그인');
});

test('the row is hidden when the page has no such controls', async ({ page }) => {
  await open(page, 'https://city.example/notice/list.do', body);
  await expect(row(page)).toBeHidden();
});

test('a home link with a dangerous script or a non-home destination is not used', async ({ page }) => {
  await open(page, 'https://city.example/notice/list.do', `<header><a href="/notice/view.do?id=3">홈</a>
    <a href="/" onclick="deleteAll()">처음으로</a></header>${body}`);
  await expect(row(page)).toBeHidden();
});

test('a changed source disables the common row like the cards', async ({ page }) => {
  await open(page, 'https://city.example/notice/list.do', header + body);
  await page.evaluate(() => document.querySelector('a[href="/member/login.do"]').remove());
  const login = row(page).getByRole('link', { name: '로그인' });
  await login.click();
  await expect(login).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('원본 페이지가 바뀌었어요. 다시 찾기를 눌러주세요.')).toBeVisible();
});

for (const path of ['/kor.do', '/', '/eng/', '/site-kor/main/main.do']) {
  test(`${path} is a home page, so log in stays a card`, async ({ page }) => {
    await open(page, `https://city.example${path}`, header + body);
    expect(await cards(page)).toContain('찾은 메뉴 · 로그인');
  });
}

for (const path of ['/notice/index.do', '/board/main.do', '/kor/notice.do', '/index.do?menu=12', '/faq.do', '/map.do']) {
  test(`${path} is not a home page`, async ({ page }) => {
    await open(page, `https://city.example${path}`, header + body);
    await expect(row(page).getByRole('link', { name: '로그인' })).toBeVisible();
  });
}

test('a home under a site prefix named after the host is a home page', async ({ page }) => {
  await open(page, 'https://www.city.example/city/index.do', header + body);
  expect(await cards(page)).toContain('찾은 메뉴 · 로그인');
});
