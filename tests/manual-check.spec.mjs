import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// The fixture and built UI are exercised headlessly. This is NOT a native
// toolbar, original-manifest, real zoom, or VoiceOver speech acceptance test.
let fixture, content;
test.beforeAll(async () => {
  [fixture, content] = await Promise.all([
    readFile(new URL('../demo/manual-check.html', import.meta.url), 'utf8'),
    readFile(new URL('../dist/content.js', import.meta.url), 'utf8'),
  ]);
});
test.beforeEach(async ({ page }) => {
  await page.route('**/manual-check.html*', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture }));
  await page.goto('http://127.0.0.1:4173/manual-check.html');
});
const open = page => page.addScriptTag({ content });
const card = (page, label) => page.locator('.card').filter({ has: page.locator('.card-source', { hasText: `찾은 메뉴 · ${label}` }) });

test('수동 확인실의 추가 메뉴에서 같은 자료 버튼을 관련 서식으로 구분하고 초기화한다', async ({ page }) => {
  await page.locator('#toggle-materials').click();
  await open(page);
  const contexts = new Set();
  for (let index = 0; index < 4; index++) {
    for (const text of await page.locator('.card-context').allTextContents()) contexts.add(text);
    const next = page.getByRole('button', { name: '다른 메뉴 보기', exact: true });
    if (!await next.isVisible()) break;
    await next.click();
  }
  expect([...contexts].sort()).toEqual(['관련 항목 · 합성 보관 서식', '관련 항목 · 합성 열람 서식']);
  await expect(page.locator('#materials-result')).toHaveAttribute('data-activation-count', '0');
  await page.keyboard.press('Escape');
  await page.locator('#reset-lab').click();
  await expect(page.locator('#context-materials')).toBeHidden();
  await expect(page.locator('#toggle-materials')).toHaveAttribute('aria-pressed', 'false');
});

test('수동 확인실의 원본 안내는 실제 버튼만 가리키며 사용자가 누르기 전에는 합성 동작도 실행하지 않는다', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await open(page);
  await card(page, '통합검색').click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason', 'ready');
  await expect(page.locator('#source-search')).toBeFocused();
  await expect(page.locator('#source-result')).toHaveAttribute('data-activation-count', '0');
  await page.getByRole('button', { name: '안내 닫기', exact: true }).click();
  await page.locator('#source-search').click();
  await expect(page.locator('#source-result')).toHaveAttribute('data-activation-count', '1');
  expect(requests).toEqual([]);
});

test('예약 변경은 열린 쉬운 화면의 실제 후보를 무효화하고 다시 찾기로 새 메뉴를 반영한다', async ({ page }) => {
  await page.clock.install();
  await page.locator('#arm-change').click();
  await open(page);
  await expect(card(page, '통합검색')).toHaveCount(1);
  await page.clock.runFor(10100);
  await expect(page.locator('#source-search')).toHaveText('자료 검색');
  await expect(page.locator('#lab-state')).toHaveAttribute('data-state', 'changed');
  await expect(card(page, '통합검색')).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled prevents assistive activation semantically; exercise the guard
  // too, including an untrusted activation, without waiting for an enabled card.
  await card(page, '통합검색').evaluate(element => element.click());
  await expect(page.locator('#source-result')).toHaveAttribute('data-activation-count', '0');
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(1);
  await page.getByRole('button', { name: '다시 찾기', exact: true }).click();
  await expect(card(page, '자료 검색')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.locator('#reset-lab').click();
  await expect(page.locator('#source-search')).toHaveText('통합검색');
  await expect(page.locator('#lab-state')).toHaveAttribute('data-state', 'idle');
});

test('예약 가림막은 쉬운 화면 뒤에서 원본의 실제 hit-test를 가리고 수동·시간 경과로 제거된다', async ({ page }) => {
  await page.clock.install();
  await page.locator('#arm-cover').click();
  await open(page);
  await page.clock.runFor(10100);
  await expect(page.locator('#lab-cover')).toBeVisible();
  await expect(card(page, '통합검색')).not.toHaveAttribute('aria-disabled', 'true');
  await card(page, '통합검색').click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason', 'covered');
  await expect(page.getByRole('alert')).toContainText('다른 창에 가려져 있어요');
  await expect(page.getByRole('button', { name: '안내 닫기', exact: true })).toBeFocused();
  await expect(page.locator('#source-result')).toHaveAttribute('data-activation-count', '0');
  await page.keyboard.press('Escape');
  await page.locator('#dismiss-cover').click();
  await expect(page.locator('#lab-cover')).toBeHidden();
  await open(page);
  await card(page, '통합검색').click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason', 'ready');
  await page.keyboard.press('Escape');
  await page.locator('#arm-cover').click();
  await page.clock.runFor(10010);
  await expect(page.locator('#lab-cover')).toBeVisible();
  await page.clock.runFor(45000);
  await expect(page.locator('#lab-cover')).toBeHidden();
  await expect(page.locator('#lab-state')).toHaveAttribute('data-state', 'idle');
});

test('합성 직접 링크와 새로고침은 같은 확인실로 이동하며 예약·횟수를 남기지 않고 UI를 다시 열 수 있다', async ({ page }) => {
  await open(page);
  await card(page, '공지사항').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/manual-check.html?view=next');
  await expect(page.locator('#page-title')).toHaveText('EasyWeb 수동 확인실 · 다음 화면');
  await open(page);
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(1);
  await open(page); // content entry toggles the existing host off, never duplicates it.
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#lab-state')).toHaveAttribute('data-state', 'idle');
  await expect(page.locator('#source-result')).toHaveAttribute('data-activation-count', '0');
  await open(page);
  await expect(card(page, '통합검색')).toHaveCount(1);
});
