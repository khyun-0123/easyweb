import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let bundle;
test.beforeAll(async()=>{bundle=(await build({stdin:{contents:`export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'GuidanceReview'})).outputFiles[0].text;});
async function inspect(page,html){await page.setContent(html);await page.addScriptTag({content:bundle});return page.evaluate(()=>GuidanceReview.classify(GuidanceReview.analyzePage(),{mode:'generic'}).map(item=>({id:item.element.id,category:item.category,action:item.action,href:item.href,label:item.label})));}
for(const [name,label,extra,action] of [['menu','실험실 예약 안내','role="button" aria-haspopup="true"','locate'],['document','연구지원 신청 절차','','navigate'],['help','교류 프로그램 접수 방법','','navigate']])test(`공개 ${name}의 신청·예약·접수 설명은 도움말이며 원본 액션을 유지한다`,async({page})=>{
  const rows=await inspect(page,`<nav><a id="guidance" href="https://example.org/public/explanation.do" ${extra}>${label}</a></nav>`);
  expect(rows.find(item=>item.id==='guidance')).toMatchObject({category:'help',action,label});
  expect(rows.find(item=>item.id==='guidance').href).toBe(action==='navigate'?'https://example.org/public/explanation.do':undefined);
});
test('명시적 실제 업무 endpoint·제출 form·기사에는 안내 문구만으로 읽기 분류를 붙이지 않는다',async({page})=>{
  const rows=await inspect(page,`<main><a id="operation" href="https://example.org/reservation">실험실 예약 안내</a><form><button id="submission" type="submit">연구지원 신청 절차</button></form><article><a id="article" href="https://example.org/news/article/723">교류 프로그램 접수 방법</a></article></main>`);
  expect(rows.find(item=>item.id==='operation')?.category).toBe('apply');
  expect(rows.find(item=>item.id==='submission')?.category).not.toBe('help');
  expect(rows.find(item=>item.id==='article')?.category).not.toBe('help');
});
test('설명 이름도 위험 URL·handler를 되살리지 않으며 실제 예약 동작을 바꾸지 않는다',async({page})=>{
  const rows=await inspect(page,`<main><a id="unsafe" href="https://example.org/delete">실험실 예약 안내</a><button id="handler" onclick="deleteRecord()">연구지원 신청 절차</button><a id="actual" href="https://example.org/public/entry.do">실험실 예약하기</a></main>`);
  expect(rows.some(item=>['unsafe','handler'].includes(item.id))).toBe(false);
  expect(rows.find(item=>item.id==='actual')).toMatchObject({category:'apply',action:'navigate'});
});
