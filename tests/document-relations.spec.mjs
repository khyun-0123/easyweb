import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
let engine;
test.beforeAll(async () => {
  const result = await build({ stdin: { contents: `export { documentRelation } from './src/document-relations';export { analyzePage,candidateLabel } from './src/analyzer';export { sourceAction } from './src/action-policy';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'Docs' });
  engine = result.outputFiles[0].text;
});
async function setup(page, html, url = 'https://example.test/current') {
  await page.route('**/*', route => route.request().isNavigationRequest() && route.request().url() === url
    ? route.fulfill({ body: html, contentType: 'text/html; charset=utf-8', headers: { 'Content-Security-Policy': "script-src 'none';connect-src 'none';object-src 'none'" } }) : route.abort());
  await page.goto(url);
  await page.evaluate(engine);
}
async function relation(page, selector = '#target') {
  return page.evaluate(selector => {
    const element = document.querySelector(selector);
    const candidate = Docs.analyzePage().find(item => item.element === element);
    if (!candidate) return null;
    const e = Docs.documentRelation(candidate);
    return e ? { rule: e.rule, category: e.category, task: e.pageTask, scope: e.contentScope, relatedLabel: e.relatedLabel ?? null, fingerprint: e.fingerprint,
      action: candidate.action, label: candidate.label, href: candidate.href ?? null, target: candidate.target ?? null, sourceTarget: element.getAttribute('target'), nodes: e.dependencies.length } : null;
  }, selector);
}
const newsTable = ({ name = '산림 관측 장비 실무자 가이드북', columns = ['번호', '제목', '작성일', '부서', '첨부'], extra = '', caption = '공개 자료실' } = {}) => {
  const cells = { 번호: '8', 제목: `<a id="target" href="javascript:openDocument('opaque');">${name}</a>`, 작성일: '2026/07/16', 부서: '자료지원팀', 첨부: '<img alt="file">' };
  return `<main><section id="region"><h2><span id="heading-text">공개 업무자료</span></h2><div id="container"><table id="table"><caption id="caption"><span id="caption-text">${caption}</span></caption><thead id="head"><tr id="header-row">${columns.map((name, i) => `<th id="column-${i}"><span id="column-text-${i}">${name}</span></th>`).join('')}</tr></thead><tbody id="body"><tr id="row">${columns.map((name, i) => `<td id="cell-${i}">${cells[name]}</td>`).join('')}</tr></tbody></table>${extra}</div></section></main>`;
};
const directoryTable = ({ name = '음향기록 열람구역', columns = ['층수', '구분', '자료설명', '이용문의'], caption = '별관 자료실 이용안내', rowspan = false } = {}) => {
  const cells = { 층수: `<td id="floor"${rowspan ? ' rowspan="2"' : ''}>4</td>`, 구분: '<td>개가제</td>', 자료설명: `<td id="name-cell"><a id="target" href="#" onclick="openRoom('opaque');return false;"><span id="room-name">${name}</span></a></td>`, 이용문의: '<td>자료지원과</td>' };
  return `<main><div id="container"><table id="table"><caption id="caption"><span id="caption-text">${caption}</span></caption><thead id="head"><tr id="header-row">${columns.map((name, i) => `<th id="column-${i}"><span id="column-text-${i}">${name}</span></th>`).join('')}</tr></thead><tbody id="body"><tr id="row">${columns.map(name => cells[name]).join('')}</tr>${rowspan ? `<tr id="row-two">${columns.filter(name => name !== '층수').map(name => name === '자료설명' ? '<td><a id="second" href="#" onclick="openRoom(2)">시청각 자료실</a></td>' : '<td>공개정보</td>').join('')}</tr>` : ''}</tbody></table></div></main>`;
};
const academicTable = ({ title = '연구장학금 지급에 관한 시행세칙', authoredTitle = title.replace('시행세칙', '운영세칙') + ' 다운로드', columns = ['구분', '파일(PDF) 다운로드'], caption = '연구장학금 지급규정 다운로드 표' } = {}) => {
  return `<main><section id="region"><h3>장학 학사안내</h3><h4>연구장학금 지급규정</h4><div id="container"><table id="table"><caption id="caption"><span id="caption-text">${caption}</span></caption><thead id="head"><tr id="header-row">${columns.map((name, i) => `<th id="column-${i}"><span id="column-text-${i}">${name}</span></th>`).join('')}</tr></thead><tbody id="body"><tr id="row">${columns.map((name, i) => name === '구분' ? `<td id="row-title"><span id="row-title-text">${title}</span></td>` : `<td id="download-cell"><a id="target" href="/download/document.pdf?token=arbitrary" target="_blank" title="${authoredTitle}"><span id="file-name">pdf 다운로드</span></a></td>`).join('')}</tr></tbody></table></div></section></main>`;
};
const academicTabs = ({ selected = '장학금 지급규정', title = '장학금 지급규정(북부)', name = '학자금 융자제도', pageTitle = '장학 학사안내' } = {}) => `<main><div id="owner"><div><h3 id="page-heading"><span id="page-heading-text">${pageTitle}</span></h3></div><div id="wrapper"><div><ul id="tabs"><li id="selected-row" class="active"><a id="selected" href="/current#reading">${selected}</a></li><li><a href="/merit#reading">교내 장학금</a></li><li><a id="target" href="/finance#topic" target="_blank">${name}</a></li></ul></div></div><section id="region"><div id="content"><h4 id="content-heading"><span id="content-heading-text">${title}</span></h4><p>공개 문서 본문</p></div></section></div></main>`;

test('고정 문서종류가 실제 제목·날짜·부서·첨부 열의 고유 문서 제어를 설명한다', async ({ page }) => {
  for (const [name, columns] of [['산림 관측 장비 실무자 가이드북', ['번호','제목','작성일','부서','첨부']], ['환경 측정 지원 업무매뉴얼', ['첨부','부서','제목','번호','작성일']], ['실험공간 운영 안내서', ['부서','작성일','첨부','제목','번호']]]) {
    await setup(page, newsTable({ name, columns }));
    const result = await relation(page);
    expect(result).toMatchObject({ rule: 'listed-fixed-document-kind', category: 'help', action: 'locate', label: name, task: 'reading' });
    await page.unrouteAll();
  }
});
test('뉴스·일반 제목·서식 언급만으로 문서 분류를 만들지 않는다', async ({ page }) => {
  for (const name of ['새로운 장비 시범운영 소식', '가이드북 발간 행사 개최', '신청서 작성 가이드북', '납부 신청 실행', '장비 안내서 뉴스']) {
    await setup(page, newsTable({ name })); expect(await relation(page), name).toBeNull(); await page.unrouteAll();
  }
});
test('문서표의 중복·누락·병합·중첩·복수제목 관계는 거절한다', async ({ page }) => {
  for (const change of ['duplicate-header','missing-header','merge-header','merge-title','nested','two-controls','role-button-header']) {
    await setup(page, newsTable());
    await page.evaluate(change => {
      if (change === 'duplicate-header') document.querySelector('#column-0').textContent = '제목';
      if (change === 'missing-header') document.querySelector('#column-4').textContent = '별도정보';
      if (change === 'merge-header') document.querySelector('#column-1').colSpan = 2;
      if (change === 'merge-title') document.querySelector('#cell-1').colSpan = 2;
      if (change === 'nested') document.querySelector('#cell-1').insertAdjacentHTML('beforeend', '<table><tr><td>설명서</td></tr></table>');
      if (change === 'two-controls') document.querySelector('#cell-1').insertAdjacentHTML('beforeend', '<a href="/other">별도 안내서</a>');
      if (change === 'role-button-header') document.querySelector('#column-1').setAttribute('role','button');
    }, change);
    expect(await relation(page), change).toBeNull(); await page.unrouteAll();
  }
});
test('정보디렉토리는 낯선 이름·열 재배열·층수의 수직병합을 정렬한다', async ({ page }) => {
  for (const columns of [['층수','구분','자료설명','이용문의'], ['이용문의','자료설명','층수','구분'], ['구분','층수','이용문의','자료설명']]) {
    await setup(page, directoryTable({ columns, rowspan: true }));
    expect(await relation(page)).toMatchObject({ rule: 'aligned-information-directory', category: 'help', action: 'locate', label: '음향기록 열람구역' });
    expect(await relation(page,'#second')).toMatchObject({ rule: 'aligned-information-directory', label: '시청각 자료실' });
    await page.unrouteAll();
  }
});
test('디렉토리 예약·신청·업무제어 표나 제어 이름은 읽기근거를 얻지 않는다', async ({ page }) => {
  for (const item of [{ caption: '시설 예약 이용안내' }, { caption: '시설 결제 안내' }, { caption: '일반 자료 현황' }, { name: '자료실 예약 신청' }, { name: '발급하기' }]) {
    await setup(page, directoryTable(item)); expect(await relation(page), JSON.stringify(item)).toBeNull(); await page.unrouteAll();
  }
});
test('디렉토리 의미열 병합·잘못된 층수범위·행누락·중첩·다중제어를 거절한다', async ({ page }) => {
  for (const change of ['name-rowspan','name-colspan','overflow','zero-span','missing-cell','nested','another-control','ambiguous-column','interactive-row']) {
    await setup(page, directoryTable({ rowspan: true }));
    await page.evaluate(change => {
      if (change === 'name-rowspan') document.querySelector('#name-cell').rowSpan = 2;
      if (change === 'name-colspan') document.querySelector('#name-cell').colSpan = 2;
      if (change === 'overflow') document.querySelector('#floor').rowSpan = 3;
      if (change === 'zero-span') document.querySelector('#floor').setAttribute('rowspan','0');
      if (change === 'missing-cell') document.querySelector('#row-two').lastElementChild.remove();
      if (change === 'nested') document.querySelector('#name-cell').insertAdjacentHTML('beforeend','<table><tr><td>별도정보</td></tr></table>');
      if (change === 'another-control') document.querySelector('#row').lastElementChild.insertAdjacentHTML('beforeend','<a href="/reserve">예약</a>');
      if (change === 'ambiguous-column') document.querySelector('#column-1').textContent = '자료설명';
      if (change === 'interactive-row') document.querySelector('#target').insertAdjacentHTML('beforeend','<span role="checkbox">선택</span>');
    }, change);
    expect(await relation(page), change).toBeNull(); await page.unrouteAll();
  }
});
test('학업지원 PDF는 고정행제목을 primary관련이름으로 쓰고 title속성은 규정계열만 교차검증한다', async ({ page }) => {
  for (const columns of [['구분','파일(PDF) 다운로드'], ['파일(PDF) 다운로드','구분']]) {
    await setup(page, academicTable({ columns }));
    expect(await relation(page)).toMatchObject({ rule: 'academic-support-regulation-file', category: 'academic', relatedLabel: '연구장학금 지급에 관한 시행세칙', label: 'pdf 다운로드', action: 'locate', target: null, sourceTarget: '_blank' });
    await page.unrouteAll();
  }
});
test('일반 파일·다른 제목·결제·서식·모호한 학업표는 새 근거를 얻지 않는다', async ({ page }) => {
  for (const item of [{ title: '등록금 납부서' }, { title: '연간 재무 보고서', caption: '재무 자료 표' }, { authoredTitle: '교내 장학금 지급규정 다운로드' }, { authoredTitle: '장학금 설치 프로그램 다운로드' }, { title: '장학금 신청서', caption: '장학금 서식 다운로드 표' }, { caption: '공지와 소식' }, { columns: ['구분','별도파일'] }]) {
    await setup(page, academicTable(item)); expect(await relation(page),JSON.stringify(item)).toBeNull(); await page.unrouteAll();
  }
});
test('선택 문서와 본문·학사 heading이 맞는 학업지원 탭은 다른문서 fragment도 navigate를 보존한다', async ({ page }) => {
  await setup(page, academicTabs());
  expect(await relation(page)).toMatchObject({ rule: 'selected-academic-support-documents', category: 'academic', action: 'navigate', label: '학자금 융자제도', href: 'https://example.test/finance#topic', target: '_blank' });
});
test('학업 탭은 선택중복·다른문서선택·다른본문·전역메뉴·업무 peer를 거절한다', async ({ page }) => {
  for (const change of ['duplicate','not-current','wrong-title','no-owner','operation','foreign','handler','nested-menu']) {
    await setup(page, academicTabs());
    await page.evaluate(change => {
      if (change === 'duplicate') document.querySelector('#target').setAttribute('aria-current','page');
      if (change === 'not-current') document.querySelector('#selected').href = '/other#reading';
      if (change === 'wrong-title') document.querySelector('#content-heading').textContent = '다른 장학금 제도';
      if (change === 'no-owner') document.querySelector('#page-heading').textContent = '자료 모음';
      if (change === 'operation') document.querySelector('#selected').textContent = '장학금 신청';
      if (change === 'foreign') document.querySelector('#target').href = 'https://other.test/finance';
      if (change === 'handler') document.querySelector('#target').setAttribute('onclick','openTopic()');
      if (change === 'nested-menu') document.querySelector('#selected-row').insertAdjacentHTML('beforeend','<ul><li><a href="/extra">교외 장학금</a></li></ul>');
    }, change);
    expect(await relation(page),change).toBeNull(); await page.unrouteAll();
  }
});
test('입력·편집·사적값·숨김·기사·form 경계는 모든 관계에서 거절한다', async ({ page }) => {
  for (const render of [newsTable,directoryTable,academicTable,academicTabs]) {
    for (const change of ['form','article','editor-own','nested-private','hidden-own']) {
      await setup(page, render());
      await page.evaluate(change => {
        const element = document.querySelector('#target');
        if (change === 'form' || change === 'article') { const wrapper = document.createElement(change); element.before(wrapper);wrapper.append(element); }
        if (change === 'editor-own') element.setAttribute('role','textbox');
        if (change === 'nested-private') element.insertAdjacentHTML('beforeend','<span role="textbox">PRIVATE_NESTED</span>');
        if (change === 'hidden-own') element.hidden = true;
      },change);
      expect(await relation(page),change).toBeNull(); await page.unrouteAll();
    }
  }
});
test('표 caption·header·행제목의 숨김/편집/ARIA참조는 표근거를 취소한다', async ({ page }) => {
  for (const [render,selector] of [[newsTable,'#column-1'],[directoryTable,'#caption-text'],[academicTable,'#row-title']]) {
    for (const change of ['hidden','editor','labelledby']) {
      await setup(page,render());
      await page.evaluate(({selector,change})=>{const node=document.querySelector(selector);if(change==='hidden')node.hidden=true;if(change==='editor')node.setAttribute('role','textbox');if(change==='labelledby')node.setAttribute('aria-labelledby','outside-private');}, {selector,change});
      expect(await relation(page),selector+change).toBeNull(); await page.unrouteAll();
    }
  }
});
test('정보표의 ARIA 대화형 역할을 읽기근거로 되살리지 않는다', async ({page})=>{
  for(const role of ['grid','checkbox','radio','switch','menuitem','menuitemcheckbox','menuitemradio','option','treeitem','listbox','tree','menu','menubar','scrollbar','radiogroup','tablist']){
    await setup(page,directoryTable());await page.evaluate(role=>document.querySelector('#name-cell').setAttribute('role',role),role);
    expect(await relation(page),role).toBeNull();await page.unrouteAll();
  }
});
test('입력 value/checked와 편집 text getter를 읽거나 로그에 넣지 않는다', async ({ page }) => {
  await setup(page, academicTable() + '<input id="private-input" value="PRIVATE_VALUE"><input id="private-check" type="checkbox" checked><textarea id="private-area">PRIVATE_TEXT</textarea><div id="private-editor" role="textbox">PRIVATE_EDITOR</div>');
  const result = await page.evaluate(() => {
    for (const node of document.querySelectorAll('input,textarea')) for (const key of ['value','checked']) Object.defineProperty(node,key,{get(){throw Error('private getter '+key);}});
    for (const key of ['textContent','innerText']) Object.defineProperty(document.querySelector('#private-editor'),key,{get(){throw Error('private editor getter');}});
    const element=document.querySelector('#target'),candidate=Docs.analyzePage().find(item=>item.element===element);
    const relation=Docs.documentRelation(candidate);
    return {rule:relation?.rule, fingerprint:relation?.fingerprint};
  });
  expect(result.rule).toBe('academic-support-regulation-file');expect(result.fingerprint).not.toContain('PRIVATE_');
});
test('같은 batch/newbatch 모두 의미를 재계산하고 source 계약은 불변이다', async ({ page }) => {
  await setup(page, academicTable());
  const result=await page.evaluate(()=>{
    const candidate=Docs.analyzePage().find(item=>item.element.id==='target'),cache=new WeakMap();
    const before=JSON.stringify({label:candidate.label,action:candidate.action,href:candidate.href,target:candidate.target});
    const first=Docs.documentRelation(candidate,cache),again=Docs.documentRelation(candidate,cache);
    document.querySelector('#row-title').textContent='장학금 신청서';
    const sameBatch=Docs.documentRelation(candidate,cache),fresh=Docs.documentRelation(candidate,new WeakMap());
    return {first:first?.rule,same:first?.fingerprint===again?.fingerprint,sameBatch:!!sameBatch,fresh:!!fresh,unchanged:before===JSON.stringify({label:candidate.label,action:candidate.action,href:candidate.href,target:candidate.target})};
  });
  expect(result).toEqual({first:'academic-support-regulation-file',same:true,sameBatch:false,fresh:false,unchanged:true});
});
test('동일문구 노드교체는 제목하위장식·표·행·열·부모의 실제 dependency 교체로 검출된다', async ({ page }) => {
  for (const [render,selectors] of [[newsTable,['#caption-text','#column-text-1','#row','#body','#head','#table','#container','#target']], [directoryTable,['#room-name','#name-cell','#floor','#header-row']], [academicTable,['#row-title-text','#file-name','#row-title','#download-cell']], [academicTabs,['#content-heading-text','#page-heading-text','#selected-row','#wrapper','#owner','#tabs','#region','#content']]]) {
    for(const selector of selectors){
      await setup(page,render());
      const changed=await page.evaluate(selector=>{
        const candidate=Docs.analyzePage().find(item=>item.element.id==='target'),before=Docs.documentRelation(candidate);
        if(!before)return {hadProof:false};
        const old=document.querySelector(selector),replacement=old.cloneNode(false);old.replaceWith(replacement);replacement.append(...old.childNodes);
        const after=Docs.documentRelation(candidate);
        return {hadProof:true,changed:!after||before.fingerprint!==after.fingerprint||before.dependencies.length!==after.dependencies.length||before.dependencies.some((node,index)=>node!==after.dependencies[index])};
      },selector);
      expect(changed,selector).toEqual({hadProof:true,changed:true}); await page.unrouteAll();
    }
  }
});
test('깊거나 과도한 이름장식·큰 표·80방문초과 지역은 보수적으로 포기한다', async ({ page }) => {
  await setup(page, newsTable());
  await page.evaluate(()=>document.querySelector('#target').insertAdjacentHTML('beforeend','<span></span>'.repeat(65)));
  expect(await relation(page)).toBeNull(); await page.unrouteAll();
  await setup(page,directoryTable());await page.evaluate(()=>document.querySelector('#body').insertAdjacentHTML('beforeend',document.querySelector('#row').outerHTML.repeat(80)));
  expect(await relation(page)).toBeNull(); await page.unrouteAll();
  await setup(page,directoryTable());await page.evaluate(()=>document.querySelector('#row').lastElementChild.insertAdjacentHTML('beforeend','<span></span>'.repeat(2049)));
  expect(await relation(page)).toBeNull(); await page.unrouteAll();
  await setup(page,academicTabs());await page.evaluate(()=>document.querySelector('#content').insertAdjacentHTML('beforeend','<div></div>'.repeat(81)));
  expect(await relation(page)).toBeNull();
});
test('동일 이름의 규정 PDF 두 행은 행별 dependency와 제목을 유지한다', async ({ page }) => {
  await setup(page,academicTable());
  await page.evaluate(()=>{
    const row=document.querySelector('#row').cloneNode(true);row.id='second-row';row.querySelector('#target').id='second-target';row.querySelector('#row-title').textContent='연구장학금 지급규정';row.querySelector('a').title='연구장학금 지급규정 다운로드';document.querySelector('#body').append(row);
  });
  const first=await relation(page),second=await relation(page,'#second-target');
  expect(first.label).toBe(second.label);expect(first.relatedLabel).not.toBe(second.relatedLabel);expect(first.fingerprint).not.toBe(second.fingerprint);
});
test('모듈은 원본 이벤트·링크·다운로드·form을 활성화하지 않는다',async({page})=>{
  await setup(page,newsTable());
  const result=await page.evaluate(()=>{let activations=0;document.addEventListener('click',()=>activations++);document.addEventListener('submit',()=>activations++);const candidate=Docs.analyzePage().find(item=>item.element.id==='target');for(let i=0;i<3;i++)Docs.documentRelation(candidate,new WeakMap());return activations;});
  expect(result).toBe(0);
});
test('이미 노출된 세 원본 fixture의 7 관계를 개발자료로만 확인한다',async({page})=>{
  const cases=[
    ['government','https://www.safekorea.go.kr/safekorea-kor/cmmn/bbs/bbsList.do?menuSn=82&bbsSn=18',['government-c0223'],'listed-fixed-document-kind'],
    ['library','https://www.nl.go.kr/NL/contents/N20103010000.do',['library-c1514','library-c1516','library-c1519'],'aligned-information-directory'],
    ['smu','https://www.smu.ac.kr/kor/life/payment.do',['smu-c0390','smu-c0391'],'academic-support-regulation-file'],
    ['smu','https://www.smu.ac.kr/kor/life/payment.do',['smu-c0314'],'selected-academic-support-documents'],
  ];
  for(const [fixture,url,ids,rule] of cases){
    await setup(page,await readFile(`evaluation/blind-v10/fixtures/${fixture}.html`,'utf8'),url);
    for(const id of ids)expect(await relation(page,`[data-eval-id="${id}"]`),id).toMatchObject({rule});
    await page.unrouteAll();
  }
});
