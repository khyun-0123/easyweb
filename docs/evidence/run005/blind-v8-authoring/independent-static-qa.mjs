import fs from 'node:fs';
import crypto from 'node:crypto';
import {chromium} from '/Users/khyun_03/easyweb/node_modules/playwright/index.mjs';

// This script does not load or execute EasyWeb, its evaluator, or prior datasets.
// Input names are fixed to the independent observer's explicitly permitted set.
const root = '/Users/khyun_03/easyweb/';
const ownDir = 'docs/evidence/run005/blind-v8-authoring/';
const allowed = new Set([
  '/tmp/easyweb-v8-excluded-pages.json',
  root + ownDir + 'selected-page-plan.json',
  root + ownDir + 'capture-observations.json',
  root + 'docs/evidence/run005/blind-v8-observations.json',
  ...['smu','city','government','public-agency','library'].flatMap(site => [
    root + `evaluation/blind-v8/sites/${site}.json`,
    root + `evaluation/blind-v8/fixtures/${site}-blind-v8.html`,
  ]),
]);
const read = file => {
  const full = file.startsWith('/') ? file : root + file;
  if (!allowed.has(full)) throw new Error('Read boundary: ' + full);
  return fs.readFileSync(full, 'utf8');
};
const json = file => JSON.parse(read(file));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const clean = value => (value || '').replace(/\s+/gu,' ').trim();
const findings = [];
const checks = [];
function check(id, ok, detail) {
  checks.push({id, pass:!!ok, detail});
  if (!ok) findings.push({severity:'REQUIRES_CORRECTION_BEFORE_FREEZE',check:id,detail});
}

const capture = json(ownDir + 'capture-observations.json');
const annotated = json('docs/evidence/run005/blind-v8-observations.json');
const plan = json(ownDir + 'selected-page-plan.json');
const excluded = json('/tmp/easyweb-v8-excluded-pages.json');
const excludedUrls = new Set(excluded.flatMap(x => [x.url,x.finalUrl]));
const pages = [];
check('page-set',equal(capture.pages.map(p=>p.siteId),annotated.pages.map(p=>p.siteId)) && capture.pages.length===5,'Five capture/annotation pages in matching order.');
check('plan-hash',annotated.planSha256 === sha(read(ownDir+'selected-page-plan.json')),'Selected plan bytes remain those recorded in the observation.');

// Manual semantic adjudication based solely on observed control text and bounded
// page context. Maintenance/service interruption notices remain notices; guides
// to installation and mailbox alias setup are help. A government explanation of
// disaster training is help, with no curriculum/enrolment/execution control.
const consensus = {
  smu:{search:[5,9,15,16],notice:[17,18,19,21,23,24,25,26,27,28,29,30,31,32],help:[20,22]},
  city:{help:[2,3,4,13],apply:[14,15,16]},
  government:{help:[1,2,3,4,5,6,7]},
  'public-agency':{help:[1,2,3,4,5,6,7]},
  library:{help:[2,3,4,5,16,17,18],search:[19],apply:[20]},
};
const semanticReasons = {
  smu:'Fixed board search controls; dated maintenance/availability posts and board paging are notice functions; application-installation and mailbox-alias instructions are help.',
  city:'Reading civil-service context is help; certificate issuance and paperwork associated with the actual inspection application are apply.',
  government:'Public training explanations, plans and reference reading are help; no academic course/enrolment function is asserted merely from education wording.',
  'public-agency':'Pension explanatory tabs, related informational services and braille reading access are help. Reading-access assistance is distinguished from generic printing or sharing.',
  library:'Usage breadcrumbs and reading instructions are help; catalogue entry performs search discovery; request confirmation is apply.',
};

function actionFor(control, page) {
  const attrs = control.attributes;
  const href = control.hrefAttribute?.trim() ?? '';
  const reasons = [];
  if (control.tag==='button' || attrs.role==='button') reasons.push('button');
  if (attrs['aria-controls']) reasons.push('aria-controls');
  if (attrs['aria-haspopup'] && attrs['aria-haspopup']!=='false') reasons.push('aria-haspopup');
  if (Object.keys(control.inlineHandlers).length) reasons.push('source-inline-handler');
  if ('download' in attrs) reasons.push('download-attribute');
  if (control.target && !['_self','_blank','_parent','_top'].includes(control.target.toLowerCase())) reasons.push('named-target');
  let dest;
  try { dest = new URL(href, page.baseURI); } catch {}
  if (!href || !dest || !['http:','https:'].includes(dest.protocol)) reasons.push('no-ordinary-http-source');
  else {
    const base = new URL(page.documentUrl);
    const sameDocument = dest.origin===base.origin && dest.pathname===base.pathname && dest.search===base.search;
    if (href.startsWith('#') || (sameDocument && dest.hash)) reasons.push('same-document-fragment');
    if (/(?:filedown|download)/iu.test(dest.pathname)) reasons.push('explicit-download-endpoint');
    if (/(?:^|\/)(?:sso|oauth|oauth2|saml|authorize)(?:\/|$)/iu.test(dest.pathname)) reasons.push('explicit-auth-endpoint');
  }
  return {action:reasons.length?'locate':'navigate',destinationUrl:reasons.length?undefined:dest.href,reasons};
}

const browser = await chromium.launch({headless:true});
try {
for (const page of annotated.pages) {
  const source = capture.pages.find(p=>p.pageId===page.pageId);
  const site = json(`evaluation/blind-v8/sites/${page.siteId}.json`);
  const fixture = read(page.fixturePath);
  const spec = site.pages[0];
  const prefix = page.siteId;
  const before = checks.length;
  const sourceById = new Map(page.controls.map(c=>[c.sourceId,c]));
  const accepted = new Map(spec.accepted.map(a=>[a.sourceId,a]));
  const coverage = new Map(page.annotationCoverage.map(c=>[c.sourceId,c]));
  const manual = new Map(Object.entries(consensus[prefix]).flatMap(([category,ids])=>ids.map(n=>[`${prefix}-v8-c${String(n).padStart(3,'0')}`,category])));
  check(prefix+':source-capture-unchanged',equal(source.controls,page.controls)&&equal(source.nodes,page.nodes)&&equal(source.headingEvidence,page.headingEvidence)&&equal(source.referenceCoverage,page.referenceCoverage),'All original captured control/node/heading/reference records remain unchanged in the annotated observation.');
  check(prefix+':not-prior-url',![page.requestedUrl,page.finalUrl].some(u=>excludedUrls.has(u)),'Requested/final URL is absent from the excluded page URL list.');
  check(prefix+':planned-url',plan.pages.some(p=>p.id===page.pageId&&p.url===page.requestedUrl&&equal(p.selectors,page.selectors)),'Capture matches the preselected URL and bounded selectors.');
  check(prefix+':fixture-hash',sha(fixture)===page.sanitizedFixtureSha&&sha(fixture)===spec.observation.sourceEvidence.fixtureSha256,'Fixture SHA256 matches both observation and site specification.');
  check(prefix+':site-page-identity',site.siteId===page.siteId&&site.pages.length===1&&spec.id===page.pageId&&spec.url===page.requestedUrl&&spec.finalUrl===page.finalUrl&&spec.fixture===page.fixturePath,'Site/page identity and fixture references agree.');
  check(prefix+':unique-control-ids',sourceById.size===page.controls.length&&coverage.size===page.controls.length&&accepted.size===spec.accepted.length,'Control, coverage and accepted source identifiers are unique.');
  check(prefix+':all-control-coverage',page.controls.every(c=>coverage.has(c.sourceId))&&[...coverage.keys()].every(id=>sourceById.has(id)),'Every retained control has one annotation and no annotation names a missing source.');
  check(prefix+':semantic-consensus',manual.size===accepted.size&&[...manual].every(([id,cat])=>accepted.get(id)?.category===cat),semanticReasons[prefix]);
  check(prefix+':hidden-rejected',page.controls.filter(c=>!c.visible).every(c=>!accepted.has(c.sourceId)&&coverage.get(c.sourceId)?.status==='REJECTED'&&/Hidden/iu.test(coverage.get(c.sourceId)?.reason)),'Every control hidden in the captured default state is explicitly rejected.');
  check(prefix+':visible-utility-rejection',page.controls.filter(c=>c.visible&&!manual.has(c.sourceId)).every(c=>!accepted.has(c.sourceId)&&coverage.get(c.sourceId)?.status==='REJECTED'),'Visible retained controls excluded by the manual semantic pass are explicit rejections.');
  const actionDetails=[];
  for (const c of page.controls) {
    const action = actionFor(c,page);
    actionDetails.push({sourceId:c.sourceId,...action});
    const a=accepted.get(c.sourceId),annotation=coverage.get(c.sourceId);
    check(c.sourceId+':action',annotation.action===action.action&&(!a||(a.action===action.action&&a.destinationUrl===action.destinationUrl)),{independent:action,accepted:a??null});
    check(c.sourceId+':annotation-consistency',(annotation.status==='ACCEPTED')===accepted.has(c.sourceId)&&annotation.category===(a?.category??null),'Accepted/rejected coverage and category agree with the specification.');
  }
  const searchControls=page.controls.filter(c=>c.visible && (
    (c.tag==='input'&&['text','search'].includes(c.attributes.type??'text')) ||
    c.attributes.role==='searchbox' || manual.get(c.sourceId)==='search'
  ));
  check(prefix+':all-retained-fixed-search-controls',searchControls.every(c=>accepted.get(c.sourceId)?.category==='search'),'All visible eligible retained search inputs, submit buttons and filter controls are accepted as search.');
  check(prefix+':three-core',spec.expected.length===3&&new Set(spec.expected.map(e=>e.id)).size===3,'Exactly three unique core expected functions.');
  for (const expected of spec.expected) {
    check(prefix+':expected:'+expected.id,expected.sourceIds.length>0&&expected.sourceIds.every(id=>{
      const a=accepted.get(id),c=sourceById.get(id);
      return c?.visible&&a?.category===expected.category&&a.action===expected.action&&a.destinationUrl===expected.destinationUrl;
    }),{sourceIds:expected.sourceIds,category:expected.category,action:expected.action});
  }
  const task=spec.task;
  const taskSource=sourceById.get(task.evidence?.observedSourceId);
  const taskExpected=spec.expected.filter(e=>task.expectedSourceIds.every(id=>e.sourceIds.includes(id)));
  check(prefix+':task-accepted-core-action',task.expectedSourceIds.length>0&&task.expectedSourceIds.every(id=>accepted.get(id)?.action===task.action)&&taskExpected.length===1&&taskExpected[0].action===task.action&&taskExpected[0].destinationUrl===task.destinationUrl,'Task maps to one accepted core function and the same action/destination.');
  check(prefix+':task-evidence',!!taskSource&&task.expectedSourceIds.includes(taskSource.sourceId)&&equal(task.evidence.accessibleName,taskSource.accessibleName)&&task.evidence.hrefAttribute===taskSource.hrefAttribute&&task.evidence.resolvedHref===taskSource.resolvedHref&&equal(task.evidence.inlineHandlers,taskSource.inlineHandlers)&&task.evidence.target===taskSource.target&&task.evidence.defaultVisible===taskSource.visible,'Task evidence is source exact.');

  const context=await browser.newContext({javaScriptEnabled:false,viewport:page.viewport});
  const tab=await context.newPage();
  await tab.route('**/*',r=>r.abort());
  await tab.setContent(fixture,{waitUntil:'domcontentloaded'});
  const dom=await tab.evaluate(()=>{
    const attrs=e=>Object.fromEntries([...e.attributes].map(a=>[a.name,a.value]));
    const simple=e=>({tag:e.tagName.toLowerCase(),attributes:attrs(e),text:e.textContent,children:[...e.children].map(x=>x.tagName.toLowerCase())});
    const nodes=[document.documentElement,...document.querySelectorAll('body,body *')].map(simple);
    const controls=[...document.querySelectorAll('a[href],button,input,select,textarea,[role="button"],[role="searchbox"],[role="link"],[contenteditable]')].map(e=>({
      ...simple(e),id:e.getAttribute('data-eval-id'),
      ancestorChain:(()=>{const a=[];for(let p=e;p;p=p.parentElement)a.unshift({tag:p.tagName.toLowerCase(),attributes:attrs(p)});return a;})(),
      visible:(()=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return !!(e.getClientRects().length&&r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&s.visibility!=='collapse'&&Number(s.opacity)!==0)})(),
    }));
    return {
      nodes,controls,
      headings:[...document.querySelectorAll('body h1,body h2,body h3,body h4,body h5,body h6')].map(e=>({tag:e.tagName.toLowerCase(),text:e.textContent})),
      forbiddenElements:[...document.querySelectorAll('script,noscript,style,link,iframe,object,embed')].map(simple),
      residualAssetAttrs:[...document.querySelectorAll('[src],[srcset],[poster],[background]')].map(simple),
      inputValues:[...document.querySelectorAll('input[value],textarea[value],select[value]')].map(simple),
      editableContent:[...document.querySelectorAll('input,textarea,[contenteditable]:not([contenteditable="false"])')].filter(e=>e.childNodes.length>0).map(simple),
      refs:[...document.querySelectorAll('[aria-controls],[aria-labelledby],[aria-describedby],[for],[form]')].flatMap(e=>['aria-controls','aria-labelledby','aria-describedby','for','form'].flatMap(a=>(e.getAttribute(a)||'').trim().split(/\s+/).filter(Boolean).map(id=>({fromTag:e.tagName,fromId:e.id,attribute:a,targetId:id,exists:!!document.getElementById(id)})))),
      csp:document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content,
      base:document.querySelector('base')?.getAttribute('href')??null,
    };
  });
  check(prefix+':node-count-and-tag-order',dom.nodes.length===page.nodes.length&&dom.nodes.every((n,i)=>n.tag===page.nodes[i]?.tag),'Every retained source element survives browser parsing in the original retained order. Generated head metadata are excluded.');
  const omittedAttrs=new Set(['value','src','srcset','poster','background','style']);
  const normalizeAttrs=a=>Object.fromEntries(Object.entries(a).filter(([k])=>!omittedAttrs.has(k)&&k!=='data-eval-id').sort(([a],[b])=>a.localeCompare(b)));
  const nodeDifferences=[];
  if(dom.nodes.length===page.nodes.length)dom.nodes.forEach((n,i)=>{
    const original=page.nodes[i];
    if(!equal(normalizeAttrs(n.attributes),normalizeAttrs(original.attributes))||n.attributes.style!==original.fixtureStyle)nodeDifferences.push({index:i,tag:n.tag,actual:n.attributes,source:original.attributes,expectedFixtureStyle:original.fixtureStyle});
  });
  check(prefix+':node-source-attributes',!nodeDifferences.length,{differences:nodeDifferences});
  check(prefix+':control-id-order',equal(dom.controls.map(c=>c.id),page.controls.map(c=>c.sourceId)),'Every retained fixed control has exactly one unchanged evaluation ID in source order.');
  const ancestryDifferences=[];
  dom.controls.forEach((n,i)=>{
    const c=page.controls[i];
    if(!c)return;
    const a=n.ancestorChain.map(x=>({tag:x.tag,attributes:normalizeAttrs(x.attributes)}));
    const b=c.ancestorChain.map(x=>({tag:x.tag,attributes:normalizeAttrs(x.attributes)}));
    if(!equal(a,b))ancestryDifferences.push({sourceId:c.sourceId,fixture:a,source:b});
  });
  check(prefix+':control-source-ancestry',!ancestryDifferences.length,{differences:ancestryDifferences});
  check(prefix+':true-heading-context',equal(dom.headings.map(h=>({tag:h.tag,text:clean(h.text)})),page.headingEvidence.map(h=>({tag:h.tag,text:clean(h.text)}))),'Original h1-h6 tags and heading text/order are retained; no extra semantic heading is fabricated.');
  check(prefix+':id-reference-targets',dom.refs.every(r=>r.exists)&&page.referenceCoverage.every(r=>r.exists&&dom.refs.some(x=>equal(x,r))),'Every recorded aria-controls/labelledby/describedby, label-for and form target remains present.');
  check(prefix+':source-inline-handlers',dom.controls.every((n,i)=>equal(Object.fromEntries(Object.entries(n.attributes).filter(([k])=>k.startsWith('on'))),page.controls[i].inlineHandlers)),'Actual inline event handler strings are retained verbatim; none is invented.');
  check(prefix+':assets-and-user-values-stripped',!dom.forbiddenElements.length&&!dom.residualAssetAttrs.length&&!dom.inputValues.length&&!dom.editableContent.length,{forbiddenElementCount:dom.forbiddenElements.length,residualAssetCount:dom.residualAssetAttrs.length,inputValueCount:dom.inputValues.length,editableContentCount:dom.editableContent.length});
  check(prefix+':script-form-csp',dom.csp?.includes("script-src 'none'")&&dom.csp?.includes("form-action 'none'"),'Fixture CSP disables inline handler execution and form submission.');
  check(prefix+':source-base',dom.base===(page.sourceBase?.attributes?.href??null),'Original source base href is preserved when present.');
  const visibilityDifferences=dom.controls.filter((c,i)=>c.visible!==page.controls[i].visible).map(c=>({sourceId:c.id,fixtureVisible:c.visible,sourceVisible:sourceById.get(c.id)?.visible}));
  check(prefix+':default-control-visibility',!visibilityDifferences.length,{differences:visibilityDifferences});
  await context.close();
  pages.push({siteId:prefix,pageId:page.pageId,fixtureSha256:sha(fixture),controls:page.controls.length,accepted:spec.accepted.length,rejected:page.annotationCoverage.filter(c=>c.status==='REJECTED').length,coreExpected:spec.expected.length,eligibleRetainedSearchControls:searchControls.map(c=>c.sourceId),actionDetails,checkCount:checks.length-before,failedChecks:checks.slice(before).filter(x=>!x.pass).map(x=>x.id)});
}
} finally { await browser.close(); }

const result={
  createdAt:new Date().toISOString(),
  reviewer:'Independent static QA sub-agent; findings disclosed only to the independent collection observer before engine freeze.',
  declaration:{productSourceRead:false,productBuiltCodeRead:false,productResultsRead:false,priorFixturesRead:false,productExecuted:false,evaluatorExecuted:false,visibleOrNativeUIUsed:false,freshFixtureBrowserOnly:true,networkRequestsBlocked:true,fixtureOrSiteMutated:false},
  status:findings.length?'CORRECTIONS_REQUIRED':'PASS',
  inputHashes:[...allowed].map(file=>({file,sha256:sha(read(file))})),
  totals:{pages:pages.length,controls:pages.reduce((n,p)=>n+p.controls,0),accepted:pages.reduce((n,p)=>n+p.accepted,0),rejected:pages.reduce((n,p)=>n+p.rejected,0),coreExpected:pages.reduce((n,p)=>n+p.coreExpected,0),checks:checks.length,passed:checks.filter(c=>c.pass).length,failed:findings.length},
  pages,findings,checks,
  limitations:[
    'This is an independent validation against the observer capture records and manual semantic review, not a product run or performance/acceptance score.',
    'Source observations are bounded public-page snapshots, so source fidelity outside selected subtrees or missing siblings is not inferred.',
    'No user task, external JavaScript behavior, authentication, download, form submission or installed-extension behavior was exercised.',
    'Semantic consensus uses retained source text/context; link destination contents were not fetched in this pass.',
  ],
};
fs.writeFileSync(root+ownDir+'independent-static-qa.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,totals:result.totals,findings:result.findings},null,2));
