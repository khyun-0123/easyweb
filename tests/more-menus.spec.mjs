import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

// Source-bundled headless UI checks. Native extension/VoiceOver acceptance is separate.
let bundle;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: "export {openEasyMode} from './src/easy-mode'; export {analyzePage} from './src/analyzer'; export {classify} from './src/classifier'; export {rank, remainingMenus, hasMoreMenus} from './src/ranker';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'MoreUi', loader: { '.css': 'text' } });
  bundle = result.outputFiles[0].text;
});
const links = count => Array.from({ length: count }, (_, index) => `<li><a id="help-${index + 1}" href="/guide-${index + 1}">이용 안내 ${String(index + 1).padStart(2, '0')}</a></li>`).join('');
async function setup(page, markup, controlledClock = false) {
  await page.goto('http://127.0.0.1:4173');
  await page.setContent(`<button id="origin">시작 위치</button><main><h1>공개 메뉴</h1><ul>${markup}</ul></main>`);
  await page.addScriptTag({ content: bundle });
  if (controlledClock) await page.clock.install();
  await page.locator('#origin').focus();
  await page.evaluate(() => {
    window.initialMenuIds = MoreUi.rank(MoreUi.classify(MoreUi.analyzePage())).map(candidate => candidate.element.id);
    const host = document.createElement('div'); host.dataset.easywebHost = 'true'; document.body.append(host);
    MoreUi.openEasyMode(host);
  });
}
const current = page => page.locator('.card-source').filter({ hasText: /^찾은 메뉴 ·/ }).allTextContents();
const next = page => page.getByRole('button', { name: '다른 메뉴 보기', exact: true });
const previous = page => page.getByRole('button', { name: '이전 메뉴', exact: true });

// The overflow path was introduced in v0.4. From v0.6, category diversity gets
// first choice, then focused pages fill unused capacity before showing overflow.
test('같은 분류의 실제 메뉴 8개를 첫 추천 유지·한 화면 6개 이하로 모두 찾아갈 수 있다', async ({ page }) => {
  await setup(page, links(8));
  const initialIds = await page.evaluate(() => window.initialMenuIds);
  const first = await current(page);
  expect(first).toHaveLength(6);
  expect(await page.locator('.card').evaluateAll(cards => cards.map(card => new URL(card.href).pathname.replace('/guide-', 'help-')))).toEqual(initialIds);
  await expect(next(page)).toBeVisible();
  const all = [...first];
  await next(page).click();
  expect(await page.locator('.card').count()).toBeLessThanOrEqual(6);
  all.push(...await current(page));
  expect(new Set(all).size).toBe(8);
  expect(all).toHaveLength(8);
  await expect(next(page)).toBeHidden();
  await previous(page).click();
  expect(await current(page)).toEqual(first);
});

test('마지막 화면·이전 화면은 안정적이고 새 메뉴는 다시 찾기에서만 추가되며 첫 화면으로 돌아온다', async ({ page }) => {
  await setup(page, links(14));
  const snapshots = [await current(page)];
  while (await next(page).isVisible()) {
    await next(page).click();
    snapshots.push(await current(page));
  }
  expect(snapshots.map(items => items.length)).toEqual([6, 6, 2]);
  expect(new Set(snapshots.flat()).size).toBe(14);
  await page.locator('main ul').evaluate(list => list.insertAdjacentHTML('beforeend', '<li><a id="help-15" href="/guide-15">이용 안내 15</a></li>'));
  await expect(next(page)).toBeHidden(); // no automatic full re-analysis of unseen controls
  await previous(page).click();
  expect(await current(page)).toEqual(snapshots[1]);
  await previous(page).click();
  expect(await current(page)).toEqual(snapshots[0]);
  await expect(previous(page)).toBeHidden();
  await next(page).click();
  await page.getByRole('button', { name: '다시 찾기', exact: true }).click();
  await expect(page.getByRole('button', { name: '다시 찾기', exact: true })).toBeFocused();
  expect(await current(page)).toEqual(snapshots[0]);
  await expect(previous(page)).toBeHidden();
  const refreshed = [...await current(page)];
  while (await next(page).isVisible()) { await next(page).click(); refreshed.push(...await current(page)); }
  expect(new Set(refreshed).size).toBe(15);
  expect(refreshed).toContain('찾은 메뉴 · 이용 안내 15');
});

test('화면 사이 중복 목적지는 제거하고 서로 다른 원본 버튼과 외부·새창 메타데이터를 보존한다', async ({ page }) => {
  await setup(page, links(5).replace('id="help-5" href="/guide-5"', 'id="help-5" target="_blank" href="https://public.example.test/guide-5"') +
    '<li><a href="/guide-2">이용 안내 복제</a></li>' +
    '<li><button id="original-a" type="button">이용 안내 상담</button></li><li><button id="original-b" type="button">이용 안내 상담</button></li>');
  await page.evaluate(() => {
    window.sourceClicks = 0;
    for (const source of document.querySelectorAll('#original-a, #original-b')) source.addEventListener('click', () => window.sourceClicks++);
  });
  const inspect = () => page.locator('.card').evaluateAll(cards => cards.map(card => ({ tag: card.tagName, href: card.getAttribute('href'), target: card.getAttribute('target'), rel: card.getAttribute('rel'), category: card.dataset.category, text: card.textContent })));
  const observed = [...await inspect()];
  while (await next(page).isVisible()) { await next(page).click(); observed.push(...await inspect()); }
  const anchors = observed.filter(item => item.tag === 'A');
  expect(anchors).toHaveLength(5);
  expect(new Set(anchors.map(item => item.href)).size).toBe(5);
  expect(observed.filter(item => item.tag === 'BUTTON')).toHaveLength(2);
  expect(observed.find(item => item.href === 'https://public.example.test/guide-5')).toMatchObject({ target: '_blank', rel: 'noopener noreferrer', category: 'help' });
  expect(observed.find(item => item.href === 'https://public.example.test/guide-5').text).toContain('연결된 사이트 · public.example.test');
  expect(observed.find(item => item.href === 'https://public.example.test/guide-5').text).toContain('새 창');
  await page.locator('button.card').first().click();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason', 'ready');
  expect(await page.evaluate(() => window.sourceClicks)).toBe(0);
  expect(await page.evaluate(() => ['original-a', 'original-b'].includes(document.activeElement.id))).toBe(true);
});

for (const change of ['removed', 'dangerous-href', 'editable-parent']) {
  test(`다음 화면의 숨은 원본이 ${change} 상태면 넘어가지 않고 다시 찾기에서만 안전하게 갱신한다`, async ({ page }) => {
    await setup(page, links(8));
    await page.clock.install();
    const first = await current(page);
    await page.evaluate(change => {
      const source = document.getElementById('help-8');
      if (change === 'removed') source.remove();
      if (change === 'dangerous-href') source.href = '/delete';
      if (change === 'editable-parent') source.parentElement.contentEditable = 'true';
    }, change);
    await page.clock.runFor(400);
    await expect(page.locator('.change-notice')).toBeHidden(); // only the displayed source controls are watched
    await next(page).click();
    expect(await current(page)).toEqual(first);
    await expect(page.locator('.change-notice')).toBeVisible();
    await expect(next(page)).toBeDisabled();
    await expect(page.getByRole('button', { name: '다시 찾기', exact: true })).toBeFocused();
    expect(await page.locator('.card[aria-disabled="true"]').count()).toBe(first.length);
    await expect(page).toHaveURL('http://127.0.0.1:4173/');
    await page.getByRole('button', { name: '다시 찾기', exact: true }).click();
    await expect(page.locator('.change-notice')).toBeHidden();
    await next(page).click();
    expect(await current(page)).not.toContain('찾은 메뉴 · 이용 안내 08');
    expect(await page.locator('a.card[href$="/delete"]').count()).toBe(0);
  });
}

test('이전 화면의 바뀐 후보와 같은 프레임에서 바뀐 현재 후보도 전환 직전에 차단한다', async ({ page }) => {
  await setup(page, links(8));
  await next(page).click();
  const second = await current(page);
  await page.evaluate(() => { document.getElementById('help-1').href = '/delete'; });
  await previous(page).click();
  expect(await current(page)).toEqual(second);
  await expect(page.locator('.change-notice')).toBeVisible();
  await expect(previous(page)).toBeDisabled();
  await page.keyboard.press('Escape');
  await setup(page, links(8));
  await page.evaluate(() => {
    document.getElementById('help-1').href = '/delete';
    [...document.querySelector('[data-easyweb-host]').shadowRoot.querySelectorAll('.menu-page')].find(button => button.textContent === '다른 메뉴 보기').click();
  });
  await expect(page.locator('.change-notice')).toBeVisible();
  await expect(next(page)).toBeDisabled();
  expect(await page.locator('.card').count()).toBe(6);
  await expect(page).toHaveURL('http://127.0.0.1:4173/');
});

test('페이지 전환은 첫 카드 초점·상태를 갱신하고 키보드 순환·Esc 원본 복귀를 유지한다', async ({ page }) => {
  await setup(page, links(8));
  await next(page).click();
  await expect(page.locator('.card').first()).toBeFocused();
  await expect(page.locator('[data-easyweb-host] .status')).toContainText('2번째 메뉴 화면');
  await page.locator('.card').last().focus();
  await page.keyboard.press('Tab');
  await expect(previous(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '원본 화면 보기', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(previous(page)).toBeFocused();
  await previous(page).click();
  await expect(page.locator('.card').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  await expect(page.locator('#origin')).toBeFocused();
});

test('1000개 후보에서도 주기 감시는 현재 화면만 확인하고 숨은 입력 내용을 읽지 않는다', async ({ page }) => {
  await setup(page, links(1000) + '<li><a id="safe-editable-parent" href="/guide-static">이용 안내 고정 <span role="textbox">PRIVATE_UNREAD</span></a></li><li><input id="password" type="password" value="PRIVATE_UNREAD"></li>', true);
  await page.evaluate(() => {
    window.attributeReads = {};
    for (const element of document.querySelectorAll('main a')) {
      const original = element.getAttribute.bind(element);
      element.getAttribute = (...args) => { window.attributeReads[element.id] = (window.attributeReads[element.id] ?? 0) + 1; return original(...args); };
    }
    Object.defineProperty(document.getElementById('password'), 'value', { get() { throw new Error('private input read'); } });
    const text = document.querySelector('[role="textbox"]').firstChild;
    Object.defineProperty(text, 'nodeValue', { get() { throw new Error('editable text read'); } });
  });
  await page.clock.runFor(1000);
  const reads = await page.evaluate(() => window.attributeReads);
  const firstIds = await page.evaluate(() => window.initialMenuIds);
  expect(firstIds.every(id => reads[id] > 0)).toBe(true);
  expect(Object.keys(reads).filter(id => !firstIds.includes(id))).toEqual([]);
  await next(page).click();
  await expect(page.locator('.card').first()).toBeFocused();
  await expect(page.getByRole('dialog')).not.toContainText('PRIVATE_UNREAD');
});

test('초과 메뉴가 없으면 숨은 페이지 버튼이 키보드 순환에 끼어들지 않는다', async ({ page }) => {
  await setup(page, links(2));
  await expect(next(page)).toBeHidden();
  await expect(previous(page)).toBeHidden();
  expect(await page.locator('.menu-page').evaluateAll(buttons => buttons.every(button => button.hidden && button.disabled))).toBe(true);
  await page.getByRole('button', { name: '원본 화면 보기', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.card').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '원본 화면 보기', exact: true })).toBeFocused();
});

test('남은 후보 순회는 같은 locate 요소를 중복하지 않고 원래 후보 객체·액션을 그대로 보존한다', async ({ page }) => {
  await setup(page, links(5) + '<li><button id="locate-a" type="button">이용 안내 상담</button></li><li><button id="locate-b" type="button">이용 안내 상담</button></li>');
  const result = await page.evaluate(() => {
    const original = MoreUi.classify(MoreUi.analyzePage());
    const selected = MoreUi.rank(original);
    const before = original.map(({ element, ...metadata }) => JSON.stringify(metadata));
    const overflow = [...MoreUi.remainingMenus([...original, ...original], selected)];
    const all = [...selected, ...overflow];
    return {
      originalCount: original.length,
      count: all.length,
      sameObjects: all.every(candidate => original.includes(candidate)),
      sameMetadata: before.every((metadata, index) => metadata === JSON.stringify((({ element, ...rest }) => rest)(original[index]))),
      ids: all.map(candidate => candidate.element.id),
      initialStillIdentical: MoreUi.rank(original).every((candidate, index) => candidate === selected[index]),
      noMoreAfterAll: !MoreUi.hasMoreMenus(original, all),
    };
  });
  expect(result).toMatchObject({ originalCount: 7, count: 7, sameObjects: true, sameMetadata: true, initialStillIdentical: true, noMoreAfterAll: true });
  expect(new Set(result.ids).size).toBe(7);
  expect(result.ids).toContain('locate-a');
  expect(result.ids).toContain('locate-b');
});
