import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Stored-result stability check (docs/reviews/business_review_20261118.md section 7): if picks made
// on one collection are stored by a fixed key instead of the element index, how many are found
// again on a later collection of the same pages? Diagnostic only; nothing is called.
//   strict = label + short href + region      loose = label + short href      label = label only
//   nth    = strict key + its order among same-key controls on the page (resolves repeats)
// A key that matches more than one control on the new page counts as not found (ambiguous).
for (const arg of process.argv.slice(2)) if (!/^--(?:before|after|picks|output)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const before = value('before'), after = value('after'), output = value('output');
const pickFiles = value('picks')?.split(',');
if (!before || !after || !pickFiles || !output) throw Error('--before=<survey dir> --after=<survey dir> --picks=a.json[,engine] --output=<file.json>');

const REGIONS = new Set(['-', 'main', 'footer', 'nav', 'header', 'aside', 'navigation']);
async function rows(dir, pageId) {
  const text = await readFile(path.join(dir, 'elements', pageId + '.txt'), 'utf8').catch(() => null);
  if (!text) return null;
  const out = new Map(), seen = new Map();
  for (const line of text.split('\n')) {
    const cells = line.split(' | ');
    if (cells.length < 8 || !/^\d+$/.test(cells[0])) continue;
    const middle = cells.slice(2, -2);
    let k = 2;
    if (middle.length > 4) for (let n = 2; n < middle.length; n++) if (REGIONS.has(middle[n])) k = n;
    const r = { label: middle.slice(0, k - 1).join(' | '), href: middle[k - 1], region: middle[k] };
    const strict = `${r.label}\u0001${r.href}\u0001${r.region}`;
    seen.set(strict, (seen.get(strict) ?? 0) + 1);
    out.set(Number(cells[0]), { ...r, nth: seen.get(strict) });
  }
  return { url: text.match(/^url: (.*)$/m)?.[1] ?? '', items: out };
}
const keys = r => ({ nth: `${r.label}\u0001${r.href}\u0001${r.region}\u0001${r.nth}`, strict: `${r.label}\u0001${r.href}\u0001${r.region}`, loose: `${r.label}\u0001${r.href}`, label: r.label });
const survey = async dir => new Map(JSON.parse(await readFile(path.join(dir, 'survey.json'), 'utf8')).pages.filter(p => !p.error).map(p => [p.pageId, p]));
const old = await survey(before), now = await survey(after);

const sets = [];
for (const file of pickFiles) {
  if (file === 'engine') sets.push({ name: 'engine cards', picks: new Map([...old].map(([id, p]) => [id, p.engine.cards.map(c => c.i).filter(i => i >= 0)])) });
  else { const run = JSON.parse(await readFile(file, 'utf8')); sets.push({ name: run.model, picks: new Map(run.pages.filter(p => !p.error).map(p => [p.pageId, p.picks])) }); }
}

const result = { checkedAt: new Date().toISOString(), before, after, scope: 'Diagnostic only. Same seeds collected twice; reference is the earlier collection.', pages: {}, sets: {} };
const pageInfo = {};
for (const pageId of old.keys()) {
  const a = await rows(before, pageId), b = now.has(pageId) ? await rows(after, pageId) : null;
  pageInfo[pageId] = { a, b, sameUrl: !!b && a.url === b.url };
  result.pages[pageId] = b ? (a.url === b.url ? 'same url' : 'different url') : 'missing';
}
const tally = Object.values(result.pages).reduce((n, s) => ({ ...n, [s]: (n[s] ?? 0) + 1 }), {});
for (const set of sets) {
  const count = { picks: 0, nth: 0, strict: 0, loose: 0, label: 0, ambiguous: 0, pages: 0, pagesAllFound: 0 };
  for (const [pageId, info] of Object.entries(pageInfo)) {
    if (!info.sameUrl || !set.picks.has(pageId)) continue;
    const index = { nth: new Map(), strict: new Map(), loose: new Map(), label: new Map() };
    for (const r of info.b.items.values()) for (const [kind, key] of Object.entries(keys(r))) index[kind].set(key, (index[kind].get(key) ?? 0) + 1);
    let all = true;
    count.pages++;
    for (const i of set.picks.get(pageId)) {
      const r = info.a.items.get(i);
      if (!r) continue;
      count.picks++;
      const k = keys(r);
      if (index.strict.get(k.strict) === 1) count.strict++; else all = false;
      if (index.nth.get(k.nth) === 1) count.nth++;
      if (index.loose.get(k.loose) === 1) count.loose++;
      if (index.label.get(k.label) === 1) count.label++;
      if ((index.strict.get(k.strict) ?? 0) > 1) count.ambiguous++;
    }
    if (all) count.pagesAllFound++;
  }
  const pct = x => Math.round(1000 * x / count.picks) / 10;
  result.sets[set.name] = { ...count, nthPct: pct(count.nth), strictPct: pct(count.strict), loosePct: pct(count.loose), labelPct: pct(count.label), ambiguousPct: pct(count.ambiguous) };
}
result.urlTally = tally;
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`pages ${JSON.stringify(tally)}`);
for (const [name, s] of Object.entries(result.sets)) console.log(`${name.padEnd(26)} ${s.picks} picks on ${s.pages} pages: nth ${s.nthPct}% strict ${s.strictPct}% loose ${s.loosePct}% label ${s.labelPct}% ambiguous ${s.ambiguousPct}%; pages with every pick found ${s.pagesAllFound}`);
