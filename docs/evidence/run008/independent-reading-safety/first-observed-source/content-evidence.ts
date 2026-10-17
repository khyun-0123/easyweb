import { candidateLabel, isVisible, supplementalEvidence, type SupplementalCache } from './analyzer';
import type { Candidate, ContentEvidence } from './types';

// A caller can share this only within one classification/currentness batch.
// No result from an earlier batch is retained by this module.
export type ContentEvidenceCache = WeakMap<Element, unknown>;
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

function evidence(candidate: Candidate, level: 1 | 2, rule: string, dependencies: Element[], tokens: unknown[] = []): ContentEvidence {
  const nodes = [...new Set([candidate.element, ...dependencies])];
  return { level, rule, dependencies: nodes,
    fingerprint: JSON.stringify([rule, level, location.origin, location.pathname, candidate.label, candidate.action, tokens,
      nodes.map(node => [node.tagName, ...['class','role','aria-current','aria-selected','aria-expanded','aria-hidden','hidden']
        .map(name => node.getAttribute(name)), node instanceof HTMLElement && node.matches(headings) ? fixedHeading(node)
        : node instanceof HTMLElement && node.matches('a[href],button') ? candidateLabel(node) : '',
        node instanceof HTMLElement && node.matches('a[href]') ? currentDocument(node) : null])]),
  };
}

// This is relevance evidence for a candidate the shared classifier has already
// accepted. It never invents a category, changes score/action/href or revives a
// rejected control. All DOM relationships are re-established on every call.
export function contentEvidence(candidate: Candidate, _cache?: ContentEvidenceCache, supplementalCache?: SupplementalCache): ContentEvidence | undefined {
  const element = candidate.element;
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
      [prep?.preparationAttachmentNodes ?? [], supplement?.relatedLabel ?? '']);
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
        [list, active!, active!.parentElement!, ...documents, ...documents.map(peer => peer.parentElement!), ...relation]);
    }
  }
  if (institution?.contentScope === 'content') return evidence(candidate, 1, 'institution-current-content',
    [...institution.dependencies], [institution.version, institution.fingerprint]);
}
