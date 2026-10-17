const { chromium } = require('/Users/khyun_03/easyweb/node_modules/playwright');
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=__dirname,fixtureRoot=path.resolve(root,'../../../../evaluation/blind-v9');
const pages=JSON.parse(fs.readFileSync(path.join(root,'candidate-pages.json')));
pages.find(p=>p.siteId==='safekorea').url='https://www.safekorea.go.kr/safekorea-kor/acts/asck/live/livelihoodSafetyCheck.do?menuSn=14';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const evaluateSafely=async(p,fn,arg)=>JSON.parse(await p.evaluate('JSON.stringify(('+fn.toString()+')('+JSON.stringify(arg)+'))'));
(async()=>{
const browser=await chromium.launch({headless:true,args:['--disable-http2']});
await Promise.all(pages.filter(p=>!process.argv[2]||p.siteId===process.argv[2]).map(async entry=>{
 const ctx=await browser.newContext({viewport:{width:1365,height:1000},locale:'ko-KR',ignoreHTTPSErrors:true});
 const p=await ctx.newPage(); const startedAt=new Date().toISOString();const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 try {
  let response;try {response=await p.goto(entry.url,{waitUntil:'domcontentloaded',timeout:30000});}catch(e){errors.push('goto: '+e.message)}
  await p.waitForTimeout(3500);
  if(response){const raw=await response.body();fs.writeFileSync(path.join(root,entry.siteId+'-document-response.html'),raw);entry.responseSha256=sha(raw);entry.responseStatus=response.status();}
  const captured=await evaluateSafely(p,({siteId})=>{
   const clean=s=>(s||'').replace(/\s+/g,' ').trim();
   const editable=el=>el.matches('textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"],[role="combobox"]')||(el.tagName==='INPUT'&&!['button','submit','reset','image','radio','checkbox'].includes(el.type));
   const attrs=el=>Object.fromEntries(Array.from(el.attributes).filter(a=>a.name!=='data-eval-id'&&!(a.name==='value'&&editable(el))).map(a=>[a.name,a.value]));
   const nth=el=>Array.from(el.parentElement?.children||[]).indexOf(el);
   const chain=el=>{const a=[];for(let x=el;x;x=x.parentElement)a.unshift({tag:x.tagName.toLowerCase(),siblingIndex:nth(x),attributes:attrs(x)});return a;};
   const visible=el=>{if(!el.getClientRects().length)return false;for(let x=el;x;x=x.parentElement){let c=getComputedStyle(x);if(c.display==='none'||c.visibility==='hidden'||c.visibility==='collapse'||Number(c.opacity)===0||x.hidden)return false;}let r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
   const ref=el=>Array.from(new Set(['aria-labelledby','aria-describedby','aria-controls','aria-owns'].flatMap(a=>(el.getAttribute(a)||'').split(/\s+/).filter(Boolean)))).map(id=>{const x=document.getElementById(id);return {id,exists:!!x,tag:x?.tagName.toLowerCase(),text:x?clean(x.innerText||x.textContent):null,attributes:x?attrs(x):null};});
   const selector='a,button,input,select,textarea,[role="button"],[role="link"],[role="searchbox"],[role="textbox"],[role="combobox"],[contenteditable]:not([contenteditable="false"]),[onclick],[tabindex]';
   let n=0;const controls=Array.from(document.querySelectorAll(selector)).map(el=>{
    const sourceId=siteId+'-v9-'+String(++n).padStart(4,'0');el.setAttribute('data-eval-id',sourceId);
    const r=el.getBoundingClientRect();
    const labels=el.labels?Array.from(el.labels).map(l=>clean(l.innerText||l.textContent)):[];
    const ariaNames=(el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)).filter(Boolean).map(x=>clean(x.innerText||x.textContent));
    const imageNames=Array.from(el.querySelectorAll('img[alt]')).map(x=>x.alt).filter(Boolean);
    const ownText=editable(el)?'':clean(el.innerText||el.textContent);
    const name=clean(ariaNames.join(' ')||el.getAttribute('aria-label')||labels.join(' ')||ownText||imageNames.join(' ')||el.getAttribute('title')||el.getAttribute('placeholder')||(['button','submit','reset'].includes(el.type)?el.getAttribute('value'):'')||'');
    return {sourceId,tag:el.tagName.toLowerCase(),role:el.getAttribute('role'),name,ownText,imageNames,labels,attributes:attrs(el),visible:visible(el),rect:{x:r.x,y:r.y,width:r.width,height:r.height},ancestorChain:chain(el),ariaReferences:ref(el),outerHTML:el.outerHTML};
   });
   const css=[],inaccessibleStyles=[];for(const sheet of document.styleSheets){try{css.push({href:sheet.href,text:Array.from(sheet.cssRules).map(r=>r.cssText).join('\n')})}catch(e){inaccessibleStyles.push({href:sheet.href,error:e.name})}}
   const structural={headings:Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')).map(el=>({tag:el.tagName.toLowerCase(),role:el.getAttribute('role'),level:el.getAttribute('aria-level'),text:clean(el.innerText||el.textContent),visible:visible(el),ancestorChain:chain(el)})),forms:Array.from(document.querySelectorAll('form,[role="form"],[role="search"]')).map(el=>({tag:el.tagName.toLowerCase(),attributes:attrs(el),ancestorChain:chain(el)})),tables:Array.from(document.querySelectorAll('table')).map(el=>({attributes:attrs(el),text:clean(el.innerText||el.textContent),rowCount:el.rows.length,cellCount:el.querySelectorAll('td,th').length,ancestorChain:chain(el)}))};
   return {url:location.href,baseURI:document.baseURI,title:document.title,originalBase:document.querySelector('base')?.outerHTML||null,controls,css,inaccessibleStyles,structural,html:document.documentElement.outerHTML,bodyText:document.body.innerText};
  },{siteId:entry.siteId});
  fs.writeFileSync(path.join(root,entry.siteId+'-live-dom.html'),captured.html);
  fs.writeFileSync(path.join(root,entry.siteId+'-controls.json'),JSON.stringify(captured.controls,null,2));
  fs.writeFileSync(path.join(root,entry.siteId+'-body.txt'),captured.bodyText);
  fs.writeFileSync(path.join(root,entry.siteId+'-styles.json'),JSON.stringify(captured.css,null,2));
  // A detached DOM preserves original element hierarchy and attribute strings.
  // CSP disables scripts/handlers/services. No source control is clicked.
  const fixture=await evaluateSafely(p,({css,url})=>{
   const doc=document.implementation.createHTMLDocument('');doc.replaceChild(document.documentElement.cloneNode(true),doc.documentElement);
   for(const el of doc.querySelectorAll('script,iframe,object,embed'))el.remove();
   for(const el of doc.querySelectorAll('meta[http-equiv]')){if(/content-security-policy|refresh/i.test(el.getAttribute('http-equiv')))el.remove();}
   for(const el of doc.querySelectorAll('input')){if(!['button','submit','reset','image','radio','checkbox'].includes(el.type))el.removeAttribute('value');}
   for(const el of doc.querySelectorAll('textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="searchbox"]'))el.textContent='';
   const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri https: http:";doc.head.prepend(csp);
   if(!doc.querySelector('base')){const base=doc.createElement('base');base.href=url;doc.head.append(base);}
   const style=doc.createElement('style');style.setAttribute('data-capture-css','original-cssom');style.textContent=css.map(s=>s.text).join('\n');doc.head.append(style);
   return '<!doctype html>\n'+doc.documentElement.outerHTML;
  },{css:captured.css,url:captured.baseURI});
  fs.writeFileSync(path.join(fixtureRoot,entry.siteId+'.html'),fixture);
  await p.screenshot({path:path.join(root,entry.siteId+'-viewport.png'),fullPage:false});
  const meta={siteId:entry.siteId,requestedUrl:entry.url,finalUrl:captured.url,baseURI:captured.baseURI,title:captured.title,startedAt,capturedAt:new Date().toISOString(),viewport:{width:1365,height:1000},responseStatus:entry.responseStatus||null,responseSha256:entry.responseSha256||null,visibleControls:captured.controls.filter(c=>c.visible).length,totalControls:captured.controls.length,structural:captured.structural,inaccessibleStyles:captured.inaccessibleStyles,errors};
  fs.writeFileSync(path.join(root,entry.siteId+'-capture.json'),JSON.stringify(meta,null,2));
  console.log(entry.siteId,JSON.stringify({ok:true,visibleControls:meta.visibleControls,totalControls:meta.totalControls,errors}));
 }catch(e){console.log(entry.siteId,JSON.stringify({ok:false,error:e.stack}))}
 await ctx.close();
}));
await browser.close();
})();
