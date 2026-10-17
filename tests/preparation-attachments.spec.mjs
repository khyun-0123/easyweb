import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let engine;
test.beforeAll(async()=>{
  const result=await build({stdin:{contents:`export {analyzePage,supplementalEvidence,sourceSnapshot} from './src/analyzer';export {sourceAction} from './src/action-policy';export {isCandidateCurrent} from './src/page-session';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Preparation'});
  engine=result.outputFiles[0].text;
});
const table=({title='실험장치 반입신고서 (임시 보관(연장))',label='ZIP 파일다운로드',columns=['번호','제목','첨부파일'],titleTag='button',caption='신청 서식 작성 견본',wrapper=true,extra=''}={})=>{
  const cells=columns.map((name,index)=>name==='제목'?`<td id="subject-cell"><${titleTag} id="subject"><strong id="subject-text">${title}</strong></${titleTag}></td>`:name==='첨부파일'?`<td id="attachment-cell"><a id="attachment" href="#bundle" onclick="return false">${label}</a></td>`:`<td>${index+1}</td>`).join('');
  const body=`<table id="records"><caption id="purpose">${caption}</caption><thead id="columns"><tr>${columns.map((name,index)=>`<th id="column-${index}">${name}</th>`).join('')}</tr></thead><tbody id="rows"><tr id="record">${cells}</tr></tbody></table>`;
  return `<main><section id="region"><h2>공개 문서</h2><div id="container">${wrapper?`<form id="wrapper" method="post"><input type="hidden">${body}${extra}</form>`:body}</div></section></main>`;
};
async function setup(page,html){
  await page.route('**/*',route=>route.abort());
  await page.setContent(`<base href="http://127.0.0.1:4173/">${html}`);await page.addScriptTag({content:engine});
}
const evidence=page=>page.evaluate(()=>Preparation.supplementalEvidence(document.querySelector('#attachment')));
async function snapshot(page){
  return page.evaluate(()=>{
    const element=document.querySelector('#attachment');
    window.candidate=Preparation.analyzePage().find(item=>item.element===element);
    candidate.supplementalDependent=true;
    candidate.snapshot=Preparation.sourceSnapshot(element,candidate.label,undefined,false,true);
    return Preparation.isCandidateCurrent(candidate);
  });
}

test('POST wrapper의 고정 서식 제목은 첨부 앵커만 설명하고 기본 submit 제목은 승격하지 않는다',async({page})=>{
  await setup(page,table());
  const result=await page.evaluate(()=>{
    window.activations=0;document.querySelector('#subject').addEventListener('click',()=>activations++);document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();activations++;});
    const attachment=document.querySelector('#attachment'),subject=document.querySelector('#subject');
    return {attachment:Preparation.supplementalEvidence(attachment),subject:Preparation.supplementalEvidence(subject),action:Preparation.sourceAction(attachment,'ZIP 파일다운로드'),type:subject.type,activations};
  });
  expect(result.attachment.preparationAttachment).toBe(true);
  expect(result.attachment.relatedLabel).toBe('실험장치 반입신고서 (임시 보관(연장))');
  expect(result.subject.preparationAttachment).toBe(false);
  expect(result.type).toBe('submit');expect(result.action).toEqual({action:'locate'});expect(result.activations).toBe(0);
});

test('열 순서·고정 문서 형식이 달라도 유일한 같은 행 제목을 보존한다',async({page})=>{
  for(const [label,columns] of [['보관자료.hwp',['첨부파일','번호','제목']],['공용양식.docx',['제목','첨부파일','번호']],['공용양식.pdf',['번호','첨부파일','제목']],['ZIP 파일다운로드',['제목','번호','첨부파일']]]){
    await setup(page,table({label,columns,title:'통행 동의서 및 장비 반환청구서'}));
    const result=await evidence(page);expect(result.preparationAttachment,label).toBe(true);expect(result.relatedLabel).toBe('통행 동의서 및 장비 반환청구서');
  }
});

test('일반 소프트웨어·보고서·뉴스·형식 없는 파일은 서식 준비 근거를 얻지 않는다',async({page})=>{
  const cases=[{title:'장비 설치 프로그램',label:'장비.zip'},{title:'연간 활동 보고서',label:'보고서.pdf'},{caption:'소식 및 보도 자료',title:'작업장 사용신청서'},{title:'견학 예약신청서',label:'설치프로그램.exe'},{caption:'프로그램 서식 뉴스',title:'작업장 사용신청서'}];
  for(const item of cases){await setup(page,table(item));expect(!!(await evidence(page)).preparationAttachment,JSON.stringify(item)).toBe(false);}
});

test('제목·첨부 열의 중복·합친 셀·중첩 표·여러 제목 제어를 거절한다',async({page})=>{
  for(const change of ['duplicate-column','merged','nested','two-titles','two-subjects','second-header']){
    await setup(page,table());
    await page.evaluate(change=>{
      if(change==='duplicate-column')document.querySelector('#column-0').textContent='제목';
      if(change==='merged')document.querySelector('#subject-cell').colSpan=2;
      if(change==='nested')document.querySelector('#subject-cell').insertAdjacentHTML('beforeend','<table><tr><td>별도 동의서</td></tr></table>');
      if(change==='two-titles')document.querySelector('#subject-cell').insertAdjacentHTML('beforeend','<button>별도 사용신청서</button>');
      if(change==='two-subjects')document.querySelector('#subject-cell').insertAdjacentHTML('beforeend','<strong>별도 보관동의서</strong>');
      if(change==='second-header')document.querySelector('thead').insertAdjacentHTML('beforeend','<tr><th>번호</th><th>제목</th><th>첨부파일</th></tr>');
    },change);
    expect(!!(await evidence(page)).preparationAttachment,change).toBe(false);
  }
});

test('숨김·기사·편집 경계의 제목이나 첨부에서 관계를 만들지 않는다',async({page})=>{
  for(const change of ['title-hidden','nested-hidden','header-hidden','purpose-hidden','article','editor-title','editor-attachment','editor-header']){
    await setup(page,table());
    await page.evaluate(change=>{
      if(change==='title-hidden')document.querySelector('#subject').hidden=true;
      if(change==='nested-hidden')document.querySelector('#subject-text').hidden=true;
      if(change==='header-hidden')document.querySelector('#column-1').hidden=true;
      if(change==='purpose-hidden')document.querySelector('#purpose').hidden=true;
      if(change==='article'){const old=document.querySelector('#container'),node=document.createElement('article');old.replaceWith(node);node.append(old);}
      if(change==='editor-title')document.querySelector('#subject-text').setAttribute('contenteditable','true');
      if(change==='editor-attachment')document.querySelector('#attachment').setAttribute('role','textbox');
      if(change==='editor-header')document.querySelector('#column-1').setAttribute('role','textbox');
    },change);
    expect(!!(await evidence(page)).preparationAttachment,change).toBe(false);
  }
});

test('입력값·checked·사용자 정의 편집 내용은 읽거나 직렬화하지 않는다',async({page})=>{
  await setup(page,table({extra:'<input type="text" value="PRIVATE_VALUE"><input type="checkbox" checked><textarea>PRIVATE_TEXT</textarea><div role="textbox">PRIVATE_EDITOR</div>'}));
  const result=await page.evaluate(()=>{
    document.querySelectorAll('input,textarea').forEach(element=>{for(const key of ['value','checked'])Object.defineProperty(element,key,{get(){throw Error('private property '+key);}});});
    const e=Preparation.supplementalEvidence(document.querySelector('#attachment'));
    const encoded=Preparation.sourceSnapshot(document.querySelector('#attachment'),'ZIP 파일다운로드',undefined,false,true).attributes;
    document.querySelector('#subject').insertAdjacentHTML('beforeend','<span role="textbox">PRIVATE_NESTED</span>');
    const contaminated=Preparation.supplementalEvidence(document.querySelector('#attachment'));
    return {positive:e.preparationAttachment,encoded,contaminated:!!contaminated.preparationAttachment};
  });
  expect(result.positive).toBe(true);expect(result.contaminated).toBe(false);expect(result.encoded).not.toContain('PRIVATE_');
});

test('제목·형식 marker 변경은 액션이 locate 그대로여도 낡은 후보를 무효화한다',async({page})=>{
  for(const change of ['title','marker']){
    await setup(page,table());expect(await snapshot(page)).toBe(true);
    expect(await page.evaluate(change=>{document.querySelector(change==='title'?'#subject-text':'#attachment').textContent=change==='title'?'시설 보관동의서':'일반 파일';return {current:Preparation.isCandidateCurrent(candidate),action:Preparation.sourceAction(candidate.element,candidate.label).action};},change)).toEqual({current:false,action:'locate'});
  }
});

test('동일 문구 제목·열·행·표·부모 container 교체도 노드 의존성으로 감지한다',async({page})=>{
  for(const selector of ['#subject','#subject-text','#column-text','#purpose-text','#column-1','#purpose','#record','#rows','#columns','#records','#wrapper','#container','#attachment-cell','#attachment']){
    await setup(page,table());
    await page.evaluate(()=>{document.querySelector('#column-1').innerHTML='<span id="column-text">제목</span>';document.querySelector('#purpose').innerHTML='<span id="purpose-text">신청 서식 작성 견본</span>';});
    expect(await snapshot(page)).toBe(true);
    expect(await page.evaluate(selector=>{
      const old=document.querySelector(selector),replacement=old.cloneNode(false);
      old.replaceWith(replacement);replacement.append(...old.childNodes);
      return Preparation.isCandidateCurrent(candidate);
    },selector),selector).toBe(false);
  }
});

test('같은 batch는 근거를 공유하되 새 batch는 제목과 heading 변경을 다시 검사한다',async({page})=>{
  await setup(page,table());
  const result=await page.evaluate(()=>{
    const element=document.querySelector('#attachment'),cache=new WeakMap();
    const first=Preparation.supplementalEvidence(element,cache);
    const same=Preparation.supplementalEvidence(element,cache);
    document.querySelector('#purpose').textContent='행사 사진';
    const next=Preparation.supplementalEvidence(element,new WeakMap());
    return {first:first.preparationAttachment,same:first.preparationAttachmentNodes===same.preparationAttachmentNodes,next:!!next.preparationAttachment,nodes:first.preparationAttachmentNodes};
  });
  expect(result.first).toBe(true);expect(result.same).toBe(true);expect(result.next).toBe(false);expect(result.nodes.length).toBeLessThanOrEqual(48);expect(result.nodes.every(Number.isSafeInteger)).toBe(true);
});

test('일반 이동 앵커와 자료 버튼은 새 첨부 전용 근거를 얻지 않는다',async({page})=>{
  for(const change of ['ordinary','button']){
    await setup(page,table());
    await page.evaluate(change=>{
      const old=document.querySelector('#attachment');
      if(change==='ordinary'){old.href='/public/information';old.removeAttribute('onclick');old.textContent='문서 정보';}
      else{const button=document.createElement('button');button.id='attachment';button.type='button';button.textContent='ZIP 파일다운로드';old.replaceWith(button);}
    },change);
    expect(!!(await evidence(page)).preparationAttachment,change).toBe(false);
  }
});

test('caption이 없으면 같은 지역의 가까운 고정 서식 heading만 사용한다',async({page})=>{
  await setup(page,table());
  await page.evaluate(()=>{document.querySelector('caption').remove();document.querySelector('h2').textContent='시설 신청서 준비 목록';});
  expect((await evidence(page)).preparationAttachment).toBe(true);
  await page.evaluate(()=>{
    const section=document.querySelector('#region'),heading=section.querySelector('h2');
    const sibling=document.createElement('section');section.before(sibling);sibling.append(heading);
  });
  expect((await evidence(page)).preparationAttachment).toBe(false);
});
