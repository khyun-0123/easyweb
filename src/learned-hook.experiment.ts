import { isSafeSource, sourceGuard } from './classifier';
import { scoreRows, type RankModel } from './learned-ranker';
import { collectRows, sensitivePage } from './learned-rows';
import model from './model/learned-ranker.json';
import type { Candidate } from './types';

// Experiment build only (docs/08_dev_plan.md, docs/09_local_ai_review.md section 13).
// On a page the rules left as "default" (not home, list, post or gate), orders the analyzer's
// own candidates by the learned ranker. A candidate the classifier accepted keeps its classified
// form. Any other must pass both the classifier's source guard (page tools, ordering, dangerous
// scripts and URLs, non-HTTP(S)) and isSafeSource (links and buttons only, no dangerous names,
// safe navigation), and is shown as an 이용 안내 card under its own name. Never runs on a page with a password field or a login/identity/payment/account title.
export const learnedBuild = true;

export function learnedOrder(raw: Candidate[], classified: Candidate[], excluded: Set<HTMLElement>): Candidate[] | undefined {
  if (sensitivePage()) return undefined;
  const { rows, elements } = collectRows();
  const scores = scoreRows(model as unknown as RankModel, rows, 'default');
  const score = new Map(elements.map((element, n) => [element, scores[n]]));
  const accepted = new Map(classified.map(candidate => [candidate.element, candidate]));
  return raw
    .filter(candidate => !excluded.has(candidate.element) && score.has(candidate.element)
      && (accepted.has(candidate.element) || (!!sourceGuard(candidate) && isSafeSource(candidate))))
    .sort((a, b) => score.get(b.element)! - score.get(a.element)!)
    .map(candidate => accepted.get(candidate.element)
      ?? { ...candidate, category: 'help' as const, title: candidate.label, reasons: ['학습한 순위 모델 (실험)', ...candidate.reasons] });
}
