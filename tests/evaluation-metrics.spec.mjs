import { test, expect } from '@playwright/test';
import { scorePage } from '../scripts/evaluation-metrics.mjs';

const target = {
  accepted: [{ sourceId: 'notice', category: 'notice', action: 'navigate' }],
  expected: [{ id: 'open-notices', sourceIds: ['notice'], category: 'notice', action: 'navigate', href: 'https://example.test/notice' }],
  task: { expectedSourceIds: ['notice'] },
};
test('소스·분류가 맞아도 다른 목적지면 정답이나 추천 과제 성공으로 세지 않는다', () => {
  const actual = { selected: [{ sourceId: 'notice', category: 'notice', action: 'navigate', href: 'https://invalid.example/wrong' }] };
  const result = scorePage(actual, target, { notice: 'https://example.test/notice' });
  expect(result.correct).toBe(0); expect(result.matched).toBe(0); expect(result.taskRecommended).toBe(false);
  expect(result.incorrect).toHaveLength(1);
});
test('올바른 목적지와 빈 추천의 분모를 명확히 계산한다', () => {
  const candidate = { sourceId: 'notice', category: 'notice', action: 'navigate', href: 'https://example.test/notice' };
  const good = scorePage({ selected: [candidate] }, target, { notice: candidate.href });
  expect(good.precision).toBe(1); expect(good.recall).toBe(1); expect(good.taskRecommended).toBe(true);
  const empty = scorePage({ selected: [] }, target, {});
  expect(empty.precision).toBeNull(); expect(empty.recall).toBe(0);
});
