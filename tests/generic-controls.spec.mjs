import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
let engine;
test.beforeAll(async () => {
  const r = await build({ stdin: { contents: `export {analyzePage} from './src/analyzer'; export {classify} from './src/classifier'; export {isCandidateCurrent,areCandidatesCurrent} from './src/page-session';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'GenericEngine' });
  engine = r.outputFiles[0].text;
});
async function inspect(page, html) {
  await page.route('https://sample.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }));
  await page.goto('https://sample.test/opaque'); await page.addScriptTag({ content: engine });
  return page.evaluate(() => {
    window.items = GenericEngine.classify(GenericEngine.analyzePage());
    return items.map(({ element, ...item }) => ({ ...item, id: element.id }));
  });
}
test('검색 form의 고정 검색 필터 표식만 사용하고 값과 일반 신청 form은 읽지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>자료 목록</h2><form id="catalogSearchForm"><input type="text" aria-label="검색어" value="PRIVATE_NOT_READ"><div role="textbox" contenteditable="true">PRIVATE_EDITOR_NOT_READ</div><ul><li><a id="filter" href="#" class="category_search">과학/기술</a></li><li><a href="#" class="category_search">문학/예술</a></li></ul></form><form id="applicationForm"><ul><li><a id="ordinary" href="#">교육/훈련</a></li></ul></form><script>document.querySelectorAll('input,select,textarea').forEach(e=>Object.defineProperty(e,'value',{get(){throw Error('private value')}}))</script></main>`);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
  expect(items.filter(i=>i.label!=='검색어').map(i => [i.id, i.category, i.action])).toEqual([['filter','search','locate'],['','search','locate']]);
  expect(await page.evaluate(() => GenericEngine.isCandidateCurrent(items.find(item=>item.element.id==='filter')))).toBe(true);
  expect(await page.evaluate(() => { document.querySelector('form').id='application'; return GenericEngine.isCandidateCurrent(items.find(item=>item.element.id==='filter')); })).toBe(false);
});
test('신청 준비 편람의 제목/자료 제어를 인식하고 임의 표·뉴스는 제외한다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>민원 편람</h2><table><thead><tr><th>제목</th><th>첨부</th></tr></thead><tbody><tr><td><a id="material" href="#view" onclick="return false">건축물 현황 변경신고서</a></td><td><button id="download" type="button">자료받기</button></td></tr><tr><td><a id="opaque" href="#view" onclick="return false">공공시설 사용 인가</a></td><td><button type="button">자료받기</button></td></tr></tbody></table><section><h2>사진 목록</h2><table><tr><td><a id="photo" href="#view">봄 전경</a></td><td><button type="button">자료받기</button></td></tr></table></section></main>`);
  expect(items.filter(i=>['material','download','opaque'].includes(i.id)).map(i=>[i.id,i.category])).toEqual([['material','apply'],['download','apply'],['opaque','apply']]);
  expect(items.find(i=>i.id==='photo')).toBeUndefined();
  expect(await page.evaluate(() => { document.querySelector('th').textContent='사진'; return GenericEngine.isCandidateCurrent(items.find(i=>i.element.id==='opaque')); })).toBe(false);
});
test('정보 패널 형제 제어와 안내 제목의 그룹 링크를 읽기로 분류한다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>재해 보상</h2><div><button id="panel" type="button" aria-expanded="false">지원금 예시</button><button type="button" aria-expanded="false">지원 절차</button><button type="button" aria-expanded="false">기관 및 가입안내</button></div><section><h3>시설 이용안내</h3><div><div role="group"><a id="reading" href="/x/18" onclick="return false">보관 자료 열람</a></div><div role="group"><a href="/x/19" onclick="return false">청년 자료 이용</a></div></div></section><button id="delete" aria-expanded="false">삭제</button></main>`);
  expect(items.find(i=>i.id==='panel')?.category).toBe('help');
  expect(items.find(i=>i.id==='reading')?.category).toBe('help');
  expect(items.find(i=>i.id==='delete')).toBeUndefined();
});
test('고정 카드 제목과 설명을 분리하여 모의 계산·개인 내역·신청을 구분한다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>생활 지원 서비스</h2><ul><li><a id="calc" href="#" onclick="return false"><strong>생활비 모의계산</strong><p>소득과 가족 수를 직접 입력하면 예상 생활비를 확인할 수 있습니다. 실제 신청과 연결되지 않습니다.</p></a></li><li><a id="own" href="#" onclick="return false"><span>가입·납부내역 조회</span><p>본인의 납부 기록을 확인할 수 있습니다.</p></a></li><li><a id="request" href="/x/44"><b>상담 예약신청</b><p>상담 시간을 신청하고 담당 안내를 받을 수 있습니다.</p></a></li><li><a id="danger" href="#"><strong>수수료 결제</strong><p>예상액 조회와 신청 안내</p></a></li></ul></main>`);
  expect(items.filter(i=>['calc','own','request'].includes(i.id)).map(i=>[i.id,i.category])).toEqual([['calc','search'],['own','apply'],['request','apply']]);
  expect(items.find(i=>i.id==='danger')).toBeUndefined();
  expect(items.find(i=>i.id==='calc').label).toContain('실제 신청');
});
test('도움말 게시판의 평서 안내 문서를 공지·실행 제어와 구별한다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>자주 묻는 질문</h2><ul><li><a id="guide" href="?mode=view&articleNo=31">연구실 출입카드 잠금 관련 안내</a></li><li><a id="question" href="?mode=view&articleNo=32">연회비를 납부했는데 환불할 수 있나요?</a></li><li><a id="unsafe" href="?action=delete&articleNo=33">자료 삭제 안내</a></li><li><a id="notice" href="/notice?articleNo=34">공지사항 안내</a></li></ul></main>`);
  expect(items.filter(i=>['guide','question'].includes(i.id)).map(i=>[i.id,i.category])).toEqual([['guide','help'],['question','help']]);
  expect(items.find(i=>i.id==='unsafe')).toBeUndefined();
  expect(items.find(i=>i.id==='notice')?.category).toBe('notice');
});

test('같은 전체 이름도 카드 제목 분할이 바뀌면 이전 근거를 무효화한다', async ({ page }) => {
  await inspect(page, `<main><a id="card" href="#" onclick="return false"><strong>생활비 모의계산</strong><p>안내</p></a></main>`);
  expect(await page.evaluate(()=>GenericEngine.isCandidateCurrent(items[0]))).toBe(true);
  expect(await page.evaluate(()=>{document.querySelector('strong').textContent='생활비'; document.querySelector('p').textContent='모의계산 안내'; return GenericEngine.isCandidateCurrent(items[0]);})).toBe(false);
});
test('보조 근거는 위험 URL·스크립트·폼 제출·기사·편집 제어를 허용하지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>자주 묻는 질문</h2><ul><li><a id="news" href="/news/42?mode=view&amp;articleNo=7">연구 결과 안내</a></li><li><a id="pay" href="/pay" onclick="return false"><strong>모의계산</strong><p>비용을 살펴봅니다.</p></a></li><li><a id="script" href="javascript:openPayment()"><strong>간단계산</strong><p>비용을 살펴봅니다.</p></a></li><li><a id="editable" href="#"><strong contenteditable="true">PRIVATE_TITLE</strong><p>PRIVATE_DESC <input value="PRIVATE_INPUT"></p></a></li></ul><form id="command"></form><div><button id="submit" form="command" type="submit" aria-expanded="false">범위 안내</button><button type="button" aria-expanded="false">활용 예시</button><button type="button" aria-expanded="false">등록 절차</button></div></main>`);
  expect(items.filter(i=>['news','pay','script','editable','submit'].includes(i.id))).toEqual([]);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
});
test('패널 동료 근거와 그룹 링크 구조가 사라지면 이전 읽기 후보는 무효다', async ({ page }) => {
  await inspect(page, `<main><div><button id="panel" type="button" aria-expanded="false">지원 예시</button><button id="peer" type="button" aria-expanded="false">지원 절차</button></div></main>`);
  expect(await page.evaluate(()=>GenericEngine.isCandidateCurrent(items[0]))).toBe(true);
  expect(await page.evaluate(()=>{document.querySelector('#peer').setAttribute('hidden',''); return GenericEngine.isCandidateCurrent(items[0]);})).toBe(false);
});

test('구조 보완은 표 안 검색창·검색 버튼·명시적 신청 그룹의 기능을 덮지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>민원 편람</h2><table><thead><tr><th>제목</th><th>첨부</th></tr></thead><tr><td><a href="#view">사용 변경 서식</a><input id="search-input" type="search" aria-label="검색어"><button id="search-button" type="button">검색</button></td><td><button type="button">자료받기</button></td></tr></table><section><h3>자료 이용안내</h3><div><div role="group"><a id="request" href="#" onclick="return false">신청확인 바로가기</a></div><div role="group"><a href="#" onclick="return false">보관 자료 열람</a></div></div></section></main>`);
  expect(items.find(i=>i.id==='search-input')?.category).toBe('search');
  expect(items.find(i=>i.id==='search-button')?.category).toBe('search');
  expect(items.find(i=>i.id==='request')?.category).toBe('apply');
});

test('서식 표의 제목·첨부 열 밖에 있는 불투명 기관 링크는 신청으로 보완하지 않는다', async ({ page }) => {
  const items = await inspect(page, `<main><h2>민원 편람</h2><table><thead><tr><th>제목</th><th>첨부</th><th>관련기관</th></tr></thead><tr><td><a id="title" href="#view">시설 사용 인가</a></td><td><button id="file" type="button">자료받기</button></td><td><a id="other" href="https://another.test/x/8">기관 소개</a></td></tr></table></main>`);
  expect(items.filter(i=>['title','file'].includes(i.id)).map(i=>i.category)).toEqual(['apply','apply']);
  expect(items.find(i=>i.id==='other')).toBeUndefined();
});

test('배치 문맥 cache는 다음 검사에 재사용하지 않고 제목 변화를 즉시 감지한다', async ({ page }) => {
  await inspect(page, `<main><section><h2>시설 이용안내</h2><div><div role="group"><a href="#" onclick="return false">보관 자료 열람</a></div><div role="group"><a href="#" onclick="return false">청년 자료 이용</a></div></div></section></main>`);
  expect(await page.evaluate(()=>GenericEngine.areCandidatesCurrent(items))).toBe(true);
  expect(await page.evaluate(()=>{document.querySelector('h2').textContent='시설 사진';return GenericEngine.areCandidatesCurrent(items);})).toBe(false);
  expect(await page.evaluate(()=>{document.querySelector('h2').textContent='시설 이용안내';return GenericEngine.areCandidatesCurrent(items);})).toBe(true);
});
test('부모가 없는 documentElement 역할 제어도 보조 분석에서 예외를 내지 않는다', async ({ page }) => {
  await page.setContent('<html role="button" aria-expanded="false" aria-label="정보 예시"><body><main>고정 설명</main></body></html>');
  await page.addScriptTag({content:engine});
  expect(await page.evaluate(()=>{GenericEngine.classify(GenericEngine.analyzePage());return true;})).toBe(true);
});

test('목적 없는 페이지도 분석과 배치 현재성마다 전체 목적 검사는 한 번만 수행한다', async ({ page }) => {
  await inspect(page, `<main><h2>생활 지원</h2><a href="/search">통합 검색</a><a href="/apply">이용 신청</a></main>`);
  expect(await page.evaluate(()=>{
    const original=document.querySelectorAll.bind(document); let count=0;
    document.querySelectorAll=function(selector){if(selector.startsWith('main > :is('))count++;return original(selector);};
    items=GenericEngine.classify(GenericEngine.analyzePage());const analysis=count;count=0;
    const current=GenericEngine.areCandidatesCurrent(items);return {analysis,batch:count,current};
  })).toEqual({analysis:1,batch:1,current:true});
});
