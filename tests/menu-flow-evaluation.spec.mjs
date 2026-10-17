import { test, expect } from '@playwright/test';
import { buildMenuFlowHarness, observeMenuFlow } from '../scripts/menu-flow-evaluation.mjs';
import { scorePage } from '../scripts/evaluation-metrics.mjs';

let bundle;
test.beforeAll(async () => { bundle = await buildMenuFlowHarness(); });
async function fixture(page, controls) {
  await page.route('https://flow.example.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="ko"><meta charset="utf-8"><main><h1>도움말</h1>${controls}</main></html>` }));
  await page.goto('https://flow.example.test/guide');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.enable');
  const { frameTree } = await cdp.send('Page.getFrameTree');
  const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'menu-flow-protocol-test' });
  const destinations = await page.locator('a').evaluateAll(elements => Object.fromEntries(elements.map(element => [element.dataset.evalId, element.href])));
  return { cdp, executionContextId, destinations };
}

test('추가 화면의 실제 표시 경로를 세되 첫 화면 재현율과 합치지 않는다', async ({ page }) => {
  const controls = Array.from({ length: 8 }, (_, index) => `<a data-eval-id="s${index + 1}" href="/help/${index + 1}">도움말 ${index + 1}</a>`).join('');
  const { cdp, executionContextId, destinations } = await fixture(page, controls);
  const target = {
    accepted: Array.from({ length: 8 }, (_, index) => ({ sourceId: `s${index + 1}`, category: 'help', action: 'navigate' })),
    expected: [1, 4, 8].map(index => ({ id: `feature${index}`, sourceIds: [`s${index}`], category: 'help', action: 'navigate', href: destinations[`s${index}`] })),
    task: { expectedSourceIds: ['s8'] },
  };
  try {
    const flow = await observeMenuFlow(page, cdp, executionContextId, bundle, target, destinations, 8);
    expect(flow.completed).toBe(true);
    expect(flow.pages.length).toBeGreaterThan(1);
    expect(flow.pages.every(view => view.cards.length <= 6)).toBe(true);
    expect(flow.repeatedCards).toEqual([]);
    expect(flow.unresolvedMappings).toEqual([]);
    expect(flow.matched).toBe(3);
    expect(flow.taskRecommended).toBe(true);
    expect(flow.firstReachedPage.feature8).toBeGreaterThan(1);
    const firstScreen = scorePage({ selected: flow.pages[0].cards }, target, destinations);
    expect(firstScreen.matched).toBeLessThan(3);
    expect(firstScreen.taskRecommended).toBe(false);
    expect(flow.scope).toContain('Original first-screen quality remains separate');
  } finally { await cdp.detach(); }
});

test('같은 이름·목적지여도 실제 카드의 원본 결속으로 중복 제거된 제어를 식별한다', async ({ page }) => {
  const { cdp, executionContextId, destinations } = await fixture(page, '<a data-eval-id="one" href="/help/shared">도움말</a><a data-eval-id="two" href="/help/shared">도움말</a>');
  const target = { accepted: [{ sourceId: 'one', category: 'help', action: 'navigate' }, { sourceId: 'two', category: 'help', action: 'navigate' }],
    expected: [{ id: 'feature', sourceIds: ['one', 'two'], category: 'help', action: 'navigate', href: destinations.one }], task: { expectedSourceIds: ['one', 'two'] } };
  try {
    const flow = await observeMenuFlow(page, cdp, executionContextId, bundle, target, destinations, 2);
    expect(flow.unresolvedMappings).toEqual([]);
    expect(flow.selected).toHaveLength(1);
    expect(['one', 'two']).toContain(flow.selected[0].sourceId);
    expect(flow.selected[0].sourceMatches).toBe(1);
    expect(flow.selected[0].bindingMethod).toBe('actual-rendered-card-source');
    expect(flow.matched).toBe(1);
    expect(flow.correct).toBe(1);
    expect(flow.taskRecommended).toBe(true);
  } finally { await cdp.detach(); }
});


test('실제 카드 결속이 있어도 원본에 평가 식별자가 없으면 정답을 만들어 세지 않는다', async ({ page }) => {
  const { cdp, executionContextId, destinations } = await fixture(page, '<a href="/help/shared">도움말</a>');
  const target = { accepted: [{ sourceId: 'unobserved', category: 'help', action: 'navigate' }],
    expected: [{ id: 'feature', sourceIds: ['unobserved'], category: 'help', action: 'navigate' }], task: { expectedSourceIds: ['unobserved'] } };
  try {
    const flow = await observeMenuFlow(page, cdp, executionContextId, bundle, target, destinations, 2);
    expect(flow.unresolvedMappings).toHaveLength(1);
    expect(flow.selected[0].sourceId).toBeNull();
    expect(flow.matched).toBe(0);
    expect(flow.correct).toBe(0);
    expect(flow.taskRecommended).toBe(false);
  } finally { await cdp.detach(); }
});
