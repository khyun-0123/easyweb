import type { Candidate, Category } from './types';

const MAX_CARDS = 6;
const MAX_PER_CATEGORY = 2;
const contextOrder = { primary: 0, body: 1, footer: 2 };
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const normalizedLabel = (candidate: Candidate) => candidate.label.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();

function destination(candidate: Candidate): string {
  if (candidate.action !== 'navigate' || !candidate.href) return '';
  try { return new URL(candidate.href).href; }
  catch { return candidate.href; }
}

function compare(a: Candidate, b: Candidate): number {
  return b.score - a.score || contextOrder[a.context] - contextOrder[b.context]
    || a.label.length - b.label.length || compareText(normalizedLabel(a), normalizedLabel(b))
    || compareText(destination(a), destination(b)) || compareText(a.category ?? '', b.category ?? '')
    || compareText(a.action, b.action) || compareText(a.element.id, b.element.id);
}

export function rank(candidates: Candidate[]): Candidate[] {
  // Deduplicate actual destinations and source controls before category policy.
  // Separate locate controls with the same label can perform different tasks.
  const destinations = new Set<string>();
  const controls = new Set<HTMLElement>();
  const unique = [...candidates].filter(candidate => candidate.category).sort(compare).filter(candidate => {
    const href = destination(candidate);
    if (href) {
      if (destinations.has(href)) return false;
      destinations.add(href);
    } else {
      if (controls.has(candidate.element)) return false;
      controls.add(candidate.element);
    }
    return true;
  });
  const counts = new Map<Category, number>();
  const selected: Candidate[] = [];
  for (const candidate of unique) {
    if (!candidate.category || counts.has(candidate.category)) continue;
    counts.set(candidate.category, 1);
    selected.push(candidate);
    if (selected.length === MAX_CARDS) return selected;
  }
  for (const candidate of unique) {
    if (!candidate.category || selected.includes(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
    counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
    selected.push(candidate);
    if (selected.length === MAX_CARDS) break;
  }
  return selected.sort(compare);
}
