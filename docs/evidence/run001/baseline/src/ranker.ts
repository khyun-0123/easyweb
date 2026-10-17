import type { Candidate, Category } from './types';

export function rank(candidates: Candidate[]): Candidate[] {
  const seen = new Set<Category>();
  const selected: Candidate[] = [];
  for (const candidate of [...candidates].sort((a, b) => b.score - a.score || a.label.length - b.label.length)) {
    if (!candidate.category || seen.has(candidate.category)) continue;
    seen.add(candidate.category);
    selected.push(candidate);
  }
  return selected.slice(0, 6);
}
