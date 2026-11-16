import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Scores model picks (scripts/ml/ondevice-llm.mjs or ondevice-embed.py) against
// the engine-blind review, next to the current engine's first screen. Same
// measure as scripts/survey-analysis.mjs: an essential control counts when it
// is a card or in the common row. The common row stays rule-based in every
// variant. "hybrid" keeps the engine's list/post/gate slots and uses the
// model elsewhere; "home" uses the model on home-type pages only.
for (const arg of process.argv.slice(2)) if (!/^--(?:engine|review|picks|output)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const engineFile = value('engine'), reviewDir = value('review'), output = value('output');
const pickFiles = value('picks')?.split(',');
if (!engineFile || !reviewDir || !pickFiles || !output) throw Error('--engine=survey.json --review=<dir> --picks=a.json,b.json --output=<file.json>');

const engine = new Map(JSON.parse(await readFile(engineFile, 'utf8')).pages.filter(page => !page.error).map(page => [page.pageId, page]));
const reviews = new Map();
for (const file of (await readdir(reviewDir)).filter(name => name.endsWith('.json'))) {
  const review = JSON.parse(await readFile(path.join(reviewDir, file), 'utf8'));
  reviews.set(review.pageId, review);
}
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;
const quantile = (values, q) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };

function score(cardsFor) {
  const total = { essential: 0, covered: 0, cards: 0, useful: 0 };
  const byType = {}, bySite = {};
  for (const [pageId, review] of reviews) {
    const page = engine.get(pageId);
    const cards = page && cardsFor(pageId, page, review);
    if (!cards) continue;
    const E = new Set(review.essential.map(item => item.i)), U = new Set((review.useful ?? []).map(item => item.i));
    const row = page.engine.common.map(item => item.i);
    const covered = review.essential.filter(item => cards.includes(item.i) || row.includes(item.i)).length;
    const useful = cards.filter(i => E.has(i) || U.has(i)).length;
    const site = bySite[page.siteId] ??= { essential: 0, covered: 0 };
    site.essential += review.essential.length; site.covered += covered;
    for (const bucket of [total, byType[review.pageType] ??= { pages: 0, essential: 0, covered: 0, cards: 0, useful: 0 }]) {
      bucket.essential += review.essential.length; bucket.covered += covered; bucket.cards += cards.length; bucket.useful += useful;
      if (bucket !== total) bucket.pages++;
    }
  }
  const view = bucket => ({ coverage: pct(bucket.covered, bucket.essential), usefulPrecision: pct(bucket.useful, bucket.cards), cards: bucket.cards });
  return { ...view(total), bySite, byType: Object.fromEntries(Object.entries(byType).sort((a, b) => b[1].pages - a[1].pages).map(([type, bucket]) => [type, { pages: bucket.pages, ...view(bucket) }])) };
}

// Site-level paired bootstrap of the coverage difference against the engine.
function versus(variant, base) {
  const sites = Object.keys(base.bySite);
  let seed = 20261115;
  const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const diffs = [];
  for (let n = 0; n < 2000; n++) {
    let e = 0, a = 0, b = 0;
    for (let k = 0; k < sites.length; k++) { const site = sites[Math.floor(random() * sites.length)]; e += base.bySite[site].essential; a += variant.bySite[site]?.covered ?? 0; b += base.bySite[site].covered; }
    diffs.push(100 * (a - b) / e);
  }
  diffs.sort((x, y) => x - y);
  return { coverageDiff: Math.round(10 * (variant.coverage - base.coverage)) / 10, interval95: [Math.round(10 * diffs[50]) / 10, Math.round(10 * diffs[1949]) / 10] };
}

const engineCards = (pageId, page) => page.engine.cards.map(card => card.i).filter(i => i >= 0);
const result = { checkedAt: new Date().toISOString(), measure: 'essential in cards or common row; useful = card in essential or useful', engine: score(engineCards), models: {} };
for (const file of pickFiles) {
  const run = JSON.parse(await readFile(file, 'utf8'));
  const picks = new Map(run.pages.map(page => [page.pageId, page.picks]));
  const model = (pageId, page) => picks.get(pageId);
  const hybrid = (pageId, page) => ['list', 'post', 'gate'].includes(page.engine.pageType) ? engineCards(pageId, page) : picks.get(pageId);
  const home = (pageId, page, review) => review.pageType === 'home' ? picks.get(pageId) : engineCards(pageId, page);
  const timed = run.pages.filter(page => page.wallMs != null && !page.error);
  result.models[run.model] = {
    file: path.basename(file), cpuThreads: run.cpuThreads ?? null,
    failures: run.pages.filter(page => page.error || page.parseError).length, invalidPicks: run.pages.reduce((n, page) => n + (page.invalid?.length ?? 0), 0),
    latencyMs: timed.length ? { median: quantile(timed.map(p => p.wallMs), 0.5), p90: quantile(timed.map(p => p.wallMs), 0.9), max: Math.max(...timed.map(p => p.wallMs)) } : null,
    promptTokens: timed.length && timed[0].promptTokens != null ? { median: quantile(timed.map(p => p.promptTokens), 0.5), p90: quantile(timed.map(p => p.promptTokens), 0.9) } : null,
    alone: score(model), hybrid: score(hybrid), homeOnly: score(home),
  };
  for (const variant of ['alone', 'hybrid', 'homeOnly']) result.models[run.model][variant].versusEngine = versus(result.models[run.model][variant], result.engine);
}
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
const line = (name, s) => `${name.padEnd(28)} cover ${s.coverage}% useful ${s.usefulPrecision}% ${s.versusEngine ? JSON.stringify(s.versusEngine.interval95) : ''} | ${Object.entries(s.byType).map(([t, b]) => `${t} ${b.coverage}`).join(' ')}`;
console.log(line('engine', result.engine));
for (const [name, m] of Object.entries(result.models)) {
  console.log(`-- ${name} fail ${m.failures} invalid ${m.invalidPicks} latency ${JSON.stringify(m.latencyMs)} tokens ${JSON.stringify(m.promptTokens)}`);
  for (const variant of ['alone', 'hybrid', 'homeOnly']) console.log(line(`   ${variant}`, m[variant]));
}
