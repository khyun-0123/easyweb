import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Free-tier API check (docs/reviews/business_review_20261118.md section 7). Asks a hosted model,
// through any OpenAI-compatible chat endpoint (OpenRouter, Gemini's OpenAI endpoint, Groq...), to
// pick first-screen controls -- but only on the pages the "rules first" gate sends out
// (scripts/ml/ondevice-gate.mjs, route "target"). Blocked and rule-typed pages are never sent.
// The system prompt is read from the saved gemma4:12b run so both use the same instruction.
// Only fixed names, regions, headings and short paths are sent (the survey never read input values).
// The key is read from the environment variable named by --key-env and is never written out.
// A 429 stops the run and saves what is done; --resume continues on another day.
const known = /^--(?:base-url|model|key-env|elements|gate|prompt-from|output|rpm|resume|max-tokens|deny-data-collection|dry-run)(?:=.+)?$/;
for (const arg of process.argv.slice(2)) if (!known.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const flag = name => process.argv.includes(`--${name}`);
const baseUrl = value('base-url') ?? 'https://openrouter.ai/api/v1';
const model = value('model'), keyEnv = value('key-env') ?? 'OPENROUTER_API_KEY';
const elementsDir = value('elements'), gateFile = value('gate'), promptFrom = value('prompt-from'), output = value('output');
if (!model || !elementsDir || !gateFile || !promptFrom || !output) throw Error('--model=<id> --elements=<dir> --gate=<gate-score.json> --prompt-from=<earlier picks.json> --output=<file.json> [--base-url] [--key-env=OPENROUTER_API_KEY] [--rpm=10] [--max-tokens=600] [--deny-data-collection] [--resume=<file>] [--dry-run]');
const rpm = Number(value('rpm') ?? 10), maxTokens = Number(value('max-tokens') ?? 600), limitLines = 300;
const dryRun = flag('dry-run');
const key = process.env[keyEnv];
if (!dryRun && !key) throw Error(`Set ${keyEnv} in the environment first.`);

const earlier = JSON.parse(await readFile(promptFrom, 'utf8'));
const system = earlier.system;
if (!system) throw Error(`${promptFrom} has no saved system prompt`);
const gate = JSON.parse(await readFile(gateFile, 'utf8')).gate;
const targets = Object.entries(gate).filter(([, g]) => g.route === 'target').map(([pageId]) => pageId).sort();

// Same page text as scripts/ml/ondevice-llm.mjs pageInput().
async function pageInput(file) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  const head = lines.filter(line => /^(?:# |url:|title:|headings:)/.test(line)).map(line => line.slice(0, 400));
  const rows = [];
  for (const line of lines) {
    const cells = line.split(' | ');
    if (cells.length < 6 || !/^\d+$/.test(cells[0])) continue;
    const [i, tag, label, href, region, heading] = cells;
    rows.push({ i: Number(i), line: `${i} | ${tag} | ${label.slice(0, 60)} | ${href.slice(0, 40)} | ${region} | ${heading.slice(0, 30)}` });
  }
  return { valid: new Set(rows.map(row => row.i)), truncated: rows.length > limitLines,
    prompt: `${head.join('\n')}\n\ni | 태그 | 이름 | 주소 | 영역 | 가까운 제목\n${rows.slice(0, limitLines).map(row => row.line).join('\n')}` };
}

const pages = value('resume') ? JSON.parse(await readFile(value('resume'), 'utf8')).pages.filter(page => !page.error) : [];
let stopped = null;
const save = () => writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), model, baseUrl, keyEnv, dataCollection: flag('deny-data-collection') ? 'deny' : 'provider default',
  limitLines, maxTokens, scope: 'Diagnostic only. Independent test pages (2026-11-17), gate route "target" only. Reference is an engine-blind Claude review, not human users.',
  stopped, targets: targets.length, system, pages }, null, 2) + '\n');

if (dryRun) {
  let chars = 0;
  for (const pageId of targets) chars += (await pageInput(path.join(elementsDir, pageId + '.txt'))).prompt.length;
  console.log(`dry run: ${targets.length} target pages would be sent (${pages.length} already done), about ${Math.round(chars / targets.length)} characters each; nothing sent`);
  process.exit(0);
}

const gap = 60000 / rpm;
for (const pageId of targets) {
  if (pages.some(page => page.pageId === pageId)) continue;
  const { valid, truncated, prompt } = await pageInput(path.join(elementsDir, pageId + '.txt'));
  const started = performance.now();
  const body = { model, temperature: 0, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] };
  if (flag('deny-data-collection')) body.provider = { data_collection: 'deny' };
  let status = 0, data = {}, error = null;
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, { method: 'POST', signal: AbortSignal.timeout(180000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
    status = response.status;
    data = await response.json().catch(() => ({}));
    if (!response.ok) error = `${status} ${data.error?.message ?? ''}`.trim();
  } catch (caught) { error = caught.name === 'TimeoutError' ? 'timeout' : String(caught); }
  const wallMs = Math.round(performance.now() - started);
  if (status === 429) { stopped = `429 at ${pageId}: ${error}`; console.log(stopped); break; }
  const content = data.choices?.[0]?.message?.content ?? '';
  let picks = [], parseError = null;
  try { picks = [...new Set((JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] ?? '{}').picks ?? []).map(Number))]; } catch (caught) { parseError = String(caught); }
  const invalid = picks.filter(i => !valid.has(i));
  pages.push({ pageId, picks: picks.filter(i => valid.has(i)).slice(0, 6), invalid, parseError, truncated, wallMs,
    promptTokens: data.usage?.prompt_tokens ?? null, outputTokens: data.usage?.completion_tokens ?? null, provider: data.provider ?? null, error });
  console.log(`${pageId} ${wallMs}ms ${JSON.stringify(picks)}${invalid.length ? ' invalid' : ''}${error ? ' ' + error : ''}`);
  await save();
  await new Promise(resolve => setTimeout(resolve, Math.max(0, gap - wallMs)));
}
pages.sort((a, b) => a.pageId.localeCompare(b.pageId));
await save();
const done = pages.filter(page => !page.error).length;
console.log(`${done}/${targets.length} target pages done${stopped ? ' (stopped; run again with --resume=' + output + ')' : ''}`);
if (done === targets.length) console.log('sha256 ' + createHash('sha256').update(await readFile(output)).digest('hex') + '  ' + path.basename(output));
