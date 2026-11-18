import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// "Rules first, AI only where the rules ask for it" check (docs/reviews/business_review_20261118.md
// section 7). Diagnostic only, no model is called: it replays picks that were already saved and
// hashed before the first score, and asks how much of the AI gain survives when the AI is called
// only on pages the engine could not type, and how many pages that would send out.
//   blocked  = page has a password field, or its title says login / identity check / payment / my page
//   ruled    = engine typed it list, post, gate, or home
//   target   = everything else; the model's picks are used there (empty or failed picks -> engine)
for (const arg of process.argv.slice(2)) if (!/^--(?:engine|review|picks|output)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const engineFile = value('engine'), reviewDir = value('review'), output = value('output');
const pickFiles = value('picks')?.split(',');
if (!engineFile || !reviewDir || !pickFiles || !output) throw Error('--engine=<survey.json> --review=<dir> --picks=a.json,b.json --output=<file.json>');

const elementsDir = path.join(path.dirname(engineFile), 'elements');
const engine = new Map(JSON.parse(await readFile(engineFile, 'utf8')).pages.filter(page => !page.error).map(page => [page.pageId, page]));
const reviews = new Map();
for (const file of (await readdir(reviewDir)).filter(name => name.endsWith('.json'))) {
  const review = JSON.parse(await readFile(path.join(reviewDir, file), 'utf8'));
  if (engine.has(review.pageId)) reviews.set(review.pageId, review);
}

const SENSITIVE_TITLE = /로그인|본인\s*인증|본인확인|결제|마이\s*페이지|회원\s*정보|비밀번호/;
const gate = {};
for (const pageId of reviews.keys()) {
  const page = engine.get(pageId);
  const text = await readFile(path.join(elementsDir, pageId + '.txt'), 'utf8');
  const title = (text.match(/^title: (.*)$/m)?.[1] ?? '').split('|')[0];
  const password = /^\d+ \| input:password \|/m.test(text);
  if (password || SENSITIVE_TITLE.test(title)) gate[pageId] = { route: 'blocked', why: password ? 'password field' : `title: ${title.trim()}` };
  else if (page.engine.homePage) gate[pageId] = { route: 'ruled', why: 'home' };
  else if (['list', 'post', 'gate'].includes(page.engine.pageType)) gate[pageId] = { route: 'ruled', why: page.engine.pageType };
  else gate[pageId] = { route: 'target', why: page.engine.pageType };
}

const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;
function score(cardsFor) {
  const total = { essential: 0, covered: 0, cards: 0, useful: 0 }, bySite = {}, byType = {};
  for (const [pageId, review] of reviews) {
    const page = engine.get(pageId), cards = cardsFor(pageId, page);
    const E = new Set(review.essential.map(item => item.i)), U = new Set((review.useful ?? []).map(item => item.i));
    const row = page.engine.common.map(item => item.i);
    const covered = review.essential.filter(item => cards.includes(item.i) || row.includes(item.i)).length;
    const site = bySite[page.siteId] ??= { essential: 0, covered: 0 };
    site.essential += review.essential.length; site.covered += covered;
    for (const bucket of [total, byType[review.pageType] ??= { pages: 0, essential: 0, covered: 0, cards: 0, useful: 0 }]) {
      bucket.essential += review.essential.length; bucket.covered += covered; bucket.cards += cards.length;
      bucket.useful += cards.filter(i => E.has(i) || U.has(i)).length;
      if (bucket !== total) bucket.pages++;
    }
  }
  const view = bucket => ({ coverage: pct(bucket.covered, bucket.essential), usefulPrecision: pct(bucket.useful, bucket.cards) });
  return { ...view(total), bySite, byType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1].pages - a[1].pages).map(([type, bucket]) => [type, { pages: bucket.pages, ...view(bucket) }])) };
}
// Same site-level paired bootstrap and seed as scripts/ml/ondevice-score.mjs.
function versus(variant, base) {
  const sites = Object.keys(base.bySite);
  let seed = 20261115;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const diffs = [];
  for (let n = 0; n < 2000; n++) {
    let e = 0, a = 0, b = 0;
    for (let k = 0; k < sites.length; k++) { const site = sites[Math.floor(random() * sites.length)]; e += base.bySite[site].essential; a += variant.bySite[site].covered; b += base.bySite[site].covered; }
    diffs.push(100 * (a - b) / e);
  }
  diffs.sort((x, y) => x - y);
  return { coverageDiff: Math.round(10 * (variant.coverage - base.coverage)) / 10, interval95: [Math.round(10 * diffs[50]) / 10, Math.round(10 * diffs[1949]) / 10] };
}

const engineCards = (pageId, page) => page.engine.cards.map(card => card.i).filter(i => i >= 0);
const base = score(engineCards);
const routes = Object.values(gate).reduce((n, g) => ({ ...n, [g.route]: (n[g.route] ?? 0) + 1 }), {});
const result = {
  checkedAt: new Date().toISOString(),
  scope: 'Diagnostic only. Replays saved picks; no model called. Reference is an engine-blind Claude review, not human users.',
  rule: { blocked: 'input:password on the page, or title matches ' + SENSITIVE_TITLE, ruled: 'engine home, list, post, gate', target: 'everything else' },
  pages: reviews.size, routes, gate,
  engine: base, models: {},
};
for (const file of pickFiles) {
  const run = JSON.parse(await readFile(file, 'utf8'));
  const picks = new Map(run.pages.map(page => [page.pageId, page.error || page.parseError ? [] : page.picks]));
  const gated = (pageId, page) => gate[pageId].route === 'target' && picks.get(pageId)?.length ? picks.get(pageId) : engineCards(pageId, page);
  const hybrid = (pageId, page) => ['list', 'post', 'gate'].includes(page.engine.pageType) ? engineCards(pageId, page) : picks.get(pageId) ?? engineCards(pageId, page);
  const calls = Object.entries(gate).filter(([pageId, g]) => g.route === 'target' && picks.get(pageId)?.length).length;
  const g = score(gated), h = score(hybrid);
  result.models[run.model] = { file: path.basename(file), gated: { ...g, versusEngine: versus(g, base), modelPages: calls }, hybrid: { ...h, versusEngine: versus(h, base) } };
}
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`routes ${JSON.stringify(routes)} of ${reviews.size}; engine ${base.coverage}%`);
for (const [name, m] of Object.entries(result.models)) {
  console.log(`${name.padEnd(30)} gated ${m.gated.coverage}% ${JSON.stringify(m.gated.versusEngine.interval95)} model on ${m.gated.modelPages} pages | hybrid ${m.hybrid.coverage}% ${JSON.stringify(m.hybrid.versusEngine.interval95)}`);
  console.log('   gated by type: ' + Object.entries(m.gated.byType).map(([t, b]) => `${t} ${b.coverage}`).join(' '));
}
