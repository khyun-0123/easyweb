import { test, expect, chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

let bridge;
test.beforeAll(async () => {
  const bundle = await build({ stdin: { contents: "export {locateOriginal} from './src/action-bridge'; export {analyzePage} from './src/analyzer';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'SourceBridge' });
  bridge = bundle.outputFiles[0].text;
});
const install = page => page.addScriptTag({ content: bridge });
const locate = page => page.evaluate(() => SourceBridge.locateOriginal({ element: window.originalControl ?? document.getElementById('source') }, () => { window.closedCount = (window.closedCount ?? 0) + 1; }));

test('원본 안내는 스크롤·초점만 옮기며 링크/위임/폼 이벤트를 실행하지 않는다', async ({ page }) => {
  await page.setContent(`<main style="height:2500px"><form><input id="input" value="SYNTHETIC_UNCHANGED"><a id="source" href="https://example.test/delete" style="position:absolute;top:2000px">신청</a><button type="submit">제출</button></form></main>`);
  await page.evaluate(() => {
    window.clickCount = 0; window.submitCount = 0;
    document.getElementById('source').onclick = event => { event.preventDefault(); window.clickCount++; };
    document.addEventListener('click', () => window.clickCount++);
    document.querySelector('form').addEventListener('submit', event => { event.preventDefault(); window.submitCount++; });
  });
  await install(page);
  expect(await locate(page)).toEqual({ ok: true });
  await expect(page.locator('#source')).toBeFocused();
  expect(await page.evaluate(() => ({ clickCount, submitCount, closedCount, scroll: window.scrollY, input: document.getElementById('input').value }))).toMatchObject({ clickCount: 0, submitCount: 0, closedCount: 1, input: 'SYNTHETIC_UNCHANGED' });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await page.locator('#source').click();
  expect(await page.evaluate(() => window.clickCount)).toBe(2); // 사용자의 원본 클릭에서만 속성/위임 동작 보존
});

test('제거·숨김·aria 숨김·팝업 가림·화면 밖 대상은 성공으로 알리지 않는다', async ({ page }) => {
  const cases = [
    ['removed', 'unavailable'], ['hidden', 'unavailable'], ['aria-hidden', 'unavailable'],
    ['covered', 'covered'], ['modal-covered', 'covered'], ['outside', 'outside-viewport'],
  ];
  for (const [condition, reason] of cases) {
    await page.setContent('<main><div id="source" role="button" aria-label="검색">검색</div></main>');
    await page.evaluate(condition => {
      const source = document.getElementById('source');
      window.originalControl = source;
      if (condition === 'removed') source.remove();
      if (condition === 'hidden') source.hidden = true;
      if (condition === 'aria-hidden') source.parentElement.setAttribute('aria-hidden', 'true');
      if (condition === 'outside') source.style.cssText = 'position:fixed;left:-1000px;top:0;width:100px;height:40px';
      if (condition === 'covered') {
        const cover = document.createElement('div');
        cover.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999';
        document.body.append(cover);
      }
      if (condition === 'modal-covered') {
        const dialog = document.createElement('dialog');
        dialog.textContent = '원본 사이트 팝업'; document.body.append(dialog); dialog.showModal();
      }
    }, condition);
    await install(page);
    expect(await locate(page), condition).toEqual({ ok: false, reason });
    expect(await page.evaluate(() => ({ tabindex: window.originalControl.getAttribute('tabindex'), outline: window.originalControl.style.outline })), condition).toEqual({ tabindex: null, outline: '' });
  }
});

test('초점 이동 중 사라지거나 새 팝업이 뜨면 임시 tabindex도 남기지 않는다', async ({ page }) => {
  for (const kind of ['removed', 'popup', 'focus-away']) {
    await page.setContent('<main><div id="source" role="button" aria-label="검색">검색</div><button id="other">다른 제어</button></main>');
    await page.evaluate(kind => {
      window.originalControl = document.getElementById('source');
      originalControl.addEventListener('focus', () => {
        if (kind === 'removed') originalControl.remove();
        if (kind === 'focus-away') document.getElementById('other').focus();
        if (kind === 'popup') {
          const cover = document.createElement('div'); cover.style.cssText = 'position:fixed;inset:0;background:white;z-index:99999'; document.body.append(cover);
        }
      });
    }, kind);
    await install(page);
    expect(await locate(page)).toEqual({ ok: false, reason: kind === 'removed' ? 'unavailable' : kind === 'popup' ? 'covered' : 'focus-failed' });
    expect(await page.evaluate(() => originalControl.getAttribute('tabindex'))).toBeNull();
    expect(await page.evaluate(() => originalControl.style.outline)).toBe('');
  }
});

test('실제 분석 snapshot 뒤 focus 중 문구·href가 바뀌면 이전 후보의 성공을 알리지 않는다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  for (const change of ['label', 'href']) {
    await page.setContent(change === 'label' ? '<main><div id="source" role="button" aria-label="통합검색">검색</div></main>' : '<main><a id="source" href="/notice">공지사항</a></main>');
    await install(page);
    const result = await page.evaluate(change => {
      const candidate = SourceBridge.analyzePage().find(item => item.element.id === 'source');
      window.clickCount = 0;
      candidate.element.addEventListener('click', () => window.clickCount++);
      candidate.element.addEventListener('focus', () => {
        if (change === 'label') candidate.element.setAttribute('aria-label', '다른 검색 메뉴');
        else candidate.element.setAttribute('href', '#menu');
      });
      const result = SourceBridge.locateOriginal(candidate, () => {});
      return { snapshotPresent: !!candidate.snapshot, result, tabindex: candidate.element.getAttribute('tabindex'), style: candidate.element.getAttribute('style'), clickCount };
    }, change);
    expect(result, change).toEqual({ snapshotPresent: true, result: { ok: false, reason: 'changed' }, tabindex: null, style: null, clickCount: 0 });
  }
});

test('초점 중 fragment 메뉴로 바뀌면 실패 안내 뒤 재탐지하고 실제 공개 하위 링크를 직접 선택한다', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173');
  await page.route('**/public-calendar', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<main><h1>합성 공개 학사일정</h1></main>' }));
  await page.setContent('<nav><section><a id="source" role="button" href="/public-calendar">학사정보</a><div id="submenu" hidden><a id="destination" href="/public-calendar">학사일정</a></div></section></nav>');
  await page.evaluate(() => {
    window.originalClicks = 0;
    document.getElementById('source').addEventListener('focus', event => {
      event.target.setAttribute('href', '#academic-menu');
      document.getElementById('submenu').hidden = false;
    });
    document.addEventListener('click', event => { if (event.target.closest('nav a')) window.originalClicks++; });
  });
  const bundle = await build({ stdin: { contents: "export {openEasyMode} from './src/easy-mode';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'RetryUi', loader: { '.css': 'text' } });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const open = () => page.evaluate(() => { const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host); RetryUi.openEasyMode(host); });
  const originalCard = () => page.locator('.card').filter({ has: page.locator('.card-source', { hasText: '찾은 메뉴 · 학사정보' }) });
  await open();
  await originalCard().click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason', 'changed');
  await expect(page.getByRole('alert')).toContainText('원본 메뉴가 바뀌었어요');
  expect(await page.locator('#source').getAttribute('style')).toBeNull();
  expect(await page.locator('#source').getAttribute('tabindex')).toBeNull();
  expect(await page.evaluate(() => window.originalClicks)).toBe(0);
  await page.getByRole('button', { name: '안내 닫기', exact: true }).click();
  await open();
  await originalCard().click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason', 'ready');
  await expect(page.locator('#source')).toBeFocused();
  expect(await page.evaluate(() => window.originalClicks)).toBe(0);
  await page.getByRole('button', { name: '안내 닫기', exact: true }).click();
  await page.locator('#destination').click();
  await expect(page).toHaveURL('http://127.0.0.1:4173/public-calendar');
  await expect(page.getByRole('heading')).toHaveText('합성 공개 학사일정');
});

test('원본 사이트가 나중에 바꾼 스타일 우선순위·tabindex를 복원 타이머가 덮지 않는다', async ({ page }) => {
  await page.clock.install();
  await page.setContent('<main><div id="source" role="button" aria-label="검색">검색</div></main>');
  await install(page);
  expect(await locate(page)).toEqual({ ok: true });
  await page.evaluate(() => {
    const source = document.getElementById('source');
    // 같은 값이어도 사이트가 !important를 제거했으면 별개의 후속 변경입니다.
    source.style.setProperty('outline', '4px solid #087e76');
    source.style.setProperty('outline-offset', '5px');
    source.style.setProperty('color', 'blue');
    source.setAttribute('tabindex', '0');
  });
  await page.clock.fastForward(3600);
  expect(await page.evaluate(() => {
    const source = document.getElementById('source');
    return { outline: source.style.outline, outlinePriority: source.style.getPropertyPriority('outline'), offset: source.style.outlineOffset, offsetPriority: source.style.getPropertyPriority('outline-offset'), color: source.style.color, tabindex: source.getAttribute('tabindex') };
  })).toEqual({ outline: 'rgb(8, 126, 118) solid 4px', outlinePriority: '', offset: '5px', offsetPriority: '', color: 'blue', tabindex: '0' });
});

test('원본 focus 핸들러가 만든 빈 style 속성도 확장의 임시 스타일로 오인하지 않는다', async ({ page }) => {
  await page.clock.install();
  await page.setContent('<main><div id="source" role="button" aria-label="검색">검색</div></main>');
  await page.evaluate(() => document.getElementById('source').addEventListener('focus', event => event.target.setAttribute('style', '')));
  await install(page);
  expect(await locate(page)).toEqual({ ok: true });
  await page.clock.fastForward(3600);
  expect(await page.locator('#source').getAttribute('style')).toBe('');
  expect(await page.locator('#source').getAttribute('tabindex')).toBeNull();
});

test('href 없는 원본 앵커도 임시 tabindex로만 초점을 주고 원래 속성 부재를 복구한다', async ({ page }) => {
  await page.clock.install();
  await page.setContent('<nav><a id="source">학사일정</a><a id="ordered" tabindex="0">학사 안내</a></nav>');
  await install(page);
  expect(await page.locator('#source').evaluate(element => element.tabIndex)).toBe(0);
  await page.locator('#source').evaluate(element => element.addEventListener('click', () => window.unexpectedClicks = true));
  expect(await locate(page)).toEqual({ ok: true });
  await expect(page.locator('#source')).toBeFocused();
  expect(await page.locator('#source').getAttribute('tabindex')).toBe('-1');
  expect(await page.evaluate(() => window.unexpectedClicks)).toBeUndefined();
  await page.clock.fastForward(3600);
  expect(await page.locator('#source').getAttribute('tabindex')).toBeNull();
  expect(await page.locator('#source').getAttribute('style')).toBeNull();
  await page.evaluate(() => { window.originalControl = document.getElementById('ordered'); });
  expect(await locate(page)).toEqual({ ok: true });
  await expect(page.locator('#ordered')).toBeFocused();
  await page.clock.fastForward(3600);
  expect(await page.locator('#ordered').getAttribute('tabindex')).toBe('0');
});

test('실제 확장 isolated world에서 DOM 속성 공유와 property 이벤트 관찰 한계를 구분한다', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'easyweb-action-world-'));
  let context;
  try {
    const extension = join(temp, 'extension');
    await cp(resolve('dist'), extension, { recursive: true });
    const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
    // 이 복사본 권한은 isolated-world 관찰용이며 배포 activeTab 클릭 검증이 아닙니다.
    manifest.host_permissions = ['http://127.0.0.1/*'];
    await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
    context = await chromium.launchPersistentContext(join(temp, 'profile'), {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173');
    await page.setContent('<nav><a id="source" href="/popup">검색</a><a id="inline" href="/popup" onclick="return false">검색</a></nav>');
    await page.evaluate(() => {
      window.originalClicks = 0;
      const source = document.getElementById('source');
      source.onclick = event => { event.preventDefault(); window.originalClicks++; };
      document.addEventListener('click', event => { if (event.target.closest('#source')) { event.preventDefault(); window.originalClicks++; } });
    });
    const observation = await worker.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
      const tabId = tabs.at(-1).id;
      const inspect = () => {
        const source = document.getElementById('source');
        return { inlineAttribute: source.getAttribute('onclick'), declaredInlineAttribute: document.getElementById('inline').getAttribute('onclick'), propertyType: typeof source.onclick, href: source.getAttribute('href') };
      };
      return {
        isolated: (await chrome.scripting.executeScript({ target: { tabId }, world: 'ISOLATED', func: inspect }))[0].result,
        main: (await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: inspect }))[0].result,
      };
    });
    expect(observation.main).toEqual({ inlineAttribute: null, declaredInlineAttribute: 'return false', propertyType: 'function', href: '/popup' });
    expect(observation.isolated).toEqual({ inlineAttribute: null, declaredInlineAttribute: 'return false', propertyType: 'object', href: '/popup' });
    await page.locator('#source').click();
    await expect(page).toHaveURL('http://127.0.0.1:4173/');
    expect(await page.evaluate(() => window.originalClicks)).toBe(2);
  } finally {
    await context?.close();
    await rm(temp, { recursive: true, force: true });
  }
});
