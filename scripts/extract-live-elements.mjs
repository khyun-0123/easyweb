import { chromium } from '@playwright/test';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Saves each core page's rendered HTML and a compact list of visible controls
// for an importance review that does not use the engine. Read-only: no clicks,
// no input. Form controls contribute only their labels, never their values.
for (const arg of process.argv.slice(2)) if (!/^--(?:output-dir|html-dir)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const outputDir = value('output-dir'), htmlDir = value('html-dir');
if (!outputDir || !htmlDir) throw Error('--output-dir=<new empty dir> --html-dir=<new empty dir> are required');
for (const dir of [outputDir, htmlDir]) {
  await mkdir(dir, { recursive: true });
  if ((await readdir(dir)).length) throw Error(`${dir} must be empty`);
}

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
  // Text of an element without descending into editable controls.
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
  const items = [];
  for (const el of document.querySelectorAll('a[href], button, input, select, [role=button], [role=link], [role=tab], [role=searchbox]')) {
    if (!visible(el)) continue;
    const isField = el.matches('input,select');
    const type = el.tagName === 'INPUT' ? (el.getAttribute('type') || 'text').toLowerCase() : '';
    if (type === 'hidden') continue;
    const label = isField
      ? clip(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('title') || (el.labels?.[0] ? safeText(el.labels[0]) : ''), 60)
      : clip(safeText(el) || el.getAttribute('aria-label') || el.getAttribute('title'), 80);
    let href = '';
    if (el.tagName === 'A') {
      const raw = el.getAttribute('href') || '';
      try { const u = new URL(raw, location.href); href = u.protocol.startsWith('http') ? (u.host === location.host ? '' : u.host) + u.pathname + (u.search ? '?…' : '') : u.protocol; } catch { href = raw.slice(0, 20); }
    }
    const r = el.getBoundingClientRect();
    items.push({ tag: el.tagName.toLowerCase() + (type ? `:${type}` : ''), label, href, region: region(el), heading: heading(el),
      y: Math.round(r.top + scrollY), fs: Math.round(parseFloat(getComputedStyle(el).fontSize)) });
  }
  const headings = [...document.querySelectorAll('h1,h2,h3')].filter(visible).map(h => `${h.tagName.toLowerCase()} ${clip(safeText(h), 50)}`);
  return { title: document.title, headings, items };
};

const pages = [];
for (const file of (await readdir('evaluation/sites')).filter(name => name.endsWith('.json')).sort()) {
  const site = JSON.parse(await readFile(`evaluation/sites/${file}`, 'utf8'));
  for (const page of site.pages) pages.push({ siteName: site.name, siteType: site.type, pageId: page.id, url: page.finalUrl || page.url });
}
const browser = await chromium.launch({ headless: true });
const summary = [];
try {
  for (const target of pages) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
    try {
      const response = await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      await writeFile(path.join(htmlDir, `${target.pageId}.html`), await page.content());
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.enable');
      const { frameTree } = await cdp.send('Page.getFrameTree');
      const { executionContextId } = await cdp.send('Page.createIsolatedWorld', { frameId: frameTree.frame.id, worldName: 'easyweb-element-review' });
      const observed = await cdp.send('Runtime.evaluate', { expression: `JSON.stringify((${collect.toString()})())`, contextId: executionContextId, returnByValue: true });
      if (observed.exceptionDetails) throw Error(observed.exceptionDetails.exception?.description?.slice(0, 200) ?? observed.exceptionDetails.text);
      await cdp.detach();
      const data = JSON.parse(observed.result.value);
      const lines = [`# ${target.siteName} (${target.siteType}) · ${target.pageId}`, `url: ${page.url()}`, `title: ${data.title}`,
        `headings: ${data.headings.join(' / ')}`, '', 'i | tag | label | href | region | heading | y | fontPx'];
      data.items.forEach((item, i) => lines.push([i, item.tag, item.label, item.href, item.region, item.heading, item.y, item.fs].join(' | ')));
      await writeFile(path.join(outputDir, `${target.pageId}.txt`), lines.join('\n') + '\n');
      summary.push({ ...target, finalUrl: page.url(), httpStatus: response?.status() ?? null, controls: data.items.length });
    } catch (error) {
      summary.push({ ...target, error: String(error).slice(0, 300) });
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({ checkedAt: new Date().toISOString(), scope: 'Visible controls of live public pages for an engine-independent importance review. Labels only; no form values.', pages: summary }, null, 2) + '\n');
console.log(summary.map(s => `${s.pageId}: ${s.error ?? s.controls + ' controls'}`).join('\n'));
