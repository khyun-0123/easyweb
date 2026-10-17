import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { scorePage } from './evaluation-metrics.mjs';

export async function buildMenuFlowHarness() {
  const result = await build({ stdin: { contents: `
import {analyzePage} from './src/analyzer'; import {classify} from './src/classifier';
import {openEasyMode} from './src/easy-mode';
window.openEasyWebMenuFlow=()=>{
  window.easyWebFlowSources=classify(analyzePage());
  const host=document.createElement('div');host.dataset.easywebHost='true';document.body.append(host);openEasyMode(host);
};
window.inspectEasyWebMenuFlow=()=>{
  const root=document.querySelector('[data-easyweb-host]')?.shadowRoot;
  if(!root)throw new Error('Menu flow is not open');
  const cards=[...root.querySelectorAll('.card')].map(card=>{
    const label=card.querySelector('.card-source')?.textContent?.replace(/^찾은 메뉴 · /,'')??'';
    const category=card.dataset.category,action=card.tagName==='A'?'navigate':'locate';
    const href=action==='navigate'?card.href:undefined;
    const sources=window.easyWebFlowSources.filter(source=>source.label===label&&source.category===category&&source.action===action&&(action!=='navigate'||source.href===href));
    return {label,category,action,href,target:card.getAttribute('target'),sourceId:sources.length===1?sources[0].element.dataset.evalId??null:null,sourceMatches:sources.length};
  });
  const next=[...root.querySelectorAll('button')].find(button=>button.textContent.trim()==='다른 메뉴 보기');
  return {cards,nextAvailable:!!next&&!next.disabled&&next.getAttribute('aria-disabled')!=='true'&&!!next.getClientRects().length,stale:root.querySelector('.change-notice')?.hidden===false,status:root.querySelector('.status')?.textContent??null};
};`, resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', loader: { '.css': 'text' } });
  const text = result.outputFiles[0].text;
  return { text, sha256: createHash('sha256').update(text).digest('hex') };
}

export async function observeMenuFlow(page, cdp, contextId, bundle, target, sourceDestinations, maxPages) {
  const evaluate = async expression => {
    const result = await cdp.send('Runtime.evaluate', { contextId, expression, returnByValue: true });
    if (result.exceptionDetails) throw new Error(`Menu flow evaluation failed: ${result.exceptionDetails.text}`);
    return result.result.value;
  };
  await evaluate(bundle.text);
  await evaluate('window.openEasyWebMenuFlow()');
  const pages = [], selected = [], keys = new Set(), repeated = [], unresolved = [];
  let complete = false;
  for (let index = 0; index < maxPages; index++) {
    const view = JSON.parse(await evaluate('JSON.stringify(window.inspectEasyWebMenuFlow())'));
    if (view.stale) throw new Error('Original source changed during menu flow; refresh is required');
    if (view.cards.length > 6) throw new Error('Menu flow exceeded six visible cards');
    if (!view.cards.length && view.nextAvailable) throw new Error('Empty menu page advertises a next page');
    for (const candidate of view.cards) {
      if (!candidate.sourceId) unresolved.push({ page: index + 1, label: candidate.label, sourceMatches: candidate.sourceMatches });
      const key = candidate.action === 'navigate' ? `url:${candidate.href}` : `source:${candidate.sourceId ?? candidate.label}`;
      if (keys.has(key)) repeated.push({ page: index + 1, key });
      else { keys.add(key); selected.push(candidate); }
    }
    pages.push({ page: index + 1, ...view });
    if (!view.nextAvailable) { complete = true; break; }
    await page.locator('[data-easyweb-host]').getByRole('button', { name: '다른 메뉴 보기', exact: true }).click();
  }
  if (!complete) throw new Error('Menu flow did not terminate within the source-control bound');
  const firstReachedPage = Object.fromEntries(target.expected.map(truth => [truth.id,
    pages.find(view => scorePage({ selected: view.cards }, { ...target, expected: [truth] }, sourceDestinations).matched === 1)?.page ?? null]));
  return { bundleSha256: bundle.sha256,
    scope: 'Actual headless UI page transitions and uniquely source-matched card display. Does not prove installed-extension use, destination/guide activation, business completion, or user study. Original first-screen quality remains separate.',
    completed: complete, pages, unresolvedMappings: unresolved, repeatedCards: repeated,
    firstReachedPage, selected, ...scorePage({ selected }, target, sourceDestinations) };
}
