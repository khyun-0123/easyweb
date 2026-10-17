const { chromium } = require('/Users/khyun_03/easyweb/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const dest = path.resolve(__dirname);
const starts = [
 ['cheonan','https://www.cheonan.go.kr/kor.do'],
 ['safekorea','https://www.safekorea.go.kr/safekorea-kor/main/main.do'],
 ['nl','https://www.nl.go.kr/'],
 ['nps','https://www.nps.or.kr/main.do'],
 ['smu','https://www.smu.ac.kr/kor/index.do']
];
(async()=>{
 const browser = await chromium.launch({headless:true});
 await Promise.all(starts.map(async([id,url])=>{
   const ctx=await browser.newContext({viewport:{width:1365,height:1000},locale:'ko-KR',ignoreHTTPSErrors:true});
   const p=await ctx.newPage();
   try {
    await p.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    await p.waitForTimeout(2500);
    const data=await p.evaluate(()=>({url:location.href,title:document.title,links:Array.from(document.querySelectorAll('a')).map(a=>({text:(a.innerText||a.textContent||'').trim().replace(/\s+/g,' '),href:a.getAttribute('href'),title:a.title})).filter(a=>a.text)}));
    fs.writeFileSync(path.join(dest,`${id}-discovery.json`),JSON.stringify(data,null,2));
    console.log(id,JSON.stringify(data));
   } catch(e){console.log(id,'ERROR',e.message)}
   await ctx.close();
 }));
 await browser.close();
})();
