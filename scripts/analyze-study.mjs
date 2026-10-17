import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const OBSERVATION_COLUMNS = [
  'data_kind', 'participant_id', 'task_id', 'condition', 'trial_order', 'outcome',
  'elapsed_ms', 'misclicks', 'help_requests', 'returned_to_original', 'difficulty',
  'serious_wrong_guidance', 'unexpected_sensitive_action', 'evidence_ref', 'observer_note',
];
const CONDITIONS = ['original', 'easyweb'];
const OUTCOMES = ['success', 'failure', 'timeout', 'blocked', 'withdrawn', 'not_run'];
const fail = message => { throw new Error(message); };
export const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};

// Strict RFC-4180-style CSV, including quoted commas, escaped quotes and newlines.
export function parseCsv(input) {
  const text = input.replace(/^\uFEFF/, '');
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  const endField = () => { row.push(field); field = ''; closed = false; };
  const endRow = () => { endField(); if (row.some(x => x !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      if (field || closed) fail('CSV: unexpected quote');
      quoted = true;
    } else if (c === ',') endField();
    else if (c === '\r' || c === '\n') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else { if (closed) fail('CSV: text after closing quote'); field += c; }
  }
  if (quoted) fail('CSV: unclosed quote');
  if (field || row.length || closed) endRow();
  return rows;
}

export function makeAssignments(plan, participantCount = 6) {
  if (!Number.isInteger(participantCount) || participantCount < plan.minimumParticipants || participantCount > plan.maximumParticipants) fail('participants must be 6, 7 or 8');
  const assignments = [];
  const siteIds = plan.siteOrder;
  for (let p = 0; p < participantCount; p++) {
    const participantId = `P${String(p + 1).padStart(2, '0')}`;
    for (let block = 0; block < siteIds.length; block++) {
      const siteIndex = (p + block) % siteIds.length;
      const siteId = siteIds[siteIndex];
      const tasks = plan.tasks.filter(t => t.siteId === siteId);
      const task = tasks[p % tasks.length];
      const order = (p + siteIndex) % 2 === 0 ? CONDITIONS : [...CONDITIONS].reverse();
      order.forEach((condition, i) => assignments.push({ participantId, siteId, taskId: task.taskId, condition, block: block + 1, trialOrder: block * 2 + i + 1 }));
    }
  }
  return assignments;
}
const trialKey = row => `${row.participantId}\u001f${row.taskId}\u001f${row.condition}`;
const pairKey = row => `${row.participantId}\u001f${row.taskId}`;

export function readObservations(csv, assignments, { allowSynthetic = false, timeLimitMs = 180000 } = {}) {
  const table = parseCsv(csv);
  if (!table.length) fail('CSV header is required; use observations.blank.csv');
  const header = table.shift();
  if (new Set(header).size !== header.length || header.length !== OBSERVATION_COLUMNS.length || OBSERVATION_COLUMNS.some(c => !header.includes(c))) fail('CSV columns do not match observations.blank.csv');
  const planned = new Map(assignments.map(x => [trialKey(x), x]));
  const seen = new Set(); const kinds = new Set();
  const rows = table.map((cells, index) => {
    const context = `CSV row ${index + 2}`;
    if (cells.length !== header.length) fail(`${context}: column count`);
    const raw = Object.fromEntries(header.map((h, i) => [h, cells[i].trim()]));
    if (!['real', 'synthetic'].includes(raw.data_kind)) fail(`${context}: data_kind=real|synthetic required`);
    kinds.add(raw.data_kind);
    if (raw.data_kind === 'synthetic' && !allowSynthetic) fail(`${context}: synthetic rows require --allow-synthetic`);
    const row = { dataKind: raw.data_kind, participantId: raw.participant_id, taskId: raw.task_id, condition: raw.condition, outcome: raw.outcome, evidenceRef: raw.evidence_ref, observerNote: raw.observer_note };
    if (!CONDITIONS.includes(row.condition) || !OUTCOMES.includes(row.outcome)) fail(`${context}: invalid condition/outcome`);
    const key = trialKey(row), assignment = planned.get(key);
    if (!assignment) fail(`${context}: trial was not assigned`);
    if (seen.has(key)) fail(`${context}: duplicate participant/task/condition`);
    seen.add(key);
    if (!/^\d+$/.test(raw.trial_order) || Number(raw.trial_order) !== assignment.trialOrder) fail(`${context}: trial_order differs from counterbalanced plan`);
    row.trialOrder = Number(raw.trial_order); row.siteId = assignment.siteId;
    if (row.outcome === 'not_run') {
      if (OBSERVATION_COLUMNS.slice(6).some(c => raw[c] !== '')) fail(`${context}: not_run must have blank measurements/evidence`);
      return row;
    }
    const number = (column, { integer = false, min = 0, max = Infinity, optional = false } = {}) => {
      if (optional && raw[column] === '') return null;
      if (raw[column] === '' || !/^(?:\d+)(?:\.\d+)?$/.test(raw[column])) fail(`${context}: ${column} needs a number; blank is not zero`);
      const n = Number(raw[column]);
      if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) fail(`${context}: ${column} out of range`);
      return n;
    };
    row.elapsedMs = number('elapsed_ms', { max: timeLimitMs, min: row.outcome === 'success' ? Number.MIN_VALUE : 0 });
    if (row.outcome === 'timeout' && row.elapsedMs !== timeLimitMs) fail(`${context}: timeout elapsed_ms must equal the predeclared time limit`);
    row.misclicks = number('misclicks', { integer: true });
    row.helpRequests = number('help_requests', { integer: true });
    row.difficulty = number('difficulty', { integer: true, min: 1, max: 5, optional: true });
    row.seriousWrongGuidance = number('serious_wrong_guidance', { integer: true, max: 1 });
    row.unexpectedSensitiveAction = number('unexpected_sensitive_action', { integer: true, max: 1 });
    const validReturns = row.condition === 'original' ? ['not_applicable'] : ['yes', 'no', 'not_attempted'];
    if (!validReturns.includes(raw.returned_to_original)) fail(`${context}: invalid returned_to_original`);
    if (row.condition === 'easyweb' && row.outcome === 'success' && raw.returned_to_original === 'not_attempted') fail(`${context}: successful EasyWeb trial needs the separate return attempt`);
    row.returnedToOriginal = raw.returned_to_original;
    if (!row.evidenceRef) fail(`${context}: evidence_ref required for an observed trial`);
    return row;
  });
  if (kinds.size > 1) fail('Do not mix real and synthetic records');
  return rows;
}

export function analyzeStudy(plan, assignments, rows) {
  const rowMap = new Map(rows.map(r => [trialKey(r), r]));
  const assignmentMap = new Map(assignments.map(a => [trialKey(a), a]));
  const observed = rows.filter(r => r.outcome !== 'not_run');
  const observedMap = new Map(observed.map(r => [trialKey(r), r]));
  const plannedPairs = [...new Map(assignments.map(a => [pairKey(a), { participantId: a.participantId, taskId: a.taskId, siteId: a.siteId }])).values()];
  const pairs = plannedPairs.map(pair => {
    const original = observedMap.get(trialKey({ ...pair, condition: 'original' }));
    const easyweb = observedMap.get(trialKey({ ...pair, condition: 'easyweb' }));
    const bothObserved = !!original && !!easyweb;
    const bothSucceeded = bothObserved && original.outcome === 'success' && easyweb.outcome === 'success';
    const pairedObservation = bothObserved && !['blocked', 'withdrawn'].includes(original.outcome) && !['blocked', 'withdrawn'].includes(easyweb.outcome);
    const firstCondition = assignmentMap.get(trialKey({ ...pair, condition: 'original' })).trialOrder < assignmentMap.get(trialKey({ ...pair, condition: 'easyweb' })).trialOrder ? 'original' : 'easyweb';
    return { ...pair, firstCondition, originalOutcome: original?.outcome ?? 'unobserved', easywebOutcome: easyweb?.outcome ?? 'unobserved', bothObserved, bothSucceeded, pairedObservation,
      originalMs: original?.elapsedMs ?? null, easywebMs: easyweb?.elapsedMs ?? null,
      timeReduction: bothSucceeded ? 1 - easyweb.elapsedMs / original.elapsedMs : null };
  });
  const summarize = subset => {
    const subsetRows = observed.filter(r => subset.some(p => pairKey(p) === pairKey(r)));
    const condition = name => {
      const records = subsetRows.filter(r => r.condition === name);
      const outcomes = Object.fromEntries(OUTCOMES.filter(x => x !== 'not_run').map(x => [x, records.filter(r => r.outcome === x).length]));
      return { assigned: subset.length, observed: records.length, unobserved: subset.length - records.length, outcomes,
        successes: outcomes.success, successRateOfAssigned: subset.length ? outcomes.success / subset.length : null,
        misclicks: records.reduce((s, r) => s + r.misclicks, 0), helpRequests: records.reduce((s, r) => s + r.helpRequests, 0),
        medianDifficulty: median(records.flatMap(r => r.difficulty === null ? [] : [r.difficulty])), difficultyMissing: records.filter(r => r.difficulty === null).length,
        seriousWrongGuidance: records.reduce((s, r) => s + r.seriousWrongGuidance, 0), unexpectedSensitiveActions: records.reduce((s, r) => s + r.unexpectedSensitiveAction, 0) };
    };
    const complete = subset.filter(p => p.bothSucceeded);
    const originalMedianMs = median(complete.map(p => p.originalMs)), easywebMedianMs = median(complete.map(p => p.easywebMs));
    const returnRows = subsetRows.filter(r => r.condition === 'easyweb');
    const returnAttempted = returnRows.filter(r => ['yes', 'no'].includes(r.returnedToOriginal));
    return { assignedPairs: subset.length, bothObservedPairs: subset.filter(p => p.bothObserved).length, pairedObservations: subset.filter(p => p.pairedObservation).length, bothSuccessPairs: complete.length,
      pairOutcomes: { bothSuccess: complete.length,
        originalOnlySuccess: subset.filter(p => p.bothObserved && p.originalOutcome === 'success' && p.easywebOutcome !== 'success').length,
        easywebOnlySuccess: subset.filter(p => p.bothObserved && p.originalOutcome !== 'success' && p.easywebOutcome === 'success').length,
        neitherSuccess: subset.filter(p => p.bothObserved && p.originalOutcome !== 'success' && p.easywebOutcome !== 'success').length,
        incomplete: subset.filter(p => !p.bothObserved).length },
      original: condition('original'), easyweb: condition('easyweb'),
      time: { denominator: 'Only identical participant/task pairs with success in both conditions', includedPairs: complete.length, excludedPairs: subset.length - complete.length,
        originalMedianMs, easywebMedianMs, reductionOfPairedSetMedians: originalMedianMs === null ? null : 1 - easywebMedianMs / originalMedianMs,
        medianWithinPairReduction: median(complete.map(p => p.timeReduction)) },
      originalReturn: { easywebObserved: returnRows.length, attempted: returnAttempted.length, succeeded: returnAttempted.filter(r => r.returnedToOriginal === 'yes').length,
        notAttempted: returnRows.filter(r => r.returnedToOriginal === 'not_attempted').length,
        successRateOfAttempts: returnAttempted.length ? returnAttempted.filter(r => r.returnedToOriginal === 'yes').length / returnAttempted.length : null } };
  };
  const summary = summarize(pairs);
  const sites = plan.siteOrder.map(siteId => ({ siteId, ...summarize(pairs.filter(p => p.siteId === siteId)) }));
  const tasks = plan.tasks.map(task => ({ taskId: task.taskId, siteId: task.siteId, ...summarize(pairs.filter(p => p.taskId === task.taskId)) }));
  const participants = [...new Set(observed.map(r => r.participantId))];
  const coverageParticipants = [...new Set(observed.filter(r => !['blocked', 'withdrawn'].includes(r.outcome)).map(r => r.participantId))];
  const isSynthetic = rows.some(r => r.dataKind === 'synthetic');
  const recordsComplete = observed.length === assignments.length;
  const coverageMet = coverageParticipants.length >= plan.minimumParticipants && sites.every(s => s.pairedObservations >= plan.minimumPairedObservationsPerSite);
  const evaluable = observed.length > 0 && recordsComplete && coverageMet;
  const goals = {
    zeroSeriousWrongGuidance: evaluable ? summary.original.seriousWrongGuidance + summary.easyweb.seriousWrongGuidance === 0 : null,
    zeroUnexpectedSensitiveAction: evaluable ? summary.original.unexpectedSensitiveActions + summary.easyweb.unexpectedSensitiveActions === 0 : null,
    assignedPairedSuccessMaintained: evaluable ? summary.easyweb.successes >= summary.original.successes : null,
    pairedMedianTimeReduction20Percent: evaluable && summary.time.includedPairs > 0 ? summary.time.reductionOfPairedSetMedians >= plan.minimumMedianTimeReduction - 1e-12 : null,
  };
  return { schemaVersion: 1, studyId: plan.studyId, dataKind: isSynthetic ? 'synthetic' : observed.length ? 'real' : 'none',
    studyStatus: !observed.length ? 'NOT_RUN' : isSynthetic ? 'SYNTHETIC_ONLY' : recordsComplete && coverageMet ? 'RECORDED_COMPLETE_PENDING_MANUAL_REVIEW' : 'INCOMPLETE',
    experimentPerformed: 'NOT_CONFIRMED_BY_CLI', productAcceptance: isSynthetic || !evaluable ? 'NOT_EVALUATED' : 'PENDING_MANUAL_EVIDENCE_REVIEW',
    assignments: assignments.length, rowsProvided: rows.length, observedTrials: observed.length, explicitNotRunTrials: rows.length - observed.length,
    missingRows: assignments.filter(a => !rowMap.has(trialKey(a))).length, observedParticipants: participants.length, coverageParticipants: coverageParticipants.length,
    recordsComplete, coverageMet, metricGoals: goals, allMetricGoalsMet: isSynthetic || !evaluable ? null : Object.values(goals).every(x => x === true),
    summary, sites, tasks, conditionOrders: CONDITIONS.map(firstCondition => ({ firstCondition, ...summarize(pairs.filter(p => p.firstCondition === firstCondition)) })), pairs,
    limitations: ['Success means the predefined public link/original control was reached, not a login, submission, application or real-world task completion.',
      'Coverage needs both conditions actually attempted (success/failure/timeout); blocked/withdrawn records remain in assigned denominators but cannot replace the six paired observations per site.',
      'Assigned success rates retain failures, timeouts, blocked/withdrawn trials and unobserved assignments in the denominator; incomplete rates are lower bounds and cannot establish a product comparison.',
      'Timing uses the same both-success participant/task pair set. Excluded pairs remain in outcome/coverage tables; this is exploratory, not a population estimate.',
      'Synthetic records never establish real study execution or product acceptance. Evidence references, participant eligibility/consent and protocol adherence require human review.'] };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help')) { console.log('node scripts/analyze-study.mjs --input=evaluation/study/observations.blank.csv --participants=6 [--out=report.json] [--allow-synthetic]'); return; }
  const allowed = new Set(['input', 'participants', 'out', 'plan', 'allow-synthetic']);
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) fail('Use --name=value arguments');
    const [key, ...value] = arg.slice(2).split('=');
    if (!allowed.has(key) || key in options) fail(`Unknown/duplicate argument: ${key}`);
    if (key === 'allow-synthetic') { if (value.length) fail('--allow-synthetic has no value'); options[key] = true; }
    else { if (!value.join('=')) fail(`Missing value: ${key}`); options[key] = value.join('='); }
  }
  const planPath = options.plan ?? 'evaluation/study/plan.json';
  const planText = await readFile(planPath, 'utf8'), plan = JSON.parse(planText);
  const inputPath = options.input ?? 'evaluation/study/observations.blank.csv';
  const input = await readFile(inputPath, 'utf8');
  const assignments = makeAssignments(plan, Number(options.participants ?? 6));
  const rows = readObservations(input, assignments, { allowSynthetic: options['allow-synthetic'] ?? false, timeLimitMs: plan.trialTimeLimitMs });
  const report = { checkedAt: new Date().toISOString(), inputPath, inputSha256: createHash('sha256').update(input).digest('hex'), planPath, planSha256: createHash('sha256').update(planText).digest('hex'), ...analyzeStudy(plan, assignments, rows) };
  if (options.out) await writeFile(options.out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
