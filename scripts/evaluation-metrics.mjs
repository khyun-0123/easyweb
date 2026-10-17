export function scorePage(actual, target, sourceDestinations) {
  const safeDestination = candidate => candidate.action !== 'navigate' ||
    !!candidate.href && candidate.href === sourceDestinations[candidate.sourceId];
  const correct = actual.selected.filter(candidate => safeDestination(candidate) && target.accepted.some(truth =>
    truth.sourceId === candidate.sourceId && truth.category === candidate.category && truth.action === candidate.action));
  const matched = target.expected.filter(truth => correct.some(candidate => truth.sourceIds.includes(candidate.sourceId) &&
    truth.category === candidate.category && truth.action === candidate.action && (!truth.href || candidate.href === truth.href)));
  return {
    correct: correct.length, recommended: actual.selected.length, matched: matched.length, expected: target.expected.length,
    precision: actual.selected.length ? correct.length / actual.selected.length : null,
    recall: matched.length / target.expected.length,
    missed: target.expected.filter(truth => !matched.includes(truth)).map(x => x.id),
    incorrect: actual.selected.filter(candidate => !correct.includes(candidate)),
    taskRecommended: correct.some(candidate => target.task.expectedSourceIds.includes(candidate.sourceId)),
  };
}

export function qualityGate(summary, sites) {
  const thresholds = { overallPrecision: 0.9, overallRecall: 0.85, sitePrecision: 0.8, siteRecall: 0.75 };
  const ratios = row => ({ precision: row.recommended > 0 ? row.correct / row.recommended : null,
    recall: row.expected > 0 ? row.matched / row.expected : null });
  const overall = ratios(summary);
  const perSite = sites.map(site => {
    const values = ratios(site);
    return { siteId: site.siteId, ...values,
      passed: values.precision !== null && values.precision >= thresholds.sitePrecision && values.recall !== null && values.recall >= thresholds.siteRecall };
  });
  const passed = overall.precision !== null && overall.precision >= thresholds.overallPrecision
    && overall.recall !== null && overall.recall >= thresholds.overallRecall && perSite.length === 5 && perSite.every(site => site.passed);
  return { status: passed ? 'PASS' : 'FAIL', thresholds, overall, sites: perSite,
    scope: 'Offline fixture accuracy/recall only. Does not establish S07 completion, live 15-task success, performance, native installation, accessibility, or user-study acceptance.' };
}
