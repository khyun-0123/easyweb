import { test, expect } from '@playwright/test';

test('같은 원본 제어를 연속 안내해도 강조와 임시 tabindex가 남지 않는다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(() => {
    const control = document.querySelector('#site-search');
    control.setAttribute('style', 'outline: 1px dotted red; outline-offset: 2px; color: blue');
    control.setAttribute('tabindex', '0');
  });
  for (let i = 0; i < 2; i++) {
    await page.addScriptTag({ path: 'dist/content.js' });
    await page.locator('.card[data-category="search"]').click();
  }
  await expect(page.locator('#site-search')).toHaveCSS('outline-color', 'rgb(255, 0, 0)', { timeout: 5000 });
  await expect(page.locator('#site-search')).toHaveCSS('outline-style', 'dotted');
  await expect(page.locator('#site-search')).toHaveCSS('outline-width', '1px');
  await expect(page.locator('#site-search')).toHaveCSS('outline-offset', '2px');
  await expect(page.locator('#site-search')).toHaveCSS('color', 'rgb(0, 0, 255)');
  await expect(page.locator('#site-search')).toHaveAttribute('tabindex', '0');
});

test('원래 없던 스타일·tabindex 속성은 반복 위치 안내 뒤 제거된다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(() => {
    const original = document.querySelector('#site-search');
    const replacement = document.createElement('div');
    replacement.id = 'site-search';
    replacement.setAttribute('role', 'button');
    replacement.setAttribute('aria-label', '통합검색 열기');
    replacement.textContent = '검색';
    original.replaceWith(replacement);
  });
  for (let i = 0; i < 2; i++) {
    await page.addScriptTag({ path: 'dist/content.js' });
    await page.locator('.card[data-category="search"]').click();
  }
  await expect(page.locator('#site-search')).not.toHaveAttribute('style', /./, { timeout: 5000 });
  await expect(page.locator('#site-search')).not.toHaveAttribute('tabindex', '-1');
  expect(await page.locator('#site-search').getAttribute('style')).toBeNull();
  expect(await page.locator('#site-search').getAttribute('tabindex')).toBeNull();
});
