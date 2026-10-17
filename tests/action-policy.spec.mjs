import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

test('불투명한 다운로드의 고정 제목·파일명만 사용하고 안내 문서와 입력은 구분한다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent('<main><a id="title" href="/opaque?id=1" title="공개 문서 pdf 다운로드">운영 규정</a><a id="filename" href="/opaque?id=2">발급방법.pdf</a><a id="guide" href="/download-guide" title="다운로드 안내">다운로드 안내</a><a id="pdf-view" href="/public.pdf">전자책 보기</a><a id="private" href="/public-help">이용 안내<span role="textbox">PRIVATE_SENTINEL.pdf</span></a></main>');
  const bundle = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'DownloadMetadata' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const actual = await page.evaluate(() => DownloadMetadata.analyzePage().map(({element, snapshot, ...candidate}) => ({id:element.id, ...candidate})));
  for (const id of ['title', 'filename']) expect(actual.find(c => c.id === id).action).toBe('locate');
  for (const id of ['guide', 'pdf-view', 'private']) expect(actual.find(c => c.id === id).action).toBe('navigate');
  expect(JSON.stringify(actual)).not.toContain('PRIVATE_SENTINEL');
});

test('원본 링크의 이동 메타데이터와 원본 위치 안내 종류를 구분한다', async ({ page }) => {
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

test('base target 새 창 메타데이터를 안내하고 변경 시 낡은 추천을 차단', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent('<base target="_blank"><nav><a href="https://example.test/notice">공지사항</a></nav>');
  await page.addScriptTag({ path: 'dist/content.js' });
  await expect(page.locator('.card')).toHaveAttribute('href', 'https://example.test/notice');
  await expect(page.locator('.card')).toHaveAttribute('target', '_blank');
  await expect(page.getByRole('dialog')).toContainText('연결된 사이트 · example.test');
  await expect(page.getByRole('dialog')).toContainText('새 창');
  const bundle = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'TargetMetadata' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  expect(await page.evaluate(() => TargetMetadata.analyzePage().find(candidate => candidate.label === '공지사항')?.target)).toBe('_blank');
  await page.evaluate(() => document.querySelector('base').target = '_self');
  await expect(page.locator('.change-notice')).toBeVisible();
});

test('URL·fragment·다운로드·인증·프레임·대상 창의 의미를 구분한다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent(`<nav>
    <a id="query" href="/search?q=public">검색</a>
    <a id="fragment" href="#section">공지사항</a>
    <a id="absolute-fragment" href="http://127.0.0.1:4173/#section">공지사항</a>
    <a id="js" href="javascript:void(0)">로그인</a>
    <a id="inline" href="/popup" onclick="return false">검색</a>
    <a id="delegated-marker" href="/popup" aria-controls="panel">검색</a>
    <a id="spa-marker" href="/route" role="button">신청</a>
    <a id="mailto" href="mailto:public@example.test">문의</a>
    <a id="tel" href="tel:000-0000">문의</a>
    <a id="data" href="data:text/html,public">공지사항</a>
    <a id="attachment" href="/opaque?id=1" download="public.pdf">이용 안내</a>
    <a id="sso" href="https://account.example.test/oauth2/authorize">로그인</a>
    <a id="top" href="/notice" target="_TOP">공지사항</a>
    <a id="parent" href="/notice" target="_parent">공지사항</a>
    <a id="named" href="/notice" target="noticeWindow">공지사항</a>
    <a id="spaced-target" href="/notice" target="_blank ">공지사항</a>
  </nav><section id="section">공개 내용</section>`);
  const bundle = await build({ entryPoints: ['src/action-policy.ts'], bundle: true, write: false, format: 'iife', globalName: 'ActionPolicy' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const actions = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('a')].map(element => [element.id, ActionPolicy.sourceAction(element)])));
  expect(actions.query).toEqual({ action: 'navigate', href: 'http://127.0.0.1:4173/search?q=public', target: '_self' });
  expect(actions.top).toEqual({ action: 'navigate', href: 'http://127.0.0.1:4173/notice', target: '_top' });
  expect(actions.parent).toEqual({ action: 'navigate', href: 'http://127.0.0.1:4173/notice', target: '_parent' });
  for (const id of ['fragment', 'absolute-fragment', 'js', 'inline', 'delegated-marker', 'spa-marker', 'mailto', 'tel', 'data', 'attachment', 'sso', 'named', 'spaced-target']) {
    expect(actions[id], id).toEqual({ action: 'locate' });
  }
});

test('base target 이름과 명시한 빈 target을 구분하고 링크 속성의 원문을 바꾸지 않는다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent('<base target="originalWindow"><nav><a id="inherited" href="/notice">공지사항</a><a id="self" target="" href="/help">도움말</a></nav>');
  const bundle = await build({ entryPoints: ['src/action-policy.ts'], bundle: true, write: false, format: 'iife', globalName: 'ActionPolicy' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const actions = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('a')].map(element => [element.id, ActionPolicy.sourceAction(element)])));
  expect(actions.inherited).toEqual({ action: 'locate' });
  expect(actions.self).toEqual({ action: 'navigate', href: 'http://127.0.0.1:4173/help', target: '_self' });
  await expect(page.locator('#inherited')).not.toHaveAttribute('target');
  await expect(page.locator('#self')).toHaveAttribute('target', '');
});

test('명확한 다운로드 endpoint만 원본 제어 의미로 분류하고 안내 문서는 이동 의미를 보존한다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  const downloads = ['/afile/fileDownload/an9mn', '/files/downloadFile/42', '/file-download?id=42', '/download/42', '/DOWNLOAD'];
  const guides = ['/download-guide', '/docs/how-to-download', '/downloadable', '/files/fileDownloadGuide', '/docs/downloads', '/help?next=/download'];
  await page.setContent(`<nav>${[...downloads, ...guides].map((href, index) => `<a id="link-${index}" href="${href}">뷰어 이용 안내</a>`).join('')}</nav>`);
  const bundle = await build({ entryPoints: ['src/action-policy.ts'], bundle: true, write: false, format: 'iife', globalName: 'ActionPolicy' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const actions = await page.evaluate(() => [...document.querySelectorAll('a')].map(element => ActionPolicy.sourceAction(element)));
  for (let index = 0; index < downloads.length; index++) expect(actions[index], downloads[index]).toEqual({ action: 'locate' });
  for (let index = 0; index < guides.length; index++) expect(actions[downloads.length + index], guides[index]).toMatchObject({ action: 'navigate', target: '_self' });
});
