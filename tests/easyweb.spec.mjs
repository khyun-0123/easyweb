import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

test.beforeEach(async ({ page }) => { await page.goto('http://127.0.0.1:4173'); });
const launch = page => page.addScriptTag({ path: 'dist/content.js' });

test('주요 기능 6개, 주요 메뉴 우선, 중복·숨김 제외', async ({ page }) => {
  await launch(page);
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('body').ariaSnapshot()).toContain('dialog');
  await expect(page.locator('[data-easyweb-host] .card')).toHaveCount(6);
  const login = page.locator('.card[data-category="login"]');
  await expect(login).toHaveAttribute('href', /task=login$/);
  await expect(page.getByRole('dialog')).not.toContainText('숨김 메뉴');
  await expect(page.getByRole('dialog')).not.toContainText('비활성');
});

test('Esc 종료 시 원본 초점·스크롤과 DOM 유지, 재주입 시 중복 방지', async ({ page }) => {
  await page.locator('#query').fill('PRIVATE_SENTINEL_QUERY');
  await page.locator('#password').fill('PRIVATE_SENTINEL_PASSWORD');
  const original = await page.locator('body').innerHTML();
  await page.locator('#demo-launch').focus();
  await page.evaluate(() => window.scrollTo(0, 160));
  const scroll = await page.evaluate(() => window.scrollY);
  await launch(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  await expect(page.locator('#demo-launch')).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  expect(await page.locator('body').innerHTML()).toBe(original);
  await expect(page.locator('#query')).toHaveValue('PRIVATE_SENTINEL_QUERY');
  await expect(page.locator('#password')).toHaveValue('PRIVATE_SENTINEL_PASSWORD');
  await launch(page);
  await launch(page);
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  await launch(page);
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('일반 링크 카드는 정확한 원본 주소로 직접 이동', async ({ page }) => {
  await launch(page);
  await page.locator('.card[data-category="notice"]').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/destination?task=notice');
  await expect(page.getByRole('heading', { name: '원본 링크 이동 확인' })).toBeVisible();
});

test('동작형 버튼은 자동 실행 없이 원본 위치를 안내', async ({ page }) => {
  // 검색창이 원래 버튼으로 열리는 경우를 고정해 순위의 입력창 우선 정책과 분리합니다.
  await page.evaluate(() => {
    document.querySelector('#query').hidden = true;
    document.querySelector('#site-search').addEventListener('click', () => { document.querySelector('#query').hidden = false; }, { capture: true });
  });
  await launch(page);
  await page.locator('.card[data-category="search"]').click();
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  await expect(page.locator('#site-search')).toBeFocused();
  await expect(page.locator('#search-state')).toBeEmpty();
  await page.keyboard.press('Enter');
  await expect(page.locator('#query')).toBeFocused();
  await expect(page.locator('#search-state')).toHaveText('원본 검색 기능을 실행했어요.');
});

test('이미 보이는 실제 검색창은 원본 검색 버튼 실행 없이 바로 초점을 안내한다', async ({ page }) => {
  await launch(page);
  await page.locator('.card[data-category="search"]').click();
  await expect(page.locator('#query')).toBeFocused();
  await expect(page.locator('#search-state')).toBeEmpty();
  await expect(page.locator('[data-easyweb-notice] [role="status"]')).toBeVisible();
});

test('다시 찾기와 원본 화면 복귀', async ({ page }) => {
  await launch(page);
  await page.evaluate(() => document.querySelector('nav a').remove());
  await page.getByRole('button', { name: '다시 찾기' }).click();
  await expect(page.locator('[data-easyweb-host]').getByRole('status')).toContainText('다시 확인했어요.');
  // 하단 링크는 점수가 낮아 주요 기능에서 제외됩니다.
  await expect(page.locator('.card[data-category="login"]')).toHaveCount(0);
  await page.getByRole('button', { name: '원본 화면 보기', exact: true }).click();
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
});

test('탐지 실패 시 기능을 지어내지 않고 원본 복귀 제공', async ({ page }) => {
  await page.setContent('<main><h1>일반 문서</h1><p>안녕하세요.</p></main>');
  await launch(page);
  await expect(page.locator('.card')).toHaveCount(0);
  await expect(page.getByText('주요 기능을 찾지 못했어요')).toBeVisible();
  await page.getByRole('button', { name: '원본 화면에서 찾아보기' }).click();
  await expect(page.getByRole('heading', { name: '일반 문서' })).toBeVisible();
});

test('분석기는 입력값을 읽지 않고 위험 동작을 추천하지 않음', async ({ page }) => {
  await page.setContent(`<header><a href="/destination?task=login" aria-label="로그인">계정</a><a href="/logout">로그아웃</a><a href="/delete">삭제 신청</a><a href="javascript:alert('unexpected')">검색</a><a href="data:text/html,evil">공지사항</a></header><input type="password" placeholder="검색"><input type="search" aria-label="검색어 입력">`);
  await page.evaluate(() => {
    for (const input of document.querySelectorAll('input')) Object.defineProperty(input, 'value', { get() { throw new Error('입력값 접근 금지'); } });
  });
  const result = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'EasyWebAnalyzer' });
  await page.addScriptTag({ content: result.outputFiles[0].text });
  const candidates = await page.evaluate(() => window.EasyWebAnalyzer.analyzePage().map(({ element, ...rest }) => ({ ...rest, type: element.getAttribute('type') })));
  expect(candidates.some(x => x.type === 'password')).toBe(false);
  await launch(page);
  await expect(page.getByRole('dialog')).not.toContainText('로그아웃');
  await expect(page.getByRole('dialog')).not.toContainText('삭제 신청');
  expect(await page.locator('.card[data-category="search"]').count()).toBeGreaterThan(0);
  await expect(page.locator('a.card[data-category="search"]')).toHaveCount(0);
  expect(await page.locator('.card[data-category="search"]').evaluateAll(items => items.every(item => item.getAttribute('type') === 'button'))).toBe(true);
  await expect(page.locator('.card[data-category="notice"]')).toHaveAttribute('type', 'button');
});

test('모달 키보드 초점이 원본 페이지로 빠져나가지 않음', async ({ page }) => {
  await launch(page);
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-easyweb-host'))).toBe(true);
  }
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-easyweb-host'))).toBe(true);
});

test('데스크톱·모바일에서 가로 스크롤이 생기지 않음', async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 980 });
    await launch(page);
    const overflow = await page.locator('dialog').evaluate(el => el.scrollWidth > el.clientWidth);
    expect(overflow).toBe(false);
    await page.keyboard.press('Escape');
  }
});
