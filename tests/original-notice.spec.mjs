import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let noticeBundle;
test.beforeAll(async () => {
  const bundle = await build({
    stdin: {
      contents: "export {showOriginalNotice, clearOriginalNotice} from './src/original-notice'; export {analyzePage} from './src/analyzer';",
      resolveDir: process.cwd(), loader: 'ts',
    },
    bundle: true, write: false, format: 'iife', globalName: 'OriginalNoticeTest',
  });
  noticeBundle = bundle.outputFiles[0].text;
});

async function prepare(page) {
  await page.setContent('<main><nav><a id="source" href="https://example.test/search">검색</a><button id="other" type="button">원본 메뉴 열기</button></nav></main>');
  await page.addScriptTag({ content: noticeBundle });
  await page.evaluate(() => {
    window.nativeEscapeEvents = [];
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') window.nativeEscapeEvents.push(event);
    });
    // Track the notice's document listeners without counting the original page listener.
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    window.noticeKeyListeners = new Set();
    window.noticeKeyRemovals = 0;
    document.addEventListener = (type, listener, options) => {
      if (type === 'keydown') window.noticeKeyListeners.add(listener);
      return add(type, listener, options);
    };
    document.removeEventListener = (type, listener, options) => {
      if (type === 'keydown') {
        window.noticeKeyListeners.delete(listener);
        window.noticeKeyRemovals++;
      }
      return remove(type, listener, options);
    };
    document.getElementById('source').focus();
  });
}

const show = (page, result = { ok: true }, label = '검색') => page.evaluate(({ result, label }) => {
  OriginalNoticeTest.showOriginalNotice(result, label, document.getElementById('source'));
}, { result, label });
const listenerCount = page => page.evaluate(() => window.noticeKeyListeners.size);
const notice = page => page.locator('[data-easyweb-notice]');

test('성공 안내는 원본 초점을 유지하고 분석 후보를 추가하지 않는다', async ({ page }) => {
  await prepare(page);
  const before = await page.evaluate(() => OriginalNoticeTest.analyzePage().map(item => item.element.id));
  await show(page);
  await expect(notice(page)).toHaveAttribute('data-easyweb-notice-reason', 'ready');
  await expect(notice(page).getByRole('status')).toBeVisible();
  await expect(notice(page).locator('#easyweb-original-message')).toHaveText('원본의 ‘검색’ 메뉴를 표시했어요. 직접 선택해 주세요.');
  await expect(page.locator('#source')).toBeFocused();
  expect(await page.evaluate(() => OriginalNoticeTest.analyzePage().map(item => item.element.id))).toEqual(before);
  await page.evaluate(() => OriginalNoticeTest.clearOriginalNotice());
  expect(await listenerCount(page)).toBe(0);
  await expect(page.locator('#source')).toBeFocused();
});

test('실제 Escape 입력은 안내를 닫고 원본 초점을 복원하며 사이트 키 동작을 보존한다', async ({ page }) => {
  await prepare(page);
  await show(page, { ok: false, reason: 'covered' });
  await expect(notice(page).getByRole('alert')).toBeVisible();
  await expect(notice(page).getByRole('button', { name: '안내 닫기' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(notice(page)).toHaveCount(0);
  await expect(page.locator('#source')).toBeFocused();
  expect(await listenerCount(page)).toBe(0);
  expect(await page.evaluate(() => window.nativeEscapeEvents.map(event => ({ trusted: event.isTrusted, prevented: event.defaultPrevented })))).toEqual([{ trusted: true, prevented: false }]);
});

test('외부 DOM 제거와 부모 교체 후 전역 키 리스너가 쌓이지 않고 다른 초점을 빼앗지 않는다', async ({ page }) => {
  await prepare(page);
  for (let cycle = 0; cycle < 6; cycle++) {
    await show(page, { ok: false, reason: 'covered' });
    expect(await listenerCount(page)).toBe(1);
    await page.evaluate(cycle => {
      const host = document.querySelector('[data-easyweb-notice]');
      document.getElementById('other').focus();
      if (cycle % 2) {
        const parent = document.createElement('section');
        document.body.append(parent);
        parent.append(host);
        parent.replaceChildren();
        parent.remove();
      } else host.remove();
      OriginalNoticeTest.clearOriginalNotice();
    }, cycle);
    await expect.poll(() => listenerCount(page)).toBe(0);
    await expect(page.locator('#other')).toBeFocused();
  }
  // An Escape on the original page after all notices are gone still reaches its handler.
  await page.keyboard.press('Escape');
  await expect(page.locator('#other')).toBeFocused();
  expect(await page.evaluate(() => window.nativeEscapeEvents.length)).toBe(1);
});

test('닫기는 한 번만 정리하고 제거된 제어의 후속 이벤트는 초점을 바꾸지 않는다', async ({ page }) => {
  await prepare(page);
  await show(page, { ok: false, reason: 'outside-viewport' });
  await page.evaluate(() => {
    window.oldNotice = document.querySelector('[data-easyweb-notice]');
    window.oldDismiss = oldNotice.shadowRoot.querySelector('button');
  });
  await notice(page).getByRole('button', { name: '안내 닫기' }).click();
  await expect(page.locator('#source')).toBeFocused();
  await page.locator('#other').focus();
  await page.evaluate(() => {
    oldDismiss.click();
    oldNotice.dispatchEvent(new Event('easyweb:dismiss-notice'));
    OriginalNoticeTest.clearOriginalNotice();
  });
  expect(await page.evaluate(() => ({ listeners: noticeKeyListeners.size, removals: noticeKeyRemovals }))).toEqual({ listeners: 0, removals: 1 });
  await expect(page.locator('#other')).toBeFocused();
});

test('연속 안내는 하나만 남고 닫을 때 원래 제어로 돌아간다', async ({ page }) => {
  await prepare(page);
  await show(page, { ok: false, reason: 'covered' });
  await show(page, { ok: false, reason: 'focus-failed' });
  await expect(notice(page)).toHaveCount(1);
  expect(await listenerCount(page)).toBe(1);
  await notice(page).getByRole('button', { name: '안내 닫기' }).click();
  await expect(page.locator('#source')).toBeFocused();
  expect(await listenerCount(page)).toBe(0);
  await show(page, { ok: false, reason: 'unavailable' });
  await page.evaluate(() => document.getElementById('source').remove());
  await notice(page).getByRole('button', { name: '안내 닫기' }).click();
  await expect(notice(page)).toHaveCount(0);
  expect(await listenerCount(page)).toBe(0);
  await expect(page.locator('#other')).not.toBeFocused();
});

test('focus 중 바뀐 메뉴는 낡은 이름으로 성공을 알리지 않는다', async ({ page }) => {
  await prepare(page);
  await show(page, { ok: false, reason: 'changed' }, '이전 메뉴 이름');
  await expect(notice(page)).toHaveAttribute('data-easyweb-notice-reason', 'changed');
  const alert = notice(page).getByRole('alert');
  await expect(alert).toContainText('원본 메뉴가 바뀌었어요. EasyWeb을 다시 열어 찾아주세요.');
  await expect(alert).not.toContainText('이전 메뉴 이름');
  await expect(alert).not.toContainText('표시했어요');
});
