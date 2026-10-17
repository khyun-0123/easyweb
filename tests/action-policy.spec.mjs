import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

test('JS 제어·인증 시작·다운로드·이름 있는 창은 원본 안내, 일반 링크는 이동', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent(`<nav>
    <a id="normal" href="/notice">공지사항</a>
    <a id="button" role="button" href="/search">검색</a>
    <a id="popup" class="js-popup-open" href="/login">로그인</a>
    <a id="sso" href="https://example.test/sso/login.jsp">로그인</a>
    <a id="download" download href="https://example.test/file.pdf">이용 안내</a>
    <a id="installer" href="https://example.test/viewer.exe">뷰어 다운로드</a>
    <a id="named" target="loginWindow" href="/login">로그인</a>
    <a id="blank" target="_blank" href="https://example.test/notice">공지사항</a>
  </nav>`);
  const bundle = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'ActionAnalyzer' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const actions = await page.evaluate(() => Object.fromEntries(window.ActionAnalyzer.analyzePage().map(c => [c.element.id, { action: c.action, target: c.target }])));
  expect(actions.normal.action).toBe('navigate');
  for (const name of ['button', 'popup', 'sso', 'download', 'installer', 'named']) expect(actions[name].action).toBe('locate');
  expect(actions.blank.target).toBe('_blank');
});

test('base target 새 창을 보존하고 변경 시 낡은 추천을 차단', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent('<base target="_blank"><nav><a href="https://example.test/notice">공지사항</a></nav>');
  await page.addScriptTag({ path: 'dist/content.js' });
  await expect(page.locator('.card')).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('dialog')).toContainText('이동할 사이트 · example.test');
  await expect(page.getByRole('dialog')).toContainText('새 창');
  await page.evaluate(() => document.querySelector('base').target = '_self');
  await expect(page.locator('.change-notice')).toBeVisible();
});
