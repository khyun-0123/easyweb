import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Compares the engine's first screen with an engine-blind review of the same
// pages. Matching is by element index (scripts/site-survey.mjs binds engine
// candidates to the indexed control list by identity), not by name.
for (const arg of process.argv.slice(2)) if (!/^--(?:survey|review|output)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const surveyFile = value('survey'), reviewDir = value('review'), output = value('output');
if (!surveyFile || !reviewDir || !output) throw Error('--survey=survey.json --review=<dir> --output=<file.json>');

const survey = JSON.parse(await readFile(surveyFile, 'utf8')).pages.filter(page => !page.error);
const reviews = new Map();
for (const file of (await readdir(reviewDir)).filter(name => name.endsWith('.json'))) {
  const review = JSON.parse(await readFile(path.join(reviewDir, file), 'utf8'));
  reviews.set(review.pageId, review);
}
const median = values => { const s = [...values].sort((a, b) => a - b); return s.length ? s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2 : null; };
const pct = (a, b) => b ? Math.round(1000 * a / b) / 10 : null;

const rows = [];
for (const page of survey) {
  const review = reviews.get(page.pageId);
  if (!review) continue;
  const essential = review.essential ?? [], useful = review.useful ?? [];
  const E = new Set(essential.map(item => item.i)), U = new Set(useful.map(item => item.i));
  const common = new Set((review.common ?? []).map(item => item.i));
  const cards = page.engine.cards.map(card => card.i);
  const row = page.engine.common.map(item => item.i);
  const sequence = [...cards, ...page.engine.more.map(card => card.i)];
  const coveredAt = k => essential.filter(item => sequence.slice(0, k).includes(item.i) || row.includes(item.i)).length;
  rows.push({
    pageId: page.pageId, siteId: page.siteId, group: page.group, surveyKind: page.kind, reviewType: review.pageType,
    engineHome: page.engine.homePage, idealSlots: review.idealSlots, essential: essential.length, useful: useful.length,
    cards: cards.length, cardsEssential: cards.filter(i => E.has(i)).length, cardsUseful: cards.filter(i => E.has(i) || U.has(i)).length,
    cardsCommon: cards.filter(i => common.has(i)).length, cardsUnmatched: cards.filter(i => i < 0).length,
    firstScreenEssential: essential.filter(item => cards.includes(item.i) || row.includes(item.i)).length,
    coverageAtK: Object.fromEntries([4, 6, 8, 10, 12].map(k => [k, coveredAt(k)])),
    missed: essential.filter(item => !cards.includes(item.i) && !row.includes(item.i)).map(item => ({ label: item.label, kind: item.kind, rank: sequence.indexOf(item.i) })),
    wrong: page.engine.cards.filter(card => !E.has(card.i) && !U.has(card.i)).map(card => ({ label: card.label, category: card.category })),
    essentialKinds: essential.map(item => item.kind),
  });
}

const byType = {};
for (const row of rows) (byType[row.reviewType] ??= []).push(row);
const typeSummary = Object.entries(byType).map(([type, list]) => {
  const kinds = {};
  for (const row of list) row.essentialKinds.forEach((kind, rank) => { kinds[kind] ??= { count: 0, pages: new Set(), rankSum: 0 }; kinds[kind].count++; kinds[kind].pages.add(row.pageId); kinds[kind].rankSum += rank + 1; });
  const essential = list.reduce((n, r) => n + r.essential, 0);
  return { type, pages: list.length,
    idealSlotsMedian: median(list.map(r => r.idealSlots)), idealSlotsRange: [Math.min(...list.map(r => r.idealSlots)), Math.max(...list.map(r => r.idealSlots))],
    essentialMedian: median(list.map(r => r.essential)), essentialRange: [Math.min(...list.map(r => r.essential)), Math.max(...list.map(r => r.essential))],
    firstScreenCoverage: pct(list.reduce((n, r) => n + r.firstScreenEssential, 0), essential),
    coverageAtK: Object.fromEntries([4, 6, 8, 10, 12].map(k => [k, pct(list.reduce((n, r) => n + r.coverageAtK[k], 0), essential)])),
    cardPrecisionUseful: pct(list.reduce((n, r) => n + r.cardsUseful, 0), list.reduce((n, r) => n + r.cards, 0)),
    kinds: Object.entries(kinds).map(([kind, k]) => ({ kind, pages: k.pages.size, share: pct(k.pages.size, list.length), meanRank: Math.round(10 * k.rankSum / k.count) / 10 }))
      .sort((a, b) => b.pages - a.pages || a.meanRank - b.meanRank) };
}).sort((a, b) => b.pages - a.pages);

const total = key => rows.reduce((n, r) => n + r[key], 0);
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Live public pages. Reference = engine-blind Claude review of visible controls, written for elderly users; not a human user study and not an independent annotation set.',
  summary: { pages: rows.length, essential: total('essential'), firstScreenEssential: total('firstScreenEssential'), coverage: pct(total('firstScreenEssential'), total('essential')),
    cards: total('cards'), cardsUseful: total('cardsUseful'), cardsEssential: total('cardsEssential'), usefulPrecision: pct(total('cardsUseful'), total('cards')),
    unmatchedCards: total('cardsUnmatched'), idealSlotsMedian: median(rows.map(r => r.idealSlots)) },
  byType: typeSummary, pages: rows,
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
for (const t of typeSummary) console.log(`${t.type}: ${t.pages}p · ideal ${t.idealSlotsMedian} ${JSON.stringify(t.idealSlotsRange)} · essential ${t.essentialMedian} · cover ${t.firstScreenCoverage}% · @k ${JSON.stringify(t.coverageAtK)} · useful ${t.cardPrecisionUseful}% · ${t.kinds.slice(0, 8).map(k => `${k.kind}${k.pages}`).join(' ')}`);
