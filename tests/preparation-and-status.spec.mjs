import { test, expect } from '@playwright/test';
import { build } from 'esbuild';

let engine;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: "export {analyzePage} from './src/analyzer'; export {classify} from './src/classifier'; export {rank} from './src/ranker';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'Tasks' });
  engine = result.outputFiles[0].text;
});
async function setup(page, body) {
  await page.route('https://tasks.example.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta charset="utf-8">' + body }));
  await page.goto('https://tasks.example.test/services');
  await page.addScriptTag({ content: engine });
}
const classify = page => page.evaluate(() => Tasks.classify(Tasks.analyzePage(), {mode:'generic'}).map(({element,snapshot,...c}) => ({...c,id:element.id})));

test('신청 준비 목록의 명시적 서식 다운로드는 기능 실행과 구별한 준비 문서다', async ({page}) => {
  await setup(page, '<main><h1>공공 서비스 안내</h1><section><h2>신청서 및 구비서류</h2><ul><li><a id="form" href="/files/FileDown.do?document=random"><i class="icon-download" aria-hidden="true"></i>동의서</a></li></ul></section></main>');
  expect((await classify(page)).find(c=>c.id==='form')).toMatchObject({category:'apply',action:'locate',pageTask:'reading'});
});

test('기사나 무관한 목록의 문서명은 신청 준비로 승격하지 않는다', async ({page}) => {
  for (const body of [
    '<article><h2>신청서 및 구비서류</h2><ul><li><a id="form" href="/files/FileDown.do"><i class="icon-download"></i>동의서</a></li></ul></article>',
    '<section><h2>참고 문서</h2><ul><li><a id="form" href="/files/FileDown.do"><i class="icon-download"></i>동의서</a></li></ul></section>',
  ]) {
    await setup(page, '<main>'+body+'</main>');
    expect((await classify(page)).find(c=>c.id==='form')?.pageTask).not.toBe('reading');
  }
});

test('본문의 신청·예약 내역 확인은 설명 제목과 구분한 직접 과제다', async ({page}) => {
  await setup(page, '<nav><a href="/old">신청</a></nav><main><h1>이용 안내</h1><a id="status" href="/records">예약 내역 확인 바로가기</a><a id="guide" href="/explanation">예약 방법 안내</a></main>');
  const items=await classify(page);
  expect(items.find(c=>c.id==='status')).toMatchObject({category:'apply',pageTask:'control',action:'navigate'});
  expect(items.find(c=>c.id==='guide')?.pageTask).not.toBe('control');
});

test('상태 확인 과제는 많은 설명 메뉴 사이에서도 첫 화면에 도달 경로가 있다', async ({page}) => {
  await setup(page, '<nav><a href="/requests">신청</a><a href="/bookings">예약</a></nav><main><h1>이용 안내</h1><ul>'+Array.from({length:3},(_,i)=>`<li><a href="/guide-${i}">이용 방법 안내 ${i}</a></li>`).join('')+'</ul><a href="/search">자료 검색</a><a id="status" href="/records">신청 확인 바로가기</a></main>');
  const ids=await page.evaluate(()=>Tasks.rank(Tasks.classify(Tasks.analyzePage(),{mode:'generic'})).map(c=>c.element.id));
  expect(ids).toContain('status');
  expect(ids.length).toBeLessThanOrEqual(6);
});

test('폼 제출과 위험 명령은 상태 확인이라는 이름으로 직접 과제가 되지 않는다', async ({page}) => {
  await setup(page, '<main><form><button id="submit">신청 확인 바로가기</button></form><a id="danger" href="/records?cmd=delete">신청 확인 바로가기</a></main>');
  const items=await classify(page);
  expect(items.find(c=>c.id==='submit')?.pageTask).not.toBe('control');
  expect(items.find(c=>c.id==='danger')).toBeUndefined();
});
