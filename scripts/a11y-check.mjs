import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import axe from 'axe-core';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const reportFile = 'docs/evidence/run005/a11y-automated.json';
const modalHost = '[data-easyweb-host]';
const noticeHost = '[data-easyweb-notice]';

async function sourceHashes(dir = 'src') {
  const files = {};
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(files, await sourceHashes(file));
    else if (entry.isFile()) files[file] = createHash('sha256').update(await readFile(file)).digest('hex');
  }
  return files;
}

const modes = [
  { id: 'desktop', viewport: { width: 1440, height: 1050 }, states: ['normal', 'empty', 'long', 'stale', 'success', 'failure', 'overflow', 'overflow-next'] },
  { id: 'reflow-720', viewport: { width: 720, height: 525 }, states: ['normal', 'long'] },
  { id: 'reflow-320', viewport: { width: 320, height: 256 }, states: ['normal', 'long', 'overflow-next'] },
  { id: 'mobile-390', viewport: { width: 390, height: 844 }, states: ['normal', 'long'] },
  { id: 'forced-colors', viewport: { width: 390, height: 844 }, forcedColors: 'active', states: ['normal', 'stale', 'success', 'failure', 'overflow-next'] },
  { id: 'reduced-motion', viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce', states: ['normal'] },
];

function fixture(state) {
  const academic = `학사정보 ${'긴메뉴이름'.repeat(15)}`;
  const calendar = `학사일정 ${'학사안내문구'.repeat(14)}`;
  const help = `도움말 ${'LONGUNBROKENMENUNAME'.repeat(4)}`;
  const faq = `이용안내 ${'ANOTHERLONGUNBROKENNAME'.repeat(4)}`;
  const controls = state === 'empty' ? '<p>오늘의 풍경을 소개합니다.</p>' : state === 'long' ? `
    <a id="source-login" href="https://source.test/login">로그인</a>
    <a href="https://source.test/academic?task=record">${academic}</a>
    <a href="https://source.test/academic?task=calendar">${calendar}</a>
    <a href="https://source.test/help?task=guide">${help}</a>
    <a href="https://source.test/faq?task=answer">${faq}</a>` : `
    <a id="source-login" href="https://source.test/login">로그인</a>
    <a href="https://source.test/notice">공지사항</a>
    <a href="https://source.test/academic">학사정보</a>
    <a href="https://source.test/apply">신청·조회</a>
    <a href="https://help.other.test/faq" target="_blank">이용 안내</a>`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>EasyWeb synthetic accessibility fixture</title>
    <style>body{margin:20px;background:#fff;color:#111;font:18px/1.5 sans-serif}nav{display:flex;flex-wrap:wrap;gap:12px}nav a,main button{display:inline-block;padding:12px}h1{font-size:24px}</style></head><body>
    <header><h1>원본 예시 사이트</h1><nav aria-label="주요 메뉴">${controls}</nav></header>
    <main><button id="launch" type="button">원본 화면</button>${state === 'empty' ? '' : '<button id="source-search" type="button">검색</button>'}${state.startsWith('overflow') ? '<ul>'+Array.from({length:8},(_,index)=>'<li><a href="https://source.test/help/topic'+index+'">도움말 자료 '+(index+1)+'</a></li>').join('')+'</ul>' : ''}</main>
    <footer><p>공개 정보 예시</p></footer></body></html>`;
}

function rgb(color) {
  const values = color?.match(/[\d.]+/g)?.map(Number);
  return values && values.length >= 3 ? values.slice(0, 3) : undefined;
}

export function contrastRatio(first, second) {
  const luminance = color => {
    const channels = rgb(color)?.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels && channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const a = luminance(first), b = luminance(second);
  if (a === undefined || b === undefined) return null;
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

async function prepare(page, bundle, state) {
  await page.evaluate(() => {
    document.querySelector('[data-easyweb-host]')?.dispatchEvent(new Event('easyweb:close'));
    document.querySelector('[data-easyweb-notice]')?.dispatchEvent(new Event('easyweb:dismiss-notice'));
  });
  await page.setContent(fixture(state));
  await page.evaluate(() => {
    window.syntheticSourceClicks = 0;
    document.getElementById('source-search')?.addEventListener('click', () => window.syntheticSourceClicks++);
    document.getElementById('launch').focus();
  });
  await page.addScriptTag({ content: bundle });
  await page.locator(`${modalHost} dialog`).waitFor({ state: 'visible' });
  if (state === 'overflow-next') await page.locator(modalHost).getByRole('button', { name: '다른 메뉴 보기', exact: true }).click();
  if (state === 'stale') {
    await page.evaluate(() => document.getElementById('source-login').setAttribute('href', 'https://source.test/login?changed=1'));
    await page.locator(`${modalHost} .change-notice`).waitFor({ state: 'visible' });
  }
  if (state === 'success' || state === 'failure') {
    if (state === 'failure') await page.evaluate(() => {
      const cover = document.createElement('div');
      cover.id = 'synthetic-cover';
      cover.setAttribute('aria-hidden', 'true');
      cover.style.cssText = 'position:fixed;inset:0;background:white;z-index:999999';
      document.body.append(cover);
    });
    await page.locator(`${modalHost} .card[data-category="search"]`).focus();
    await page.keyboard.press('Enter');
    await page.locator(`${noticeHost} [role="status"], ${noticeHost} [role="alert"]`).waitFor({ state: 'visible' });
    return noticeHost;
  }
  return modalHost;
}

async function metrics(page, selector) {
  return page.evaluate(selector => {
    const host = document.querySelector(selector), root = host.shadowRoot;
    const parent = element => element.parentElement ?? element.getRootNode().host ?? null;
    const background = start => {
      for (let element = start; element; element = parent(element)) {
        const color = getComputedStyle(element).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
      }
      return 'rgb(255, 255, 255)';
    };
    const controls = [...root.querySelectorAll('button, a[href], summary')].map(element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      const referenceText = attribute => (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean).map(id => root.getElementById(id)?.textContent ?? '').join(' ');
      return {
        name: referenceText('aria-labelledby') || element.getAttribute('aria-label') || element.textContent.trim(), className: element.className,
        description: referenceText('aria-describedby'),
        width: rect.width, height: rect.height, disabled: element.getAttribute('aria-disabled') === 'true' || element.disabled,
        rendered: !!element.getClientRects().length && style.display !== 'none' && style.visibility !== 'hidden',
        foreground: style.color, background: background(element), surroundingBackground: background(parent(element)),
        borderColor: style.borderTopColor, borderWidth: parseFloat(style.borderTopWidth), borderStyle: style.borderTopStyle,
        transitionDuration: style.transitionDuration, scrollBehavior: style.scrollBehavior, hovered: element.matches(':hover'),
      };
    });
    const dialog = root.querySelector('dialog'), panel = dialog ?? root.querySelector('[role="status"], [role="alert"]');
    const bounds = panel.getBoundingClientRect();
    const overflow = [...root.querySelectorAll('*')].filter(element => element instanceof HTMLElement && element.getClientRects().length).map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
      .map(({ element, rect }) => ({ tag: element.tagName, className: element.className, left: rect.left, right: rect.right }));
    const source = document.getElementById('source-search');
    return {
      controls, cardCount: root.querySelectorAll('.card').length,
      panel: { role: panel.getAttribute('role') ?? panel.tagName.toLowerCase(), width: bounds.width, height: bounds.height, scrollWidth: panel.scrollWidth, clientWidth: panel.clientWidth },
      overflow, horizontalOverflow: panel.scrollWidth > panel.clientWidth + 1 || overflow.length > 0,
      sourceClicks: window.syntheticSourceClicks, sourceFocused: document.activeElement === source,
      sourceOutline: source && { width: getComputedStyle(source).outlineWidth, color: getComputedStyle(source).outlineColor, background: background(source) },
      noticeDismissFocused: !!root.activeElement && root.activeElement.tagName === 'BUTTON',
      media: { forcedColors: matchMedia('(forced-colors: active)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches },
    };
  }, selector);
}

async function accessibilityNames(page, selector, data) {
  const session = await page.context().newCDPSession(page);
  try {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    const children = node => [...(node.children ?? []), ...(node.shadowRoots ?? [])];
    const attribute = (node, name) => {
      for (let index = 0; index < (node.attributes?.length ?? 0); index += 2) if (node.attributes[index] === name) return node.attributes[index + 1];
    };
    const find = node => attribute(node, selector.slice(1, -1)) !== undefined ? node : children(node).map(find).find(Boolean);
    const host = find(root), controls = [];
    const collect = node => {
      if (['BUTTON', 'SUMMARY'].includes(node.nodeName) || node.nodeName === 'A' && attribute(node, 'href') !== undefined) controls.push(node);
      children(node).forEach(collect);
    };
    host.shadowRoots.forEach(collect);
    if (controls.length !== data.controls.length) throw new Error(`Accessibility control mapping differs: ${controls.length}/${data.controls.length}`);
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    const accessible = new Map(nodes.filter(node => node.backendDOMNodeId).map(node => [node.backendDOMNodeId, node]));
    data.controls.forEach((control, index) => {
      const node = accessible.get(controls[index].backendNodeId);
      if (!control.rendered) {
        control.axExposed = !!node && !node.ignored;
        if (control.axExposed) throw new Error(`Hidden control unexpectedly exposed: ${control.name}`);
        return;
      }
      if (!node || node.ignored) throw new Error(`No exposed accessibility node for ${control.name}`);
      control.name = node.name?.value ?? '';
      control.description = node.description?.value ?? '';
      control.role = node.role?.value ?? '';
      control.nameSource = 'Chromium Accessibility.getFullAXTree';
    });
    data.hiddenControls = data.controls.filter(control => !control.rendered);
    data.controls = data.controls.filter(control => control.rendered);
  } finally {
    await session.detach();
  }
}

async function focusedMetric(page, selector) {
  return page.evaluate(selector => {
    const root = document.querySelector(selector)?.shadowRoot, element = root?.activeElement;
    if (!element) return { inside: false };
    const style = getComputedStyle(element);
    const opaque = element => {
      while (element) {
        const color = getComputedStyle(element).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
        element = element.parentElement ?? element.getRootNode().host;
      }
      return 'rgb(255, 255, 255)';
    };
    return { inside: true, className: element.className, name: element.textContent.trim(), focusVisible: element.matches(':focus-visible'), outlineWidth: parseFloat(style.outlineWidth), outlineStyle: style.outlineStyle, outlineColor: style.outlineColor, background: opaque(element), surroundingBackground: opaque(element.parentElement) };
  }, selector);
}

async function keyboardProbe(page) {
  const count = await page.locator(`${modalHost} a[href], ${modalHost} button:not(:disabled)`).count();
  // Start and finish through keyboard navigation, not an assumed programmatic
  // focus-visible state. A modal must wrap in both directions.
  await page.locator(`${modalHost} .close`).focus();
  await page.keyboard.press('Shift+Tab');
  const reverse = await focusedMetric(page, modalHost);
  await page.keyboard.press('Tab');
  const focus = [];
  for (let index = 0; index < count; index++) {
    focus.push(await focusedMetric(page, modalHost));
    await page.keyboard.press('Tab');
  }
  const afterCycle = await focusedMetric(page, modalHost);
  await page.locator(`${modalHost} .refresh`).focus();
  await page.keyboard.press('Enter');
  const refreshRetained = await page.evaluate(() => document.querySelector('[data-easyweb-host]').shadowRoot.activeElement?.classList.contains('refresh'));
  await page.keyboard.press('Escape');
  const restored = await page.evaluate(() => !document.querySelector('[data-easyweb-host]') && document.activeElement?.id === 'launch');
  return { count, focus, reverse, afterCycle, refreshRetained, restored };
}

function addContrast(data) {
  for (const control of data.controls) {
    control.textContrast = contrastRatio(control.foreground, control.background);
    control.componentContrast = control.borderWidth > 0 && control.borderStyle !== 'none'
      ? Math.min(contrastRatio(control.borderColor, control.background) ?? 0, contrastRatio(control.borderColor, control.surroundingBackground) ?? 0)
      : control.textContrast;
  }
  if (data.sourceOutline) data.sourceOutline.contrast = contrastRatio(data.sourceOutline.color, data.sourceOutline.background);
}

function addFocusContrast(record) {
  if (!record?.inside) return record;
  return { ...record, contrast: Math.min(contrastRatio(record.outlineColor, record.background) ?? 0, contrastRatio(record.outlineColor, record.surroundingBackground) ?? 0) };
}

export async function runA11yCheck({ output = reportFile, screenshots = true } = {}) {
  const screenshotDir = join(dirname(output), 'a11y-screenshots');
  const sourceBefore = await sourceHashes();
  const built = await build({ entryPoints: ['src/content.ts'], bundle: true, write: false, format: 'iife', loader: { '.css': 'text' } });
  const bundle = built.outputFiles[0].text;
  const browser = await chromium.launch({ headless: true });
  const report = {
    checkedAt: new Date().toISOString(),
    scope: 'Current source bundled in memory; synthetic page and EasyWeb shadow hosts only. No deployment/activeTab or live-site validation.',
    bundleSHA256: createHash('sha256').update(bundle).digest('hex'),
    sourceHashes: sourceBefore,
    browser: browser.version(), axeVersion: axe.version,
    emulationBoundary: '720 CSS px is a 200-percent-layout viewport comparison; 320 CSS px is the WCAG reflow width often reached at 400 percent from 1280. Neither is a real browser zoom test. Forced colors/reduced motion are Playwright media emulation.',
    manualChecksRemaining: ['Actual browser 200% and 400% zoom', 'VoiceOver with Chrome announcements and focus', 'NVDA/Windows if environment available'],
    contrastAuditBoundary: 'After a menu transition may scroll its first card into view, normalize dialog scroll to the top for the whole-content axe/contrast snapshot. Keyboard transition focus and actual scrolled navigation are separately tested; this does not simulate native zoom.',
    cases: [], errors: [],
  };
  if (screenshots) await mkdir(screenshotDir, { recursive: true });
  try {
    for (const mode of modes) {
      const context = await browser.newContext({ viewport: mode.viewport, forcedColors: mode.forcedColors ?? 'none', reducedMotion: mode.reducedMotion ?? 'no-preference' });
      const page = await context.newPage();
      page.setDefaultTimeout(5000);
      await page.route('https://source.test/**', route => route.fulfill({ contentType: 'text/html', body: fixture('normal') }));
      await page.goto('https://source.test/a11y');
      for (const state of mode.states) {
        const id = `${mode.id}-${state}`;
        try {
          const selector = await prepare(page, bundle, state);
          const scrollBeforeContrastAudit = selector === modalHost ? await page.locator(`${modalHost} dialog`).evaluate(dialog => {
            const original = dialog.scrollTop; dialog.scrollTop = 0; return original;
          }) : null;
          const data = await metrics(page, selector);
          await accessibilityNames(page, selector, data);
          addContrast(data);
          await page.addScriptTag({ content: axe.source });
          const result = await page.evaluate(async selector => {
            const result = await axe.run({ include: [selector] });
            return { violations: result.violations, incomplete: result.incomplete, passes: result.passes.map(rule => rule.id), inapplicable: result.inapplicable.map(rule => rule.id) };
          }, selector);
          const record = { id, state, viewport: mode.viewport, scrollBeforeContrastAudit, ...data, axe: result, screenshots: [] };
          if (screenshots) {
            const top = `${screenshotDir}/${id}.png`;
            await page.screenshot({ path: top });
            record.screenshots.push(top);
            if (state === 'long') {
              await page.locator(`${modalHost} .card[data-category="academic"]`).first().evaluate(card => card.scrollIntoView({ block: 'start' }));
              const middle = `${screenshotDir}/${id}-middle.png`;
              await page.screenshot({ path: middle });
              record.screenshots.push(middle);
            }
            if (mode.viewport.width <= 390 && selector === modalHost) {
              await page.locator(`${modalHost} dialog`).evaluate(dialog => { dialog.scrollTop = dialog.scrollHeight; });
              const bottom = `${screenshotDir}/${id}-bottom.png`;
              await page.screenshot({ path: bottom });
              record.screenshots.push(bottom);
              await page.locator(`${modalHost} dialog`).evaluate(dialog => { dialog.scrollTop = 0; });
            }
            if (state === 'long') await page.locator(`${modalHost} dialog`).evaluate(dialog => { dialog.scrollTop = 0; });
          }
          if (['normal', 'overflow', 'overflow-next'].includes(state) && ['desktop', 'forced-colors'].includes(mode.id)) {
            if (mode.id === 'desktop') {
              record.hoverControls = [];
              for (const target of ['.card', '.close']) {
                await page.locator(`${modalHost} ${target}`).first().hover();
                await page.waitForTimeout(180);
                const hovered = await metrics(page, modalHost);
                addContrast(hovered);
                record.hoverControls.push(...hovered.controls.filter(control => control.hovered));
              }
              await page.mouse.move(0, 0);
            }
            record.keyboard = await keyboardProbe(page);
            record.keyboard.focus = record.keyboard.focus.map(addFocusContrast);
            record.keyboard.reverse = addFocusContrast(record.keyboard.reverse);
            record.keyboard.afterCycle = addFocusContrast(record.keyboard.afterCycle);
          } else if (selector === noticeHost) {
            await page.locator(`${noticeHost} button`).focus();
            // The source action was invoked with Enter, so focus-visible remains
            // keyboard-based even though the status notice does not steal focus.
            record.noticeFocus = addFocusContrast(await focusedMetric(page, noticeHost));
          }
          report.cases.push(record);
        } catch (error) {
          report.errors.push({ id, message: String(error?.stack ?? error) });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  report.sourceStable = JSON.stringify(sourceBefore) === JSON.stringify(await sourceHashes());
  if (!report.sourceStable) report.errors.push({ id: 'source-stability', message: 'Source changed during accessibility verification.' });
  report.summary = {
    cases: report.cases.length, errors: report.errors.length,
    violations: report.cases.reduce((sum, record) => sum + record.axe.violations.length, 0),
    seriousOrCritical: report.cases.reduce((sum, record) => sum + record.axe.violations.filter(rule => ['serious', 'critical'].includes(rule.impact)).length, 0),
    incomplete: report.cases.reduce((sum, record) => sum + record.axe.incomplete.length, 0),
    horizontalOverflowCases: report.cases.filter(record => record.horizontalOverflow).map(record => record.id),
    smallTargets: report.cases.flatMap(record => record.controls.filter(control => control.width < 48 || control.height < 48).map(control => ({ case: record.id, name: control.name, width: control.width, height: control.height }))),
    lowComponentContrast: report.cases.flatMap(record => [...record.controls, ...(record.hoverControls ?? [])].filter(control => !control.disabled && control.componentContrast !== null && control.componentContrast < 3).map(control => ({ case: record.id, name: control.name, contrast: control.componentContrast }))),
    lowFocusContrast: report.cases.flatMap(record => [...(record.keyboard?.focus ?? []), ...(record.noticeFocus ? [record.noticeFocus] : [])].filter(focus => !focus.focusVisible || focus.outlineWidth < 3 || focus.contrast < 3).map(focus => ({ case: record.id, ...focus }))),
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length) ?? reportFile;
  const report = await runA11yCheck({ output });
  console.log(JSON.stringify({ report: output, ...report.summary }, null, 2));
  if (report.summary.errors || report.summary.violations || report.summary.horizontalOverflowCases.length || report.summary.smallTargets.length || report.summary.lowComponentContrast.length || report.summary.lowFocusContrast.length) process.exitCode = 1;
}
