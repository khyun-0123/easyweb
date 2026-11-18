// Experiment build only (docs/08_dev_plan.md, docs/09_local_ai_review.md section 13): a LambdaRank
// model trained offline on engine-blind reviews scores the controls of a page. It never adds a
// candidate; page-types.ts uses the scores only to order candidates the rules already accepted.
// Inputs are fixed names, short paths, regions, headings and positions. No input values, no
// network, no storage. Features mirror scripts/ml/ondevice-rank.py; parity is checked by
// scripts/ml/learned-parity.mjs against that script's own scores.

export interface RankRow {
  tag: string;      // 'a', 'button', 'input:search', ...
  label: string;    // fixed visible name
  href: string;     // short href: same-host path or other host + path, query reduced to '?…'
  region: string;   // header, nav, main, aside, footer, navigation, - ...
  heading: string;  // nearest heading text
  y: number;        // page y in CSS px
  font: number;     // font size in px
}

interface Vocab { ngram: [number, number]; terms: Record<string, [number, number]> }
interface Node { split_feature?: number; threshold?: number; left_child?: Node; right_child?: Node; leaf_value?: number }
export interface RankModel { format: string; label: Vocab; context: Vocab; contextWeight: number; meta: string[][]; trees: Node[] }

// sklearn TfidfVectorizer(analyzer='char_wb', lowercase, sublinear_tf, norm='l2').
function tfidf(text: string, vocab: Vocab, weight: number, offset: number, out: Map<number, number>): void {
  const [min, max] = vocab.ngram;
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().replace(/\s\s+/g, ' ').split(/\s+/).filter(Boolean)) {
    const w = [...` ${word} `];
    for (let n = min; n <= max; n++) {
      let start = 0;
      const add = () => { const gram = w.slice(start, start + n).join(''); if (vocab.terms[gram]) counts.set(gram, (counts.get(gram) ?? 0) + 1); };
      add();
      while (start + n < w.length) { start++; add(); }
      if (start === 0) break;
    }
  }
  const cells: [number, number][] = [];
  let norm = 0;
  for (const [gram, count] of counts) {
    const [index, idf] = vocab.terms[gram];
    const value = (1 + Math.log(count)) * idf;
    cells.push([index, value]); norm += value * value;
  }
  norm = Math.sqrt(norm);
  for (const [index, value] of cells) out.set(offset + index, (value / norm) * weight);
}

const size = (vocab: Vocab) => Object.keys(vocab.terms).length;

export function features(model: RankModel, rows: RankRow[], ruleType: string): Map<number, number>[] {
  const labelSize = size(model.label), contextSize = size(model.context);
  const metaOffsets: number[] = [];
  let at = labelSize + contextSize;
  for (const categories of model.meta) { metaOffsets.push(at); at += categories.length; }
  const numericOffset = at;
  const height = Math.max(1, ...rows.map(row => row.y));
  return rows.map((row, n) => {
    const out = new Map<number, number>();
    const path = row.href.toLowerCase().replace(/^[a-z0-9.-]+\.[a-z]{2,}(?=\/|$)/, ' ext ');
    tfidf(row.label, model.label, 1, 0, out);
    tfidf(`${row.heading} ${path.split(/[/._?=&-]+/).join(' ')}`, model.context, model.contextWeight, labelSize, out);
    const meta = [row.tag, row.region, ruleType, `${ruleType}:${row.region}`, path.startsWith(' ext ') ? 'ext' : 'same'];
    meta.forEach((value, k) => { const index = model.meta[k].indexOf(value); if (index >= 0) out.set(metaOffsets[k] + index, 1); });
    [row.y / height, n / Math.max(rows.length, 1), row.font / 20, Math.min([...row.label].length, 40) / 40]
      .forEach((value, k) => { if (value) out.set(numericOffset + k, value); });
    return out;
  });
}

// LightGBM trees: every split in the exported model is "value <= threshold goes left" with no
// missing-value handling, on float32 inputs (the script casts features to float32).
export function scoreRows(model: RankModel, rows: RankRow[], ruleType: string): number[] {
  return features(model, rows, ruleType).map(vector => {
    let total = 0;
    for (const tree of model.trees) {
      let node = tree;
      while (node.leaf_value === undefined) node = Math.fround(vector.get(node.split_feature!) ?? 0) <= node.threshold! ? node.left_child! : node.right_child!;
      total += node.leaf_value;
    }
    return total;
  });
}
