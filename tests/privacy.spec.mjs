import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

async function inspect(page) {
  const bundle = await build({ entryPoints: ['src/analyzer.ts'], bundle: true, write: false, format: 'iife', globalName: 'PrivacyAnalyzer' });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  return page.evaluate(() => window.PrivacyAnalyzer.analyzePage().map(({ element, ...candidate }) => ({ id: element.id, ...candidate })));
}

test('편집 제어와 이를 포함하는 메뉴·label에서 입력 내용을 읽지 않는다', async ({ page }) => {
  await page.setContent(`<header>
    <div id="editable-search" role="searchbox" contenteditable="true">PRIVATE_SENTINEL 검색어</div>
    <div id="named-editable" role="searchbox" contenteditable="true" aria-label="통합검색">PRIVATE_SENTINEL 입력</div>
    <a id="wrapped" href="https://example.test/search">검색 <span contenteditable="true">PRIVATE_SENTINEL</span></a>
    <label id="label-text" for="native">사이트 검색 <span contenteditable="true">PRIVATE_SENTINEL</span></label>
    <input id="native" type="text" value="PRIVATE_SENTINEL">
    <button id="query-button" aria-labelledby="typed-label"><span id="typed-label" contenteditable="true">PRIVATE_SENTINEL 검색</span></button>
    <div role="searchbox"><span id="custom-typed">PRIVATE_SENTINEL 검색</span></div>
    <button aria-labelledby="custom-typed">검색</button>
    <a href="https://example.test/search"><span role="searchbox textbox">검색 PRIVATE_SENTINEL</span></a>
    <a href="https://example.test/search"><span contenteditable="true"><img alt="검색 PRIVATE_SENTINEL"></span></a>
    <div contenteditable="true"><a href="https://example.test/search" title="검색 PRIVATE_SENTINEL">검색 PRIVATE_SENTINEL</a></div>
    <textarea placeholder="검색">PRIVATE_SENTINEL</textarea>
    <input type="password" aria-label="검색" value="PRIVATE_SENTINEL">
    <input type="submit" value="검색">
  </header>`);
  // 입력값이나 편집 가능한 부분을 통째로 읽으면 즉시 실패시킵니다.
  await page.evaluate(() => {
    const trap = () => { throw new Error('입력 내용 접근 금지'); };
    for (const node of document.querySelectorAll('input, textarea')) Object.defineProperty(node, 'value', { get: trap });
    for (const node of document.querySelectorAll('[contenteditable], [role="searchbox"], a, label, button')) {
      Object.defineProperty(node, 'innerText', { get: trap });
      Object.defineProperty(node, 'textContent', { get: trap });
    }
  });
  const candidates = await inspect(page);
  expect(JSON.stringify(candidates)).not.toContain('PRIVATE_SENTINEL');
  expect(candidates.find(x => x.id === 'named-editable')?.label).toBe('통합검색');
  expect(candidates.find(x => x.id === 'wrapped')?.label).toBe('검색');
  expect(candidates.find(x => x.id === 'native')?.label).toBe('사이트 검색');
  expect(candidates.some(x => x.id === 'query-button')).toBe(false);
});

test('실제 키보드로 바뀐 spinbutton·slider 값은 부모 링크·접근성 이름·주변 제목에서 제외한다', async ({ page }) => {
  await page.setContent(`<nav>
    <a id="numeric-wrapped" href="https://example.test/search">검색 <span id="wrapped-value" role="spinbutton" tabindex="0"></span></a>
  </nav>
  <span id="numeric-label">통합검색 <span id="label-value" role="slider" tabindex="0"></span></span>
  <button id="numeric-labelled" aria-labelledby="numeric-label">검색</button>
  <section><h2>공지사항 <span id="heading-value" role="spinbutton" tabindex="0"></span></h2>
    <a id="numeric-section" href="https://example.test/notice">더보기</a>
  </section>
  <input id="safe-named-search" type="text" aria-label="자료 검색">`);
  await page.evaluate(() => {
    for (const id of ['wrapped-value', 'heading-value']) {
      const control = document.getElementById(id);
      let current = '';
      control.addEventListener('keydown', event => {
        if (!/^[0-9]$/.test(event.key)) return;
        event.preventDefault();
        current += event.key;
        control.textContent = current;
        control.setAttribute('aria-valuenow', current);
      });
    }
    const slider = document.getElementById('label-value');
    let position = 972540;
    slider.addEventListener('keydown', event => {
      if (event.key !== 'ArrowRight') return;
      event.preventDefault();
      position++;
      slider.textContent = String(position);
      slider.setAttribute('aria-valuenow', String(position));
    });
  });
  await page.locator('#wrapped-value').focus();
  await page.keyboard.type('972531');
  await page.locator('#label-value').focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('#heading-value').focus();
  await page.keyboard.type('972551');
  await expect(page.locator('#wrapped-value')).toHaveText('972531');
  await expect(page.locator('#label-value')).toHaveText('972541');
  await expect(page.locator('#heading-value')).toHaveText('972551');

  const candidates = await inspect(page);
  for (const value of ['972531', '972541', '972551']) expect(JSON.stringify(candidates)).not.toContain(value);
  expect(candidates.find(x => x.id === 'numeric-wrapped')?.label).toBe('검색');
  expect(candidates.find(x => x.id === 'numeric-labelled')?.label).toBe('통합검색');
  expect(candidates.find(x => x.id === 'numeric-section')?.sectionLabel).toBe('공지사항');
  expect(candidates.find(x => x.id === 'safe-named-search')?.label).toBe('자료 검색');

  // After proving keyboard entry, make even a text-node read fail. Exclusion
  // must happen at the editable subtree, before reading its current content.
  await page.evaluate(() => {
    for (const control of document.querySelectorAll('[role="spinbutton"], [role="slider"]')) {
      for (const node of control.childNodes) Object.defineProperty(node, 'nodeValue', { get() { throw new Error('숫자 입력 내용 접근 금지'); } });
    }
  });
  await inspect(page);
});

test('aria-label·연결 label·search role로 일반 검색창을 찾되 일반 개인정보 필드는 제외', async ({ page }) => {
  await page.setContent(`<main>
    <input id="aria-search" type="text" aria-label="통합검색">
    <label for="label-search">자료 검색</label><input id="label-search" type="text">
    <div role="search"><input id="role-search" type="text"></div>
    <input id="name" type="text" aria-label="이름">
    <input id="phone" type="tel" placeholder="검색">
    <input id="pwd" type="password" aria-label="검색">
    <textarea id="message" placeholder="문의"></textarea>
  </main>`);
  const candidates = await inspect(page);
  expect(candidates.map(x => x.id)).toEqual(['aria-search', 'label-search', 'role-search']);
});

test('쉬운 화면에도 사용자 정의 검색창의 입력 문구가 나타나지 않는다', async ({ page }) => {
  await page.setContent('<div role="searchbox" contenteditable="true">검색 PRIVATE_SENTINEL</div><div role="searchbox" aria-label="통합검색" contenteditable="true">PRIVATE_SENTINEL</div>');
  await page.addScriptTag({ path: 'dist/content.js' });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).not.toContainText('PRIVATE_SENTINEL');
  await expect(page.getByRole('dialog')).toContainText('검색');
});

test('일반 제어의 고정 문구와 접근성 이름을 보조 title보다 우선한다', async ({ page }) => {
  await page.setContent('<nav><a id="visible-label" href="https://example.test/faq" title="새창 열림">자주 묻는 질문</a><button id="named-label" aria-label="통합검색" title="추가 설명">찾기</button><a id="image-label" href="https://example.test/help" title="새창"><img alt="이용 안내"></a><a id="tooltip-only" href="https://example.test/notice" title="공지사항"></a></nav>');
  const candidates = await inspect(page);
  expect(candidates.find(x => x.id === 'visible-label')?.label).toBe('자주 묻는 질문');
  expect(candidates.find(x => x.id === 'named-label')?.label).toBe('통합검색');
  expect(candidates.find(x => x.id === 'image-label')?.label).toBe('이용 안내');
  expect(candidates.find(x => x.id === 'tooltip-only')?.label).toBe('공지사항');
});

test('작은 기능 상자의 짧은 문맥을 읽을 때 편집 내용을 건너뛴다', async ({ page }) => {
  await page.setContent('<div><p>이용 안내 <span role="textbox">PRIVATE_SENTINEL</span></p><p>설명 문장</p><a id="context-link" href="https://example.test/faq">바로가기</a></div>');
  const candidates = await inspect(page);
  expect(candidates.find(x => x.id === 'context-link')?.sectionLabel).toBe('이용 안내');
  expect(JSON.stringify(candidates)).not.toContain('PRIVATE_SENTINEL');
});
