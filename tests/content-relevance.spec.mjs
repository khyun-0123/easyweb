import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';

let engine;
test.beforeAll(async () => {
  const baseline = process.env.EASYWEB_CONTENT_BASELINE === '1';
  const oldRanker = path.resolve('docs/evidence/run008/content-relevance/before-ranker.ts');
  const plugins = baseline ? [{ name: 'preserved-ranker', setup(builder) {
    builder.onResolve({ filter: /^\.\/src\/ranker$/ }, () => ({ path: oldRanker }));
    builder.onResolve({ filter: /^\.\/analyzer$/ }, args => args.importer === oldRanker ? { path: path.resolve('src/analyzer.ts') } : undefined);
  }}] : [];
  const result = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {contentEvidence} from './src/content-evidence';export {isCandidateCurrent} from './src/page-session';export {rank,remainingMenus} from './src/ranker';`, resolveDir: process.cwd() },
    plugins, bundle: true, write: false, format: 'iife', globalName: 'ContentRelevance' });
  engine = result.outputFiles[0].text;
});

const url = 'https://unfamiliar.example.invalid/education/topic.html';
const globals = `<header><a id="global-search" href="/search">검색</a><a id="global-apply" href="/apply">신청</a><a id="global-login" href="/login">로그인</a></header>`;
const broad = `<ul id="broad"><li><a id="curriculum" href="/education/structure.html">교육과정</a></li><li><a id="broad-major" href="/education/major.html">전공제도</a></li><li><a id="broad-term" href="/education/term.html">교양과정</a></li></ul>`;
const documents = `<ul id="documents"><li class="active"><a id="current-topic" href="/education/topic.html#unfamiliar">학사안내</a></li><li><a id="document-a" href="/education/other-book.html#unfamiliar">미래융합 학위 운영편람</a></li><li><a id="document-b" href="/education/other-manual.html">새로운 전공 선택 안내책자</a></li></ul>`;
const primary = () => `${globals}<div><h2>학사안내</h2>${broad}</div><main><h2 id="current-heading">학사안내</h2>${documents}</main>`;

async function setup(page, html) {
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }) : route.abort());
  await page.goto(url);
  await page.addScriptTag({ content: engine });
  await page.evaluate(() => {
    window.sources = ContentRelevance.analyzePage();
    window.candidates = ContentRelevance.classify(sources, { mode: 'generic' });
    for (const candidate of candidates) {
      const proof = ContentRelevance.contentEvidence(candidate);
      if (proof) candidate.contentEvidence = proof;
    }
  });
}

const selected = page => page.evaluate(() => ContentRelevance.rank(candidates).map(candidate => candidate.element.id));

test('@positive current-topic documents displace broad peers while curriculum and category diversity remain', async ({ page }) => {
  await setup(page, primary());
  const first = await selected(page);
  expect(first).toHaveLength(6);
  expect(first.slice(0, 2)).toEqual(['document-a', 'document-b']);
  expect(first).toContain('curriculum');
  expect(await page.evaluate(() => new Set(ContentRelevance.rank(candidates).map(candidate => candidate.category)).size)).toBeGreaterThanOrEqual(3);
  expect(await page.evaluate(() => {
    const first = ContentRelevance.rank(candidates);
    return [...first, ...ContentRelevance.remainingMenus(candidates, first)].map(candidate => candidate.element.id);
  })).toEqual(expect.arrayContaining(['global-search', 'global-apply', 'global-login']));
});

test('@positive parent-topic and following content section support unfamiliar layout divs without site-specific classes', async ({ page }) => {
  const parent = `<ul><li class="selected"><a href="/education/topic.html#parent">공개 학사안내</a></li><li><a href="/education/structure.html">교육과정</a></li></ul>`;
  await setup(page, `${globals}<div><h2>학사안내</h2><div><div>${parent}</div><div><div>${documents}</div></div></div><section><p>고정된 공개 설명</p></section></div>`);
  expect(await page.evaluate(() => candidates.filter(candidate => candidate.contentEvidence?.level === 2).map(candidate => candidate.element.id))).toEqual(['document-a', 'document-b']);
});

test('array shuffles and unfamiliar labels retain source-backed selection and distinct overflow', async ({ page }) => {
  await setup(page, primary().replace('미래융합 학위 운영편람', '독립학위 handbook').replace('새로운 전공 선택 안내책자', '연계전공 manual'));
  expect(await page.evaluate(() => {
    const expected = ContentRelevance.rank(candidates).map(candidate => candidate.element.id).join(',');
    for (let run = 0; run < 24; run++) {
      const rotated = [...candidates.slice(run % candidates.length), ...candidates.slice(0, run % candidates.length)].reverse();
      if (ContentRelevance.rank(rotated).map(candidate => candidate.element.id).join(',') !== expected) return false;
    }
    const first = ContentRelevance.rank(candidates);
    const all = [...first, ...ContentRelevance.remainingMenus([...candidates, candidates[0]], first)];
    return all.length === candidates.length && new Set(all.map(candidate => candidate.element)).size === candidates.length
      && all.every(candidate => candidates.includes(candidate));
  })).toBe(true);
});

for (const [name, html] of [
  ['plain body sidebar', `<div><h2>학사안내</h2>${documents}</div>`],
  ['unrelated main heading', `<main><h2>별도 지역 안내</h2>${documents}</main>`],
  ['neighbouring heading', `<section><h2>학사안내</h2></section><main>${documents}</main>`],
  ['article', `<main><article><h2>학사안내</h2>${documents}</article></main>`],
  ['navigation', `<main><nav><h2>학사안내</h2>${documents}</nav></main>`],
  ['form', `<main><form><h2>학사안내</h2>${documents}</form></main>`],
  ['breadcrumb', `<main class="breadcrumb"><h2>학사안내</h2>${documents}</main>`],
  ['skip navigation', `<main id="skip-navigation"><h2>학사안내</h2>${documents}</main>`],
]) test(`unproven ${name} cannot acquire content relevance`, async ({ page }) => {
  await setup(page, html);
  expect(await page.evaluate(() => candidates.some(candidate => candidate.contentEvidence))).toBe(false);
});

test('a heading or current selected row replacement changes dependency identity', async ({ page }) => {
  for (const id of ['current-heading', 'documents']) {
    await setup(page, primary());
    expect(await page.evaluate(id => {
      const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
      const oldProof = candidate.contentEvidence;
      const node = document.getElementById(id);
      const replacement = node.cloneNode(false);
      while (node.firstChild) replacement.append(node.firstChild);
      node.replaceWith(replacement);
      const proof = ContentRelevance.contentEvidence(candidate);
      return !!proof && oldProof.dependencies.includes(node) && !proof.dependencies.includes(node)
        && proof.dependencies.includes(replacement);
    }, id)).toBe(true);
  }
});

test('source currentness rejects an equal-content replacement of the relevance heading', async ({ page }) => {
  await setup(page, primary());
  expect(await page.evaluate(() => {
    const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
    const before = ContentRelevance.isCandidateCurrent(candidate);
    const heading = document.getElementById('current-heading');
    heading.replaceWith(heading.cloneNode(true));
    return { before, after: ContentRelevance.isCandidateCurrent(candidate) };
  })).toEqual({ before: true, after: false });
});

test('changing selection, topic heading, or dependency danger removes the positive relation', async ({ page }) => {
  for (const kind of ['selected', 'heading', 'danger']) {
    await setup(page, primary());
    expect(await page.evaluate(kind => {
      const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
      if (kind === 'selected') document.querySelector('#current-topic').parentElement.className = '';
      if (kind === 'heading') document.getElementById('current-heading').replaceChildren('다른 지역 자료');
      if (kind === 'danger') document.getElementById('document-b').setAttribute('href', '/delete?cmd=payment');
      return ContentRelevance.contentEvidence(candidate);
    }, kind)).toBeUndefined();
  }
});

test('nested editable values and private getters are excluded from all proof fingerprints', async ({ page }) => {
  await setup(page, primary().replace('id="current-heading">학사안내', 'id="current-heading">학사안내<span role="textbox">PRIVATE_EDITOR</span><textarea>PRIVATE_TEXTAREA</textarea>'));
  expect(await page.evaluate(() => {
    let reads = 0;
    for (const node of document.querySelectorAll('textarea,[role="textbox"]')) for (const key of ['value','textContent','innerText'])
      Object.defineProperty(node, key, { get() { reads++; throw Error('private getter'); } });
    const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
    const proof = ContentRelevance.contentEvidence(candidate);
    return { reads, hasProof: !!proof, privateInFingerprint: proof?.fingerprint.includes('PRIVATE_') };
  })).toEqual({ reads: 0, hasProof: true, privateInFingerprint: false });
});

test('dangerous original controls, branch expanders, default submits and below-threshold candidates get no evidence', async ({ page }) => {
  await setup(page, primary().replace('href="/education/other-book.html#unfamiliar"', 'href="/delete?cmd=payment"'));
  expect(await page.evaluate(() => candidates.some(candidate => candidate.element.id === 'document-a'))).toBe(false);
  await setup(page, primary());
  expect(await page.evaluate(() => {
    const candidate = candidates.find(candidate => candidate.element.id === 'document-a');
    const below = ContentRelevance.contentEvidence({ ...candidate, score: 54 });
    candidate.element.setAttribute('aria-expanded','false');
    const branch = ContentRelevance.contentEvidence(candidate);
    const form = document.createElement('form'); const button = document.createElement('button');
    button.textContent = '새로운 학위 안내서'; form.append(button); document.querySelector('main').append(form);
    const submit = ContentRelevance.contentEvidence({ ...candidate, element: button, label: '새로운 학위 안내서', action: 'locate' });
    return [below, branch, submit].every(proof => proof === undefined);
  })).toBe(true);
});

test('@positive six equally supported local topics remain author ordered while overflow and globals survive', async ({ page }) => {
  const labels = ['융합학위 운영편람','독립전공 안내책자','공동학위 설명서','복수전공 핸드북','연계학위 자료집','창의전공 요람','미래학위 지침서','교양학위 매뉴얼'];
  await setup(page, `${globals}<main><h2 id="topic-heading">학사안내</h2><ul>${labels.map((label,index) => `<li><a id="local-${index}" href="/education/book-${index}.html">${label}</a></li>`).join('')}</ul></main>`);
  expect(await page.evaluate(() => {
    const dependencies = [document.querySelector('main'), document.getElementById('topic-heading')];
    for (const candidate of candidates.filter(candidate => candidate.element.id.startsWith('local-'))) {
      candidate.institutionEvidence = { version: 37, rule: 'synthetic-explicit-topic', contentScope: 'content', dependencies, fingerprint: 'fixed-synthetic-topic' };
      candidate.contentEvidence = ContentRelevance.contentEvidence(candidate);
    }
    const first = ContentRelevance.rank(candidates);
    const rest = [...ContentRelevance.remainingMenus(candidates, first)];
    return { first: first.map(candidate => candidate.element.id), all: [...first,...rest].map(candidate => candidate.element.id) };
  })).toEqual({ first: Array.from({ length: 6 }, (_,index) => `local-${index}`),
    all: [...Array.from({ length: 8 }, (_,index) => `local-${index}`), 'global-search','global-apply','global-login'] });
});

test('equally supported content reserves diversity before more same-category content', async ({ page }) => {
  await setup(page, `${globals}<main><h2>학사안내</h2><ul>${Array.from({ length: 6 }, (_,index) => `<li><a id="local-${index}" href="/education/topic-${index}.html">융합학위 운영편람 ${index}</a></li>`).join('')}<li><a id="local-help" href="/help">복잡한 설치 도움말 안내서</a></li></ul></main>`);
  expect(await page.evaluate(() => {
    for (const candidate of candidates.filter(candidate => candidate.element.id.startsWith('local-'))) {
      candidate.contentEvidence = { level: 1, rule: 'synthetic-content', dependencies: [candidate.element], fingerprint: 'synthetic' };
    }
    return ContentRelevance.rank(candidates).map(candidate => candidate.element.id);
  })).toEqual(expect.arrayContaining(['local-help']));
  expect((await selected(page)).some(id => id.startsWith('global-'))).toBe(false);
});

test('explicit preparatory attachment stays locate and uses row/title identity tokens', async ({ page }) => {
  await setup(page, `${globals}<main><section><h2>공개 문서</h2><form method="post"><table><caption>신청 서식 작성 견본</caption><thead><tr><th>제목</th><th>첨부파일</th></tr></thead><tbody><tr><td><button><strong id="form-title">보관장치 반입신고서</strong></button></td><td><a id="preparation-file" href="#bundle" onclick="return false">ZIP 파일다운로드</a></td></tr></tbody></table></form></section></main>`);
  expect(await page.evaluate(() => {
    const candidate = candidates.find(candidate => candidate.element.id === 'preparation-file');
    const proof = candidate.contentEvidence;
    const before = ContentRelevance.isCandidateCurrent(candidate);
    const title = document.getElementById('form-title'); title.replaceWith(title.cloneNode(true));
    return { action: candidate.action, href: candidate.href, level: proof?.level, rule: proof?.rule,
      before, after: ContentRelevance.isCandidateCurrent(candidate), changedFingerprint: ContentRelevance.contentEvidence(candidate)?.fingerprint !== proof?.fingerprint };
  })).toEqual({ action: 'locate', href: undefined, level: 2, rule: 'explicit-preparation-attachment', before: true, after: false, changedFingerprint: true });
});

test('reading tie groups cannot borrow a higher relevance position', async ({ page }) => {
  await setup(page, `<main><h2>학사안내</h2><ul><li><a id="ordinary-long" href="/education/book.html">융합학위 운영편람</a></li><li><a id="proven-short" href="/education/topic-two.html">전공제도</a></li></ul></main>`);
  expect(await page.evaluate(() => {
    const preferred = candidates.find(candidate => candidate.element.id === 'proven-short');
    preferred.contentEvidence = { level: 1, rule: 'synthetic', dependencies: [preferred.element], fingerprint: 'synthetic' };
    return ContentRelevance.rank(candidates).map(candidate => candidate.element.id);
  })).toEqual(['proven-short','ordinary-long']);
});
