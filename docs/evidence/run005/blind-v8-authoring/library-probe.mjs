import {chromium} from '/Users/khyun_03/easyweb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b=await chromium.launch({headless:true});
for(const js of [true,false]){const p=await b.newPage({viewport:{width:1440,height:1000},ignoreHTTPSErrors:true,javaScriptEnabled:js});
try{const r=await p.goto('https://www.nl.go.kr/',{waitUntil:'domcontentloaded',timeout:60000});await p.waitForTimeout(1500);console.log('js',js,'http',r?.status(),'url',p.url(),'title',await p.title(),'length',(await p.content()).length);console.log((await p.content()).slice(0,600));fs.writeFileSync(`docs/evidence/run005/blind-v8-authoring/library-live-${js}.html`,await p.content());}catch(e){console.log('ERROR',String(e))};await p.close()};await b.close();
