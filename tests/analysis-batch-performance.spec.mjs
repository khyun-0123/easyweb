import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let engine;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `export {analyzePage,contextLabels,sourceSnapshot} from './src/analyzer';export {navigationUtility,createNavigationCache} from './src/navigation-utility';export {isCandidateCurrent,areCandidatesCurrent} from './src/page-session';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'AnalysisBatch' });
  engine = result.outputFiles[0].text;
});
async function setup(page, html) {
  await page.route('**/*', route => route.abort());
  await page.setContent(`<base href="https://example.test/public-guide">${html}`);
  await page.addScriptTag({ content: engine });
}
const children = '<li><a href="/first-guide">첫 안내</a></li><li><a href="/second-guide">두번째 안내</a></li>';

test('큰 문서 목록은 모든 후보마다 전체 자식을 열거하지 않는다', async ({ page }) => {
  await setup(page, `<main><ul>${Array.from({ length: 1000 }, (_, i) => `<li><a href="/guide/${i}">도구 ${i} 이용 안내</a></li>`).join('')}</ul></main>`);
  const actual = await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'children');
    let enumeratedUpperBound = 0;
    Object.defineProperty(Element.prototype, 'children', { configurable: true, get() { const result = original.get.call(this); enumeratedUpperBound += result.length; return result; } });
    const cache = AnalysisBatch.createNavigationCache();
    const kinds = [...document.querySelectorAll('a')].map(element => AnalysisBatch.navigationUtility(element, '고정된 도구 이용 안내', cache) ?? null);
    return { count: kinds.length, distinct: [...new Set(kinds)], enumeratedUpperBound };
  });
  expect(actual).toEqual({ count: 1000, distinct: [null], enumeratedUpperBound: 0 });
});

test('단일 배치의 반복 원본검사는 가시성과 작은 메뉴 구조를 다시 순회하지 않는다', async ({ page }) => {
  await setup(page, `<div><button id="source" type="button" aria-expanded="false" aria-controls="menu">자료 구분</button><ul id="menu">${children}</ul></div>`);
  const actual = await page.evaluate(() => {
    const element = document.querySelector('#source');
    const original = Element.prototype.getClientRects;
    let layouts = 0;
    Element.prototype.getClientRects = function (...args) { layouts++; return original.apply(this, args); };
    const cache = AnalysisBatch.createNavigationCache();
    const first = AnalysisBatch.navigationUtility(element, '자료 구분', cache);
    const afterFirst = layouts;
    for (let i = 0; i < 20; i++) {
      if (AnalysisBatch.navigationUtility(element, '자료 구분', cache) !== first) throw Error('semantic result drift');
      AnalysisBatch.sourceSnapshot(element, '자료 구분', undefined, false, false, undefined, cache);
    }
    const afterRepeats = layouts;
    const next = AnalysisBatch.navigationUtility(element, '자료 구분', AnalysisBatch.createNavigationCache());
    return { first, next, afterFirst, afterRepeats, afterFresh: layouts };
  });
  expect(actual.first).toBe('branch');
  expect(actual.next).toBe('branch');
  expect(actual.afterFirst).toBe(1);
  expect(actual.afterRepeats).toBe(actual.afterFirst);
  expect(actual.afterFresh).toBeGreaterThan(actual.afterRepeats);
});

test('문단 없는 부모의 전체 제어 목록은 문맥 fallback을 위해 수집하지 않는다', async ({ page }) => {
  await setup(page, `<main><h2>문서 안내</h2><ul>${Array.from({ length: 1000 }, (_, i) => `<li><a href="/guide/${i}">문서 ${i}</a></li>`).join('')}</ul></main>`);
  const actual = await page.evaluate(() => {
    const original = Element.prototype.querySelectorAll;
    let fallbackQueries = 0;
    Element.prototype.querySelectorAll = function (selector) { if (selector === 'a, button, input') fallbackQueries++; return original.call(this, selector); };
    const candidates = AnalysisBatch.analyzePage();
    return { count: candidates.length, fallbackQueries, labels: [...new Set(candidates.flatMap(item => item.contextLabels))] };
  });
  expect(actual).toEqual({ count: 1000, fallbackQueries: 0, labels: ['문서 안내'] });
});

test('같은 작은 부모의 고정 문단은 배치당 한번 검사하고 새 분석은 변경을 읽는다', async ({ page }) => {
  await setup(page, '<main><div><p id="topic">문서 안내</p><a href="/a">첫 문서</a><a href="/b">둘째 문서</a><a href="/c">셋째 문서</a></div></main>');
  const actual = await page.evaluate(() => {
    const original = Element.prototype.querySelectorAll;
    let fallbackQueries = 0;
    Element.prototype.querySelectorAll = function (selector) { if (selector === 'a, button, input') fallbackQueries++; return original.call(this, selector); };
    const first = AnalysisBatch.analyzePage().map(item => item.contextLabels);
    const firstQueries = fallbackQueries;
    document.querySelector('#topic').textContent = '새 이용 안내';
    const next = AnalysisBatch.analyzePage().map(item => item.contextLabels);
    return { first, next, firstQueries, nextQueries: fallbackQueries - firstQueries };
  });
  expect(actual.first).toEqual(Array.from({ length: 3 }, () => ['문서 안내']));
  expect(actual.next).toEqual(Array.from({ length: 3 }, () => ['새 이용 안내']));
  expect(actual.firstQueries).toBe(1);
  expect(actual.nextQueries).toBe(1);
});

test('같은 프레임의 같은 문구 대상 교체와 중복 id를 새 배치에서 다시 확인한다', async ({ page }) => {
  await setup(page, '<a id="source" href="#reading">Skip to content</a><main id="reading"><h2>안내 문서</h2></main>');
  const actual = await page.evaluate(() => {
    const element = document.querySelector('#source');
    const oldTarget = document.querySelector('#reading');
    const firstCache = AnalysisBatch.createNavigationCache();
    const first = AnalysisBatch.navigationUtility(element, 'Skip to content', firstCache);
    const clone = oldTarget.cloneNode(true);
    oldTarget.replaceWith(clone);
    const nextCache = AnalysisBatch.createNavigationCache();
    const next = AnalysisBatch.navigationUtility(element, 'Skip to content', nextCache);
    const identityFresh = firstCache.targets.get('reading') === oldTarget && nextCache.targets.get('reading') === clone;
    clone.after(clone.cloneNode(true));
    const duplicate = AnalysisBatch.navigationUtility(element, 'Skip to content', AnalysisBatch.createNavigationCache()) ?? null;
    return { first, next, identityFresh, duplicate };
  });
  expect(actual).toEqual({ first: 'position', next: 'position', identityFresh: true, duplicate: null });
});

test('위험 속성·관계·폼 변경과 같은 문구 원본 교체는 다음 검사에서 stale다', async ({ page }) => {
  await setup(page, '<main><h2>공개 안내</h2><div id="wrap"><a id="source" href="/guide">이용 안내</a></div><form id="owner"></form></main>');
  const actual = await page.evaluate(() => {
    const changes = [
      source => source.setAttribute('href', 'javascript:changedAction()'),
      source => source.setAttribute('onclick', 'changedAction()'),
      source => source.setAttribute('target', '_blank'),
      source => source.setAttribute('rel', 'home'),
      source => source.setAttribute('aria-current', 'page'),
      source => document.querySelector('#owner').append(source),
      source => source.replaceWith(source.cloneNode(true)),
    ];
    const results = [];
    for (const change of changes) {
      const wrap = document.querySelector('#wrap');
      document.querySelector('#source')?.remove();
      wrap.innerHTML = '<a id="source" href="/guide">이용 안내</a>';
      const candidate = AnalysisBatch.analyzePage().find(item => item.element.id === 'source');
      const before = AnalysisBatch.isCandidateCurrent(candidate);
      change(candidate.element);
      const current = AnalysisBatch.isCandidateCurrent(candidate);
      results.push({ before, current });
    }
    return results;
  });
  expect(actual).toEqual(Array.from({ length: 7 }, () => ({ before: true, current: false })));
});

test('배치 캐시와 문단 fallback은 입력·checked·중첩 편집 텍스트 getter를 읽지 않는다', async ({ page }) => {
  await setup(page, `<main><div><p>문서 안내<span id="private" role="textbox">PRIVATE_EDITOR</span></p><a id="read" href="/guide">사용 안내</a><input id="input" type="text" aria-label="검색" value="PRIVATE_VALUE"><input id="check" type="checkbox" checked><textarea id="area">PRIVATE_TEXT</textarea></div><div><button id="menu-source" type="button" aria-expanded="false" aria-controls="menu">자료 구분</button><ul id="menu">${children}</ul></div></main>`);
  const actual = await page.evaluate(() => {
    let reads = 0;
    for (const element of document.querySelectorAll('input,textarea')) {
      for (const key of ['value', 'checked']) Object.defineProperty(element, key, { get() { reads++; throw Error('private getter'); } });
    }
    for (const element of [document.querySelector('#private'), document.querySelector('#area')]) {
      for (const key of ['textContent', 'innerText']) Object.defineProperty(element, key, { get() { reads++; throw Error('editor getter'); } });
      for (const child of element.childNodes) Object.defineProperty(child, 'nodeValue', { get() { reads++; throw Error('editor text node getter'); } });
    }
    const candidates = AnalysisBatch.analyzePage();
    const source = document.querySelector('#menu-source');
    const cache = AnalysisBatch.createNavigationCache();
    const kinds = Array.from({ length: 3 }, () => AnalysisBatch.navigationUtility(source, '자료 구분', cache));
    const snapshots = candidates.map(item => item.snapshot);
    return { reads, kinds, labels: candidates.map(item => item.label), snapshots };
  });
  expect(actual.reads).toBe(0);
  expect(actual.kinds).toEqual(['branch', 'branch', 'branch']);
  expect(JSON.stringify(actual)).not.toContain('PRIVATE_');
});
