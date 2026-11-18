import { readFile, writeFile } from 'node:fs/promises';

// Converts the full export of scripts/ml/ondevice-rank.py --export (format easyweb-lambdarank-1)
// into the compact form the experiment build loads (easyweb-lambdarank-2). Only fields scoring
// needs are kept, numbers are copied unchanged:
//   vocab: terms in column order + idf in the same order (instead of {term: [column, idf]})
//   tree node: [feature, threshold, left, right], leaf: its value (all splits are "<=" without
//   missing-value handling, checked here)
// Parity with Python is re-checked by scripts/ml/learned-parity.mjs on the compact file.
for (const arg of process.argv.slice(2)) if (!/^--(?:input|output)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const input = value('input'), output = value('output');
if (!input || !output) throw Error('--input=<format 1 json> --output=<format 2 json>');

const full = JSON.parse(await readFile(input, 'utf8'));
if (full.format !== 'easyweb-lambdarank-1') throw Error(`Expected format 1, got ${full.format}`);
const vocab = v => {
  const entries = Object.entries(v.terms).sort((a, b) => a[1][0] - b[1][0]);
  entries.forEach(([, [column]], n) => { if (column !== n) throw Error('Vocabulary columns are not contiguous'); });
  return { ngram: v.ngram, terms: entries.map(([term]) => term), idf: entries.map(([, [, idf]]) => idf) };
};
const node = n => {
  if (n.leaf_value !== undefined) return n.leaf_value;
  if (n.decision_type !== '<=' || n.missing_type !== 'None') throw Error(`Unsupported split ${n.decision_type} ${n.missing_type}`);
  return [n.split_feature, n.threshold, node(n.left_child), node(n.right_child)];
};
const compact = { format: 'easyweb-lambdarank-2', note: full.note, trained: full.trained, label: vocab(full.label), context: vocab(full.context),
  contextWeight: full.contextWeight, meta: full.meta, numeric: full.numeric, trees: full.trees.map(node) };
await writeFile(output, JSON.stringify(compact));
console.log(`${input} -> ${output}: ${JSON.stringify(compact).length} bytes`);
