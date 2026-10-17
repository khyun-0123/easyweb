import {chromium} from '/Users/khyun_03/easyweb/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true});
const urls=process.argv.slice(2);
for(const url of urls){
const page=await browser.newPage({viewport:{width:1440,height:1000}});
try{const r=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000}); await page.waitForTimeout(2000);
console.log(JSON.stringify(await page.evaluate(()=>({title:document.title,url:location.href,status:document.readyState,headings:[...document.querySelectorAll('h1,h2,h3,h4')].map(x=>x.textContent.trim()).filter(Boolean),links:[...document.querySelectorAll('a[href]')].map(a=>({text:(a.innerText||a.getAttribute('aria-label')||a.getAttribute('title')||'').trim().replace(/\s+/g,' '),href:a.getAttribute('href'),target:a.getAttribute('target'),onclick:a.getAttribute('onclick')})).filter(x=>x.text)})),null,2));
console.log('HTTP',r?.status());
}catch(e){console.log(url,String(e));}
await page.close();
}
await browser.close();
