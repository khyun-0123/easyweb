import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Sentence embeddings of each surveyed control for scripts/ml/ondevice-rank.py
// (docs/09_local_ai_review.md section 10). transformers.js is loaded from a
// directory outside the project so package.json does not change.
for (const arg of process.argv.slice(2)) if (!/^--(?:elements|review|output|transformers|model)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const elementsDir = value('elements'), reviewDir = value('review'), output = value('output'), transformers = value('transformers');
const modelId = value('model') ?? 'Xenova/multilingual-e5-small';
if (!elementsDir || !reviewDir || !output || !transformers) throw Error('--elements=<dir> --review=<dir> --output=<file.json> --transformers=<dir with node_modules>');

const { pipeline } = await import(pathToFileURL(path.join(transformers, 'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
const regions = new Set(['-', 'main', 'footer', 'nav', 'header', 'aside', 'navigation']);
const pages = (await readdir(reviewDir)).filter(name => name.endsWith('.json')).map(name => name.replace(/\.json$/, '')).sort();
const extractor = await pipeline('feature-extraction', modelId, { dtype: 'q8' });
const rows = [];
let texts = 0, totalMs = 0;
for (const pageId of pages) {
  const items = [];
  for (const line of (await readFile(path.join(elementsDir, `${pageId}.txt`), 'utf8')).split('\n')) {
    const cells = line.split(' | ');
    if (cells.length < 8 || !/^\d+$/.test(cells[0])) continue;
    const middle = cells.slice(2, -2);
    let k = 2;
    if (middle.length > 4) for (let n = 2; n < middle.length; n++) if (regions.has(middle[n])) k = n;
    items.push({ i: Number(cells[0]), text: `query: ${middle.slice(0, k - 1).join(' | ').slice(0, 80)} | ${middle.slice(k + 1).join(' | ').slice(0, 40)}` });
  }
  const started = performance.now();
  const vectors = items.length ? (await extractor(items.map(item => item.text), { pooling: 'mean', normalize: true })).tolist() : [];
  totalMs += performance.now() - started; texts += items.length;
  items.forEach((item, n) => rows.push({ page: pageId, i: item.i, vector: vectors[n].map(x => Math.round(x * 1e4) / 1e4) }));
}
await writeFile(output, JSON.stringify({ model: modelId, dtype: 'q8', texts, msPerText: Math.round(100 * totalMs / texts) / 100, rows }));
console.log(`${texts} texts, ${(totalMs / texts).toFixed(2)} ms/text (node, CPU)`);
