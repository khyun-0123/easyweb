import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

// Browser-side cost of a small embedding model (docs/09_local_ai_review.md
// section 10): cold load and one page of control names, in a separate
// headless Chromium. All files come from a temporary 127.0.0.1 server on a
// free port (page.route drops a 118MB body); nothing is fetched from the network. Diagnostic only.
for (const arg of process.argv.slice(2)) if (!/^--(?:transformers|elements|output|pages)=.+$/.test(arg)) throw Error(`Unknown option: ${arg}`);
const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const transformers = value('transformers'), elementsDir = value('elements'), output = value('output');
if (!transformers || !elementsDir || !output) throw Error('--transformers=<dir> --elements=<dir> --output=<file.json> [--pages=a,b]');
const pageIds = (value('pages') ?? 'busan-home,seoul-home,busan-board,snu-home').split(',');
const dist = path.join(transformers, 'node_modules/@huggingface/transformers/dist');
const models = path.join(transformers, 'node_modules/@huggingface/transformers/.cache');

const labels = {};
for (const pageId of pageIds) {
  labels[pageId] = (await readFile(path.join(elementsDir, `${pageId}.txt`), 'utf8')).split('\n')
    .map(line => line.split(' | ')).filter(cells => cells.length >= 8 && /^\d+$/.test(cells[0])).map(cells => `query: ${cells[2].slice(0, 80)}`);
}

const types = { js: 'text/javascript', mjs: 'text/javascript', wasm: 'application/wasm', json: 'application/json', onnx: 'application/octet-stream', html: 'text/html' };
const headers = { 'cross-origin-opener-policy': 'same-origin', 'cross-origin-embedder-policy': 'require-corp', 'cross-origin-resource-policy': 'same-origin' };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const file = url.pathname === '/' ? null : url.pathname.startsWith('/models/') ? path.join(models, url.pathname.slice(8)) : path.join(dist, url.pathname.slice(1));
  if (!file) return response.writeHead(200, { ...headers, 'content-type': 'text/html' }).end('<!doctype html><title>t</title>');
  try { const body = await readFile(file); response.writeHead(200, { ...headers, 'content-type': types[file.split('.').pop()] ?? 'application/octet-stream' }).end(body); }
  catch { response.writeHead(404, headers).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-webgpu'] });
const results = [];
for (const [device, threads] of [['wasm', 1], ['wasm', 4], ['webgpu', 0]]) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('crash', () => console.log(`${device}/${threads}: renderer crashed`));
  page.on('console', message => message.type() === 'error' && console.log(`${device}/${threads}: ${message.text().slice(0, 200)}`));
  await page.goto(origin);
  const result = await page.evaluate(async ({ device, threads, labels, origin }) => {
    const out = { device, threads, isolated: self.crossOriginIsolated, webgpu: !!navigator.gpu, cpus: navigator.hardwareConcurrency };
    try {
      const { pipeline, env } = await import(`${origin}/transformers.js`);
      env.allowRemoteModels = false; env.allowLocalModels = true; env.localModelPath = `${origin}/models/`;
      env.backends.onnx.wasm.wasmPaths = `${origin}/`;
      if (threads) env.backends.onnx.wasm.numThreads = threads;
      let started = performance.now();
      const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8', device });
      out.loadMs = Math.round(performance.now() - started);
      out.pages = [];
      for (const [pageId, texts] of Object.entries(labels)) {
        started = performance.now();
        await extractor(texts, { pooling: 'mean', normalize: true });
        out.pages.push({ pageId, controls: texts.length, ms: Math.round(performance.now() - started) });
      }
    } catch (error) { out.error = String(error).slice(0, 300); }
    return out;
  }, { device, threads, labels, origin });
  console.log(JSON.stringify(result));
  results.push(result);
  await context.close();
}
await browser.close();
server.close();
await writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), host: 'Apple M4 Pro 24GB (development machine, not a target-user PC)',
  scope: 'Diagnostic only. Separate headless Chromium; local files only.', results }, null, 2) + '\n');
