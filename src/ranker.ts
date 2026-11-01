import type { Candidate, Category } from './types';
import { supplementalEvidence, type SupplementalCache } from './analyzer';
import { hasDocumentReference } from './classifier';

const MAX_CARDS = 6;
// A focused page can offer a help index, a question and a reading control.
// Positive local content tiers come first; fallback category reservations keep
// alternatives visible while the total remains six cards.
const MAX_PER_CATEGORY = 3;
const MAX_PAGE_TASKS = 3;
const contextOrder = { primary: 0, body: 1, footer: 2 };
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const normalizedLabel = (candidate: Candidate) => candidate.label.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const contentPriority = (candidate: Candidate) => candidate.contentEvidence?.level ?? 0;

function destination(candidate: Candidate): string {
  if (candidate.action !== 'navigate' || !candidate.href) return '';
  try { return new URL(candidate.href).href; }
  catch { return candidate.href; }
}

function isPageTask(candidate: Candidate): boolean {
  return !!candidate.pageTask && candidate.context !== 'footer' && !candidate.element.closest('header, [role~="banner"]');
}

function isLocalNavigation(candidate: Candidate): boolean {
  return candidate.context === 'primary' && !!candidate.element.closest('nav, [role~="navigation"]')
    && !candidate.element.closest('header, [role~="banner"]');
}

function navigationPriority(candidate: Candidate): number {
  if (!isLocalNavigation(candidate) || isPageTask(candidate)) return 0;
  const current = candidate.element.getAttribute('aria-current');
  if (current && current.toLowerCase() !== 'false') return 0;
  if (candidate.href) {
    try {
      const url = new URL(candidate.href);
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return 0;
    } catch { /* A malformed destination cannot add navigation evidence. */ }
  }
  const item = candidate.element.closest('li, [role~="listitem"]');
  const submenu = item?.querySelector(':scope > ul, :scope > ol, :scope > [role~="group"], :scope > [role~="menu"]');
  return submenu || candidate.element.hasAttribute('aria-expanded') ? 1 : 2;
}

function pagePriority(candidate: Candidate): number {
  if (candidate.context === 'footer') return -1;
  if (isPageTask(candidate)) {
    const purposeMatch = candidate.pagePurpose === 'academic-calendar' && candidate.category === 'academic'
      || candidate.pagePurpose === 'help' && candidate.category === 'help';
    return purposeMatch ? 3 : 2;
  }
  // A local contents menu remains distinct from the site's global header.
  return isLocalNavigation(candidate) ? 1 : 0;
}

function sameOriginURL(candidate: Candidate): URL | undefined {
  if (candidate.action !== 'navigate' || !candidate.href) return;
  try {
    const url = new URL(candidate.href);
    return url.origin === location.origin ? url : undefined;
  } catch { return; }
}

// A single post of a board is represented by that board's list link when the
// page offers one and the list is another page. The post stays reachable
// through additional menus. On the board page itself the list link is the
// current page, so it cannot represent anything and the posts are unchanged.
function representedDocuments(candidates: readonly Candidate[]): Set<Candidate> {
  const lists = new Set<string>();
  for (const candidate of candidates) {
    const url = sameOriginURL(candidate);
    if (url && !hasDocumentReference(url) && url.pathname !== location.pathname) lists.add(url.pathname);
  }
  return new Set(candidates.filter(candidate => {
    const url = sameOriginURL(candidate);
    return !!url && candidate.pageTask === 'reading' && hasDocumentReference(url) && lists.has(url.pathname);
  }));
}

const searchField = 'input:not([type]), input[type="text" i], input[type="search" i], [role~="searchbox" i]';
const searchButton = 'button, input[type="submit" i], input[type="button" i], input[type="image" i]';

// A search field and the submit button next to it are one function. The form
// owns them when there is one; otherwise the nearest small container holding
// both. Links are separate functions (advanced search, another catalogue).
function searchGroup(candidate: Candidate): Element | undefined {
  const element = candidate.element;
  const isField = element.matches(searchField), isButton = element.matches(searchButton);
  if (!isField && !isButton) return;
  const owner = element instanceof HTMLInputElement || element instanceof HTMLButtonElement ? element.form : null;
  if (owner) return owner;
  let container: Element | null = element.parentElement;
  for (let depth = 0; container && depth < 3; depth++, container = container.parentElement) {
    if (container.querySelector(isField ? searchButton : searchField)) return container;
  }
}

// The first screen shows one card per function. Repeats stay reachable through
// additional menus: a link to the page being viewed, a second link with the
// same name, category and section, and a search field's own submit button.
// Same-named controls that locate the original stay separate: a row's "조회"
// or another form's "검색" is a different function with the same word.
function firstScreenRepeats(ordered: readonly Candidate[]): Set<Candidate> {
  const here = location.origin + location.pathname + location.search;
  const names = new Set<string>(), searches = new Set<Element>(), repeats = new Set<Candidate>();
  for (const candidate of ordered) {
    const url = sameOriginURL(candidate);
    // A related heading tells same-named row links apart ("상세보기" per row).
    const name = candidate.action === 'navigate'
      ? `${candidate.category}:${normalizedLabel(candidate)}:${candidate.relatedLabel ?? ''}:${candidate.sectionLabel ?? ''}` : undefined;
    const group = candidate.category === 'search' ? searchGroup(candidate) : undefined;
    if (url && url.origin + url.pathname + url.search === here || name && names.has(name) || group && searches.has(group)) {
      repeats.add(candidate);
      continue;
    }
    if (name) names.add(name);
    if (group) searches.add(group);
  }
  return repeats;
}

function sourceOrder(a: Candidate, b: Candidate): number {
  const position = a.element.compareDocumentPosition(b.element);
  return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
}

function compare(a: Candidate, b: Candidate): number {
  return contentPriority(b) - contentPriority(a) || pagePriority(b) - pagePriority(a) || navigationPriority(b) - navigationPriority(a) || b.score - a.score
    || contextOrder[a.context] - contextOrder[b.context]
    || a.label.length - b.label.length || compareText(normalizedLabel(a), normalizedLabel(b))
    || compareText(destination(a), destination(b)) || compareText(a.category ?? '', b.category ?? '')
    || compareText(a.action, b.action) || compareText(a.element.id, b.element.id);
}

function ordered(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort(compare);
  const groups = new Map<Element, Map<string, number[]>>();
  const filterGroups = new Map<Element, Map<Element, Map<string, number[]>>>();
  // Reuse local evidence within this ordering pass only. A later rank or menu
  // traversal must observe current source metadata instead of a retained cache.
  const supplementalCache: SupplementalCache = new WeakMap();
  sorted.forEach((candidate, index) => {
    if (candidate.pageTask === 'reading') {
      const container = candidate.element.closest('ul, ol, table, [role~="list"], [role~="grid"]');
      if (!container) return;
      const key = `${candidate.category}:${contentPriority(candidate)}:${pagePriority(candidate)}:${navigationPriority(candidate)}:${candidate.score}:${candidate.context}:${candidate.pagePurpose ?? ''}`;
      const peers = groups.get(container) ?? new Map<string, number[]>();
      peers.set(key, [...(peers.get(key) ?? []), index]);
      groups.set(container, peers);
    } else if (candidate.category === 'search' && candidate.pageTask === 'control' && candidate.supplementalDependent) {
      const element = candidate.element;
      const container = element.closest('ul, ol, [role~="list" i]');
      const form = element.closest('form, [role~="form" i]')
        ?? (element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.form : null);
      if (!container || !form || !supplementalEvidence(element, supplementalCache).filter) return;
      // Equally supported filters inherit their author's list order rather than
      // favouring a short name. Keep every preceding rank policy tied, and never
      // borrow positions from another form, list, page purpose or score.
      const key = `${candidate.category}:${contentPriority(candidate)}:${pagePriority(candidate)}:${navigationPriority(candidate)}:${candidate.score}:${candidate.context}:${candidate.pagePurpose ?? ''}`;
      const lists = filterGroups.get(form) ?? new Map<Element, Map<string, number[]>>();
      const peers = lists.get(container) ?? new Map<string, number[]>();
      const positions = peers.get(key) ?? [];
      positions.push(index);
      peers.set(key, positions);
      lists.set(container, peers);
      filterGroups.set(form, lists);
    }
  });
  // Apply source order only to a tied group's existing positions. Putting a
  // conditional DOM comparison inside the general comparator creates cycles
  // when another list's lexical order falls between two items in this list.
  const applySourceOrder = (peers: Map<string, number[]>) => {
    for (const positions of peers.values()) {
      const controls = positions.map(index => sorted[index]).sort(sourceOrder);
      positions.forEach((index, offset) => { sorted[index] = controls[offset]; });
    }
  };
  for (const peers of groups.values()) applySourceOrder(peers);
  for (const lists of filterGroups.values()) for (const peers of lists.values()) applySourceOrder(peers);
  return sorted;
}

export function rank(candidates: Candidate[]): Candidate[] {
  // Deduplicate actual destinations and source controls before category policy.
  // Separate locate controls with the same label can perform different tasks.
  const destinations = new Set<string>();
  const controls = new Set<HTMLElement>();
  const categorized = candidates.filter(candidate => candidate.category);
  const represented = representedDocuments(categorized);
  const distinct = ordered(categorized.filter(candidate => !represented.has(candidate))).filter(candidate => {
    const href = destination(candidate);
    if (href) {
      if (destinations.has(href)) return false;
      destinations.add(href);
    } else {
      if (controls.has(candidate.element)) return false;
      controls.add(candidate.element);
    }
    return true;
  });
  const repeats = firstScreenRepeats(distinct);
  const unique = distinct.filter(candidate => !repeats.has(candidate));
  const counts = new Map<Category, number>();
  const selected: Candidate[] = [];
  // Proven content on this page has priority over unrelated global categories.
  // Preserve category diversity among equally supported content, then retain
  // the existing task/diversity/fill policy for whatever space remains.
  for (const level of [2, 1]) {
    const content = unique.filter(candidate => contentPriority(candidate) === level);
    const categories = new Set<Category>();
    const add = (candidate: Candidate) => {
      selected.push(candidate);
      counts.set(candidate.category!, (counts.get(candidate.category!) ?? 0) + 1);
    };
    for (const candidate of content) {
      if (categories.has(candidate.category!)) continue;
      categories.add(candidate.category!);
      add(candidate);
      if (selected.length === MAX_CARDS) return ordered(selected);
    }
    for (const candidate of content) {
      if (selected.includes(candidate) || candidate.contentEvidence?.taskGroup
        && selected.some(item => item.contentEvidence?.taskGroup === candidate.contentEvidence?.taskGroup)) continue;
      add(candidate);
      if (selected.length === MAX_CARDS) return ordered(selected);
    }
  }
  // Reserve bounded space for source-backed tasks on the current page. A mere
  // body keyword does not acquire this evidence. Then retain category diversity.
  for (const candidate of unique) {
    if (selected.length >= MAX_PAGE_TASKS) break;
    if (!candidate.category || selected.includes(candidate) || !isPageTask(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
    counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
    selected.push(candidate);
    if (selected.length === MAX_PAGE_TASKS) break;
  }
  for (const candidate of unique) {
    if (!candidate.category || counts.has(candidate.category)) continue;
    counts.set(candidate.category, 1);
    selected.push(candidate);
    if (selected.length === MAX_CARDS) return ordered(selected);
  }
  for (const candidate of unique) {
    if (!candidate.category || selected.includes(candidate) || (counts.get(candidate.category) ?? 0) >= MAX_PER_CATEGORY) continue;
    counts.set(candidate.category, (counts.get(candidate.category) ?? 0) + 1);
    selected.push(candidate);
    if (selected.length === MAX_CARDS) break;
  }
  // The category cap reserves space while alternatives exist. On a focused
  // page it must not leave usable slots empty and force a needless next page.
  // Diversity and source-backed task selection above still get first choice.
  if (selected.length < MAX_CARDS) for (const candidate of unique) {
    if (selected.includes(candidate)) continue;
    selected.push(candidate);
    if (selected.length === MAX_CARDS) break;
  }
  return ordered(selected);
}

function alreadyShown(selected: readonly Candidate[]): { destinations: Set<string>; controls: Set<HTMLElement> } {
  const destinations = new Set<string>();
  const controls = new Set<HTMLElement>();
  for (const candidate of selected) {
    const href = destination(candidate);
    if (href) destinations.add(href); else controls.add(candidate.element);
  }
  return { destinations, controls };
}

// The first screen keeps rank()'s selection policy. This inexpensive probe only
// decides whether another real, distinct control exists; it does not sort or
// revalidate all hidden controls on initial opening or on observer ticks.
export function hasMoreMenus(candidates: readonly Candidate[], selected: readonly Candidate[]): boolean {
  const shown = alreadyShown(selected);
  return candidates.some(candidate => {
    if (!candidate.category) return false;
    const href = destination(candidate);
    return href ? !shown.destinations.has(href) : !shown.controls.has(candidate.element);
  });
}

// Sorting and overflow traversal start only when the user asks for more. Each
// yielded object retains its original source, action and snapshot. Categories
// no longer discard overflow; the UI bounds each subsequent screen separately.
export function* remainingMenus(candidates: readonly Candidate[], selected: readonly Candidate[]): Generator<Candidate> {
  const shown = alreadyShown(selected);
  for (const candidate of ordered(candidates.filter(candidate => candidate.category))) {
    const href = destination(candidate);
    if (href) {
      if (shown.destinations.has(href)) continue;
      shown.destinations.add(href);
    } else {
      if (shown.controls.has(candidate.element)) continue;
      shown.controls.add(candidate.element);
    }
    yield candidate;
  }
}
