import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
let engine;
test.beforeAll(async () => {
  const bundle = await build({ stdin:{contents:`export {analyzePage} from './src/analyzer'; export {sourceAction,isDocumentDownload} from './src/action-policy'; export {isCandidateCurrent} from './src/page-session'; export {openEasyMode} from './src/easy-mode';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'DownloadSafety',loader:{'.css':'text'} });
  engine=bundle.outputFiles[0].text;
});
async function setup(page, html) {
  await page.route('**/*', route=>route.abort());
  await page.setContent(`<base href="http://127.0.0.1:4173/">${html}`);
  await page.addScriptTag({content:engine});
}
async function analyze(page) {
  return page.evaluate(()=>{
    window.items=DownloadSafety.analyzePage();
    return items.map(({element,snapshot,...item})=>({...item,id:element.id}));
  });
}
async function open(page) {
  await page.evaluate(()=>{const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);DownloadSafety.openEasyMode(host);});
}

test('완전한 FileDown 동작 경로와 고정 다운로드 아이콘·문구를 함께 식별한다', async ({page})=>{
  await setup(page, `<main><a id="icon" href="/files/FileDown.do?document=sample-a"><i class="icon-download" aria-hidden="true"></i>공개 양식</a><a id="svg" href="/documents/fIlEdOwN.Do?part=2"><svg class="ir-download" aria-hidden="true"></svg>공개 안내 자료</a><a id="text" href="/files/FileDown.do?document=sample-b">자료 내려받기</a><a id="english" href="/files/FileDown.do?document=sample-c">Download document</a><a id="english-noun" href="/files/FileDown.do?document=sample-d">File download</a><a id="korean-noun" href="/files/FileDown.do?document=sample-e">문서 다운로드</a></main>`);
  expect((await analyze(page)).map(i=>[i.id,i.action,i.href])).toEqual([['icon','locate',undefined],['svg','locate',undefined],['text','locate',undefined],['english','locate',undefined],['english-noun','locate',undefined],['korean-noun','locate',undefined]]);
  expect(await page.evaluate(()=>[...document.querySelectorAll('main a')].map(e=>DownloadSafety.isDocumentDownload(e, e.textContent)))).toEqual([true,true,true,true,true,true]);
});

test('일반 경로·유사 endpoint·유사 class·다운로드 언급만 있는 문서는 직접 이동을 유지한다', async ({page})=>{
  const links=[
    ['normal','/notice','icon-download','공개 양식'],
    ['path-lookalike','/files/FileDownGuide.do','icon-download','공개 양식'],
    ['path-child','/files/FileDown.do/help','icon-download','공개 양식'],
    ['query-only','/help?next=/files/FileDown.do','icon-download','공개 양식'],
    ['class-lookalike','/files/FileDown.do','downloadable','공개 양식'],
    ['missing-signal','/files/FileDown.do','','공개 양식'],
    ['mention','/files/FileDown.do','','다운로드 안내'],
  ];
  await setup(page, `<main>${links.map(([id,href,marker,label])=>`<a id="${id}" href="${href}"><i class="${marker}" aria-hidden="true"></i>${label}</a>`).join('')}<i class="icon-download" aria-hidden="true"></i></main>`);
  const items=await analyze(page);
  expect(items).toHaveLength(links.length);
  expect(items.every(i=>i.action==='navigate')).toBe(true);
});

test('편집 자식의 다운로드 class·입력값·사용자 정의 편집 role을 신호로 수집하지 않는다', async ({page})=>{
  await setup(page, `<main><a id="editable" href="/files/FileDown.do?document=one">공개 양식<span contenteditable="true"><i class="icon-download"></i>PRIVATE_EDITOR 다운로드</span></a><a id="custom" href="/files/FileDown.do?document=two">공개 양식<span role="textbox"><i class="icon-download"></i>PRIVATE_CUSTOM 다운로드</span></a><a id="input" href="/files/FileDown.do?document=three">공개 양식<input value="PRIVATE_INPUT 다운로드" class="icon-download"></a><script>document.querySelectorAll('input,textarea,select').forEach(e=>Object.defineProperty(e,'value',{get(){throw Error('private value')}}));</script></main>`);
  const items=await analyze(page);
  expect(items.map(i=>i.action)).toEqual(['navigate','navigate','navigate']);
  expect(JSON.stringify(items)).not.toContain('PRIVATE_');
  expect(await page.evaluate(()=>JSON.stringify(items.map(i=>i.snapshot)))).not.toContain('PRIVATE_');
});

test('아이콘 추가·제거·class 교체는 이름·URL이 같은 기존 후보를 무효화한다', async ({page})=>{
  for (const change of ['add','remove','replace']) {
    await setup(page, `<main><a id="source" href="/files/FileDown.do?document=sample"><i id="marker" class="${change==='add'?'icon-file':'icon-download'}" aria-hidden="true"></i>공개 양식</a></main>`);
    await analyze(page);
    expect(await page.evaluate(()=>DownloadSafety.isCandidateCurrent(items[0]))).toBe(true);
    expect(await page.evaluate(change=>{
      const marker=document.querySelector('#marker');
      if(change==='add')marker.className='icon-download';
      if(change==='remove')marker.remove();
      if(change==='replace')marker.className='icon-print';
      return DownloadSafety.isCandidateCurrent(items[0]);
    },change),change).toBe(false);
  }
});

test('다운로드 액션이 유지되더라도 실제 다운로드 marker 근거의 교체를 감지한다', async ({page})=>{
  await setup(page, `<main><a id="source" href="/files/FileDown.do?document=sample"><i id="marker" class="icon-download" aria-hidden="true"></i>공개 양식</a></main>`);
  await analyze(page);
  expect(await page.evaluate(()=>{document.querySelector('#marker').className='ir-download';return {current:DownloadSafety.isCandidateCurrent(items[0]),action:DownloadSafety.sourceAction(document.querySelector('#source'),'공개 양식').action};})).toEqual({current:false,action:'locate'});
});

test('같은 프레임에서 다운로드 신호가 생기면 이전 이동 카드의 기본 이동을 먼저 막는다', async ({page})=>{
  await setup(page, `<main><a id="source" href="/files/FileDown.do?document=sample"><i id="marker" class="icon-file" aria-hidden="true"></i>신청서 이용 안내</a></main>`);
  await open(page);
  await expect(page.locator('.card')).toHaveAttribute('href','http://127.0.0.1:4173/files/FileDown.do?document=sample');
  const result=await page.evaluate(()=>{
    const card=document.querySelector('[data-easyweb-host]').shadowRoot.querySelector('.card');let blocked=false;
    card.addEventListener('click',event=>{blocked=event.defaultPrevented;event.preventDefault();},{once:true});
    document.querySelector('#marker').className='icon-download';card.click();
    return {blocked,originalName:document.querySelector('#source').textContent};
  });
  expect(result).toEqual({blocked:true,originalName:'신청서 이용 안내'});
  await expect(page.locator('.change-notice')).toBeVisible();
});

test('다운로드 카드는 원본 위치만 안내하고 원본 click·위임 동작을 자동 실행하지 않는다', async ({page})=>{
  await setup(page, `<main><a id="source" href="/files/FileDown.do?document=sample"><i class="icon-download" aria-hidden="true"></i>신청서 이용 안내</a></main>`);
  await page.evaluate(()=>{window.originalClicks=0;document.querySelector('#source').addEventListener('click',e=>{e.preventDefault();originalClicks++;});document.addEventListener('click',e=>{if(e.target.closest('#source'))originalClicks++;});});
  await open(page);
  await expect(page.locator('.card')).toHaveJSProperty('tagName','BUTTON');
  await page.locator('.card').click();
  await expect(page.locator('#source')).toBeFocused();
  await expect(page.locator('[data-easyweb-notice]')).toHaveAttribute('data-easyweb-notice-reason','ready');
  expect(await page.evaluate(()=>window.originalClicks)).toBe(0);
});

test('안내·설명·부정·비활성 의미의 icon class는 다운로드 동작 표식으로 사용하지 않는다', async ({page})=>{
  const markers=['download-guide','icon-download-instructions','no-download','icon-download-disabled'];
  await setup(page, `<main>${markers.map((marker,index)=>`<a id="lookalike-${index}" href="/files/FileDown.do?document=sample-${index}"><i class="${marker}" aria-hidden="true"></i>공개 양식</a>`).join('')}</main>`);
  expect((await analyze(page)).map(i=>i.action)).toEqual(['navigate','navigate','navigate','navigate']);
});

test('기존 title 근거도 명시적 부정은 제외하고 긍정 제목·download 속성은 보존한다', async ({page})=>{
  const titles=['Do not download','No download','Never download now','금지된 다운로드','자료 다운로드','Manual download'];
  await setup(page, `<main>${titles.map((title,index)=>`<a id="title-${index}" href="/opaque?document=sample-${index}" title="${title}">공개 양식</a>`).join('')}<a id="attribute" href="/opaque?document=sample-extra" title="Do not download" download>공개 양식</a></main>`);
  expect((await analyze(page)).map(i=>i.action)).toEqual(['navigate','navigate','navigate','navigate','locate','locate','locate']);
});

test('파일 이름 뒤에 크기가 붙은 첨부 링크도 다운로드로 보고 원본 위치만 안내한다', async ({page})=>{
  const names=['공고.hwpx(59KB)','결과.pdf [38.74 KB]','명단.xlsx (1,204 bytes)','안내.pdf(12MB)','pdf 보기','결과.pdf 안내 (3)'];
  await setup(page, `<main>${names.map((name,index)=>`<a id="file-${index}" href="/opaque?document=sample-${index}">${name}</a>`).join('')}</main>`);
  expect((await analyze(page)).map(i=>i.action)).toEqual(['locate','locate','locate','locate','navigate','navigate']);
});
