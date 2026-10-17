import { test, expect } from '@playwright/test';
import { scorePage, qualityGate } from '../scripts/evaluation-metrics.mjs';

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

const summarizeSites = sites => Object.fromEntries(['correct', 'recommended', 'matched', 'expected'].map(key => [key, sites.reduce((sum, site) => sum + site[key], 0)]));
test('품질 목표의 전체 90%·85% 경계를 정확히 판정한다', () => {
  const sites = Array.from({ length: 5 }, (_, index) => ({ siteId: String(index), correct: 18, recommended: 20, matched: 17, expected: 20 }));
  expect(qualityGate(summarizeSites(sites), sites).status).toBe('PASS');
  for (const key of ['correct', 'matched']) {
    const below = sites.map(site => ({ ...site }));
    below[0][key]--;
    expect(qualityGate(summarizeSites(below), below).status).toBe('FAIL');
  }
});
test('전체 수치가 좋아도 한 사이트의 정확도·재현율 미달을 숨기지 않는다', () => {
  const sites = Array.from({ length: 5 }, (_, index) => ({ siteId: String(index), correct: 20, recommended: 20, matched: 20, expected: 20 }));
  for (const key of ['correct', 'matched']) {
    const failed = sites.map(site => ({ ...site }));
    failed[0][key] = key === 'correct' ? 15 : 14;
    const gate = qualityGate(summarizeSites(failed), failed);
    expect(gate.overall.precision).toBeGreaterThanOrEqual(0.9);
    expect(gate.overall.recall).toBeGreaterThanOrEqual(0.85);
    expect(gate.sites[0].passed).toBe(false);
    expect(gate.status).toBe('FAIL');
  }
});
test('추천 없음·기대 기능 없음·사이트 누락은 품질 통과로 바꾸지 않는다', () => {
  const sites = Array.from({ length: 5 }, (_, index) => ({ siteId: String(index), correct: 0, recommended: 0, matched: 0, expected: 2 }));
  const empty = qualityGate(summarizeSites(sites), sites);
  expect(empty.overall.precision).toBeNull();
  expect(empty.overall.recall).toBe(0);
  expect(empty.status).toBe('FAIL');
  const noExpected = sites.map(site => ({ ...site, expected: 0 }));
  expect(qualityGate(summarizeSites(noExpected), noExpected).status).toBe('FAIL');
  const four = Array.from({ length: 4 }, (_, index) => ({ siteId: String(index), correct: 2, recommended: 2, matched: 2, expected: 2 }));
  expect(qualityGate(summarizeSites(four), four).status).toBe('FAIL');
});
