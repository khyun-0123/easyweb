import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Read-only survey of public sites: each home page plus internal pages reached
// by same-hostname links (board list, one post, FAQ, service guide, location,
// academic). For every page it saves (1) the visible controls with an index,
// for an engine-blind importance review, and (2) the engine's common row, cards
// and later menus, bound to the same indices by element identity rather than
// by name. No clicks, no input, no form values. Headless only.
for (const arg of process.argv.slice(2)) if (!/^--(?:seeds|output-dir|html-dir|max-pages|replay|composition)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const seedsFile = value('seeds'), outputDir = value('output-dir'), htmlDir = value('html-dir');
const maxPages = Number(value('max-pages') ?? 7);
const replay = value('replay');
if ((!seedsFile && !replay) || !outputDir || !htmlDir) throw Error('--seeds=<file> --output-dir=<new empty dir> --html-dir=<new empty dir> are required');
for (const dir of replay ? [outputDir] : [outputDir, htmlDir]) {
  await mkdir(dir, { recursive: true });
  if ((await readdir(dir)).length) throw Error(`${dir} must be empty`);
}
await mkdir(path.join(outputDir, 'elements'));

const engine = await build({ stdin: {
  contents: `import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier'; import {rank, remainingMenus} from './src/ranker'; import {isHomePage, commonActions, withoutCommon} from './src/common-actions';
const commonOnly=(raw,classified)=>{const common=commonActions(raw,classified);const pool=withoutCommon(classified,common);return {type:'default',common,cards:rank(pool),pool};}; import {composeFirstScreen} from './src/page-types';
window.easywebSurvey=()=>{const els=window.__surveyEls??[];const raw=analyzePage();const classified=classify(raw);const screen=${value('composition') === 'common-only' ? 'commonOnly' : 'composeFirstScreen'}(raw,classified);const common=screen.common;const rest=screen.pool;const cards=screen.cards;
const show=c=>({i:els.indexOf(c.element),category:c.category??null,label:c.label,title:c.title??null,action:c.action,section:c.sectionLabel??null,context:c.context,score:c.score??null,pageTask:c.pageTask??null,reason:(c.reasons??[])[0]??null});
return {pageType:screen.type,homePage:isHomePage(),candidateCount:raw.length,classifiedCount:classified.length,common:common.map(({kind,candidate})=>({kind,...show(candidate)})),cards:cards.map(show),more:[...remainingMenus(rest,cards)].slice(0,40).map(show)};};`,
  resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife' });

const collect = () => {
  const clip = (s, n) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const visible = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    }
    return true;
  };
  const region = el => {
    const r = el.closest('header,nav,main,aside,footer,[role=banner],[role=navigation],[role=main],[role=contentinfo]');
    return r ? (r.getAttribute('role') || r.tagName.toLowerCase()) : '-';
  };
  const safeText = el => {
    let out = '';
    const walk = n => {
      if (n.nodeType === 3) { out += n.textContent; return; }
      if (n.nodeType !== 1) return;
      if (n.matches('input,textarea,select,[contenteditable=""],[contenteditable=true],script,style')) return;
      if (n.tagName === 'IMG') { out += ' ' + (n.getAttribute('alt') || ''); return; }
      n.childNodes.forEach(walk);
    };
    walk(el);
    return out;
  };
  const heading = el => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const h = n.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > * > h2, :scope > * > h3');
      if (h && !h.contains(el)) return clip(safeText(h), 40);
    }
    return '';
  };
  const items = [], elements = [], links = [];
  for (const el of document.querySelectorAll('a[href], button, input, select, textarea, [role=button], [role=link], [role=tab], [role=searchbox], [role=textbox]')) {
    if (!visible(el)) continue;
    const isField = el.matches('input,select,textarea');
    const type = el.tagName === 'INPUT' ? (el.getAttribute('type') || 'text').toLowerCase() : '';
    if (type === 'hidden') continue;
    const label = isField
      ? clip(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || (el.labels?.[0] ? safeText(el.labels[0]) : ''), 60)
      : clip(safeText(el) || el.getAttribute('aria-label') || el.getAttribute('title'), 80);
    let href = '';
    if (el.tagName === 'A') {
      const raw = el.getAttribute('href') || '';
      try {
        const u = new URL(raw, location.href);
        href = u.protocol.startsWith('http') ? (u.host === location.host ? '' : u.host) + u.pathname + (u.search ? '?…' : '') : u.protocol;
        if (u.protocol.startsWith('http') && u.hostname === location.hostname && !/\.(?:pdf|hwpx?|docx?|xlsx?|zip|jpg|png)$/i.test(u.pathname))
          links.push({ i: items.length, label: clip(safeText(el) || el.getAttribute('title'), 60), url: u.href.replace(/#.*$/, ''), region: region(el) });
      } catch { href = raw.slice(0, 20); }
    }
    const r = el.getBoundingClientRect();
    elements.push(el);
    items.push({ tag: el.tagName.toLowerCase() + (type ? `:${type}` : ''), label, href, region: region(el), heading: heading(el),
      y: Math.round(r.top + scrollY), fs: Math.round(parseFloat(getComputedStyle(el).fontSize)) });
  }
  window.__surveyEls = elements;
  // Discovery also reads closed drop-down menus; it never opens them.
  const menuLinks = [];
  for (const a of document.querySelectorAll('a[href]')) {
    try {
      const u = new URL(a.getAttribute('href'), location.href);
      if (u.protocol.startsWith('http') && u.hostname === location.hostname && !/\.(?:pdf|hwpx?|docx?|xlsx?|zip|jpg|png)$/i.test(u.pathname))
        menuLinks.push({ label: clip(safeText(a) || a.getAttribute('title'), 60), url: u.href.replace(/#.*$/, ''), region: region(a), visible: visible(a) });
    } catch {}
  }
  const headings = [...document.querySelectorAll('h1,h2,h3')].filter(visible).map(h => `${h.tagName.toLowerCase()} ${clip(safeText(h), 50)}`);
  return { title: document.title, headings, items, links, menuLinks, pageHeight: document.documentElement.scrollHeight };
};

// Generic label cues only; no site-specific paths.
const buckets = [
  { kind: 'board', exact: /^(?:공지\s*사항|공지|새\s*소식|공지\s*\/?\s*새소식|알림\s*마당|통합\s*공지|시정\s*소식|보도\s*자료|고시\s*\/?\s*공고|공고|notice)$/i, loose: /공지|새\s*소식|보도\s*자료|고시|공고|notice/i },
  { kind: 'faq', exact: /^(?:자주\s*(?:묻는|하는)\s*질문|faq|q\s*&\s*a|묻고\s*답하기)$/i, loose: /자주\s*(?:묻는|하는)|faq|질문|q\s*&\s*a|qna/i },
  { kind: 'service', exact: /^(?:민원\s*(?:안내|신청|서비스)?|전자\s*민원|민원\s*편람|서비스\s*안내|증명서\s*발급|분야별\s*정보|이용\s*안내)$/, loose: /민원|신청|발급|서비스\s*안내|이용\s*안내|예약/ },
  { kind: 'location', exact: /^(?:오시는\s*길|찾아\s*오시는\s*길|위치\s*안내|조직도|부서\s*안내|전화\s*번호\s*안내)$/, loose: /오시는\s*길|찾아\s*오시는|위치\s*안내|조직|부서\s*안내|전화\s*번호/ },
  { kind: 'academic', exact: /^(?:학사\s*일정|학사\s*안내|학사\s*공지|수강\s*신청)$/, loose: /학사|수강/ },
  { kind: 'guide', exact: /^(?:이용\s*가이드|이용\s*방법|처음\s*오셨나요|사이트\s*이용\s*안내|진료\s*안내|진료\s*예약|대출\s*안내|열람\s*안내)$/, loose: /가이드|이용\s*방법|진료|대출|열람/ },
];
const postPath = /(?:view|detail|read|article|nttid|bbsid|seq|idx|articleno|boardid|no=)/i;

function pick(links, bucket, seen) {
  const ok = links.filter(link => link.label && link.label.length <= 20 && !seen.has(link.url) && (bucket.exact.test(link.label) || bucket.loose.test(link.label)));
  const score = link => (bucket.exact.test(link.label) ? 0 : 10) + (link.visible ? 0 : 2) + (['nav', 'navigation', 'header', 'banner'].includes(link.region) ? 0 : 1);
  return ok.sort((a, b) => score(a) - score(b) || a.label.length - b.label.length)[0];
}
// A gate page chooses between sites; its own main page is surveyed as well.
const mainLink = /(?:대표\s*(?:홈페이지|누리집)|메인\s*(?:홈페이지|화면))/;

async function observe(browser, url, savedHtml) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, locale: 'ko-KR' });
  try {
    // Replay: the saved rendered DOM at its original address, site scripts
    // blocked so the DOM stays as reviewed; stylesheets and images still load.
    if (savedHtml) await page.route('**/*', route => route.request().isNavigationRequest()
      ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: savedHtml })
      : route.request().resourceType() === 'script' ? route.abort() : route.continue());
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Page.enable');
    const { frameTree } = await cdp.send('Page.getFrameTree');
    const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'easyweb-site-survey' });
    const run = async expression => {
      const result = await cdp.send('Runtime.evaluate', { expression, contextId: executionContextId, returnByValue: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description?.slice(0, 200) ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const data = JSON.parse(await run(`JSON.stringify((${collect.toString()})())`));
    await run(engine.outputFiles[0].text);
    const engineResult = JSON.parse(await run('JSON.stringify(window.easywebSurvey())'));
    const html = await page.content();
    await cdp.detach();
    return { finalUrl: page.url(), httpStatus: response?.status() ?? null, data, engine: engineResult, html };
  } finally { await page.close(); }
}

const browser = await chromium.launch({ headless: true });
const pages = [];
const key = line => line.split(' | ').slice(1, 6).join(' | ');
if (replay) {
  // Re-run the current engine on the pages of an earlier survey and express
  // its choices in that survey's element indices (matched by tag, name, href,
  // region and heading, in order), so the earlier review stays applicable.
  const earlier = JSON.parse(await readFile(path.join(replay, 'survey.json'), 'utf8')).pages.filter(page => !page.error);
  try {
    for (const target of earlier) {
      let savedHtml;
      try { savedHtml = await readFile(path.join(htmlDir, `${target.pageId}.html`), 'utf8'); } catch { continue; }
      const original = (await readFile(path.join(replay, 'elements', `${target.pageId}.txt`), 'utf8')).split('\n').filter(line => /^\d+ \|/.test(line));
      const slots = new Map();
      original.forEach((line, i) => { const k = key(line); slots.set(k, [...(slots.get(k) ?? []), i]); });
      let observed;
      try { observed = await observe(browser, target.finalUrl, savedHtml); }
      catch (error) { pages.push({ ...target, engine: undefined, error: String(error).slice(0, 300) }); continue; }
      const used = new Map();
      const mapIndex = observed.data.items.map(item => {
        const k = [item.tag, item.label, item.href, item.region, item.heading].join(' | ');
        const n = used.get(k) ?? 0; used.set(k, n + 1);
        return slots.get(k)?.[n] ?? -1;
      });
      const remap = list => list.map(item => ({ ...item, i: item.i >= 0 ? mapIndex[item.i] : -1 }));
      const engineResult = { ...observed.engine, common: remap(observed.engine.common), cards: remap(observed.engine.cards), more: remap(observed.engine.more) };
      pages.push({ ...target, engine: engineResult, replay: { controls: observed.data.items.length, originalControls: original.length, mapped: mapIndex.filter(i => i >= 0).length } });
      console.log(`${target.pageId}: ${engineResult.pageType} · mapped ${mapIndex.filter(i => i >= 0).length}/${original.length} · ${engineResult.cards.map(c => (c.title ?? c.label).slice(0, 14)).join(' / ')}`);
    }
  } finally { await browser.close(); }
  await writeFile(path.join(outputDir, 'survey.json'), JSON.stringify({ checkedAt: new Date().toISOString(), replayOf: replay,
    scope: 'Replay of saved rendered HTML (site scripts blocked) with the current engine. Indices refer to the earlier survey elements/*.txt.', pages }, null, 2) + '\n');
  process.exit(0);
}
const seeds = JSON.parse(await readFile(seedsFile, 'utf8')).sites;
try {
  for (const site of seeds) {
    const seen = new Set();
    const queue = [{ kind: 'home', url: site.url, via: null }];
    let count = 0;
    while (queue.length && count < maxPages) {
      const target = queue.shift();
      if (seen.has(target.url)) continue;
      seen.add(target.url);
      const pageId = `${site.siteId}-${target.kind}`;
      let observed;
      try { observed = await observe(browser, target.url); }
      catch (error) { pages.push({ siteId: site.siteId, group: site.group, pageId, kind: target.kind, url: target.url, error: String(error).slice(0, 300) }); continue; }
      count += 1;
      seen.add(observed.finalUrl);
      const { data, engine: result } = observed;
      if (target.kind === 'home' || target.kind === 'main') {
        const main = target.kind === 'home' && data.menuLinks.find(link => mainLink.test(link.label) && !seen.has(link.url));
        if (main) queue.unshift({ kind: 'main', url: main.url, via: main.label });
        else for (const bucket of buckets) {
          if (bucket.kind === 'academic' && site.group !== 'university') continue;
          const link = pick(data.menuLinks, bucket, seen);
          if (link) queue.push({ kind: bucket.kind, url: link.url, via: link.label });
        }
        for (const extra of target.kind === 'home' ? site.extra ?? [] : []) queue.push(extra);
      }
      if (target.kind === 'board') {
        // One post of this board: a same-host link in the main list whose URL names a document.
        const post = data.links.find(link => !seen.has(link.url) && postPath.test(link.url) && link.label.length >= 8
          && !['nav', 'navigation', 'header', 'banner', 'footer', 'contentinfo'].includes(link.region));
        if (post) queue.unshift({ kind: 'post', url: post.url, via: post.label });
      }
      const lines = [`# ${site.name} (${site.group}) · ${pageId}`, `url: ${observed.finalUrl}`, `title: ${data.title}`,
        `reached-by: ${target.via ?? '(home)'}`, `headings: ${data.headings.join(' / ').slice(0, 1500)}`, '',
        'i | tag | label | href | region | heading | y | fontPx'];
      data.items.forEach((item, i) => lines.push([i, item.tag, item.label, item.href, item.region, item.heading, item.y, item.fs].join(' | ')));
      await writeFile(path.join(outputDir, 'elements', `${pageId}.txt`), lines.join('\n') + '\n');
      await writeFile(path.join(htmlDir, `${pageId}.html`), observed.html);
      pages.push({ siteId: site.siteId, siteName: site.name, group: site.group, pageId, kind: target.kind, reachedBy: target.via,
        url: target.url, finalUrl: observed.finalUrl, httpStatus: observed.httpStatus, title: data.title, controls: data.items.length,
        pageHeight: data.pageHeight, engine: result });
      console.log(`${pageId}: ${data.items.length} controls · cards ${result.cards.map(c => c.label.slice(0, 16)).join(' / ')}`);
    }
  }
} finally { await browser.close(); }
await writeFile(path.join(outputDir, 'survey.json'), JSON.stringify({ checkedAt: new Date().toISOString(),
  scope: 'Live public pages, read-only headless Chromium 1440x1080, ko-KR, DOMContentLoaded+load+1.5s. Engine output with element indices matching elements/*.txt. Not task completion, not a user study.',
  pages }, null, 2) + '\n');
