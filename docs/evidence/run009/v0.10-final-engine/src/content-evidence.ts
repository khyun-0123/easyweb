import { candidateLabel, isVisible, isSearchControl, supplementalEvidence, type SupplementalCache } from './analyzer';
import type { Candidate, ContentEvidence } from './types';
import { evidenceNodes } from './evidence-nodes';

// A caller can share this only within one classification/currentness batch.
// No result from an earlier batch is retained by this module.
interface SearchRelation { dependencies: Element[]; group: HTMLFormElement }
interface ContentCacheEntry { nodeFacts?: unknown[]; searchRelation?: SearchRelation | null }
export type ContentEvidenceCache = WeakMap<Element, ContentCacheEntry>;
const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false" i]),[role~="textbox" i],[role~="searchbox" i],[role~="combobox" i],[role~="spinbutton" i],[role~="slider" i]';
const excluded = 'header,footer,nav,aside,article,[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i],[role~="complementary" i],[role~="article" i]';
const form = 'form,[role~="form" i]';
const lists = 'ul,ol,[role~="list" i],[role~="tablist" i]';
const headings = 'h1,h2,h3,h4,h5,h6,[role~="heading" i]';
const documentKind = /안내서|안내\s*책자|책자|편람|설명서|매뉴얼|자료집|지침서|핸드북|요람|\b(?:handbook|manual|guide|documents?)\b/i;
const normalize = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim();
const dangerous = /로그아웃|탈퇴|삭제|결제|납부|구매|최종\s*제출|\b(?:log[\s_-]*out|sign[\s_-]*out|delete|remove|unregister|withdraw|pay|payment|checkout|purchase|final[\s_-]*submit|submit[\s_-]*final)\b/i;

function utility(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element, depth = 0; node && depth < 8; node = node.parentElement, depth++) {
    const metadata = `${node.getAttribute('class') ?? ''} ${node.getAttribute('id') ?? ''}`;
    if (/(?:^|[\s_-])(?:breadcrumbs?|skip(?:links?|nav|navigation)?)(?:[\s_-]|$)/i.test(metadata)
      || /breadcrumb|이동\s*경로/i.test(node.getAttribute('aria-label') ?? '')) return true;
  }
  return false;
}

function currentDocument(element: HTMLElement): boolean {
  const raw = element.getAttribute('href')?.trim();
  if (!raw || /^(?:javascript:|data:)/i.test(raw)) return false;
  try {
    const url = new URL(raw, document.baseURI);
    return /^https?:$/.test(url.protocol) && url.origin === location.origin
      && url.pathname === location.pathname && url.search === location.search;
  } catch { return false; }
}

function selected(element: HTMLElement): boolean {
  return [element, element.parentElement].some(node => !!node && (
    /^(?:page|true)$/i.test(node.getAttribute('aria-current') ?? '')
    || /^true$/i.test(node.getAttribute('aria-selected') ?? '')
    || /(?:^|\s)(?:active|selected|current|is-active)(?:\s|$)/i.test(node.getAttribute('class') ?? '')));
}

function listControls(list: HTMLElement): HTMLElement[] {
  if (list.childElementCount < 2 || list.childElementCount > 12) return [];
  return [...list.querySelectorAll<HTMLElement>(':scope > li > a[href],:scope > [role~="listitem" i] > a[href]')]
    .filter(node => !node.closest(`${excluded},${form},${editable}`) && !!candidateLabel(node)
      && !node.matches('[onclick],[aria-expanded],[aria-haspopup]') && !dangerous.test(candidateLabel(node))
      && safeReadingURL(node));
}

function safeReadingURL(element: HTMLElement): boolean {
  try {
    const url = new URL(element.getAttribute('href') ?? '', document.baseURI);
    if (!/^https?:$/.test(url.protocol)) return false;
    const parts = url.pathname.split('/').map(part => { try { return decodeURIComponent(part); } catch { return part; } });
    if (parts.some(part => dangerous.test(part.replace(/[_.-]/g, ' ')))) return false;
    for (const [key, value] of url.searchParams) {
      if (/^(?:logout|signout|delete|remove|payment|checkout|final_submit)$/i.test(key)
        || /^(?:action|cmd|command|mode|task|event|method|operation|do)$/i.test(key)
          && (dangerous.test(value) || /^submit$/i.test(value))) return false;
    }
    return true;
  } catch { return false; }
}

function currentSelection(controls: HTMLElement[]): HTMLElement | undefined {
  const active = controls.filter(selected);
  return active.length === 1 && currentDocument(active[0]) ? active[0] : undefined;
}

function localLists(container: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  const pending = [...container.children].reverse();
  let visited = 0;
  while (pending.length && visited++ < 80) {
    const node = pending.pop()!;
    if (!(node instanceof HTMLElement) || node.matches(`${excluded},${form},${editable},section,[role~="region" i]`)) continue;
    if (node.matches(lists)) { result.push(node); continue; }
    pending.push(...[...node.children].reverse());
  }
  return pending.length ? [] : result;
}

function fixedHeading(element: HTMLElement): string {
  return element.matches(headings) && !element.closest(`${editable},${excluded},${form}`)
    && !element.hasAttribute('aria-labelledby') ? normalize(candidateLabel(element)) : '';
}

function documentRelation(list: HTMLElement, active: HTMLElement): HTMLElement[] | undefined {
  const name = normalize(candidateLabel(active));
  const main = list.closest<HTMLElement>('main,[role~="main" i]');
  if (main) {
    // Only the same local section's preceding editorial heading may name the
    // selected topic. Do not borrow another section's or a distant title.
    const region = list.closest<HTMLElement>('section,[role~="region" i]') ?? main;
    if (region.childElementCount <= 12) {
      const titles = [...region.children].filter((node): node is HTMLElement => node instanceof HTMLElement
        && fixedHeading(node) === name && !!(node.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING));
      if (titles.length === 1) return [main, region, titles[0]];
    }
  }
  // Some editorial pages use two adjacent levels of topic lists in layout
  // divs. A selected parent topic and an actual following content section,
  // together, distinguish the subordinate document group from a sidebar.
  for (let container = list.parentElement, depth = 0; container && depth < 4; container = container.parentElement, depth++) {
    if (container.matches(`html,body,${excluded},${form},${editable}`) || container.childElementCount > 12) break;
    const content = container.nextElementSibling;
    if (!(content instanceof HTMLElement) || !content.matches('section,[role~="region" i]')
      || content.closest(`${excluded},${form},${editable}`)) continue;
    const parents = localLists(container).filter(peer => peer !== list
      && !!(peer.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING))
      .map(peer => ({ list: peer, controls: listControls(peer) }))
      .map(peer => ({ ...peer, active: currentSelection(peer.controls) })).filter(peer => !!peer.active);
    if (parents.length === 1) return [container, content, parents[0].list, parents[0].active!, parents[0].active!.parentElement!];
  }
}

function evidence(candidate: Candidate, level: 1 | 2, rule: string, dependencies: Element[], tokens: unknown[] = [], cache?: ContentEvidenceCache): ContentEvidence | undefined {
  const nodes = evidenceNodes([candidate.element, ...dependencies]);
  if (!nodes) return;
  return { level, rule, dependencies: nodes,
    fingerprint: JSON.stringify([rule, level, location.origin, location.pathname, candidate.label, candidate.action, tokens,
      nodes.map(node => {
        const previous = cache?.get(node);
        if (previous?.nodeFacts) return previous.nodeFacts;
        const nodeFacts = [node.tagName, ...['class','role','aria-current','aria-selected','aria-expanded','aria-hidden','hidden']
          .map(name => node.getAttribute(name)), node instanceof HTMLElement && node.matches(headings) ? fixedHeading(node)
          : node instanceof HTMLElement && node.matches('a[href],button') ? candidateLabel(node) : '',
          node instanceof HTMLElement && node.matches('a[href]') ? currentDocument(node) : null];
        cache?.set(node, { ...previous, nodeFacts });
        return nodeFacts;
      })]),
  };
}


// A query field and its submit button are one local purpose. Only fixed names,
// query-form ownership and the adjacent authored content structure are inspected.
// No field state, selected option or private editor subtree is read.
function sameContentSearch(candidate: Candidate, cache?: ContentEvidenceCache): SearchRelation | undefined {
  const element = candidate.element;
  if (candidate.category !== 'search' || candidate.pageTask !== 'control' || candidate.context !== 'body'
    || candidate.action !== 'locate' || element.closest(excluded)) return;
  const owner = element instanceof HTMLInputElement || element instanceof HTMLButtonElement ? element.form : null;
  if (!(owner instanceof HTMLFormElement) || !owner.contains(element) || !['get','post'].includes(owner.method.toLowerCase())
    || owner.closest(excluded) || dangerous.test((owner.getAttribute('onsubmit') ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')) || !(element instanceof HTMLInputElement && ['text','search'].includes(element.type)
      || (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && ['button','submit'].includes(element.type) && /^(?:검색|search)$/i.test(candidate.label))
    || owner.querySelector('[contenteditable]:not([contenteditable="false" i]),textarea,[role~="textbox" i],[role~="searchbox" i]')) return;
  const old = cache?.get(owner);
  if (old?.searchRelation !== undefined) return old.searchRelation ?? undefined;
  const compute = (): SearchRelation | undefined => {
    try {
      const action = new URL(owner.getAttribute('action') || location.href, document.baseURI);
      if (action.origin !== location.origin || action.pathname !== location.pathname || action.pathname.split('/').some(part => {
        try { return dangerous.test(decodeURIComponent(part).replace(/[_.-]/g, ' ')); } catch { return true; }
      })) return;
      for (const key of action.searchParams.keys()) if (/^(?:logout|signout|delete|remove|payment|checkout|final_submit)$/i.test(key)
        || /^(?:action|cmd|command|mode|task|operation)$/i.test(key)
        && action.searchParams.getAll(key).some(value => dangerous.test(value) || /^submit$/i.test(value))) return;
    } catch { return; }
    const inputs = [...owner.querySelectorAll<HTMLInputElement>('input:not([type="hidden" i])')];
    if (inputs.some(node => !['text','search','button','submit'].includes(node.type))) return;
    const fields = inputs.filter(node => ['text','search'].includes(node.type));
    if (fields.length !== 1 || !isVisible(fields[0]) || !isSearchControl(fields[0], candidateLabel(fields[0]))) return;
    const buttons = [...owner.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button,input[type="button" i],input[type="submit" i]')];
    const submits = buttons.filter(node => ['button','submit'].includes(node.type) && isVisible(node) && /^(?:검색|search)$/i.test(candidateLabel(node)));
    // POST is eligible only for an explicitly named non-submit query button;
    // a default/final form submit never obtains this new relevance evidence.
    if (submits.length !== 1 || owner.method.toLowerCase() === 'post' && submits[0].type !== 'button'
      || buttons.some(node => dangerous.test(candidateLabel(node)))) return;
    if (element !== fields[0] && element !== submits[0]) return;
    const legends = [...owner.querySelectorAll<HTMLElement>('legend')].filter(node => /검색|search/i.test(candidateLabel(node)));
    for (let region = owner.parentElement, depth = 0; region && depth < 3; region = region.parentElement, depth++) {
      if (region.matches(`html,body,${excluded},${form}`) || region.childElementCount > 16) break;
      let titles = [...region.children].filter((node): node is HTMLElement => node instanceof HTMLElement
        && !!fixedHeading(node) && /게시판|목록|자료|증명|서비스|board|catalog|services?/i.test(fixedHeading(node))
        && !!(node.compareDocumentPosition(owner) & Node.DOCUMENT_POSITION_FOLLOWING));
      const contextNodes: HTMLElement[] = [];
      if (!titles.length && legends.length) {
        const groups = [...region.children].filter((node): node is HTMLElement => node instanceof HTMLElement
          && node.matches('ul,ol,[role~="tablist" i]') && node.childElementCount >= 2 && node.childElementCount <= 12
          && !!(node.compareDocumentPosition(owner) & Node.DOCUMENT_POSITION_FOLLOWING));
        for (const group of groups) {
          const peers = [...group.querySelectorAll<HTMLElement>(':scope > li > a[href]')];
          const active = peers.filter(selected);
          if (active.length === 1 && normalize(candidateLabel(active[0])) === normalize(candidate.sectionLabel ?? '')
            && !dangerous.test(candidateLabel(active[0]))) {
            titles.push(active[0]);contextNodes.push(group, ...peers);
          }
        }
      }
      const contextName = titles[0]?.matches(headings) ? fixedHeading(titles[0]) : titles[0] ? candidateLabel(titles[0]) : '';
      if (titles.length !== 1 || !legends.length && !/게시판|board/i.test(contextName)) continue;
      const containers: HTMLElement[] = [];
      for (const child of region.children) {
        if (!(child instanceof HTMLElement) || child === owner || child.matches(`${excluded},${form},${editable}`)
          || !(owner.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        if (child.matches('ul,ol,table,[role~="list" i]')) containers.push(child);
        else if (child.childElementCount <= 6) containers.push(...[...child.children].filter((node): node is HTMLElement => node instanceof HTMLElement
          && node.matches('ul,ol,table,[role~="list" i]')));
      }
      const contentLists = containers.filter(list => list.childElementCount >= 2
        && !/(?:^|[\s_-])(?:paging|pagination|pager)(?:[\s_-]|$)/i.test(`${list.getAttribute('class') ?? ''} ${list.getAttribute('id') ?? ''}`)
        && !/페이지\s*(?:이동|탐색)|page\s*navigation/i.test(list.getAttribute('aria-label') ?? ''));
      if (contentLists.length !== 1) continue;
      const list = contentLists[0];
      const rows = list instanceof HTMLTableElement ? list.tBodies[0] : list;
      if (!rows || rows.childElementCount < 2) continue;
      const rowNodes: Element[] = [];
      let count = 0, visited = 0;
      for (let row = rows.firstElementChild; row && visited++ < 12 && count < 2; row = row.nextElementSibling) {
        if (row.querySelector(`${editable},${form}`)) continue;
        const links = [...row.querySelectorAll<HTMLElement>('a[href]')];
        if (!links.length || links.length > 4 || links.some(link => candidateLabel(link).length < 4 || /^\d+$/.test(candidateLabel(link)) || dangerous.test(candidateLabel(link)))) continue;
        rowNodes.push(row, ...links);count++;
      }
      if (count !== 2) continue;
      return { group: owner, dependencies: [owner, region, ...titles, ...contextNodes, ...legends, fields[0], submits[0], ...(fields[0].parentElement ? [fields[0].parentElement] : []), list, rows, ...rowNodes] };
    }
  };
  const result = compute();cache?.set(owner, { ...old, searchRelation: result ?? null });return result;
}

// This is relevance evidence for a candidate the shared classifier has already
// accepted. It never invents a category, changes score/action/href or revives a
// rejected control. All DOM relationships are re-established on every call.
export function contentEvidence(candidate: Candidate, cache?: ContentEvidenceCache, supplementalCache?: SupplementalCache): ContentEvidence | undefined {
  const element = candidate.element;
  if (candidate.category && candidate.score >= 55 && isVisible(element) && candidateLabel(element) === candidate.label) {
    const localSearch = sameContentSearch(candidate, cache);
    if (localSearch) {
      const proof = evidence(candidate, 1, 'same-content-query-form', localSearch.dependencies, [], cache);
      if (proof) return { ...proof, taskGroup: localSearch.group };
    }
  }
  if (!candidate.category || !candidate.pageTask || candidate.score < 55 || candidate.context === 'footer'
    || !isVisible(element) || candidateLabel(element) !== candidate.label || element.closest(`${excluded},${editable}`)
    || utility(element) || !element.matches('a[href],button,[role~="button" i],[role~="tab" i]')) return;
  const supplement = candidate.supplementalDependent ? supplementalEvidence(element, supplementalCache) : undefined;
  const prep = supplement as (typeof supplement & { preparationAttachment?: boolean; preparationAttachmentNodes?: number[] });
  const preparation = element.matches('a[href]') && candidate.action === 'locate' && !!prep?.preparationAttachment;
  if (element.closest(form) && !preparation || element instanceof HTMLButtonElement && !!element.form) return;
  if (preparation) {
    const row = element.closest('tr,li,[role~="row" i],[role~="listitem" i]');
    const table = row?.closest('table,[role~="grid" i]');
    const owner = element.closest(form) ?? row?.parentElement;
    if (row && owner) return evidence(candidate, 2, 'explicit-preparation-attachment', [row, owner, ...(table ? [table] : [])],
      [prep?.preparationAttachmentNodes ?? [], supplement?.relatedLabel ?? ''], cache);
  }
  const institution = candidate.institutionEvidence;
  const panel = institution?.readonlyPanel;
  const row = element.closest('li,[role~="listitem" i]');
  if (!panel && (element.matches('[aria-expanded],[aria-haspopup],[aria-controls]')
    || row?.querySelector(':scope > ul,:scope > ol,:scope > [role~="group" i],:scope > [role~="menu" i]'))) return;
  if (candidate.pageTask === 'reading' && element.matches('a[href]') && documentKind.test(candidate.label)) {
    const list = element.closest<HTMLElement>(lists);
    if (list) {
      const peers = listControls(list);
      const active = currentSelection(peers);
      const documents = peers.filter(peer => documentKind.test(candidateLabel(peer)));
      const relation = active && documents.length >= 2 && peers.includes(element) ? documentRelation(list, active) : undefined;
      if (relation) return evidence(candidate, 2, 'current-topic-document-group',
        [list, active!, active!.parentElement!, ...documents, ...documents.map(peer => peer.parentElement!), ...relation], [], cache);
    }
  }
  if (candidate.relationEvidence?.contentScope === 'content') return evidence(candidate, 1, 'verified-current-content-relation',
    [...candidate.relationEvidence.dependencies], [candidate.relationEvidence.rule, candidate.relationEvidence.category, candidate.relationEvidence.pageTask], cache);
  if (institution?.contentScope === 'content') return evidence(candidate, 1, 'institution-current-content',
    [...institution.dependencies], [institution.version, institution.adapter, institution.rule, institution.category, institution.pageTask, !!institution.readonlyPanel], cache);
}
