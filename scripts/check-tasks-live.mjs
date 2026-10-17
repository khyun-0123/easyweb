import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const option = (name, fallback) => {
  const inline = process.argv.find(arg => arg.startsWith(`--${name}=`));
  const index = process.argv.indexOf(`--${name}`);
  if (inline === undefined && index < 0) return fallback;
  const value = inline?.slice(name.length + 3) ?? process.argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`Missing value for --${name}`);
  return value;
};
const output = option('output', 'docs/evidence/run004/tasks-live.json');
const only = [...new Set([option('only', ''), option('page-ids', '')].flatMap(value => value.split(',').map(id => id.trim()).filter(Boolean)))];
const observeOnly = process.argv.includes('--observe-only');
const files = (await readdir('evaluation/sites')).filter(name => name.endsWith('.json')).sort();
const sites = await Promise.all(files.map(async name => JSON.parse(await readFile(`evaluation/sites/${name}`, 'utf8'))));
let previousReport = null;
try { previousReport = JSON.parse(await readFile(output, 'utf8')); } catch {}
const allTargets = sites.flatMap(site => site.pages.map(page => ({ siteId: site.siteId, ...page })));
const unknownPageIds = only.filter(id => !allTargets.some(page => page.id === id));
if (unknownPageIds.length) throw new Error('Unknown --page-ids/--only value: ' + unknownPageIds.join(', '));
const targets = allTargets.filter(page => !only.length || only.includes(page.id));
const built = await build({ stdin: { contents: `
import {analyzePage,getSafeLabel,isVisible} from './src/analyzer';
import {classify} from './src/classifier'; import {rank} from './src/ranker'; import {openEasyMode} from './src/easy-mode';
const norm=s=>s.normalize('NFKC').replace(/\\s+/g,'').toLowerCase();
const clickPoint=element=>{for(const r of element.getClientRects()){const l=Math.max(0,r.left),t=Math.max(0,r.top),right=Math.min(innerWidth,r.right),bottom=Math.min(innerHeight,r.bottom);if(right<=l||bottom<=t)continue;for(const [fx,fy]of [[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]]){const x=l+(right-l)*fx,y=t+(bottom-t)*fy,hit=document.elementFromPoint(x,y);if(hit&&(hit===element||element.contains(hit)))return {x,y};}}return null;};
const diagnostic=candidate=>({label:candidate.label,category:candidate.category??null,action:candidate.action,context:candidate.context,score:candidate.score,reasons:[...candidate.reasons],sectionLabel:candidate.sectionLabel??null,contextLabels:candidate.contextLabels??[],pagePurpose:candidate.pagePurpose??null,destinationHost:candidate.destinationHost??null});
const describe=element=>({tag:element.tagName.toLowerCase(),id:element.id||null,name:element.getAttribute('name'),role:element.getAttribute('role'),label:getSafeLabel(element),ariaLabel:element.getAttribute('aria-label'),placeholder:element.getAttribute('placeholder'),rawHref:element.getAttribute('href'),href:element instanceof HTMLAnchorElement?element.href:null});
window.EasyWebTaskAudit={describe,clickPoint,
 dismissible(){this.dismissElements=[...document.querySelectorAll('dialog a,dialog button,[role="dialog"] a,[role="dialog"] button,.main-pop-outer a,.popup a,.popup button,.pop_wrap a,.pop_wrap button,.layerPopup a,.layerPopup button')].filter(element=>isVisible(element)&&/^(닫기|팝업\\s*닫기|close|일주일간 팝업 보지 않기|오늘\\s*하루\\s*(그만|보지)\\s*보기|오늘\\s*하루\\s*보지\\s*않기)$/i.test(getSafeLabel(element)));return this.dismissElements.map((element,index)=>({index,label:getSafeLabel(element)}));},
 inspect(descriptors,truths,allowMenuContinuation=false){
  const all=[...document.querySelectorAll('a,button,input,textarea,[role~="button"],[role~="searchbox"],[role~="textbox"]')];
  const match=(element,d)=>{if(element.tagName.toLowerCase()!==d.tag)return false;const label=getSafeLabel(element);const fixedInput=element.matches('input,textarea')&&!!d.placeholder&&element.getAttribute('placeholder')===d.placeholder&&(!d.id||element.id===d.id);if(norm(label)!==norm(d.label)&&!fixedInput)return false;if(d.href&&/^https?:/.test(d.href))return element instanceof HTMLAnchorElement&&element.href===d.href;if(d.rawHref!==null)return element.getAttribute('href')===d.rawHref;return !d.id||element.id===d.id||!!d.ariaLabel&&element.getAttribute('aria-label')===d.ariaLabel||!!d.placeholder&&element.getAttribute('placeholder')===d.placeholder;};
  const continuations=allowMenuContinuation?(this.initialRecommendedSources??[]).filter(({element,label})=>element.isConnected&&isVisible(element)&&norm(getSafeLabel(element))===norm(label)&&element instanceof HTMLAnchorElement&&element.getAttribute('href')?.startsWith('#')&&truths.some(truth=>truth.action==='navigate'&&truth.href&&[...element.parentElement.querySelectorAll('a[href]')].some(child=>child!==element&&child.href===truth.href&&isVisible(child)&&clickPoint(child)))).map(({element})=>element):[];
  const matched=all.filter(element=>descriptors.some(d=>match(element,d))||continuations.includes(element));
  this.matched=matched;this.visibleMatched=matched.filter(isVisible);const raw=analyzePage();const classified=classify(raw);const selected=rank(classified);this.selected=selected;
  const selectedMatches=selected.flatMap((candidate,index)=>this.visibleMatched.includes(candidate.element)&&truths.some(truth=>truth.category===candidate.category&&(truth.action===candidate.action||truth.action==='navigate'&&candidate.action==='locate'&&continuations.includes(candidate.element)))?[{index,label:candidate.label,category:candidate.category,action:candidate.action,href:candidate.href??null,originalMenuContinuation:continuations.includes(candidate.element)}]:[]);
  if(!allowMenuContinuation)this.initialRecommendedSources=selectedMatches.map(({index})=>({element:selected[index].element,label:getSafeLabel(selected[index].element)}));
  return {candidateCount:raw.length,classifiedCount:classified.length,selectedCount:selected.length,diagnostics:{selected:selected.map((candidate,index)=>({index,...diagnostic(candidate),matchesTaskControl:this.visibleMatched.includes(candidate.element)})),taskCandidates:this.visibleMatched.map(element=>({source:describe(element),raw:raw.filter(candidate=>candidate.element===element).map(diagnostic),classified:classified.filter(candidate=>candidate.element===element).map(diagnostic)}))},matchedCount:matched.length,visibleMatchedCount:this.visibleMatched.length,matched:matched.map(element=>({...describe(element),visible:isVisible(element)})),originalMenuContinuations:continuations.map(describe),selectedMatches};
 },
 open(){const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);this.close=openEasyMode(host);},
 cardIndexes(candidate){const host=document.querySelector('[data-easyweb-host]');return [...host.shadowRoot.querySelectorAll('.card')].flatMap((card,index)=>card.dataset.category===candidate.category&&[...card.querySelectorAll('.card-source')].some(node=>node.textContent==='찾은 메뉴 · '+candidate.label)?[index]:[]);},
 afterGuide(){const active=document.activeElement;const source=this.visibleMatched.find(element=>element===active||element.contains(active));this.source=source??null;const host=document.querySelector('[data-easyweb-notice]');const panel=host?.shadowRoot.querySelector('[role="status"],[role="alert"]');return {focusedMatch:!!source,source:source?describe(source):null,noticeRole:panel?.getAttribute('role')??null,noticeReason:host?.getAttribute('data-easyweb-notice-reason')??null,noticeText:panel?.textContent??null,overlayClosed:!document.querySelector('[data-easyweb-host]')};}
};`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', loader: { '.css': 'text' } });
const harnessCorrections = [{"scope": "Evaluation realm, not product or fixture change", "observation": "On the library public site, Playwright main-world evaluate returned undefined for objects and arrays, while direct CDP Runtime.evaluate returned 42 and the public document title; a CDP-created isolated world returned the expected object and public control count.", "correction": "Use a CDP-created isolated world consistently for the source bundle and descriptor inspection on all sites. No extension installation or activeTab claim is made."}, {"scope": "Reduced-fixture descriptor matching, not expected-data change", "observation": "The actual SMU notice search input had the same fixed id and placeholder but a richer linked label than the reduced fixture.", "correction": "Allow native input fixed id plus exact placeholder, or exact placeholder when fixture id is absent. Preserve original expected task/source IDs."}, {"scope": "Original public menu flow, not copied URL fallback", "observation": "Focusing the SMU academic menu changed its original href to #a and revealed a visible child academic-calendar link.", "correction": "Record that focus mutation and follow only the visible original child link under the recommended original menu whose HTTP(S) href exactly matches the known public task destination. No address-bar jump or copied URL navigation."}, {"scope": "Report field wording", "observation": "The initial snapshot used allDatasetTasksExecuted for page attempts, while passed and allPassed separately showed failures.", "correction": "Current report uses allDatasetTasksAttempted. Earlier raw snapshots retain their original fields and are not claims that all tasks completed."}];
harnessCorrections.push({ scope: 'Changed original menu, actual UI retry only', observation: 'The product rejects a candidate whose label or href changes while focus is being given and displays an explicit changed-menu alert.', correction: 'Only after that alert, dismiss it and reopen EasyWeb once. Require a fresh actual recommendation. A fragment-menu continuation is permitted only for the initially correctly recommended same DOM element with the same fixed name and a visible original child anchor to the exact known public destination. Record both guidance attempts; never replace a missing recommendation with a copied URL.' });
const code = built.outputFiles[0].text;
async function createAudit(page) {
  const session = await page.context().newCDPSession(page);
  const tree = await session.send('Page.getFrameTree');
  const world = await session.send('Page.createIsolatedWorld', { frameId: tree.frameTree.frame.id, worldName: 'EasyWebTaskAudit' });
  return { async evaluate(fn, arg) {
    const expression = typeof fn === 'string' ? fn : `(${fn.toString()})(${arg === undefined ? 'undefined' : JSON.stringify(arg)})`;
    const response = await session.send('Runtime.evaluate', { expression, contextId: world.executionContextId, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  } };
}
const sha = text => createHash('sha256').update(text).digest('hex');
const sourceFiles = (await readdir('src')).filter(name => /\.(?:ts|css)$/.test(name)).sort();
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async name => ['src/' + name, sha(await readFile('src/' + name, 'utf8'))])));
const browser = await chromium.launch({ headless: true });
const report = { checkedAt: new Date().toISOString(), environment: { chromium: browser.version(), node: process.version, playwright: JSON.parse(await readFile('node_modules/@playwright/test/package.json', 'utf8')).version, platform: process.platform, architecture: process.arch, viewport: { width: 1440, height: 1080 }, locale: 'ko-KR', freshUnauthenticatedContextPerPage: true }, engineHash: sha(code), engineHashScope: 'Entire in-memory bundle, including analyzer, classifier, ranker, UI and audit helpers; not a classifier-only hash.', sourceHashes, datasetHash: sha(JSON.stringify(sites)), priorSnapshots: previousReport ? [...(previousReport.priorSnapshots ?? []), { ...previousReport, priorSnapshots: undefined }] : [], harnessCorrections, scope: 'Actual public pages in fresh Playwright contexts, source-bundled UI in a CDP-created isolated world and native browser actual-card or original-link clicks. Not an installed-extension toolbar/activeTab test, business completion or human usability evidence.', conditions: ['No input entry, search submission, login, authentication, payment, application submission or download activation.', 'A navigate recommendation may activate only its actual EasyWeb card anchor with the exact known public HTTP(S) task destination. A locate recommendation must reach the original source guidance; locate-only tasks stop there without activating the source.', 'Presentation popup dismissal is limited to explicit close/do-not-show controls and recorded per page.', 'Fixture IDs are used only to derive descriptors offline. No data-eval-id is added to actual pages.', 'Classification uses the frozen in-memory source bundle. No fixture, expected data or classifier rule is changed by this script.', 'CDP isolated-world evaluation avoids the observed main-world Playwright evaluation-helper interaction on the library site; this is not an extension installation test.', 'Native input mapping permits exact fixed id plus placeholder (or exact placeholder without fixture id) when a fuller actual-page linked label differs from the reduced fixture.', 'During task activation, navigation requests with non-GET/HEAD methods or authentication-start paths are blocked. Actual card links and any original public submenu links are checked against the exact known href before native browser activation. Destination success requires an observed HTTP navigation response below 400.'], observeOnly, selectedPageIds: targets.map(page => page.id), expectedDatasetTasks: sites.reduce((n, site) => n + site.pages.length, 0), results: [] };
const normalizeUrl = value => { try { const url = new URL(value); url.hash = ''; return url.href; } catch { return value; } };
const fixtureContext = await browser.newContext();
try {
  for (const target of targets) {
    const row = { siteId: target.siteId, pageId: target.id, taskId: target.task.id, instruction: target.task.instruction, split: target.split, requestedUrl: target.finalUrl || target.url, startedAt: new Date().toISOString(), status: 'not-run', taskPassed: false };
    report.results.push(row);
    const fixturePage = await fixtureContext.newPage();
    let descriptors;
    try {
      const html = await readFile(target.fixture, 'utf8');
      row.fixtureHash = sha(html);
      await fixturePage.setContent(html);
      const fixtureAudit = await createAudit(fixturePage);
      await fixtureAudit.evaluate(code);
      descriptors = await fixtureAudit.evaluate(ids => ids.map(id => { const element = [...document.querySelectorAll('[data-eval-id]')].find(el => el.getAttribute('data-eval-id') === id); if (!element) throw new Error('Missing fixture source: ' + id); return { sourceId: id, ...EasyWebTaskAudit.describe(element) }; }), target.task.expectedSourceIds);
      row.descriptors = descriptors;
    } finally { await fixturePage.close(); }
    const truths = target.expected.filter(truth => truth.sourceIds.some(id => target.task.expectedSourceIds.includes(id)));
    const context = await browser.newContext({ viewport: report.environment.viewport, locale: 'ko-KR' });
    const page = await context.newPage();
    const navigationResponses = [];
    context.on('page', p => p.on('response', response => { if (response.request().isNavigationRequest()) navigationResponses.push({ url: response.url(), status: response.status() }); }));
    page.on('response', response => { if (response.request().isNavigationRequest()) navigationResponses.push({ url: response.url(), status: response.status() }); });
    let downloadObserved = false;
    context.on('page', p => p.on('download', download => { downloadObserved = true; void download.cancel(); }));
    page.on('download', download => { downloadObserved = true; void download.cancel(); });
    try {
      const response = await page.goto(row.requestedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      row.httpStatus = response?.status() ?? null;
      await page.waitForTimeout(1800);
      const audit = await createAudit(page);
      row.finalUrl = page.url(); row.title = await audit.evaluate(() => document.title);
      if (!response || response.status() >= 400) { row.status = 'public-page-unavailable'; continue; }
      await audit.evaluate(code);
      row.popupDismissals = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const candidates = await audit.evaluate(() => EasyWebTaskAudit.dismissible());
        if (!candidates.length) break;
        const candidate = candidates[0];
        const point = await audit.evaluate(index => { const element=EasyWebTaskAudit.dismissElements[index]; element.scrollIntoView({block:'center',behavior:'instant'}); return EasyWebTaskAudit.clickPoint(element); }, candidate.index);
        try { if (!point) throw new Error('Explicit dismiss control is covered or outside viewport'); await page.mouse.click(point.x, point.y); row.popupDismissals.push({ label: candidate.label, result: 'clicked-explicit-dismiss' }); await page.waitForTimeout(250); }
        catch (error) { row.popupDismissals.push({ label: candidate.label, result: 'not-clickable', error: String(error).slice(0, 250) }); break; }

      }
      row.analysis = await audit.evaluate(({ descriptors, truths }) => EasyWebTaskAudit.inspect(descriptors, truths), { descriptors, truths });
      row.taskControlPresent = row.analysis.matchedCount > 0;
      row.taskRecommended = row.analysis.selectedMatches.length > 0;
      if (!row.taskControlPresent) { row.status = 'task-control-not-matched'; continue; }
      if (!row.taskRecommended) { row.status = 'task-not-recommended'; continue; }
      if (observeOnly) { row.status = 'observed-only'; continue; }
      row.prohibitedNavigations = [];
      await context.route('**/*', route => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.isNavigationRequest() && (!['GET', 'HEAD'].includes(request.method()) || /(?:^|[\/_.-])(?:sso|oauth2?|saml|authorize|login)(?:[\/_.-]|$)/i.test(url.pathname))) {
          row.prohibitedNavigations.push({ method: request.method(), url: request.url() });
          return route.abort('blockedbyclient');
        }
        return route.continue();
      });
      const navigationTruth = truths.find(truth => truth.action === 'navigate' && truth.href && descriptors.some(descriptor => truth.sourceIds.includes(descriptor.sourceId)));
      await audit.evaluate(() => { window.__easyWebTaskSubmitBlocked = false; document.addEventListener('submit', event => { event.preventDefault(); window.__easyWebTaskSubmitBlocked = true; }, { capture: true }); });
      const verifyDestination = async (expectedHref, beforePages) => {
        await page.waitForTimeout(800);
        const submitted = await audit.evaluate(() => window.__easyWebTaskSubmitBlocked === true).catch(() => false);
        const destinationPage = context.pages().find(p => !beforePages.includes(p)) ?? page;
        await destinationPage.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
        const destinationAudit = await createAudit(destinationPage);
        row.destination = { finalUrl: destinationPage.url(), title: await destinationAudit.evaluate(() => document.title), navigationResponses, downloadObserved, formSubmitBlocked: submitted };
        const finalResponse = [...navigationResponses].reverse().find(response => normalizeUrl(response.url) === normalizeUrl(destinationPage.url()));
        row.destination.httpStatus = finalResponse?.status ?? null;
        row.destinationReached = !downloadObserved && !submitted && !row.prohibitedNavigations.length && normalizeUrl(destinationPage.url()) === normalizeUrl(expectedHref) && !!finalResponse && finalResponse.status < 400;
        row.status = row.destinationReached ? 'public-destination-reached' : 'destination-not-verified';
        row.taskPassed = row.destinationReached;
      };
      const activateRecommendation = async selected => {
        await audit.evaluate(() => EasyWebTaskAudit.open());
        const indexes = await audit.evaluate(candidate => EasyWebTaskAudit.cardIndexes(candidate), selected);
        if (indexes.length !== 1) return { kind: 'ambiguous', cardMatches: indexes.length };
        const index = indexes[0];
        const card = await audit.evaluate(index => { const card = document.querySelector('[data-easyweb-host]').shadowRoot.querySelectorAll('.card')[index]; return { tag: card.tagName.toLowerCase(), href: card instanceof HTMLAnchorElement ? card.href : null, target: card.getAttribute('target'), download: card.hasAttribute('download') }; }, index);
        if (selected.action === 'navigate') {
          row.execution = 'actual-card-link';
          row.cardLink = card;
          if (!navigationTruth || card.tag !== 'a' || card.download || !card.href || !/^https?:/.test(card.href) || normalizeUrl(card.href) !== normalizeUrl(navigationTruth.href)) {
            row.status = 'card-link-not-exact-public-destination';
            return { kind: 'navigation', cardMatches: 1, activated: false };
          }
          row.expectedDestination = navigationTruth.href;
          const beforePages = context.pages();
          await page.locator('[data-easyweb-host]').locator('.card').nth(index).click({ timeout: 6000 });
          row.cardLinkClicked = true;
          await verifyDestination(navigationTruth.href, beforePages);
          return { kind: 'navigation', cardMatches: 1, activated: true };
        }
        if (card.tag !== 'button') return { kind: 'ambiguous', cardMatches: 1, unexpectedCardTag: card.tag };
        row.execution = 'original-source-guidance';
        await page.locator('[data-easyweb-host]').locator('.card').nth(index).click({ timeout: 6000 });
        return { kind: 'guidance', cardMatches: 1, ...await audit.evaluate(() => EasyWebTaskAudit.afterGuide()) };
      };
      row.guidanceAttempts = [await activateRecommendation(row.analysis.selectedMatches[0])];
      row.guidance = row.guidanceAttempts[0];
      if (row.guidance.kind === 'navigation') continue;
      if (row.guidance.kind !== 'guidance') { row.status = 'task-card-ambiguous-or-changed'; continue; }
      row.firstGuidanceReached = row.guidance.overlayClosed && row.guidance.focusedMatch && row.guidance.noticeRole === 'status';
      if (!row.firstGuidanceReached && row.guidance.noticeRole === 'alert' && row.guidance.noticeReason === 'changed') {
        // Follow the actual changed-menu instruction once. A fresh, visible real recommendation is required.
        await page.getByRole('button', { name: '안내 닫기', exact: true }).click({ timeout: 3000 });
        row.retryAnalysis = await audit.evaluate(({ descriptors, truths }) => EasyWebTaskAudit.inspect(descriptors, truths, true), { descriptors, truths });
        row.retryRecommended = row.retryAnalysis.selectedMatches.length > 0;
        if (!row.retryRecommended) { row.status = 'changed-menu-not-recommended-on-retry'; continue; }
        row.guidanceAttempts.push(await activateRecommendation(row.retryAnalysis.selectedMatches[0]));
        row.guidance = row.guidanceAttempts[1];
        if (row.guidance.kind === 'navigation') continue;
        if (row.guidance.kind !== 'guidance') { row.status = 'retry-task-card-ambiguous-or-changed'; continue; }
      }
      row.originalGuidanceReached = row.guidance.overlayClosed && row.guidance.focusedMatch && row.guidance.noticeRole === 'status';
      if (row.prohibitedNavigations.length) { row.status = 'read-only-boundary-blocked'; continue; }
      if (!row.originalGuidanceReached) { row.status = 'original-guidance-failed'; continue; }
      if (!navigationTruth) { row.status = 'original-control-reached'; row.taskPassed = true; continue; }
      let observedHref = await audit.evaluate(() => EasyWebTaskAudit.source instanceof HTMLAnchorElement ? EasyWebTaskAudit.source.href : null);
      row.expectedDestination = navigationTruth.href;
      if (observedHref && normalizeUrl(observedHref) !== normalizeUrl(navigationTruth.href)) {
        // Follow only an actually visible original child of a correctly recommended fragment-menu source.
        row.originalFocusChangedHref = observedHref;
        const submenu = await audit.evaluate(expectedHref => {
          const source=EasyWebTaskAudit.source;
          const current=source instanceof HTMLAnchorElement?source.getAttribute('href'):null;
          if(!current?.startsWith('#'))return null;
          const child=[...source.parentElement.querySelectorAll('a[href]')].find(element=>element!==source&&element.href===expectedHref&&EasyWebTaskAudit.clickPoint(element));
          if(!child)return null;EasyWebTaskAudit.source=child;return EasyWebTaskAudit.describe(child);
        }, navigationTruth.href);
        row.visibleOriginalSubmenu = submenu;
        if (submenu) observedHref = submenu.href;
      }
      if (!observedHref || normalizeUrl(observedHref) !== normalizeUrl(navigationTruth.href) || !/^https?:/.test(observedHref)) { row.status = 'original-link-changed'; continue; }
      // This branch requires the exact known public original anchor, never a submission control.
      await page.getByRole('button', { name: '안내 닫기', exact: true }).click({ timeout: 3000 });
      const beforePages = context.pages();
      const point = await audit.evaluate(() => EasyWebTaskAudit.clickPoint(EasyWebTaskAudit.source));
      if (!point) { row.status = 'original-link-covered'; continue; }
      await page.mouse.click(point.x, point.y);
      row.originalLinkClicked = true;
      await verifyDestination(navigationTruth.href, beforePages);
    } catch (error) { row.status = 'observation-error'; row.error = String(error).slice(0, 700); }
    finally {
      row.finishedAt = new Date().toISOString();
      await context.close();
      console.log(JSON.stringify({ pageId: row.pageId, httpStatus: row.httpStatus ?? null, status: row.status, recommended: row.taskRecommended ?? null, originalReached: row.originalGuidanceReached ?? null, passed: row.taskPassed }));
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    }
  }
} finally { await fixtureContext.close(); await browser.close(); }
report.finishedAt = new Date().toISOString();
report.summary = { observedTasks: report.results.length, notRecommended: report.results.filter(row => row.taskRecommended === false).length, observationErrors: report.results.filter(row => row.status === 'observation-error').length, controlPresent: report.results.filter(row => row.taskControlPresent).length, recommended: report.results.filter(row => row.taskRecommended).length, firstGuidanceReached: report.results.filter(row => row.firstGuidanceReached).length, guidanceRetries: report.results.filter(row => row.guidanceAttempts?.length === 2).length, originalGuidanceReached: report.results.filter(row => row.originalGuidanceReached).length, actualCardLinksClicked: report.results.filter(row => row.cardLinkClicked).length, destinationReached: report.results.filter(row => row.destinationReached).length, passed: report.results.filter(row => row.taskPassed).length, allDatasetTasksAttempted: report.results.length === report.expectedDatasetTasks && !observeOnly, allPassed: report.results.length === report.expectedDatasetTasks && !observeOnly && report.results.every(row => row.taskPassed) };
report.acceptance = report.summary.allPassed ? 'PUBLIC_TASKS_PASSED: original control/public destination only; not business completion or installed-extension evidence.' : `NOT_MET: actual public tasks reached ${report.summary.passed} of ${report.expectedDatasetTasks}; ${report.summary.notRecommended} task controls were not recommended.`;
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, summary: report.summary }));
if (!observeOnly && !report.summary.allPassed) process.exitCode = 1;
