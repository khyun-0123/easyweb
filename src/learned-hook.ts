import type { Candidate } from './types';

// Default build: no learned ordering. The experiment build (node scripts/build.mjs --learned)
// replaces this module with src/learned-hook.experiment.ts. docs/08_dev_plan.md, experiment row.
export const learnedBuild = false;

export function learnedOrder(_raw: Candidate[], _classified: Candidate[], _excluded: Set<HTMLElement>): Candidate[] | undefined {
  return undefined;
}
