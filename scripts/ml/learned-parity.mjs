import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

// Checks that src/learned-ranker.ts gives the same scores and top six as scripts/ml/ondevice-rank.py
// (--scores) on the same element files. Diagnostic for the experiment build; nothing is called.
// --picks-output also writes picks restricted to a candidate pool (--pool): 'more' = cards + the
// recorded "다른 기능 보기" list, 'pool' = cards + every classified remaining candidate, 'raw' = every
// analyzer candidate outside the common row (needs a survey with rawIndex/poolIndex, see site-survey.mjs).
for (const arg of process.argv.slice(2)) if (!/^--(?:model|scores|elements|survey|output|picks-output|pool)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const [modelFile, scoresFile, elementsDir, surveyFile, output] = ['model', 'scores', 'elements', 'survey', 'output'].map(value);
if (!modelFile || !scoresFile || !elementsDir || !surveyFile || !output) throw Error('--model --scores --elements --survey --output [--picks-output]');

const bundle = await build({ entryPoints: ['src/learned-ranker.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { scoreRows } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const model = JSON.parse(await readFile(modelFile, 'utf8'));
const expected = JSON.parse(await readFile(scoresFile, 'utf8'));
const survey = new Map(JSON.parse(await readFile(surveyFile, 'utf8')).pages.filter(p => !p.error).map(p => [p.pageId, p]));

const REGIONS = new Set(['-', 'main', 'footer', 'nav', 'header', 'aside', 'navigation']);
function rows(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const cells = line.replace(/\n$/, '').split(' | ');
    if (cells.length < 8 || !/^\d+$/.test(cells[0])) continue;
    const middle = cells.slice(2, -2);
    let k = 2;
    if (middle.length > 4) for (let n = 2; n < middle.length; n++) if (REGIONS.has(middle[n])) k = n;
    out.push({ i: Number(cells[0]), tag: cells[1], label: middle.slice(0, k - 1).join(' | '), href: middle[k - 1], region: middle[k],
      heading: middle.slice(k + 1).join(' | '), y: Number(cells.at(-2) || 0), font: Number(cells.at(-1) || 0) });
  }
  return out;
}

let maxDiff = 0, controls = 0, sameTop = 0, pages = 0;
const restricted = [];
for (const [pageId, want] of Object.entries(expected)) {
  const page = survey.get(pageId);
  const items = rows(await readFile(path.join(elementsDir, pageId + '.txt'), 'utf8'));
  const ruleType = page.engine.homePage ? 'home' : page.engine.pageType;
  const got = scoreRows(model, items, ruleType);
  items.forEach((item, n) => { maxDiff = Math.max(maxDiff, Math.abs(got[n] - want[item.i])); controls++; });
  const top = scores => items.map((item, n) => [item.i, scores[n]]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]).join(',');
  pages++; if (top(got) === top(items.map(item => want[item.i]))) sameTop++;
  const kind = value('pool') ?? 'more', common = new Set(page.engine.common.map(c => c.i));
  const cards = page.engine.cards.map(c => c.i);
  const pool = new Set((kind === 'raw' ? page.engine.rawIndex.filter(i => !common.has(i)) : kind === 'pool' ? [...cards, ...page.engine.poolIndex] : [...cards, ...(page.engine.more ?? []).map(c => c.i)]).filter(i => i >= 0));
  restricted.push({ pageId, picks: items.map((item, n) => [item.i, got[n]]).filter(([i]) => pool.has(i)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]) });
}
const result = { checkedAt: new Date().toISOString(), pages, controls, maxAbsScoreDiff: maxDiff, sameTopSixPages: sameTop };
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
if (value('picks-output')) await writeFile(value('picks-output'), JSON.stringify({ model: `lambdarank-js-${value('pool') ?? 'more'}`, scope: 'Diagnostic only. JS port of the experiment model, picks restricted to engine candidates (cards + more).', pages: restricted }, null, 1) + '\n');
console.log(`${pages} pages, ${controls} controls: max |score diff| ${maxDiff.toExponential(2)}, same top six on ${sameTop}/${pages}`);
