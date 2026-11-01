import { test, expect } from '@playwright/test';
import { runA11yCheck } from '../scripts/a11y-check.mjs';

let report;
test.beforeAll(async () => { report = await runA11yCheck(); });
test.setTimeout(120_000);

test('정상·빈 결과·긴 이름·stale·안내 성공/실패와 미디어 상태의 axe 위반이 없다', () => {
  expect(report.errors).toEqual([]);
  expect(report.cases).toHaveLength(21);
  expect(report.summary.seriousOrCritical).toBe(0);
  expect(report.cases.flatMap(record => record.axe.violations.map(rule => ({ case: record.id, id: rule.id, impact: rule.impact, nodes: rule.nodes.map(node => node.failureSummary) })))).toEqual([]);
});

test('320·390·720·1440 CSS px에서 긴 이름을 포함해 가로 스크롤 없이 재배치한다', () => {
  expect(report.summary.horizontalOverflowCases).toEqual([]);
  for (const width of [320, 390, 720, 1440]) {
    expect(report.cases.some(record => record.viewport.width === width && record.state === 'normal')).toBe(true);
    expect(report.cases.some(record => record.viewport.width === width && record.state === 'long')).toBe(true);
  }
});

test('모든 확장 제어의 클릭 영역은 48px 이상이며 활성 제어 대비가 3대1 이상이다', () => {
  expect(report.summary.smallTargets).toEqual([]);
  expect(report.summary.lowComponentContrast).toEqual([]);
});

test('숨긴 페이지 제어는 접근성 트리에서도 제외하고 실제 다른 메뉴 제어는 노출한다', () => {
  const normal = report.cases.find(record => record.id === 'desktop-normal');
  expect(normal.hiddenControls.filter(control => control.className === 'menu-page')).toHaveLength(2);
  expect(normal.hiddenControls.every(control => control.axExposed === false)).toBe(true);
  const initial = report.cases.find(record => record.id === 'desktop-overflow');
  expect(initial.controls.some(control => control.name === '다른 기능 보기' && control.role === 'button')).toBe(true);
  expect(initial.hiddenControls.some(control => control.name === '이전 기능' && !control.axExposed)).toBe(true);
  const next = report.cases.find(record => record.id === 'desktop-overflow-next');
  expect(next.controls.some(control => control.name === '이전 기능' && control.role === 'button')).toBe(true);
});

test('키보드 초점은 양방향 순환·재탐지 유지·종료 복귀하고 표시 대비가 3대1 이상이다', () => {
  expect(report.summary.lowFocusContrast).toEqual([]);
  for (const record of report.cases.filter(record => record.keyboard)) {
    expect(record.keyboard.focus.every(focus => focus.inside)).toBe(true);
    expect(record.keyboard.reverse.inside).toBe(true);
    expect(record.keyboard.afterCycle.className).toBe('close');
    expect(record.keyboard.refreshRetained).toBe(true);
    expect(record.keyboard.restored).toBe(true);
  }
});

test('카드의 native 이름은 보이는 제목·원본문구·실행·외부 사이트·새창을 보존한다', () => {
  const normal = report.cases.find(record => record.id === 'desktop-normal');
  // 2026-10-31: the fixture is not a home page, so its 로그인 left the cards
  // for the common row (docs/07_todo.md D13). Six cards became five plus one.
  expect(normal.cardCount).toBe(5);
  const cards = normal.controls.filter(control => control.className.split(/\s+/).includes('card'));
  expect(cards).toHaveLength(5);
  const common = normal.controls.filter(control => control.className.split(/\s+/).includes('common-action'));
  expect(common.map(control => control.name)).toEqual(['로그인']);
  expect(cards.every(control => control.nameSource === 'Chromium Accessibility.getFullAXTree' && control.name.includes('찾은 메뉴') && (control.name.includes('원본에서 계속하기') || control.name.includes('원본 페이지') && control.name.includes('이동')))).toBe(true);
  expect(cards.some(control => control.role === 'link')).toBe(true);
  expect(cards.some(control => control.role === 'button')).toBe(true);
  expect(cards.some(control => control.name.includes('help.other.test') && control.name.includes('새 창'))).toBe(true);
});

test('원본 안내는 원본을 자동 실행하지 않고 성공/실패 상태와 초점을 구분한다', () => {
  for (const record of report.cases.filter(record => ['success', 'failure'].includes(record.state))) {
    expect(record.sourceClicks).toBe(0);
    if (record.state === 'success') {
      expect(record.panel.role).toBe('status');
      expect(record.sourceFocused).toBe(true);
      expect(parseFloat(record.sourceOutline.width)).toBeGreaterThanOrEqual(3);
      expect(record.sourceOutline.contrast).toBeGreaterThanOrEqual(3);
    } else {
      expect(record.panel.role).toBe('alert');
      expect(record.noticeDismissFocused).toBe(true);
    }
  }
});

test('강제 색상과 모션 감소를 실제 줌·보조기술 검사와 구분하여 기록한다', () => {
  expect(report.cases.filter(record => record.id.startsWith('forced-colors')).every(record => record.media.forcedColors)).toBe(true);
  const reduced = report.cases.find(record => record.id === 'reduced-motion-normal');
  expect(reduced.media.reducedMotion).toBe(true);
  expect(reduced.controls.every(control => control.transitionDuration === '0s')).toBe(true);
  expect(report.emulationBoundary).toContain('Neither is a real browser zoom test');
  expect(report.manualChecksRemaining).toContain('VoiceOver with Chrome announcements and focus');
});
