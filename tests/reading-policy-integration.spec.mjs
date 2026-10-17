import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let bundle;
test.beforeAll(async()=>{const root=process.env.EASYWEB_TEST_ENGINE_ROOT??'./src';bundle=(await build({stdin:{contents:`export {analyzePage,sourceSnapshot} from '${root}/analyzer';export {classify} from '${root}/classifier';export {isCandidateCurrent} from '${root}/page-session';export {openEasyMode} from '${root}/easy-mode';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'ReadingPolicyReview',loader:{'.css':'text'}})).outputFiles[0].text;});
const url='https://www.nps.or.kr/pnsinfo/ntpsklg/contributionExplanation.do';
function panels(label='시설 보험료 납부기한',extra='',contents='') {return `<main><h2>연금보험료 제도 안내</h2><div class="tabWrap con-tab"><ul class="tabNav"><li><a id="deadline" href="#unknown-panel-a" ${extra}>${label}</a></li><li><a id="rate" href="#unknown-panel-b">보험료 변동기준</a></li></ul><div class="tabContents"><div class="tabPage" id="unknown-panel-a"><h4 id="deadline-title">${label}</h4>${contents}</div><div class="tabPage" id="unknown-panel-b" hidden><h4>보험료 변동기준</h4></div></div></div></main>`;}
async function setup(page,html){await page.route('**/*',r=>r.request().isNavigationRequest()?r.fulfill({contentType:'text/html; charset=utf-8',body:html}):r.abort());await page.goto(url);await page.addScriptTag({content:bundle});}
async function inspect(page){return page.evaluate(()=>{window.reviewSources=ReadingPolicyReview.analyzePage();window.reviewCandidates=ReadingPolicyReview.classify(reviewSources);return reviewCandidates.map(c=>({id:c.element.id,label:c.label,action:c.action,href:c.href,category:c.category,task:c.pageTask,readonlyPanel:c.institutionEvidence?.readonlyPanel,scope:c.institutionEvidence?.contentScope,content:c.contentEvidence?.level}));});}

test('실제 읽기 전용 fragment 설명의 납부기한만 help/locate로 제공한다',async({page})=>{
  await setup(page,panels());const rows=await inspect(page);
  expect(rows.find(r=>r.id==='deadline')).toMatchObject({category:'help',action:'locate',task:'reading',readonlyPanel:true,scope:'content'});
  expect(rows.find(r=>r.id==='deadline').href).toBeUndefined();
  expect(rows.find(r=>r.id==='rate')).toMatchObject({category:'help',action:'locate',task:'reading'});
  expect(await page.evaluate(()=>reviewCandidates.every(c=>{const raw=reviewSources.find(r=>r.element===c.element);return raw.action===c.action&&raw.href===c.href&&raw.snapshot===c.snapshot;}))).toBe(true);
});

test('설명 표제가 같아도 결제·삭제 handler나 HTTP 명령은 복구하지 않는다',async({page})=>{
  for(const extra of ['onclick="startPayment()"','onclick="deleteRecord()"']){
    await setup(page,panels('시설 보험료 납부기한',extra));expect((await inspect(page)).some(r=>r.id==='deadline')).toBe(false);
  }
  for(const href of ['https://www.nps.or.kr/pnsinfo/ntpsklg/delete','https://www.nps.or.kr/pnsinfo/ntpsklg/explain.do?CMD=view&CMD=payment']){
    await setup(page,panels().replace('href="#unknown-panel-a"',`href="${href}" onclick="return false"`));expect((await inspect(page)).some(r=>r.id==='deadline')).toBe(false);
  }
});

test('위험 낱말을 섞거나 실제 결제 제어가 있는 패널에는 기한 예외를 적용하지 않는다',async({page})=>{
  for(const [name,contents] of [['삭제 납부기한',''],['시설 보험료 납부기한','<form><input aria-label="검색어"><button type="submit">납부하기</button></form>'],['시설 보험료 납부기한','<a href="/payment">결제하기</a>'],['시설 보험료 납부기한','<div role="button" tabindex="0">실행</div>']]){
    await setup(page,panels(name,'',contents));expect((await inspect(page)).some(r=>r.id==='deadline')).toBe(false);
  }
});

test('설명 제목의 동일 문구 교체도 낡은 후보를 차단한다',async({page})=>{
  await setup(page,panels());expect((await inspect(page)).find(r=>r.id==='deadline')).toBeTruthy();
  expect(await page.evaluate(()=>{const c=reviewCandidates.find(c=>c.element.id==='deadline');const h=document.querySelector('#deadline-title');h.replaceWith(h.cloneNode(true));return ReadingPolicyReview.isCandidateCurrent(c);})).toBe(false);
});

test('같은 프레임의 설명 교체 후 카드 클릭은 원본을 활성화하지 않는다',async({page})=>{
  await setup(page,panels());expect((await inspect(page)).find(r=>r.id==='deadline')).toBeTruthy();
  await page.evaluate(()=>{window.sourceActivations=0;document.querySelector('#deadline').addEventListener('click',e=>{sourceActivations++;e.preventDefault();});const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);ReadingPolicyReview.openEasyMode(host);const h=document.querySelector('#deadline-title');h.replaceWith(h.cloneNode(true));const card=[...host.shadowRoot.querySelectorAll('.card')].find(c=>c.querySelector('.card-source')?.textContent.includes('시설 보험료 납부기한'));card.click();});
  expect(await page.evaluate(()=>sourceActivations)).toBe(0);
  await expect(page.locator('.change-notice')).toBeVisible();
});

test('비활성 설명의 입력·편집 속성 getter는 예외 판단에서도 읽지 않는다',async({page})=>{
  await setup(page,panels('시설 보험료 납부기한','','<input value="PRIVATE_VALUE"><span role="textbox">PRIVATE_EDIT</span>'));
  await page.evaluate(()=>{window.privateReads=0;for(const node of document.querySelectorAll('input,[role="textbox"]'))for(const name of ['value','textContent','innerText'])Object.defineProperty(node,name,{get(){privateReads++;throw Error('private read');}});});
  const rows=await inspect(page);expect(rows.some(r=>r.id==='deadline')).toBe(false);expect(JSON.stringify(rows)).not.toContain('PRIVATE_');expect(await page.evaluate(()=>privateReads)).toBe(0);
});
