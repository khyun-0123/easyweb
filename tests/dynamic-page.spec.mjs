import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('http://127.0.0.1:4173'); });
const launch = page => page.addScriptTag({ path: 'dist/content.js' });

test('원본 href 변경 직후에도 낡은 URL로 이동하지 않고 재탐지한다', async ({ page }) => {
  await launch(page);
  await page.evaluate(() => {
    document.querySelector('nav a').href = '/destination?task=login-updated';
    document.querySelector('[data-easyweb-host]').shadowRoot.querySelector('.card[data-category="login"]').click();
  });
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.getByRole('dialog')).toContainText('원본 페이지가 바뀌었어요');
  await page.getByRole('button', { name: '다시 찾기' }).click();
  await expect(page.getByRole('button', { name: '다시 찾기' })).toBeFocused();
  await expect(page.locator('.card[data-category="login"]')).toHaveAttribute('href', /login-updated$/);
});

test('후보 제거·숨김·메뉴명 변경과 SPA URL 변경을 감지한다', async ({ page }) => {
  for (const change of ['removed', 'hidden', 'renamed', 'route', 'editable-parent', 'disabled-parent']) {
    await page.goto('http://127.0.0.1:4173');
    await launch(page);
    await page.evaluate(change => {
      const original = document.querySelector('nav a');
      if (change === 'removed') original.remove();
      if (change === 'hidden') original.hidden = true;
      if (change === 'renamed') original.textContent = '다른 서비스';
      if (change === 'route') history.pushState({}, '', '?route=changed');
      if (change === 'editable-parent') original.parentElement.contentEditable = 'true';
      if (change === 'disabled-parent') original.parentElement.setAttribute('aria-disabled', 'true');
    }, change);
    await expect(page.locator('.change-notice')).toBeVisible();
    await expect(page.locator('.card[data-category="login"]')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('.card[data-category="login"]')).not.toHaveAttribute('href');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  }
});

test('동일 프레임의 우클릭·드래그와 변경 감지 후에도 이전 링크 주소를 노출하지 않는다', async ({ page }) => {
  for (const type of ['contextmenu', 'dragstart']) {
    await page.goto('http://127.0.0.1:4173');
    await launch(page);
    const state = await page.evaluate(type => {
      document.querySelector('nav a').href = '/destination?task=changed';
      const card = document.querySelector('[data-easyweb-host]').shadowRoot.querySelector('.card[data-category="login"]');
      const allowed = card.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
      return { allowed, href: card.getAttribute('href'), disabled: card.getAttribute('aria-disabled') };
    }, type);
    expect(state).toEqual({ allowed: false, href: null, disabled: 'true' });
    await expect(page).toHaveURL('http://127.0.0.1:4173/');
  }
});

test('관계없는 본문 갱신은 정상 링크를 막지 않고 종료 시 감시 타이머를 정리한다', async ({ page }) => {
  await page.evaluate(() => {
    const originalSet = window.setInterval;
    const originalClear = window.clearInterval;
    window.activeIntervals = new Set();
    window.setInterval = (...args) => { const id = originalSet(...args); window.activeIntervals.add(id); return id; };
    window.clearInterval = id => { window.activeIntervals.delete(id); return originalClear(id); };
  });
  await launch(page);
  await page.evaluate(() => { document.querySelector('.hero p').textContent = '원본 페이지의 새로운 안내'; });
  await page.waitForTimeout(150);
  await expect(page.locator('.change-notice')).toBeHidden();
  await expect(page.locator('.card[data-category="notice"]')).not.toHaveAttribute('aria-disabled', 'true');
  expect(await page.evaluate(() => window.activeIntervals.size)).toBe(1);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.activeIntervals.size)).toBe(0);
});
