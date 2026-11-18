import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Zero-shot cross-encoder reranker check (docs/reviews/business_review_20261118.md section 7):
// "of the controls the engine already found safe, which matter most?". No training; a small
// multilingual reranker scores (page purpose, control) pairs and the top six become the picks.
// Only the engine's own candidates (cards + "다른 기능 보기" list) are ranked, so the model never
// sees or adds anything the rules dropped. transformers.js is loaded from outside the project.
// Output is a picks file for scripts/ml/ondevice-score.mjs and ondevice-gate.mjs.
for (const arg of process.argv.slice(2)) if (!/^--(?:engine|elements|output|transformers|model|dtype)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const engineFile = value('engine'), output = value('output'), transformers = value('transformers');
const modelId = value('model') ?? 'jinaai/jina-reranker-v2-base-multilingual';
if (!engineFile || !output || !transformers) throw Error('--engine=<survey.json> --output=<file.json> --transformers=<dir with node_modules> [--model] [--dtype=q8]');

const { AutoTokenizer, AutoModelForSequenceClassification } = await import(pathToFileURL(path.join(transformers, 'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
const tokenizer = await AutoTokenizer.from_pretrained(modelId);
const model = await AutoModelForSequenceClassification.from_pretrained(modelId, { dtype: value('dtype') ?? 'q8' });

const elementsDir = value('elements') ?? path.join(path.dirname(engineFile), 'elements');
const survey = JSON.parse(await readFile(engineFile, 'utf8')).pages.filter(page => !page.error);
const pages = [];
for (const page of survey) {
  const text = await readFile(path.join(elementsDir, page.pageId + '.txt'), 'utf8').catch(() => null);
  if (!text) continue;
  const title = (text.match(/^title: (.*)$/m)?.[1] ?? '').slice(0, 80);
  const pool = new Map();
  for (const c of [...page.engine.cards, ...(page.engine.more ?? [])]) if (c.i >= 0 && !pool.has(c.i)) pool.set(c.i, c);
  const items = [...pool.values()];
  const query = `어르신이 "${title}" 페이지에서 가장 하려는 일`;
  const started = performance.now();
  let picks = [];
  if (items.length) {
    const docs = items.map(c => `${c.label}${c.section ? ` (${c.section})` : ''}`.slice(0, 120));
    const inputs = tokenizer(new Array(docs.length).fill(query), { text_pair: docs, padding: true, truncation: true, max_length: 128 });
    const { logits } = await model(inputs);
    const scores = Array.from(logits.data);
    picks = items.map((c, n) => ({ i: c.i, s: scores[n] })).sort((a, b) => b.s - a.s).slice(0, 6).map(x => x.i);
  }
  pages.push({ pageId: page.pageId, picks, candidates: items.length, wallMs: Math.round(performance.now() - started), error: null });
}
const sorted = pages.map(p => p.wallMs).sort((a, b) => a - b);
await writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), model: `rerank:${modelId.split('/').pop()}`, modelId,
  scope: 'Diagnostic only, zero-shot (no training). Ranks only engine candidates. Reference is an engine-blind Claude review, not human users.',
  query: '어르신이 "<title>" 페이지에서 가장 하려는 일', pages }, null, 2) + '\n');
console.log(`${pages.length} pages; median ${sorted[Math.floor(sorted.length / 2)]}ms, max ${sorted.at(-1)}ms per page`);
