import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// On-device feasibility check (docs/09_local_ai_review.md section 10): a small
// local model picks the first-screen controls of each surveyed page from the
// same element list the engine-blind reviewers saw. Diagnostic only; the
// product does not call a model. Only fixed names, regions, headings and short
// paths are sent (the survey never collected input values).
for (const arg of process.argv.slice(2)) if (!/^--(?:elements|output|model|pages|cpu-threads|limit-lines|timeout-s|resume)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const elementsDir = value('elements'), output = value('output'), model = value('model');
if (!elementsDir || !output || !model) throw Error('--elements=<dir> --output=<file.json> --model=<ollama model> [--pages=a,b] [--cpu-threads=4] [--limit-lines=300] [--timeout-s=600] [--resume=<earlier output>]');
const only = value('pages')?.split(',');
const cpuThreads = value('cpu-threads') ? Number(value('cpu-threads')) : 0;
const limitLines = Number(value('limit-lines') ?? 300);
const timeoutMs = 1000 * Number(value('timeout-s') ?? 600);

const system = `당신은 고령자를 위한 "쉬운 화면"을 설계합니다. 사용자는 홈페이지 메뉴 찾기가 어려운 할머니입니다.
웹페이지의 누를 수 있는 요소 목록을 보고, 이 사용자가 "이 페이지에 와서" 가장 하려고 할 일에 필요한 요소를 최대 6개 고르세요. 중요한 순서대로 고릅니다.
- 게시판 목록이면 검색과 최신 글, 글 보기 페이지면 첨부파일·목록·이전/다음 글, 홈이면 검색·대표 업무·전화 문의처럼 페이지 목적에 맞게 고릅니다.
- 고르지 않는 것: 처음 화면(로고)·로그인·회원가입(따로 표시됨), 본문 바로가기, 배너 넘김, SNS, 개인정보처리방침·저작권 같은 바닥글 정책, 글자 크기·언어, 페이지 번호.
- 목록에 있는 번호(i)만 씁니다.
JSON으로만 답합니다: {"picks":[번호,...]}`;

async function pageInput(file) {
  const textValue = await readFile(file, 'utf8');
  const lines = textValue.split('\n');
  const head = lines.filter(line => /^(?:# |url:|title:|headings:)/.test(line)).map(line => line.slice(0, 400));
  const rows = [];
  for (const line of lines) {
    const cells = line.split(' | ');
    if (cells.length < 6 || !/^\d+$/.test(cells[0])) continue;
    const [i, tag, label, href, region, heading] = cells;
    rows.push({ i: Number(i), line: `${i} | ${tag} | ${label.slice(0, 60)} | ${href.slice(0, 40)} | ${region} | ${heading.slice(0, 30)}` });
  }
  const valid = new Set(rows.map(row => row.i));
  return { valid, truncated: rows.length > limitLines, prompt: `${head.join('\n')}\n\ni | 태그 | 이름 | 주소 | 영역 | 가까운 제목\n${rows.slice(0, limitLines).map(row => row.line).join('\n')}` };
}

// Streamed so a slow page is not cut by fetch's header timeout; a page over
// --timeout-s is recorded as a timeout and the run moves on.
async function ask(prompt) {
  const options = { temperature: 0, num_ctx: 16384, num_predict: 120 };
  if (cpuThreads) Object.assign(options, { num_gpu: 0, num_thread: cpuThreads });
  const started = performance.now();
  let content = '', body = {};
  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model, stream: true, think: false, format: 'json', keep_alive: '10m', options, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }) });
    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).trim(); buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const part = JSON.parse(line);
        content += part.message?.content ?? '';
        if (part.done || part.error) body = part;
      }
    }
  } catch (error) { body = { error: error.name === 'TimeoutError' ? 'timeout' : String(error) }; }
  return { wallMs: Math.round(performance.now() - started), body: { ...body, message: { content } } };
}

const files = (await readdir(elementsDir)).filter(name => name.endsWith('.txt')).sort()
  .filter(name => !only || only.includes(name.replace(/\.txt$/, '')));
await mkdir(path.dirname(output), { recursive: true });
const pages = value('resume') ? JSON.parse(await readFile(value('resume'), 'utf8')).pages.filter(page => !page.error) : [];
const save = () => writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), model, cpuThreads: cpuThreads || null, limitLines,
  scope: 'Diagnostic only. Exposed development pages (site survey 2026-11-01). Reference is an engine-blind Claude review, not human users.', system, pages }, null, 2) + '\n');
for (const name of files) {
  const pageId = name.replace(/\.txt$/, '');
  if (pages.some(page => page.pageId === pageId)) continue;
  const { valid, truncated, prompt } = await pageInput(path.join(elementsDir, name));
  const { wallMs, body } = await ask(prompt);
  let picks = [], parseError = null;
  try { picks = [...new Set((JSON.parse(body.message?.content ?? '{}').picks ?? []).map(Number))]; } catch (error) { parseError = String(error); }
  const invalid = picks.filter(i => !valid.has(i));
  pages.push({ pageId, picks: picks.filter(i => valid.has(i)).slice(0, 6), invalid, parseError, truncated, wallMs,
    promptTokens: body.prompt_eval_count, outputTokens: body.eval_count, loadMs: Math.round((body.load_duration ?? 0) / 1e6),
    promptMs: Math.round((body.prompt_eval_duration ?? 0) / 1e6), outputMs: Math.round((body.eval_duration ?? 0) / 1e6), error: body.error ?? null });
  console.log(`${pageId} ${wallMs}ms in${body.prompt_eval_count} out${body.eval_count} ${JSON.stringify(picks)}${invalid.length ? ' invalid' : ''}${body.error ? ' ' + body.error : ''}`);
  await save();
}
pages.sort((a, b) => a.pageId.localeCompare(b.pageId));
await save();
