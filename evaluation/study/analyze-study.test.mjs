// Every row below is generated in memory for synthetic analysis verification.
// A few cases set data_kind=real solely to exercise validation/status branches.
// None is an enrolled participant, an observed usability result, or a product pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { OBSERVATION_COLUMNS, parseCsv, makeAssignments, readObservations, analyzeStudy } from '../../scripts/analyze-study.mjs';

const plan = JSON.parse(await readFile(new URL('./plan.json', import.meta.url), 'utf8'));
const assignments = makeAssignments(plan, 6);
const blank = OBSERVATION_COLUMNS.join(',') + '\n';
const csv = records => blank + records.map(record => OBSERVATION_COLUMNS.map(key => {
  const value = String(record[key] ?? '');
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}).join(',')).join('\n') + (records.length ? '\n' : '');
const fixture = (kind = 'synthetic') => assignments.map(a => ({
  data_kind: kind, participant_id: a.participantId, task_id: a.taskId, condition: a.condition, trial_order: a.trialOrder,
  outcome: 'success', elapsed_ms: a.condition === 'original' ? 10000 : 8000, misclicks: 0, help_requests: 0,
  returned_to_original: a.condition === 'original' ? 'not_applicable' : 'yes', difficulty: 2,
  serious_wrong_guidance: 0, unexpected_sensitive_action: 0, evidence_ref: 'synthetic:test-only', observer_note: '',
}));
const evaluate = (records, allowSynthetic = true) => analyzeStudy(plan, assignments, readObservations(csv(records), assignments, { allowSynthetic, timeLimitMs: plan.trialTimeLimitMs }));

for (const n of [6, 7, 8]) test(`planned ${n}-person assignment has all sites, matched tasks and balanced condition order`, () => {
  const rows = makeAssignments(plan, n);
  assert.equal(rows.length, n * 10);
  for (const participant of new Set(rows.map(r => r.participantId))) {
    const participantRows = rows.filter(r => r.participantId === participant);
    assert.deepEqual(participantRows.map(r => r.trialOrder), [1,2,3,4,5,6,7,8,9,10]);
    assert.equal(new Set(participantRows.map(r => r.siteId)).size, 5);
    assert.equal(new Set(participantRows.map(r => r.taskId)).size, 5);
  }
  for (const site of plan.siteOrder) {
    const siteRows = rows.filter(r => r.siteId === site);
    assert.equal(siteRows.length, 2 * n);
    const first = siteRows.filter(r => r.trialOrder % 2 === 1);
    assert.ok(Math.abs(first.filter(r => r.condition === 'original').length - first.filter(r => r.condition === 'easyweb').length) <= 1);
    for (const task of plan.tasks.filter(t => t.siteId === site)) assert.ok(siteRows.filter(r => r.taskId === task.taskId && r.condition === 'original').length >= 2);
  }
});

test('task plan preserves all 15 actual public tasks and records source hashes', async () => {
  assert.equal(plan.tasks.length, 15);
  for (const [filename, hash] of Object.entries(plan.sourceDatasetSha256)) {
    const source = await readFile(new URL(`../sites/${filename}`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(source).digest('hex'), hash);
    const site = JSON.parse(source);
    for (const page of site.pages) {
      const task = plan.tasks.find(t => t.taskId === page.task.id);
      assert.equal(task.instruction, page.task.instruction);
      assert.equal(task.startUrl, page.finalUrl ?? page.url);
      assert.deepEqual(task.expectedTargets.map(t => t.sourceId), page.task.expectedSourceIds);
    }
  }
});

test('empty real-data CSV stays NOT_RUN, all 60 assignments unobserved and all metrics unknown', () => {
  const report = analyzeStudy(plan, assignments, readObservations(blank, assignments));
  assert.equal(report.studyStatus, 'NOT_RUN'); assert.equal(report.productAcceptance, 'NOT_EVALUATED');
  assert.equal(report.missingRows, 60); assert.equal(report.observedTrials, 0);
  assert.equal(report.summary.time.originalMedianMs, null);
  assert.equal(report.allMetricGoalsMet, null);
  assert.ok(Object.values(report.metricGoals).every(value => value === null));
});

test('synthetic records need explicit flag and can never establish real study acceptance', () => {
  assert.throws(() => evaluate(fixture(), false), /--allow-synthetic/);
  const report = evaluate(fixture());
  assert.equal(report.studyStatus, 'SYNTHETIC_ONLY'); assert.equal(report.productAcceptance, 'NOT_EVALUATED');
  assert.equal(report.experimentPerformed, 'NOT_CONFIRMED_BY_CLI'); assert.equal(report.allMetricGoalsMet, null);
  assert.equal(report.summary.time.includedPairs, 30);
  assert.ok(Math.abs(report.summary.time.reductionOfPairedSetMedians - 0.2) < 1e-12);
});

test('synthetic real-mode branch still requires manual review after all numerical goals', () => {
  const report = evaluate(fixture('real'));
  assert.equal(report.studyStatus, 'RECORDED_COMPLETE_PENDING_MANUAL_REVIEW');
  assert.equal(report.productAcceptance, 'PENDING_MANUAL_EVIDENCE_REVIEW');
  assert.equal(report.experimentPerformed, 'NOT_CONFIRMED_BY_CLI'); assert.equal(report.allMetricGoalsMet, true);
});

test('mixed real/synthetic, duplicate trials and counterbalance changes are rejected', () => {
  const mixed = fixture(); mixed[0].data_kind = 'real'; assert.throws(() => evaluate(mixed), /mix real and synthetic/);
  const duplicate = fixture(); duplicate.push({ ...duplicate[0] }); assert.throws(() => evaluate(duplicate), /duplicate/);
  const wrongOrder = fixture(); wrongOrder[0].trial_order = 2; assert.throws(() => evaluate(wrongOrder), /trial_order/);
});

test('blank measurement is unknown, not an invented zero, and unassigned trial is rejected', () => {
  const missing = fixture(); missing[0].misclicks = ''; assert.throws(() => evaluate(missing), /blank is not zero/);
  const unknown = fixture(); unknown[0].task_id = 'nonexistent-task'; assert.throws(() => evaluate(unknown), /not assigned/);
});

test('only identical participant/task pairs enter timing; pooled successes cannot be paired', () => {
  const records = fixture();
  const left = records.find(r => r.participant_id === 'P01' && r.condition === 'original');
  const right = records.find(r => r.participant_id === 'P02' && r.condition === 'easyweb');
  const report = evaluate([left, right]);
  assert.equal(report.summary.time.includedPairs, 0); assert.equal(report.summary.time.originalMedianMs, null);
  assert.equal(report.summary.pairOutcomes.incomplete, 30); assert.equal(report.productAcceptance, 'NOT_EVALUATED');
});

test('failures remain in assigned denominators and excluded timing pair counts', () => {
  const records = fixture(); const firstSite = plan.siteOrder[0];
  const siteTasks = new Set(plan.tasks.filter(t => t.siteId === firstSite).map(t => t.taskId));
  for (const r of records) if (siteTasks.has(r.task_id)) {
    if ((r.participant_id === 'P01' && r.condition === 'original') || (r.participant_id === 'P02' && r.condition === 'easyweb') || r.participant_id === 'P03') r.outcome = 'failure';
  }
  const report = evaluate(records);
  assert.equal(report.summary.original.successes, 28); assert.equal(report.summary.original.assigned, 30);
  assert.equal(report.summary.original.successRateOfAssigned, 28 / 30);
  assert.deepEqual(report.summary.pairOutcomes, { bothSuccess: 27, originalOnlySuccess: 1, easywebOnlySuccess: 1, neitherSuccess: 1, incomplete: 0 });
  assert.equal(report.summary.time.excludedPairs, 3);
});

test('primary paired-set median ratio is not replaced by median individual percentage', () => {
  const records = fixture(); for (const r of records) r.outcome = 'failure';
  const pairs = [...new Set(records.map(r => `${r.participant_id}|${r.task_id}`))].slice(0, 3);
  const original = [100, 1000, 10000], easyweb = [50, 900, 1000];
  for (const r of records) {
    const i = pairs.indexOf(`${r.participant_id}|${r.task_id}`);
    if (i !== -1) { r.outcome = 'success'; r.elapsed_ms = r.condition === 'original' ? original[i] : easyweb[i]; }
  }
  const report = evaluate(records);
  assert.equal(report.summary.time.includedPairs, 3); assert.equal(report.summary.time.excludedPairs, 27);
  assert.ok(Math.abs(report.summary.time.reductionOfPairedSetMedians - 0.1) < 1e-12);
  assert.equal(report.summary.time.medianWithinPairReduction, 0.5);
  assert.equal(report.metricGoals.pairedMedianTimeReduction20Percent, false);
});

test('not_run and missing rows do not become failed trials or a completed study', () => {
  const records = fixture(); const pending = records[0]; pending.outcome = 'not_run';
  for (const key of OBSERVATION_COLUMNS.slice(6)) pending[key] = '';
  const report = evaluate(records);
  assert.equal(report.explicitNotRunTrials, 1); assert.equal(report.missingRows, 0); assert.equal(report.observedTrials, 59);
  assert.equal(report.recordsComplete, false); assert.equal(report.summary.original.outcomes.failure, 0);
  assert.equal(report.summary.original.successRateOfAssigned, 29 / 30); assert.equal(report.allMetricGoalsMet, null);
});

test('completed failures with no common successes cannot pass the time goal', () => {
  const records = fixture('real'); for (const r of records) r.outcome = 'failure';
  const report = evaluate(records);
  assert.equal(report.recordsComplete, true); assert.equal(report.summary.time.includedPairs, 0);
  assert.equal(report.metricGoals.pairedMedianTimeReduction20Percent, null); assert.equal(report.allMetricGoalsMet, false);
});

test('serious misguidance and sensitive actions independently fail improvement criteria', () => {
  const records = fixture('real'); records[0].serious_wrong_guidance = 1; records[1].unexpected_sensitive_action = 1;
  const report = evaluate(records);
  assert.equal(report.metricGoals.zeroSeriousWrongGuidance, false); assert.equal(report.metricGoals.zeroUnexpectedSensitiveAction, false);
  assert.equal(report.allMetricGoalsMet, false); assert.notEqual(report.productAcceptance, 'PASS');
});

test('return success is reported separately from timed primary reach', () => {
  const records = fixture(); records.find(r => r.condition === 'easyweb').returned_to_original = 'no';
  const report = evaluate(records);
  assert.equal(report.summary.easyweb.successes, 30); assert.equal(report.summary.originalReturn.attempted, 30);
  assert.equal(report.summary.originalReturn.succeeded, 29); assert.equal(report.summary.originalReturn.successRateOfAttempts, 29 / 30);
});

test('zero or over-limit success and malformed timeout are rejected', () => {
  for (const elapsed of [0, 180001]) { const records = fixture(); records[0].elapsed_ms = elapsed; assert.throws(() => evaluate(records), /elapsed_ms/); }
  const records = fixture(); records[0].outcome = 'timeout'; assert.throws(() => evaluate(records), /predeclared time limit/);
});

test('CSV preserves quoted commas/newlines and rejects malformed quoting/headers', () => {
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n"hello, x","say ""yes""\nnext"\r\n'), [['a','b'],['hello, x','say "yes"\nnext']]);
  assert.throws(() => parseCsv('a\n"unfinished'), /unclosed/);
  assert.throws(() => readObservations('a,b\n', assignments), /columns/);
});

test('standalone CLI on actual blank artifact cannot produce a study pass', () => {
  const output = execFileSync(process.execPath, ['scripts/analyze-study.mjs'], { encoding: 'utf8', cwd: new URL('../..', import.meta.url) });
  const report = JSON.parse(output); assert.equal(report.studyStatus, 'NOT_RUN'); assert.equal(report.dataKind, 'none');
  assert.equal(report.productAcceptance, 'NOT_EVALUATED'); assert.equal(report.observedTrials, 0);
});

// Order strata are descriptive, so carryover cannot be hidden in a pooled headline.
test('counterbalanced order strata retain all assigned pairs', () => {
  const report = evaluate(fixture());
  assert.deepEqual(report.conditionOrders.map(group => [group.firstCondition, group.assignedPairs]), [['original', 15], ['easyweb', 15]]);
  assert.equal(report.conditionOrders.reduce((n, group) => n + group.bothSuccessPairs, 0), 30);
});

// A known outcome row is not proof that an actual paired user trial took place.
test('blocked or withdrawn records remain reported but cannot replace six paired observations', () => {
  for (const outcome of ['blocked', 'withdrawn']) {
    const records = fixture('real');
    for (const row of records) if (row.participant_id === 'P06') row.outcome = outcome;
    const report = evaluate(records);
    assert.equal(report.recordsComplete, true);
    assert.equal(report.coverageMet, false);
    assert.equal(report.summary.pairedObservations, 25);
    assert.ok(report.sites.every(site => site.pairedObservations === 5));
    assert.equal(report.studyStatus, 'INCOMPLETE');
    assert.equal(report.summary.original.outcomes[outcome], 5);
    assert.equal(report.summary.original.assigned, 30);
    assert.equal(report.productAcceptance, 'NOT_EVALUATED');
  }
});
