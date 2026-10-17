import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
let engine;
test.beforeAll(async()=>{
  const result=await build({stdin:{contents:`export {analyzePage} from './src/analyzer';export {classify} from './src/classifier';export {rank,remainingMenus} from './src/ranker';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'FilterOrdering'});
  engine=result.outputFiles[0].text;
});
const labels=['은하 관측자료','감자','바다 생물기록','숲길','지역 암석자료','달빛','구름','별빛','지형 자료','물결'];
const list=(prefix,values)=>`<ul>${values.map((label,index)=>`<li><a id="${prefix}-${index}" href="#" class="facet-search">${label}</a></li>`).join('')}</ul>`;
const form=(prefix,values)=>`<form id="${prefix}-search-form">${list(prefix,values)}</form>`;
async function setup(page,html){
  await page.route('**/*',route=>route.abort());
  await page.setContent(`<base href="http://127.0.0.1:4173/"><main>${html}</main>`);await page.addScriptTag({content:engine});
  await page.evaluate(()=>{window.candidates=FilterOrdering.classify(FilterOrdering.analyzePage(),{mode:'generic'});});
}
const selected=page=>page.evaluate(()=>FilterOrdering.rank(candidates).map(item=>item.element.id));

test('명시적 검색 필터의 동률은 짧은 문구·철자보다 원본 목록 순서를 보존한다',async({page})=>{
  await setup(page,form('nebula',labels.slice(0,3)));
  expect(await page.evaluate(()=>candidates.map(i=>[i.category,i.score,i.pageTask,i.supplementalDependent]))).toEqual(Array.from({length:3},()=>['search',70,'control',true]));
  expect(await selected(page)).toEqual(['nebula-0','nebula-1','nebula-2']);
});

test('점수나 페이지 목적이 다른 필터를 새 동률 그룹으로 합치지 않는다',async({page})=>{
  for(const kind of ['score','purpose']){
    await setup(page,form('separate',labels.slice(0,2)));
    const actual=await page.evaluate(kind=>{
      if(kind==='score')candidates.find(i=>i.element.id==='separate-1').score=90;
      else candidates.find(i=>i.element.id==='separate-0').pagePurpose='help';
      return FilterOrdering.rank(candidates).map(i=>i.element.id);
    },kind);
    expect(actual,kind).toEqual(['separate-1','separate-0']);
  }
});

test('같은 form의 서로 다른 목록은 각자 기존 정렬 위치 안에서만 source 순서를 적용한다',async({page})=>{
  await setup(page,`<form id="paired-search-form">${list('north',['나무 기록자료','가을'])}${list('south',['바다 지도자료','나라'])}</form>`);
  expect(await selected(page)).toEqual(['north-0','south-0','north-1','south-1']);
});

test('서로 다른 form의 필터와 전역 검색 입력의 선택 정책을 섞지 않는다',async({page})=>{
  await setup(page,`<header><input id="global-query" type="search" aria-label="통합 검색"></header>${form('first',['나무 기록자료','가을'])}${form('second',['바다 지도자료','나라'])}`);
  const actual=await selected(page);
  expect(actual).toEqual(['first-0','second-0','first-1','second-1','global-query']);
  expect(await page.evaluate(()=>{const input=candidates.find(i=>i.element.id==='global-query');return {category:input.category,action:input.action,filterEvidence:!!input.supplementalDependent};})).toEqual({category:'search',action:'locate',filterEvidence:false});
});

test('입력 배열을 반복 섞어도 동률 필터와 독립 그룹의 결과가 결정적이다',async({page})=>{
  await setup(page,form('one',labels.slice(0,4))+form('two',labels.slice(4,8)));
  expect(await page.evaluate(()=>{
    const expected=FilterOrdering.rank(candidates).map(i=>i.element.id).join(',');
    let seed=1787;
    for(let run=0;run<40;run++){
      const shuffled=[...candidates];
      for(let i=shuffled.length-1;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
      if(FilterOrdering.rank(shuffled).map(i=>i.element.id).join(',')!==expected)return false;
    }
    return true;
  })).toBe(true);
});

test('첫 여섯 필터와 추가 메뉴는 원본 순서를 유지하고 중복 원본을 한 번만 제공한다',async({page})=>{
  await setup(page,form('overflow',labels));
  const actual=await page.evaluate(()=>{
    const withDuplicate=[...candidates,candidates[0]];const first=FilterOrdering.rank(withDuplicate);const rest=[...FilterOrdering.remainingMenus(withDuplicate,first)];
    return {first:first.map(i=>i.element.id),all:[...first,...rest].map(i=>i.element.id),sameSources:[...first,...rest].every(item=>candidates.includes(item))};
  });
  expect(actual.first).toEqual(Array.from({length:6},(_,i)=>`overflow-${i}`));
  expect(actual.all).toEqual(Array.from({length:10},(_,i)=>`overflow-${i}`));expect(actual.sameSources).toBe(true);
});

test('명시적 필터 근거 없는 검색 메뉴는 기존 문구 정렬을 유지한다',async({page})=>{
  await setup(page,'<form id="ordinary"><ul><li><a id="ordinary-long" href="#">새로운 자료 검색</a></li><li><a id="ordinary-short" href="#">검색</a></li></ul></form>');
  expect(await selected(page)).toEqual(['ordinary-short','ordinary-long']);
});

test('별도 정렬 호출은 바뀐 form 메타데이터를 읽고 이전 필터 근거를 재사용하지 않는다',async({page})=>{
  await setup(page,form('changing',labels.slice(0,2)));
  const actual=await page.evaluate(()=>{
    const before=FilterOrdering.rank(candidates).map(i=>i.element.id);
    document.querySelector('form').id='ordinary';
    return {before,after:FilterOrdering.rank(candidates).map(i=>i.element.id)};
  });
  expect(actual).toEqual({before:['changing-0','changing-1'],after:['changing-1','changing-0']});
});
