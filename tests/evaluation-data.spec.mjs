import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';

test('동결 정답 데이터의 페이지·분리·소스 ID·과제·관찰 근거가 일치한다', async ({ page }) => {
  const files = (await readdir('evaluation/sites')).filter(file => file.endsWith('.json'));
  expect(files).toHaveLength(5);
  const uniquePages = new Set();
  const uniqueTasks = new Set();
  let expectedCount = 0;
  let calibration = 0;
  let holdout = 0;
  for (const file of files) {
    const site = JSON.parse(await readFile(`evaluation/sites/${file}`, 'utf8'));
    expect(site.pages).toHaveLength(3);
    for (const item of site.pages) {
      expect(uniquePages.has(item.id)).toBe(false); uniquePages.add(item.id);
      expect(uniqueTasks.has(item.task.id)).toBe(false); uniqueTasks.add(item.task.id);
      expect(item.httpStatus).toBe(200);
      expect(item.observation.method).toBeTruthy();
      expect(item.expected.length).toBeGreaterThanOrEqual(2);
      if (item.split === 'calibration') calibration++; else if (item.split === 'holdout') holdout++; else throw new Error('잘못된 split');
      const html = await readFile(item.fixture, 'utf8');
      await page.setContent(html);
      await expect(page.locator('script')).toHaveCount(0);
      const sourceIds = await page.locator('[data-eval-id]').evaluateAll(elements => elements.map(el => el.dataset.evalId));
      expect(new Set(sourceIds).size).toBe(sourceIds.length);
      for (const truth of item.expected) {
        expectedCount++;
        for (const id of truth.sourceIds) {
          expect(sourceIds).toContain(id);
          expect(item.accepted.some(a => a.sourceId === id && a.category === truth.category && a.action === truth.action)).toBe(true);
        }
      }
      for (const id of item.task.expectedSourceIds) expect(sourceIds).toContain(id);
    }
  }
  expect(uniquePages.size).toBe(15);
  expect(uniqueTasks.size).toBe(15);
  expect(expectedCount).toBeGreaterThanOrEqual(30);
  expect(calibration).toBe(10);
  expect(holdout).toBe(5);
});
