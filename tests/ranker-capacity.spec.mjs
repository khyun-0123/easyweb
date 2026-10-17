import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let bundle;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `export {rank,hasMoreMenus,remainingMenus} from './src/ranker';`, resolveDir: process.cwd() },
    bundle: true, write: false, format: 'iife', globalName: 'CapacityRanker',
  });
  bundle = result.outputFiles[0].text;
});

async function choose(page, rows) {
  await page.setContent('<main><ul></ul></main>');
  await page.addScriptTag({ content: bundle });
  return page.evaluate(rows => {
    const candidates = rows.map((row, index) => {
      const item = document.createElement('li');
      const element = document.createElement('a');
      element.id = row.id;
      element.textContent = row.id;
      element.href = row.href ?? `https://catalog.example/resource/${index}`;
      item.append(element);
      document.querySelector('ul').append(item);
      return { element, label: row.id, href: element.href, action: 'navigate', context: 'body',
        score: 80, category: row.category, ...(row.reading ? {pageTask: 'reading', pagePurpose: 'help'} : {}) };
    });
    const selected = CapacityRanker.rank(candidates);
    return {
      ids: selected.map(candidate => candidate.element.id),
      categories: selected.map(candidate => candidate.category),
      hasMore: CapacityRanker.hasMoreMenus(candidates, selected),
      remaining: [...CapacityRanker.remainingMenus(candidates, selected)].map(candidate => candidate.element.id),
      reversedInputIds: CapacityRanker.rank([...candidates].reverse()).map(candidate => candidate.element.id),
    };
  }, rows);
}

test('focused page uses available first-screen capacity for four distinct reading controls', async ({ page }) => {
  const rows = ['north', 'east', 'south', 'west'].map(id => ({id, category: 'help', reading: true}));
  const result = await choose(page, rows);
  expect(result.ids).toEqual(rows.map(row => row.id));
  expect(result.hasMore).toBe(false);
  expect(result.remaining).toEqual([]);
  expect(result.reversedInputIds).toEqual(result.ids);
});

test('category diversity keeps all six available categories before extra same-category menus', async ({ page }) => {
  const rows = ['login', 'search', 'notice', 'academic', 'apply', 'help'].map(category => ({id: category, category}));
  rows.push({id: 'extra-help', category: 'help'}, {id: 'another-help', category: 'help'});
  const result = await choose(page, rows);
  expect([...new Set(result.categories)].sort()).toEqual(rows.slice(0, 6).map(row => row.category).sort());
  expect(result.ids).toHaveLength(6);
  expect(result.remaining.sort()).toEqual(['another-help', 'extra-help']);
});

test('focused overflow stays bounded and each distinct source appears once', async ({ page }) => {
  const rows = Array.from({length: 8}, (_, index) => ({id: `topic-${index}`, category: 'help', reading: true}));
  const result = await choose(page, rows);
  expect(result.ids).toHaveLength(6);
  expect(result.hasMore).toBe(true);
  expect(new Set([...result.ids, ...result.remaining]).size).toBe(8);
  expect([...result.ids, ...result.remaining]).toEqual(rows.map(row => row.id));
});

test('capacity fill preserves destination deduplication', async ({ page }) => {
  const rows = Array.from({length: 5}, (_, index) => ({id: `menu-${index}`, category: 'help', reading: true}));
  rows.push({id: 'duplicate', category: 'help', reading: true, href: 'https://catalog.example/resource/0'});
  const result = await choose(page, rows);
  expect(result.ids).toEqual(rows.map(row => row.id).slice(0, 5));
  expect(result.hasMore).toBe(false);
});
