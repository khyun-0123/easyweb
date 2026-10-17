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
