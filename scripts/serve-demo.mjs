import http from 'node:http';
import { readFile } from 'node:fs/promises';

const portOption = process.argv.find(arg => arg.startsWith('--port='));
const port = portOption ? Number(portOption.slice('--port='.length)) : 4173;
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('--port must be an integer from 1 to 65535');
const files = {
  '/': ['demo/index.html', 'text/html; charset=utf-8'],
  '/content.js': ['dist/content.js', 'text/javascript; charset=utf-8'],
  '/manual-check.html': ['demo/manual-check.html', 'text/html; charset=utf-8'],
  '/manual-check-next.html': ['demo/manual-check.html', 'text/html; charset=utf-8'],
};
http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/destination') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>이동 확인</title><h1>원본 링크 이동 확인</h1><a href="/">예시 페이지로 돌아가기</a></html>');
    return;
  }
  const file = files[path];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(file[0]);
    res.writeHead(200, { 'content-type': file[1], 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(500); res.end('npm run build를 먼저 실행해주세요.');
  }
}).listen(port, '127.0.0.1', () => console.log(`EasyWeb 로컬 예시: http://127.0.0.1:${port} (종료: Ctrl+C)`));
