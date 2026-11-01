import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Compares the engine's first six cards on live pages with an engine-blind
// importance review. Matching is by normalized label, so it is approximate:
// unmatched rows are listed for a human to check rather than silently scored.
for (const arg of process.argv.slice(2)) if (!/^--(?:engine|review|output)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const engineFile = value('engine'), reviewDir = value('review'), output = value('output');
if (!engineFile || !reviewDir || !output) throw Error('--engine=first-six.json --review=<dir> --output=<file.json>');

const norm = s => (s ?? '').toLowerCase().replace(/\s+|[·•|/()「」\[\]<>.,:;!?'"`-]/g, '');
const same = (a, b) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || (Math.min(x.length, y.length) >= 2 && (x.includes(y) || y.includes(x)))); };

const engine = JSON.parse(await readFile(engineFile, 'utf8')).results;
const pages = [];
for (const file of (await readdir(reviewDir)).filter(name => name.endsWith('.json')).sort()) {
  const review = JSON.parse(await readFile(path.join(reviewDir, file), 'utf8'));
  const run = engine.find(r => r.pageId === review.pageId);
  if (!run || run.error) { pages.push({ pageId: review.pageId, error: run?.error ?? 'no engine run' }); continue; }
  const top = review.top ?? [], also = review.alsoFine ?? [];
  const cards = run.firstSix.map(card => {
    const t = top.find(r => same(r.label, card.label));
    const a = !t && also.find(r => same(r.label, card.label));
    return { label: card.label, category: card.category, verdict: t ? `top${t.rank}` : a ? 'alsoFine' : 'notPicked', reviewKind: (t || a)?.kind ?? null };
  });
  const missed = top.filter(r => !run.firstSix.some(card => same(r.label, card.label)))
    .map(r => ({ rank: r.rank, label: r.label, kind: r.kind, inLaterMenus: run.ranked.slice(6).some(card => same(r.label, card.label)) }));
  pages.push({ pageId: review.pageId, purpose: review.purpose,
    engineCards: run.firstSix.length, cardsInTop: cards.filter(c => c.verdict.startsWith('top')).length,
    cardsUseful: cards.filter(c => c.verdict !== 'notPicked').length, reviewTop: top.length,
    topCovered: top.length - missed.length, cards, missed });
}
const ok = pages.filter(p => !p.error);
const sum = key => ok.reduce((n, p) => n + p[key], 0);
const report = {
  checkedAt: new Date().toISOString(),
  scope: 'Live public pages. Reference = engine-blind agent review of visible controls (not a human user, not an independent annotation of the original evaluation). Label matching is approximate.',
  summary: { pages: ok.length, engineCards: sum('engineCards'), cardsInTop: sum('cardsInTop'), cardsUseful: sum('cardsUseful'), reviewTop: sum('reviewTop'), topCovered: sum('topCovered') },
  pages,
};
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.summary));
for (const p of pages) console.log(p.error ? `${p.pageId}: ${p.error}` : `${p.pageId}: 카드 ${p.engineCards} 중 유용 ${p.cardsUseful}(top ${p.cardsInTop}) · 검토 top ${p.reviewTop} 중 포함 ${p.topCovered} · 빠짐: ${p.missed.map(m => m.label).join(', ')}`);
