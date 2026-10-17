const {chromium}=require('/Users/khyun_03/easyweb/node_modules/playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const judgments=require('./observer-judgments.cjs');
const root=__dirname,repo=path.resolve(root,'../../../..'),dest=path.join(repo,'evaluation/blind-v9');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,n)));
const clean=s=>(s||'').replace(/\s+/g,' ').trim();
function action(c,url){
 const a=c.attributes,h=a.href||'';
 if(c.tag!=='a'||!h||a.onclick||/^javascript:/i.test(h)||'download' in a||/다운로드|파일다운로드/.test(c.name)||/\/(?:FileDown|fileDown|download)\b|\.(?:hwp|hwpx|pdf|docx?|xlsx?|zip)(?:[?#]|$)/i.test(h)||/sso_|oauth|ssoLogin/i.test(h))return 'locate';
 try{const u=new URL(h,url),s=new URL(url);if(!/^https?:$/.test(u.protocol))return 'locate';if(u.hash&&u.origin===s.origin&&u.pathname===s.pathname&&u.search===s.search)return 'locate';return 'navigate';}catch{return 'locate';}
}
function rejection(c){
 if(['input','textarea','select'].includes(c.tag)||['textbox','combobox','searchbox'].includes(c.role))return '실제 입력·선택 또는 제출/보기 설정 제어로, 독립 기능 추천 대신 원본에서 직접 다뤄야 한다.';
 if(/^tel:/.test(c.attributes.href||''))return '전화 연결은 이 공개 정보 탐색 평가의 기능 범위 밖이다.';
 if(/바로가기|본문|주메뉴|대메뉴|푸터|^홈$|^home$|^Home$|^TOP$/.test(c.name))return '건너뛰기·홈·문서 위치 이동 또는 일반 연결로, 지정된 여섯 기능의 독립 의미가 없다.';
 if(/개인정보|저작권|무단수집|인증마크|품질마크|정보보호|ISO|WebWatch|WA WEB|국립중앙도서관 윤리|도서관법령|이용봉사헌장|공공누리/.test(c.name))return '정책·법령·품질표시 정보로, 이 평가에서 정의한 기능 범주에 해당하지 않는다.';
 if(/페이스북|인스타그램|유투브|유튜브|블로그|onAir|카카오톡|^X$/.test(c.name))return '사회관계망 및 홍보 채널 연결로, 지정 기능 범주 밖이다.';
 if(/URL|공유|프린트|초기화|적용|화면크기|Language|English|ENG|CHN|VNM|QUICK MENU|퀵메뉴|사이트맵|전체메뉴|모아보기|관련누리집|관련단체|시 본청|구청\/사업소|읍면동|특화누리집|위원회|업무별|직원|SMPOPUP|자주 사용하는/.test(c.name))return '언어·표시·공유·인쇄 또는 메뉴 펼침 등 구조/환경 제어로, 독립적인 지정 기능이 아니다.';
 return '원본의 일반 기관 소개·포괄 메뉴·홍보/외부 연결로, 문맥에서 여섯 기능 중 하나의 구체적인 공개 기능을 확인할 수 없다.';
}
function normalize(doc){
 for(const el of doc.querySelectorAll('script'))el.remove();
 for(const el of doc.querySelectorAll('input'))if(!['button','submit','reset','image','radio','checkbox'].includes(el.type))el.removeAttribute('value');
 for(const el of doc.querySelectorAll('textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"]'))el.textContent='';
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[]; const summary=[];
 for(const sid of Object.keys(judgments)){
  const ctx=await browser.newContext({viewport:{width:1365,height:1000},javaScriptEnabled:false});
  await ctx.route('**/*',r=>r.abort());const p=await ctx.newPage();
  const source=fs.readFileSync(path.join(root,sid+'-live-dom.html'),'utf8');
  const css=read(sid+'-styles-expanded.json'),capture=read(sid+'-capture.json'),controls=read(sid+'-controls.json'),j=judgments[sid];
  await p.setContent(source,{waitUntil:'domcontentloaded'});
  const fixture=await p.evaluate(({css,url})=>{
   const doc=document.implementation.createHTMLDocument('');doc.replaceChild(document.documentElement.cloneNode(true),doc.documentElement);
   for(const el of doc.querySelectorAll('script'))el.remove();
   for(const el of doc.querySelectorAll('meta[http-equiv]'))if(/content-security-policy|refresh/i.test(el.getAttribute('http-equiv')))el.remove();
   for(const el of doc.querySelectorAll('input'))if(!['button','submit','reset','image','radio','checkbox'].includes(el.type))el.removeAttribute('value');
   for(const el of doc.querySelectorAll('textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"]'))el.textContent='';
   const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri https: http:";doc.head.prepend(csp);
   if(!doc.querySelector('base')){const base=doc.createElement('base');base.href=url;doc.head.append(base);}
   const style=doc.createElement('style');style.setAttribute('data-capture-css','original-cssom');style.textContent=css.map(s=>s.text).join('\n');doc.head.append(style);
   return '<!doctype html>\n'+doc.documentElement.outerHTML;
  },{css,url:capture.baseURI});
  fs.writeFileSync(path.join(dest,sid+'.html'),fixture);
  const all=new Map(controls.map(c=>[c.sourceId,c])),accepted=[];
  for(const [category,nums] of Object.entries(j.accepted))for(const n of nums){
   const sourceId=`${sid}-v9-${String(n).padStart(4,'0')}`,c=all.get(sourceId);
   if(!c||!c.visible)throw Error('Accepted source missing or invisible: '+sourceId);
   const a=action(c,capture.finalUrl);accepted.push({sourceId,category,action:a,label:c.name,...(a==='navigate'?{destinationUrl:new URL(c.attributes.href,capture.baseURI).href}:{}),evidence:{name:c.name,href:c.attributes.href||null,onclick:c.attributes.onclick||null,role:c.role,originalTag:c.tag},reason:'원본의 고정 이름·속성 및 주변 원래 문서 구조에서 이 기능 의미를 확인했다.'});
  }
  const acceptedIds=new Set(accepted.map(a=>a.sourceId));if(acceptedIds.size!==accepted.length)throw Error('Duplicate acceptance '+sid);
  const visible=controls.filter(c=>c.visible),rejected=visible.filter(c=>!acceptedIds.has(c.sourceId)).map(c=>({sourceId:c.sourceId,label:c.name,reason:rejection(c),evidence:{name:c.name,href:c.attributes.href||null,onclick:c.attributes.onclick||null,role:c.role,originalTag:c.tag}}));
  const expected=j.expected.map(({numbers,reason,...e})=>({...e,sourceIds:numbers.map(n=>`${sid}-v9-${String(n).padStart(4,'0')}`),reason}));
  for(const e of expected)for(const sourceId of e.sourceIds){const a=accepted.find(a=>a.sourceId===sourceId);if(!a||a.category!==e.category||a.action!==e.action)throw Error('Expected mismatch '+sourceId)}
  const {numbers,...task}=j.task;task.expectedSourceIds=numbers.map(n=>`${sid}-v9-${String(n).padStart(4,'0')}`);
  if(task.action==='navigate')task.destinationUrl=accepted.find(a=>a.sourceId===task.expectedSourceIds[0]).destinationUrl;
  for(const e of expected)if(e.action==='navigate')e.destinationUrl=accepted.find(a=>a.sourceId===e.sourceIds[0]).destinationUrl;
  const page={id:sid+'-v9-01',url:capture.requestedUrl,finalUrl:capture.finalUrl,split:'holdout',fixture:'evaluation/blind-v9/'+sid+'.html',observation:{viewport:capture.viewport,capturedAt:capture.capturedAt,baseURI:capture.baseURI,title:capture.title,sourceCapture:'docs/evidence/run007/blind-v9-raw/'+sid+'-capture.json',sourceControls:'docs/evidence/run007/blind-v9-raw/'+sid+'-controls.json',visibleControlCount:visible.length,retainedControlCount:controls.length,notes:j.notes},accepted,rejected,expected,task};
  fs.writeFileSync(path.join(dest,sid+'.json'),JSON.stringify({siteId:sid,name:j.name,pages:[page]},null,2)+'\n');
  const normalizedSource=await p.evaluate(()=>{const d=document.documentElement.cloneNode(true);for(const el of d.querySelectorAll('script'))el.remove();for(const el of d.querySelectorAll('input'))if(!['button','submit','reset','image','radio','checkbox'].includes(el.type))el.removeAttribute('value');for(const el of d.querySelectorAll('textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"]'))el.textContent='';return d.querySelector('body').outerHTML;});
  await p.setContent(fixture,{waitUntil:'domcontentloaded'});
  const replay=await p.evaluate(()=>{
   const attrs=el=>Object.fromEntries(Array.from(el.attributes).filter(a=>a.name!=='data-eval-id').map(a=>[a.name,a.value]));
   const visible=el=>{if(!el.getClientRects().length)return false;for(let x=el;x;x=x.parentElement){let c=getComputedStyle(x);if(c.display==='none'||c.visibility==='hidden'||c.visibility==='collapse'||Number(c.opacity)===0||x.hidden)return false;}let r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
   return {body:document.body.outerHTML,controls:Array.from(document.querySelectorAll('[data-eval-id]')).map(el=>({sourceId:el.getAttribute('data-eval-id'),tag:el.tagName.toLowerCase(),attributes:attrs(el),visible:visible(el)})),scripts:document.scripts.length,csp:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,frames:Array.from(document.querySelectorAll('iframe,object,embed')).map(e=>({tag:e.tagName.toLowerCase(),attributes:attrs(e)})),tables:Array.from(document.querySelectorAll('table')).map(el=>({rows:el.rows.length,cells:el.querySelectorAll('td,th').length})),headings:document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]').length,forms:document.querySelectorAll('form,[role="form"],[role="search"]').length,nonemptyEditableValues:Array.from(document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]),textarea')).filter(el=>el.value).length};
  });
  const replayMap=new Map(replay.controls.map(c=>[c.sourceId,c])),attributeMismatches=[],visibilityMismatches=[];
  for(const c of controls){const r=replayMap.get(c.sourceId);if(!r){attributeMismatches.push({sourceId:c.sourceId,error:'missing'});continue;}const a={...c.attributes};if(c.tag==='input'&&!['button','submit','reset','image','radio','checkbox'].includes(a.type||'text'))delete a.value;
   if(JSON.stringify(a)!==JSON.stringify(r.attributes)||r.tag!==c.tag)attributeMismatches.push({sourceId:c.sourceId,expected:a,actual:r.attributes});
   if(c.visible!==r.visible)visibilityMismatches.push({sourceId:c.sourceId,sourceVisible:c.visible,replayVisible:r.visible});
  }
  const tableMatch=JSON.stringify(capture.structural.tables.map(t=>({rows:t.rowCount,cells:t.cellCount})))===JSON.stringify(replay.tables);
  const qa={siteId:sid,bodyAfterPlannedSanitizationIdentical:normalizedSource===replay.body,sourceBodySha256:hash(normalizedSource),fixtureBodySha256:hash(replay.body),sourceControlCount:controls.length,fixtureControlCount:replay.controls.length,visibleSourceControls:visible.length,accepted:accepted.length,rejected:rejected.length,annotationCoverageComplete:accepted.length+rejected.length===visible.length,expectedGroups:expected.length,expectedAllAccepted:true,attributeMismatches,visibilityMismatches,tableMatch,headingRoleCountMatch:capture.structural.headings.length===replay.headings,formRoleCountMatch:capture.structural.forms.length===replay.forms,scripts:replay.scripts,csp:replay.csp,blockedFrames:replay.frames,nonemptyEditableValues:replay.nonemptyEditableValues,limitations:['DOM element hierarchy, control order, original fixed attrs, ARIA references, headings, forms and all table cells are retained. Executable script nodes are removed; this changes raw child element indices only where a script was a sibling. Original complete sibling chains remain in control observation proof.','No source handler or service is executed during replay. Original event strings and iframe/object/embed metadata remain inert under CSP.','External font and image resources are blocked. Original captured same-origin CSSOM is inlined; font geometry can vary.']};
  qa.pass=qa.bodyAfterPlannedSanitizationIdentical&&qa.annotationCoverageComplete&&qa.expectedGroups===3&&!attributeMismatches.length&&!visibilityMismatches.length&&tableMatch&&qa.headingRoleCountMatch&&qa.formRoleCountMatch&&replay.scripts===0&&replay.nonemptyEditableValues===0;
  results.push(qa);summary.push({siteId:sid,accepted:accepted.length,rejected:rejected.length,expected:expected.length,task:1,qaPass:qa.pass});
  await ctx.close();
 }
 await browser.close();
 fs.writeFileSync(path.join(root,'static-qa.json'),JSON.stringify({productExecuted:false,checkedAt:new Date().toISOString(),results},null,2)+'\n');
 console.log(JSON.stringify(summary,null,2));
})();
