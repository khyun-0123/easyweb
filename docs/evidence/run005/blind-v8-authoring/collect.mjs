import {chromium} from '/Users/khyun_03/easyweb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';
const base='docs/evidence/run005/blind-v8-authoring/';
const plan=JSON.parse(fs.readFileSync(base+'selected-page-plan.json','utf8'));
const excluded=JSON.parse(fs.readFileSync('/tmp/easyweb-v8-excluded-pages.json','utf8'));
const forbidden=new Set(excluded.flatMap(x=>[x.url,x.finalUrl]));
const browser=await chromium.launch({headless:true});
const observations=[];
for(const spec of plan.pages){
 if(forbidden.has(spec.url))throw Error('excluded URL');
 const context=await browser.newContext({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true});
 const page=await context.newPage();
 const response=await page.goto(spec.url,{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForTimeout(1500);
 const capturedAt=new Date().toISOString();
 const result=JSON.parse(await page.evaluate(specJson=>{
  const spec=JSON.parse(specJson);
  const controlSelector='a[href],button,input,select,textarea,[role="button"],[role="searchbox"],[role="link"],[contenteditable]';
  const cleanText=s=>(s||'').replace(/\s+/g,' ').trim();
  const selected=spec.selectors.map(s=>{const e=document.querySelector(s);if(!e)throw Error('missing '+s);return e;});
  const retain=new Set(); const fullRoots=new Set();
  const add=e=>{if(!e)return;fullRoots.add(e);for(const n of [e,...e.querySelectorAll('*')])retain.add(n);for(let p=e.parentElement;p;p=p.parentElement)retain.add(p)};
  selected.forEach(add);
  const references=[];
  for(let round=0;round<5;round++){
   let changed=false;
   for(const e of [...retain])for(const name of ['aria-controls','aria-labelledby','aria-describedby','for','form']){
    const v=e.getAttribute(name);if(!v)continue;
    for(const id of v.trim().split(/\s+/)){const t=document.getElementById(id);references.push({fromTag:e.tagName,fromId:e.id,attribute:name,targetId:id,exists:!!t});if(t&&!retain.has(t)){add(t);changed=true}}
   }
   if(!changed)break;
  }
  const ancestry=e=>{const a=[];for(let n=e;n;n=n.parentElement)a.unshift({tag:n.tagName.toLowerCase(),attributes:Object.fromEntries([...n.attributes].filter(x=>x.name!=='value').map(x=>[x.name,x.value])),indexAmongElements:n.parentElement?[...n.parentElement.children].indexOf(n):0});return a};
  const visible=e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return !!(e.getClientRects().length&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse'&&Number(s.opacity)!==0)};
  const accessible=e=>{
   const by=e.getAttribute('aria-labelledby');if(by){const t=by.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ');if(cleanText(t))return {name:cleanText(t),basis:'aria-labelledby'}}
   if(e.getAttribute('aria-label'))return {name:cleanText(e.getAttribute('aria-label')),basis:'aria-label'};
   if(e.matches('input,select,textarea')&&e.labels?.length)return {name:cleanText([...e.labels].map(x=>x.textContent).join(' ')),basis:'associated-label'};
   const inner=cleanText(e.innerText);if(inner)return {name:inner,basis:'rendered-text'};
   const img=[...e.querySelectorAll('img[alt]')].map(x=>x.getAttribute('alt')).join(' ');if(cleanText(img))return {name:cleanText(img),basis:'image-alt'};
   if(e.getAttribute('title'))return {name:cleanText(e.getAttribute('title')),basis:'title'};
   if(e.getAttribute('placeholder'))return {name:cleanText(e.getAttribute('placeholder')),basis:'placeholder-metadata-not-value'};
   return {name:'',basis:'none'};
  };
  const allControls=[...document.querySelectorAll(controlSelector)].filter(e=>retain.has(e));
  const idFor=e=>{const i=allControls.indexOf(e);return i<0?null:`${spec.siteId}-v8-c${String(i+1).padStart(3,'0')}`};
  const controls=allControls.map((e,i)=>{
   const s=getComputedStyle(e),r=e.getBoundingClientRect();const attrs=Object.fromEntries([...e.attributes].filter(x=>x.name!=='value').map(x=>[x.name,x.value]));
   let href=null;try{if(e.hasAttribute('href'))href=new URL(e.getAttribute('href'),document.baseURI).href}catch{}
   return {sourceId:idFor(e),order:i,tag:e.tagName.toLowerCase(),attributes:attrs,text:cleanText(e.innerText),textContent:cleanText(e.textContent),accessibleName:accessible(e),hrefAttribute:e.getAttribute('href'),resolvedHref:href,target:e.getAttribute('target'),inlineHandlers:Object.fromEntries([...e.attributes].filter(x=>x.name.startsWith('on')).map(x=>[x.name,x.value])),visible:visible(e),computed:{display:s.display,visibility:s.visibility,opacity:s.opacity},bounds:{x:r.x,y:r.y,width:r.width,height:r.height},ancestorChain:ancestry(e)};
  });
  const removal={scripts:0,styles:0,links:0,embedded:0,inputValueAttributes:0,editableTextNodes:0,assetAttributes:0};
  const nodes=[];
  const clone=e=>{
   if(!retain.has(e))return null;
   if(e.matches('script,noscript,style,link,iframe,object,embed')){if(e.tagName==='SCRIPT')removal.scripts++;else if(e.tagName==='STYLE')removal.styles++;else if(e.tagName==='LINK')removal.links++;else removal.embedded++;return null}
   const c=e.cloneNode(false);
   if(c.hasAttribute('value')){c.removeAttribute('value');removal.inputValueAttributes++}
   for(const attr of ['src','srcset','poster','background'])if(c.hasAttribute(attr)){c.removeAttribute(attr);removal.assetAttributes++}
   const s=getComputedStyle(e);
   const originalStyle=e.getAttribute('style');
   c.style.setProperty('display',s.display,'important');c.style.setProperty('visibility',s.visibility,'important');c.style.setProperty('opacity',s.opacity,'important');
   if(e.tagName==='IMG'){const r=e.getBoundingClientRect();c.style.setProperty('width',r.width+'px');c.style.setProperty('height',r.height+'px')}
   if(idFor(e))c.setAttribute('data-eval-id',idFor(e));
   nodes.push({tag:e.tagName.toLowerCase(),attributes:Object.fromEntries([...e.attributes].filter(x=>x.name!=='value').map(x=>[x.name,x.value])),retainedParentIndex: e.parentElement?null:null,order:[...document.querySelectorAll('*')].indexOf(e),computedVisibility:{display:s.display,visibility:s.visibility,opacity:s.opacity},fixtureStyle:c.getAttribute('style'),originalStyle});
   const editable=e.matches('input,textarea,[contenteditable]:not([contenteditable="false"])');
   if(editable){if(e.childNodes.length)removal.editableTextNodes+=e.childNodes.length;c.textContent='';return c}
   for(const n of e.childNodes){if(n.nodeType===1){const child=clone(n);if(child)c.appendChild(child)}else if(n.nodeType===3&&fullRootsHasAncestor(e))c.appendChild(n.cloneNode());}
   return c;
  };
  function fullRootsHasAncestor(e){for(let n=e;n;n=n.parentElement)if(fullRoots.has(n))return true;return false}
  const html=clone(document.documentElement);
  const head=document.createElement('head');
  const charset=document.createElement('meta');charset.setAttribute('charset','utf-8');head.append(charset);
  const title=document.createElement('title');title.textContent=document.title;head.append(title);
  const csp=document.createElement('meta');csp.setAttribute('http-equiv','Content-Security-Policy');csp.setAttribute('content',"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'; base-uri *");head.append(csp);
  const sourceBase=document.querySelector('base');if(sourceBase)head.append(sourceBase.cloneNode(false));
  html.prepend(head);
  const headingEvidence=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(x=>retain.has(x)).map(e=>({tag:e.tagName.toLowerCase(),text:cleanText(e.textContent),ancestorChain:ancestry(e),visible:visible(e)}));
  return JSON.stringify({title:document.title,finalUrl:location.href,documentUrl:document.URL,baseURI:document.baseURI,sourceBase:sourceBase?{attributes:Object.fromEntries([...sourceBase.attributes].map(x=>[x.name,x.value]))}:null,selectors:spec.selectors,selectedSubtrees:selected.map(e=>({tag:e.tagName.toLowerCase(),id:e.id,class:e.className,ancestorChain:ancestry(e),childElements:e.children.length})),referenceCoverage:references.filter((x,i,a)=>a.findIndex(y=>JSON.stringify(x)===JSON.stringify(y))===i),controls,headingEvidence,nodes,removal,fixture:'<!doctype html>\n'+html.outerHTML+'\n'});
 },JSON.stringify(spec)));
 if(forbidden.has(result.finalUrl))throw Error('excluded finalURL');
 const fixturePath=`evaluation/blind-v8/fixtures/${spec.id}.html`;
 fs.writeFileSync(fixturePath,result.fixture);
 const sanitizedFixtureSha=crypto.createHash('sha256').update(result.fixture).digest('hex');delete result.fixture;
 observations.push({siteId:spec.siteId,pageId:spec.id,requestedUrl:spec.url,capturedAt,viewport:{width:1440,height:1000},method:'Fresh headless Playwright Chromium; read-only public HTTP DOMContentLoaded plus 1500ms; no interactions',httpStatus:response?.status(),fixturePath,sanitizedFixtureSha,...result});
 console.log(spec.siteId,observations.at(-1).controls.length,sanitizedFixtureSha);
 await context.close();
}
await browser.close();
fs.writeFileSync(base+'capture-observations.json',JSON.stringify({createdAt:new Date().toISOString(),declaration:{productSourceRead:false,productBuiltCodeRead:false,productResultsRead:false,priorFixturesRead:false,initialPermittedData:'/tmp/easyweb-v8-excluded-pages.json',productExecution:false},planSha256:crypto.createHash('sha256').update(fs.readFileSync(base+'selected-page-plan.json')).digest('hex'),pages:observations},null,2)+'\n');
