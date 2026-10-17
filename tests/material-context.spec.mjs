import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { buildMenuFlowHarness, observeMenuFlow } from '../scripts/menu-flow-evaluation.mjs';
let engine, flowBundle;
test.beforeAll(async () => {
  const sourceRoot=process.env.EASYWEB_ENGINE_ROOT??'./src';
  const result = await build({ stdin: { contents: `export {analyzePage} from ${JSON.stringify(`${sourceRoot}/analyzer`)}; export {classify} from ${JSON.stringify(`${sourceRoot}/classifier`)}; export {isCandidateCurrent} from ${JSON.stringify(`${sourceRoot}/page-session`)}; export {openEasyMode} from ${JSON.stringify(`${sourceRoot}/easy-mode`)};`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'MaterialEngine', loader: { '.css': 'text' } });
  engine = result.outputFiles[0].text;
  flowBundle = await buildMenuFlowHarness();
});
const table = (first='시설 이용 인가', second='사업장 변경 신고') => `<main><h2>민원 편람</h2><table><thead><tr><th>제목</th><th>첨부</th></tr></thead><tbody><tr><td><a id="title-one" data-eval-id="title-one" href="#view-one">${first}</a></td><td><button id="file-one" data-eval-id="file-one" type="button">자료받기</button></td></tr><tr><td><a id="title-two" data-eval-id="title-two" href="#view-two">${second}</a></td><td><button id="file-two" data-eval-id="file-two" type="button">자료받기</button></td></tr></tbody></table></main>`;
async function setup(page, markup=table(), controlledClock=false) {
  await page.route('https://material.example.test/**', route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="ko"><meta charset="utf-8">${markup}</html>`}));
  await page.goto('https://material.example.test/opaque');
  if(controlledClock)await page.clock.install();
  await page.evaluate(()=>{document.querySelectorAll('input,textarea,select').forEach(control=>Object.defineProperty(control,'value',{get(){throw Error('private value read');}}));});
  await page.addScriptTag({content:engine});
  await page.evaluate(()=>{
    window.materialCandidates=MaterialEngine.classify(MaterialEngine.analyzePage());
    const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);MaterialEngine.openEasyMode(host);
  });
}
const next = page=>page.getByRole('button',{name:'다른 메뉴 보기',exact:true});
async function findMaterial(page, title) {
  for(let index=0;index<3;index++){
    const card=page.locator('button.card').filter({has:page.locator('.card-context',{hasText:`관련 항목 · ${title}`})});
    if(await card.count())return card;
    if(!(await next(page).isVisible()))break;
    await next(page).click();
  }
  throw Error(`Missing material card: ${title}`);
}
test('동명 자료 카드의 관련 제목과 실제 접근성 이름·표시 원본 매핑을 구분한다', async ({page})=>{
  await setup(page);
  const observed=[];
  for(let index=0;index<3;index++){
    for(const card of await page.locator('button.card').filter({has:page.locator('.card-source',{hasText:/^찾은 메뉴 · 자료받기$/})}).all()){
      await expect(card.locator('.card-source').first()).toHaveText('찾은 메뉴 · 자료받기');
      await expect(card.locator('.card-context')).toHaveCount(1,{timeout:500});
      const caption=await card.locator('.card-context').textContent();
      await expect(card).toHaveAccessibleName(new RegExp(caption));
      expect(await card.ariaSnapshot()).toContain(caption);
      observed.push(caption);
    }
    if(!(await next(page).isVisible()))break;
    await next(page).click();
  }
  expect(observed.sort()).toEqual(['관련 항목 · 사업장 변경 신고','관련 항목 · 시설 이용 인가'].sort());
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-easyweb-host]')).toHaveCount(0);
  const cdp=await page.context().newCDPSession(page);
  try{
    await cdp.send('Page.enable');const {frameTree}=await cdp.send('Page.getFrameTree');
    const {executionContextId}=await cdp.send('Page.createIsolatedWorld',{frameId:frameTree.frame.id,worldName:'material-caption-test'});
    const ids=['title-one','file-one','title-two','file-two'];
    const target={accepted:ids.map(sourceId=>({sourceId,category:'apply',action:'locate'})),expected:['file-one','file-two'].map(sourceId=>({id:sourceId,sourceIds:[sourceId],category:'apply',action:'locate'})),task:{expectedSourceIds:['file-two']}};
    const flow=await observeMenuFlow(page,cdp,executionContextId,flowBundle,target,{},4);
    expect(flow.unresolvedMappings).toEqual([]);expect(flow.repeatedCards).toEqual([]);
    expect(flow.correct).toBe(4);expect(flow.matched).toBe(2);
    expect(flow.selected.filter(item=>item.label==='자료받기').map(item=>[item.sourceId,item.relatedLabel]).sort()).toEqual([['file-one','시설 이용 인가'],['file-two','사업장 변경 신고']]);
  }finally{await cdp.detach();}
});
test('관련 제목이 바뀌면 자료 버튼 이름이 같아도 snapshot과 즉시 실행을 무효화한다',async({page})=>{
  await setup(page,table(),true);
  expect(await page.evaluate(()=>MaterialEngine.isCandidateCurrent(materialCandidates.find(item=>item.element.id==='file-one')))).toBe(true);
  expect(await page.evaluate(()=>{document.querySelector('#title-one').textContent='교체된 인가 서식';return MaterialEngine.isCandidateCurrent(materialCandidates.find(item=>item.element.id==='file-one'));})).toBe(false);
  const card=await findMaterial(page,'시설 이용 인가');
  await card.click();
  await expect(page.locator('.change-notice')).toBeVisible();await expect(card).toHaveAttribute('aria-disabled','true');
  await expect(page.locator('[data-easyweb-notice]')).toHaveCount(0);
});
test('관련 항목은 고정 제목만 사용하고 자식 편집 내용·입력값을 후보와 UI에 넣지 않는다',async({page})=>{
  await setup(page,table('고정 시설 서식 <span role="textbox" contenteditable="true">PRIVATE_EDITOR</span><input aria-label="비공개 내용" value="PRIVATE_VALUE">'));
  const result=await page.evaluate(()=>{
    const item=materialCandidates.find(item=>item.element.id==='file-one');
    return{label:item.label,relatedLabel:item.relatedLabel,snapshot:item.snapshot};
  });
  expect(result.label).toBe('자료받기');expect(result.relatedLabel).toBe('고정 시설 서식');expect(JSON.stringify(result)).not.toContain('PRIVATE_');
  const card=await findMaterial(page,'고정 시설 서식');await expect(card.locator('.card-context')).toHaveText('관련 항목 · 고정 시설 서식');
  expect(await page.locator('[data-easyweb-host]').evaluate(host=>host.shadowRoot.textContent)).not.toContain('PRIVATE_');
});
