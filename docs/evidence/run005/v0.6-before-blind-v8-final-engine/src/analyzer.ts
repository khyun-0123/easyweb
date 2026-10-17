import type { Candidate, SourceSnapshot, PagePurpose } from './types';
import { sourceAction } from './action-policy';

const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 140);
const editableRoleSelector = ['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider'].map(role => `[role~="${role}" i]`).join(', ');
const editableSelector = `input, textarea, select, [contenteditable]:not([contenteditable="false" i]), ${editableRoleSelector}`;
const headingSelector = ':is(h1,h2,h3,h4,h5,h6,[role~="heading" i])';
const localRegionSelector = 'section, article, aside, [role~="region" i], [role~="article" i], [role~="complementary" i]';
const informationConcept = /(?:행동\s*요령|안전\s*수칙|대처\s*(?:방법|요령)|이용\s*(?:안내|방법)|사용\s*설명서|instructions?|(?:action|safety)\s+tips?)(?:\s*(?:안내|모음))?$/i;
const helpHeading = /^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A|도움말|Help)$/i;
const collectionSelector = 'ul, ol, [role~="list" i], [role~="tablist" i]';
const collectionControlSelector = 'a[href], button, [role~="button" i], [role~="tab" i]';
const collectionExcludedSelector = 'header, footer, article, form, [role~="banner" i], [role~="contentinfo" i], [role~="article" i], [role~="form" i]';
const topicUtility = /^(?:전체|이전|다음|처음|마지막|확인|취소|닫기|뒤로|더\s*보기|바로\s*가기|자세히\s*보기|공유(?:하기)?|인쇄(?:하기)?|프린트|화면\s*(?:확대|축소)|previous|next|first|last|ok|cancel|close|back|more|open|share|print|zoom\s*(?:in|out)|\d+)$/i;
const informationFacet = /(?:특징|종류|조건|기준|절차|방법|제도)(?:\s*안내)?$/;
interface CollectionSummary { peers: number; informationPeer: boolean }
export type CollectionCache = WeakMap<Element, CollectionSummary>;

export function isInformationTopicLabel(label: string): boolean {
  const text = label.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return text.length >= 2 && text.length <= 36 && !/[.!?。？]/.test(text) && !topicUtility.test(text);
}

export function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest('[hidden], [inert], [aria-hidden="true" i], [aria-disabled="true" i]')) return false;
  if (element.closest('[data-easyweb-host], [data-easyweb-notice]')) return false;
  if (!element.getClientRects().length) return false;
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  }
  return !element.matches(':disabled, [aria-disabled="true" i]');
}

function isEditable(element: Element): boolean {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement ||
    element instanceof HTMLElement && element.isContentEditable || element.matches(editableRoleSelector);
}

// innerText/textContent는 자식 편집 제어의 입력 내용까지 읽습니다.
// 텍스트 노드만 순회하며 입력·편집 제어와 스크립트 하위 트리는 건너뜁니다.
function staticText(node: Node): string {
  if (node instanceof Element && (isEditable(node) || node.closest(editableSelector) || node.matches('script, style, noscript, template, [data-easyweb-host]'))) return '';
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue ?? '';
  const parts: string[] = [];
  for (const child of node.childNodes) parts.push(staticText(child));
  return parts.join(' ');
}

export function getSafeLabel(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const label = labelledBy.split(/\s+/).map(id => {
      const target = document.getElementById(id);
      return target ? staticText(target) : '';
    }).join(' ');
    if (clean(label)) return clean(label);
  }
  const label = element.getAttribute('aria-label');
  if (label) return clean(label);
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    const labels = [...(element.labels ?? [])].map(staticText).join(' ');
    if (clean(labels)) return clean(labels);
  }
  const title = clean(element.getAttribute('title') ?? '');
  if (element instanceof HTMLInputElement) {
    // 버튼의 정적 라벨 속성만 사용하고 현재 value 프로퍼티는 읽지 않습니다.
    return ['button', 'submit'].includes(element.type) ? clean(element.getAttribute('value') ?? '') || title : title || clean(element.getAttribute('placeholder') ?? '');
  }
  if (isEditable(element)) return title || clean(element.getAttribute('placeholder') ?? '');
  const text = clean(staticText(element));
  if (text) return text;
  const image = [...element.querySelectorAll('img')].find(img => !img.closest(editableSelector));
  return clean(image?.getAttribute('alt') ?? '') || title;
}

export function candidateLabel(element: HTMLElement): string {
  if (!isVisible(element) || element.parentElement?.closest(editableSelector)) return '';
  if (element.isContentEditable && element.matches('a, button, [role~="button"]')) return '';
  if (element instanceof HTMLInputElement && !['search', 'text', 'submit', 'button'].includes(element.type)) return '';
  const textInput = isEditable(element) && !element.matches('input[type="submit"], input[type="button"]');
  const label = getSafeLabel(element);
  const searchControl = isSearchControl(element, label);
  if (textInput && !searchControl) return '';
  const safe = label || (textInput && searchControl ? '검색' : '');
  return safe.length <= 100 ? safe : '';
}

export function isSearchControl(element: HTMLElement, label = getSafeLabel(element)): boolean {
  const searchCue = (text: string) => /검색|\bsearch\b/i.test(text.normalize('NFKC').replace(/[_-]+/g, ' '));
  const textual = element instanceof HTMLInputElement && ['text', 'search'].includes(element.type)
    || element instanceof HTMLTextAreaElement || element.isContentEditable || element.matches('[role~="textbox" i], [role~="searchbox" i]');
  return textual && (element.matches('input[type="search"], [role~="searchbox" i]') || !!element.closest('[role~="search"], search')
    || searchCue(label) || searchCue(element.getAttribute('placeholder') ?? ''));
}

function headingBelongsTo(heading: HTMLElement, element: HTMLElement): boolean {
  const region = heading.closest(localRegionSelector);
  if (!region || region.contains(element)) return true;
  // A neighbouring section's heading does not describe this section. Preserve
  // an existing title-only section wrapper only when the control has no local
  // semantic region of its own (a common page-title layout).
  if (element.closest(localRegionSelector) || !region.matches('section')) return false;
  const onlyHeading = (node: Node): boolean => {
    if (node === heading) return true;
    if (node.nodeType === Node.TEXT_NODE) return !(node.nodeValue ?? '').trim();
    if (!(node instanceof Element)) return true;
    return node.contains(heading) && [...node.childNodes].every(onlyHeading);
  };
  return onlyHeading(region);
}

interface ContextHeading { element: HTMLElement; label: string; visible: boolean }
export type ContextCache = WeakMap<Element, ContextHeading[]>;

export function contextLabels(element: HTMLElement, cache?: ContextCache): string[] {
  const labels: string[] = [];
  const add = (text: string) => { if (text && text.length <= 60 && !labels.includes(text)) labels.push(text); };
  let parent = element.parentElement;
  for (let level = 0; parent && parent !== document.body && level < 10; level++, parent = parent.parentElement) {
    let headings = cache?.get(parent);
    if (!headings) {
      headings = [...parent.querySelectorAll<HTMLElement>(`:scope > ${headingSelector}, :scope > :is(div,section) > ${headingSelector}, :scope > :is(div,section) > :is(div,section) > ${headingSelector}`)]
        .map(heading => ({ element: heading, label: clean(getSafeLabel(heading)), visible: isVisible(heading) }));
      cache?.set(parent, headings);
    }
    const preceding = headings.filter(({ element: heading, visible }) => {
      let branch = heading;
      while (branch.parentElement && branch.parentElement !== parent) branch = branch.parentElement;
      // 같은 내용 상자 안에서 이미 읽은 하위 표제가 상위 표제를 덮지 않게 합니다.
      if (branch !== heading && branch.contains(element)) return false;
      return !heading.closest('header, nav, footer, [role~="banner"], [role~="navigation"], [role~="contentinfo"]') && visible
        && headingBelongsTo(heading, element) && !!(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    const label = preceding.at(-1);
    if (label) add(label.label);
    // 작은 기능 상자는 제목을 p로 표시하기도 합니다. 가까운 상자의 첫 짧은 문구만 문맥으로 씁니다.
    if (!label && level < 2 && parent.querySelectorAll('a, button, input').length <= 3) {
      const firstParagraph = parent.querySelector<HTMLElement>(':scope > p');
      if (firstParagraph && isVisible(firstParagraph) && (firstParagraph.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        const text = clean(staticText(firstParagraph));
        if (text && text.length <= 40) add(text);
      }
    }
    if (labels.length >= 3) break;
  }
  return labels;
}

export function sectionLabel(element: HTMLElement): string | undefined { return contextLabels(element)[0]; }

export function documentPurpose(): PagePurpose | undefined {
  // 현재 URL의 경로와 명시된 페이지 표제만 분류하며 title·검색 쿼리·입력값은 읽지 않습니다.
  if (/(?:^|[\/_.-])academic[-_]?calendar(?:[\/_.-]|$)/i.test(location.pathname)) return 'academic-calendar';
  if (/(?:^|[\/_.-])(?:faq|qna|qa|help|answerquestions)(?:[\/_.-]|$)/i.test(location.pathname)) return 'help';
  // General semantic words from the endpoint only, never query values. Split
  // camelCase so an opaque route prefix does not conceal an instructions task.
  const words = (location.pathname.split('/').at(-1) ?? '').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if (words.some(word => /^(?:instruction|instructions)$/.test(word))
    || words.some((word, index) => word === 'action' && /^tips?$/.test(words[index + 1] ?? ''))) return 'help';
  const headings = document.querySelectorAll<HTMLElement>(`main > ${headingSelector}, [role~="main"] > ${headingSelector}, .page-title > ${headingSelector}`);
  for (const heading of headings) {
    if (!isVisible(heading)) continue;
    const text = clean(getSafeLabel(heading));
    if (text.length > 60) continue;
    if (/학사\s*일정|academic\s+calendar/i.test(text)) return 'academic-calendar';
    if (helpHeading.test(text) || informationConcept.test(text)) return 'help';
  }
  return undefined;
}

export function pagePurpose(element: HTMLElement, labels = contextLabels(element), common: PagePurpose | null | undefined = documentPurpose()): PagePurpose | undefined {
  if (common) return common;
  if (labels.some(text => helpHeading.test(text) || informationConcept.test(text))) return 'help';
  // 본문 영역 안의 로컬 목차만 확인합니다. 전역 header/footer의 FAQ는 페이지 목적이 아닙니다.
  const region = element.closest('main, [role~="main"], section, [role~="region"]');
  if (region) for (const link of region.querySelectorAll<HTMLElement>(':scope > nav a, :scope > [role~="navigation"] a')) {
    if (!isVisible(link)) continue;
    if (/^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A)$/i.test(clean(staticText(link)))) return 'help';
  }
  return undefined;
}

export function sourceContext(element: HTMLElement): Candidate['context'] {
  return element.closest('footer, [role~="contentinfo"]') ? 'footer' : element.closest('header, nav, [role~="navigation"], [role~="banner"]') ? 'primary' : 'body';
}

// 명시적 질문 표시가 여러 개 있는 같은 목록만 질문 모음의 근거로 사용합니다.
export function isQuestionCollection(element: HTMLElement): boolean {
  const marked = (control: HTMLElement) => !![...control.querySelectorAll<HTMLElement>(':scope > abbr[title]')]
    .find(marker => /^(?:질문|question)$/i.test((marker.getAttribute('title') ?? '').trim()) && isVisible(marker));
  if (!marked(element) || !element.matches('a, button, [role~="button"]') || candidateLabel(element).length < 4) return false;
  const list = element.closest('ul, ol, [role~="list"]');
  if (!list) return false;
  let count = 0;
  for (const row of list.querySelectorAll<HTMLElement>(':scope > li, :scope > [role~="listitem"]')) {
    const control = row.querySelector<HTMLElement>(':scope > a, :scope > button, :scope > [role~="button"]');
    if (control && marked(control) && candidateLabel(control).length >= 4 && ++count >= 2) return true;
  }
  return false;
}

export function collectionEvidence(element: HTMLElement, cache?: CollectionCache) {
  const empty = { kind: undefined as 'list' | 'tabs' | undefined, peers: 0, informationPeer: false, controlled: false, targetExists: false };
  if (element.closest(collectionExcludedSelector)) return empty;
  const container = element.closest(collectionSelector);
  if (!container) return empty;
  const tabs = container.matches('[role~="tablist" i]');
  const row = element.closest('li, [role~="listitem" i]');
  if (!(tabs ? element.matches('[role~="tab" i]') : row?.parentElement === container)) return empty;
  let summary = cache?.get(container);
  if (!summary) {
    const eligible = (peer: HTMLElement) => !peer.closest(collectionExcludedSelector)
      && !((peer instanceof HTMLButtonElement || peer instanceof HTMLInputElement) && peer.form)
      && isInformationTopicLabel(candidateLabel(peer));
    const controls = tabs
      ? [...container.querySelectorAll<HTMLElement>('[role~="tab" i]')].filter(peer => peer.closest(collectionSelector) === container && eligible(peer))
      : [...container.querySelectorAll<HTMLElement>(':scope > li, :scope > [role~="listitem" i]')].flatMap(item => {
        const control = [...item.querySelectorAll<HTMLElement>(collectionControlSelector)]
          .find(peer => peer.closest(collectionSelector) === container && eligible(peer));
        return control ? [control] : [];
      });
    let peers = 0;
    let informationPeer = false;
    let facets = 0;
    for (const peer of controls) {
      const label = candidateLabel(peer);
      if (!label) continue;
      peers = Math.min(2, peers + 1);
      if (label.length <= 40 && (helpHeading.test(label) || informationConcept.test(label))) informationPeer = true;
      if (informationFacet.test(label)) facets++;
    }
    informationPeer ||= facets >= 2;
    summary = { peers, informationPeer };
    cache?.set(container, summary);
  }
  const references = (element.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean);
  const targetExists = references.length > 0 && references.every(id => !!document.getElementById(id));
  const raw = element.getAttribute('href')?.trim() ?? '';
  const controlled = element.matches('button, [role~="button" i], [role~="tab" i]') || targetExists
    || /^#.+|^javascript:\s*\S/i.test(raw) || element.hasAttribute('onclick')
    || /^(?:true|false)$/i.test(element.getAttribute('aria-expanded') ?? '');
  return { kind: tabs ? 'tabs' as const : 'list' as const, ...summary, controlled, targetExists };
}

// Fixed control structure only: never inspect form values or editable text.
// Shared tables/panel groups are scanned once per classification/currentness
// check, rather than once for every control and its derived snapshot.
interface SupplementalSummary {
  columns?: string[];
  materials?: Map<HTMLElement, string | undefined>;
  panels?: Set<HTMLElement>;
  groups?: Set<HTMLElement>;
  topicControls?: HTMLElement[];
  cardControls?: HTMLElement[];
  followingHeadings?: string[];
  wrapperControls?: HTMLElement[];
}
export type SupplementalCache = WeakMap<Element, SupplementalSummary>;
const contentBoundarySelector = 'section,article,aside,nav,form,header,footer,[role~="region" i],[role~="article" i],[role~="complementary" i],[role~="navigation" i],[role~="form" i],[role~="banner" i],[role~="contentinfo" i]';

function withinContentBranch(node: Element, container: Element): boolean {
  const boundary = node.closest(contentBoundarySelector);
  return !boundary || boundary === container || !container.contains(boundary);
}

function fixedHeadingLabels(container: Element): string[] {
  return [...(container instanceof HTMLElement && container.matches(headingSelector) ? [container] : []),
    ...container.querySelectorAll<HTMLElement>(headingSelector)]
    .filter(heading => !heading.closest(`${editableSelector},a,button,[role~="button" i],[role~="tab" i]`)
      && withinContentBranch(heading, container) && isVisible(heading))
    .map(getSafeLabel).filter(text => text.length >= 2 && text.length <= 60);
}

function followingContentHeadings(container: HTMLElement, cache?: SupplementalCache): string[] {
  let branch = container;
  for (let depth = 0; depth <= 3; depth++) {
    const next = branch.nextElementSibling;
    if (next) {
      // The first following branch is the only possible relation. Never skip
      // another section/control to borrow a more convenient distant heading.
      return !next.matches(`${contentBoundarySelector},a,button,[role~="button" i],[role~="tab" i]`)
        && next.childElementCount <= 12 ? fixedHeadingLabels(next) : [];
    }
    const parent = branch.parentElement;
    if (!parent?.matches('div') || parent.matches('[role]') || parent.childElementCount > 12) break;
    const outside = [...parent.children].filter(child => child !== branch);
    if (outside.some(child => child.matches(contentBoundarySelector) || child.querySelector(contentBoundarySelector)
      || child.matches(editableSelector) || child.querySelector(editableSelector))) break;
    let summary = cache?.get(parent);
    if (!summary?.wrapperControls) {
      summary = { ...summary, wrapperControls: [...parent.querySelectorAll<HTMLElement>(collectionControlSelector)] };
      cache?.set(parent, summary);
    }
    if (summary.wrapperControls!.some(control => !branch.contains(control))) break;
    branch = parent;
  }
  return [];
}

function cardTitle(element: HTMLElement, cache?: SupplementalCache): { title?: string; relatedLabel?: string } {
  if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby')) return {};
  const fixedTitles = (container: Element) => [...container.querySelectorAll<HTMLElement>(`${headingSelector},strong,b`)]
    .filter(node => !node.closest(editableSelector) && withinContentBranch(node, container) && isVisible(node))
    .filter(node => !node.parentElement?.closest(`${headingSelector},strong,b`))
    .map(node => ({ node, label: clean(staticText(node)) }))
    .filter(({ label }) => isInformationTopicLabel(label));
  // A single fixed title may be wrapped in layout divs, followed by dates,
  // locations or a description. Do not infer a title from arbitrary prose.
  const titles = fixedTitles(element);
  if (titles.length === 1 && !element.querySelector(collectionControlSelector)) {
    const { node, label } = titles[0];
    const description = [...element.querySelectorAll<HTMLElement>('p,div,dl,ul')].some(block => !block.contains(node)
      && !block.closest(editableSelector) && isVisible(block) && !!clean(staticText(block))
      && !!(node.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (description) return { title: label };
  }
  if (!/^(?:더\s*보기|자세히\s*보기|상세\s*보기|more|read\s*more|details?|view\s*details?)$/i.test(candidateLabel(element))) return {};
  // A generic detail control can borrow a sibling title only from a bounded
  // single-control card. Stop before a page/semantic region can become a card.
  for (let parent = element.parentElement, depth = 0; parent && depth < 3; depth++, parent = parent.parentElement) {
    if (parent.matches(`html,body,main,[role~="main" i],${contentBoundarySelector}`) || parent.childElementCount > 12) break;
    let summary = cache?.get(parent);
    if (!summary?.cardControls) {
      summary = { ...summary, cardControls: [...parent.querySelectorAll<HTMLElement>(collectionControlSelector)]
        .filter(control => !!candidateLabel(control)) };
      cache?.set(parent, summary);
    }
    if (summary.cardControls!.length !== 1 || summary.cardControls![0] !== element) break;
    const neighbours = fixedTitles(parent).filter(({ node }) => !element.contains(node)
      && !!(node.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
    if (neighbours.length === 1) return { title: neighbours[0].label, relatedLabel: neighbours[0].label };
  }
  return {};
}

function topicEvidence(element: HTMLElement, cache?: SupplementalCache) {
  const empty = { topicPeers: 0, controlledTopic: false, linkedTopic: false, associatedHeadings: [] as string[],
    collectionPeers: [] as { label: string; action: 'locate' | 'navigate'; href?: string; isLink: boolean }[] };
  if (!isInformationTopicLabel(candidateLabel(element))) return empty;
  const references = (control: HTMLElement) => (control.getAttribute('aria-controls') ?? '').split(/\s+/).filter(Boolean);
  const contentTarget = (control: HTMLElement, id: string): HTMLElement | undefined => {
    const target = document.getElementById(id);
    if (!target || target === control || target.closest(editableSelector)
      || target.matches('html,body,main,[role~="main" i],a,button,[role~="button" i],[role~="tab" i]')
      || target.closest('article,aside,form,header,footer,nav,[role~="article" i],[role~="complementary" i],[role~="form" i],[role~="banner" i],[role~="contentinfo" i],[role~="navigation" i]')
      || target.closest('main,[role~="main" i]') !== control.closest('main,[role~="main" i]')) return;
    return target;
  };
  const controlsTarget = (control: HTMLElement) => { const ids = references(control); return ids.length > 0 && ids.every(id => !!contentTarget(control, id)); };
  const expanded = (control: HTMLElement) => /^(?:true|false)$/i.test(control.getAttribute('aria-expanded') ?? '');
  const semanticCollection = element.closest(collectionSelector);
  let container: HTMLElement | null = semanticCollection as HTMLElement | null;
  if (!container) {
    container = element.parentElement;
    if (container?.matches('[role~="group" i]') && container.parentElement) container = container.parentElement;
  }
  if (!container || container.matches('body,main,section,article,form,header,footer') || container.childElementCount > 24) return empty;
  let summary = cache?.get(container);
  if (!summary?.topicControls) {
    const controls = [...container.querySelectorAll<HTMLElement>(collectionControlSelector)].filter(control =>
      !control.closest(collectionExcludedSelector) && !(control instanceof HTMLButtonElement && control.form)
      && isInformationTopicLabel(candidateLabel(control)) && (semanticCollection
        ? control.closest(collectionSelector) === container
        : control.parentElement === container || control.parentElement?.parentElement === container));
    summary = { ...summary, topicControls: controls }; cache?.set(container, summary);
  }
  const controls = summary.topicControls!;
  if (controls.length < 2 || controls.length > 12 || !controls.includes(element)) return empty;
  // Only the immediately following content branch of the same local container
  // can describe a list. A neighbouring section's heading is not evidence.
  if (!summary.followingHeadings) {
    const headings = followingContentHeadings(container, cache);
    summary = { ...summary, followingHeadings: headings }; cache?.set(container, summary);
  }
  const associatedHeadings = [...summary.followingHeadings!];
  for (const id of references(element)) {
    const target = contentTarget(element, id);
    if (target && target.childElementCount <= 24) {
      for (const label of fixedHeadingLabels(target)) if (!associatedHeadings.includes(label)) associatedHeadings.push(label);
    }
  }
  const controlledTopic = controlsTarget(element) && controls.filter(controlsTarget).length >= 2
    || expanded(element) && controls.filter(expanded).length >= 2
    || element.matches('[role~="tab" i]') && !!semanticCollection?.matches('[role~="tablist" i]')
    || !!element.closest('[role~="group" i]') && controls.every(control => !!control.closest('[role~="group" i]'));
  const linkedTopic = controlsTarget(element) || element.matches('[role~="tab" i]') && !!semanticCollection?.matches('[role~="tablist" i]');
  // A readonly semantic collection can supply peer meaning independently of
  // a nearby heading. Keep fixed names/actions/destinations in the snapshot so
  // a peer's replacement cannot silently preserve an obsolete interpretation.
  const localParent = container.parentElement;
  const outsideCollection = localParent?.matches('div') ? [...localParent.children].filter(child => child !== container) : [];
  const isolatedCollection = !outsideCollection.some(child => child.matches(`${contentBoundarySelector},${editableSelector},${collectionControlSelector}`)
    || child.querySelector(`${contentBoundarySelector},${editableSelector},${collectionControlSelector}`));
  const collectionPeers = semanticCollection && isolatedCollection && !container.querySelector(`form,[role~="form" i],${editableSelector}`)
    ? controls.map(control => ({ label: candidateLabel(control), ...sourceAction(control, candidateLabel(control)), isLink: control.matches('a[href]') })) : [];
  return { topicPeers: Math.min(controls.length, 2), controlledTopic, linkedTopic, associatedHeadings, collectionPeers };
}

export function supplementalEvidence(element: HTMLElement, cache?: SupplementalCache) {
  const bodyControl = !element.closest('header, footer, article, [role~="banner" i], [role~="contentinfo" i], [role~="article" i]');
  const form = element.closest('form, [role~="form" i]')
    ?? (element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? element.form : null);
  const metadataWords = (text: string) => text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const searchMetadata = (target: Element) => ['id', 'class'].some(name => metadataWords(target.getAttribute(name) ?? '').includes('search'))
    || /검색|\bsearch\b/i.test(target.getAttribute('aria-label') ?? '');
  const filter = bodyControl && !!form && searchMetadata(form) && searchMetadata(element)
    && !!element.closest('li, [role~="listitem" i]') && element.matches('a[href], button[type="button"], [role~="button" i]');
  let title: string | undefined;
  let cardRelatedLabel: string | undefined;
  // A title preceding a paragraph is an explicit card title/description split.
  // Respect an authored accessible-name override instead of second-guessing it.
  if (bodyControl && !form && !element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')
    && element.matches('a, button, [role~="button" i]')) {
    const children = [...element.children];
    const paragraph = children.findIndex(child => child.matches('p'));
    if (paragraph === 1 && children[0] instanceof HTMLElement && children[0].matches('span, strong, b, em, h2, h3, h4, h5, h6')
      && isVisible(children[0]) && isVisible(children[1] as HTMLElement)) {
      const text = clean(staticText(children[0]));
      if (isInformationTopicLabel(text) && clean(staticText(children[1]))) title = text;
    }
    if (!title) ({ title, relatedLabel: cardRelatedLabel } = cardTitle(element, cache));
  }
  let materialRow = false;
  let relatedLabel: string | undefined = cardRelatedLabel;
  const row = bodyControl && !form ? element.closest('tr, [role~="row" i]') : null;
  const table = row?.closest('table, [role~="grid" i]');
  if (row && table) {
    let rowSummary = cache?.get(row);
    if (!rowSummary?.materials) {
      let tableSummary = cache?.get(table);
      if (!tableSummary?.columns) {
        const columns = [...table.querySelectorAll<HTMLElement>('thead th, [role~="columnheader" i]')]
          .filter(header => header.closest('table, [role~="grid" i]') === table)
          .map(header => isVisible(header) ? clean(staticText(header)) : '');
        tableSummary = { ...tableSummary, columns }; cache?.set(table, tableSummary);
      }
      const titleColumn = (text: string) => /^(?:제목|민원명|사무명|서식명|title|form\s+name)$/i.test(text);
      const attachmentColumn = (text: string) => /^(?:첨부|서식|첨부파일|attachment|forms?)$/i.test(text);
      const download = (control: HTMLElement) => /^(?:자료\s*받기|다운로드|서식\s*받기|download)$/i.test(candidateLabel(control));
      const cells = [...row.querySelectorAll<HTMLElement>(':scope > td, :scope > th, :scope > [role~="cell" i], :scope > [role~="gridcell" i]')];
      const controls = [...row.querySelectorAll<HTMLElement>('a[href], button, [role~="button" i]')]
        .filter(control => control.closest('tr, [role~="row" i]') === row && !!candidateLabel(control));
      const columns = tableSummary.columns!;
      const materials = new Map<HTMLElement, string | undefined>();
      if (columns.some(titleColumn) && columns.some(attachmentColumn)) {
        if (cells.length === columns.length) {
          const titles = cells.flatMap((cell, index) => titleColumn(columns[index])
            ? controls.filter(control => control.matches('a[href]') && cell.contains(control)).slice(0, 1) : []);
          const attachments = controls.filter(control => cells.some((cell, index) => attachmentColumn(columns[index]) && cell.contains(control)) && download(control));
          if (titles.length && attachments.length) {
            const labels = [...new Set(titles.map(candidateLabel))];
            titles.forEach(control => materials.set(control, candidateLabel(control)));
            // Multiple different title columns do not identify one attachment
            // subject. Keep that relationship unresolved rather than invent it.
            attachments.forEach(control => materials.set(control, labels.length === 1 ? labels[0] : undefined));
          }
        }
      }
      rowSummary = { ...rowSummary, materials }; cache?.set(row, rowSummary);
    }
    materialRow = rowSummary.materials!.has(element);
    relatedLabel = rowSummary.materials!.get(element);
  }
  let informationPanels = false;
  if (bodyControl && !form && element.matches('button, [role~="button" i]') && /^(?:true|false)$/i.test(element.getAttribute('aria-expanded') ?? '')) {
    const parent = element.parentElement;
    if (!parent) return { filter, title, materialRow, relatedLabel, informationPanels: false, grouped: false,
      topicPeers: 0, controlledTopic: false, linkedTopic: false, associatedHeadings: [] as string[], collectionPeers: [] };
    let summary = cache?.get(parent);
    if (!summary?.panels) {
      const controls = [...parent.children].filter((child): child is HTMLElement => child instanceof HTMLElement
        && child.matches('button, [role~="button" i]') && /^(?:true|false)$/i.test(child.getAttribute('aria-expanded') ?? '')
        && !(child instanceof HTMLButtonElement && child.form) && isInformationTopicLabel(candidateLabel(child)));
      const panels = controls.length >= 2 && controls.filter(control => /(?:안내|절차|방법|예시|기준|종류)$/.test(candidateLabel(control))).length >= 2
        ? new Set(controls) : new Set<HTMLElement>();
      summary = { ...summary, panels }; cache?.set(parent, summary);
    }
    informationPanels = summary.panels!.has(element);
  }
  let grouped = false;
  const group = bodyControl && !form ? element.closest('[role~="group" i]') : null;
  const parent = group?.parentElement;
  if (parent) {
    let summary = cache?.get(parent);
    if (!summary?.groups) {
      const controls = [...parent.children].filter(child => child.matches('[role~="group" i]')).flatMap(child => {
        const groupControls = [...child.querySelectorAll<HTMLElement>('a[href], button, [role~="button" i]')]
          .filter(control => !control.closest('form, [role~="form" i]') && !(control instanceof HTMLButtonElement && control.form) && !!candidateLabel(control));
        return groupControls.length === 1 ? groupControls : [];
      });
      summary = { ...summary, groups: controls.length >= 2 ? new Set(controls) : new Set<HTMLElement>() }; cache?.set(parent, summary);
    }
    grouped = summary.groups!.has(element);
  }
  const topics = bodyControl && !form ? topicEvidence(element, cache)
    : { topicPeers: 0, controlledTopic: false, linkedTopic: false, associatedHeadings: [] as string[], collectionPeers: [] };
  return { filter, title, materialRow, relatedLabel, informationPanels, grouped, ...topics };
}

export function sourceSnapshot(element: HTMLElement, safeLabel = candidateLabel(element), collectionCache?: CollectionCache, includeCollection = false, includeSupplemental = false, supplementalCache?: SupplementalCache): SourceSnapshot {
  return {
    pageUrl: location.href,
    baseUrl: document.baseURI,
    attributes: JSON.stringify([
      ...['href', 'target', 'onclick', 'aria-controls', 'aria-current', 'aria-expanded', 'download', 'type', 'form', 'role', 'title', 'placeholder', 'contenteditable'].map(name => element.getAttribute(name)),
      element instanceof HTMLButtonElement || element instanceof HTMLInputElement ? [element.type, !!element.form] : null,
      document.querySelector('base[target]')?.getAttribute('target'),
      [...element.querySelectorAll<HTMLElement>(':scope > abbr')].map(marker => [marker.getAttribute('title'), isVisible(marker)]),
      !!element.closest('table, [role~="grid"]'),
      !!element.closest('tr, [role~="row"]'),
      !!element.closest('li, [role~="listitem"]'),
      !!element.closest('ol'),
      !!element.closest('dt'),
      !!element.closest('dl'),
      element.closest('dt')?.getAttribute('title'),
      !!element.closest('header, [role~="banner"]'),
      !!element.closest('nav, [role~="navigation"]'),
      !!element.closest('li, [role~="listitem"]')?.querySelector(':scope > ul, :scope > ol, :scope > [role~="group"], :scope > [role~="menu"]'),
      !!element.closest('article, [role~="article"]'),
      isQuestionCollection(element),
      includeCollection ? collectionEvidence(element, collectionCache) : null,
      includeSupplemental ? supplementalEvidence(element, supplementalCache) : null,
      !!element.closest('form, [role~="form" i]'),
      sourceAction(element, safeLabel),
    ]),
  };
}

export function analyzePage(): Candidate[] {
  const commonPurpose = documentPurpose();
  const contextCache: ContextCache = new WeakMap();
  const selector = 'a[href], button, [role~="button"], [role~="tab" i], input[type="submit"], input[type="button"], input[type="search"], input[type="text"], input:not([type]), [role~="searchbox"], [role~="textbox"], textarea';
  const elements = document.querySelectorAll<HTMLElement>(selector + (commonPurpose === 'academic-calendar' ? ', table a:not([href]), [role~="grid"] a:not([href])' : ''));
  const candidates: Candidate[] = [];
  for (const element of elements) {
    const label = candidateLabel(element);
    if (!label) continue;
    const { href, action, target } = sourceAction(element, label);
    let destinationHost: string | undefined;
    let opensNewWindow: boolean | undefined;
    if (element instanceof HTMLAnchorElement) {
      try {
        const raw = element.getAttribute('href')?.trim();
        if (raw && !raw.startsWith('#')) {
          const destination = new URL(raw, document.baseURI);
          if (/^https?:$/.test(destination.protocol)) {
            destinationHost = destination.hostname;
            const originalTarget = (element.getAttribute('target') ?? document.querySelector('base[target]')?.getAttribute('target') ?? '_self').toLowerCase();
            opensNewWindow = !['_self', '_top', '_parent', ''].includes(originalTarget);
          }
        }
      } catch { /* 해석할 수 없는 링크는 원본에서 확인합니다. */ }
    }
    const labels = contextLabels(element, contextCache);
    candidates.push({
      element, label, href, action, target,
      destinationHost, opensNewWindow,
      context: sourceContext(element),
      score: 0, reasons: [],
      snapshot: sourceSnapshot(element, label),
      sectionLabel: labels[0], contextLabels: labels, pagePurpose: pagePurpose(element, labels, commonPurpose ?? null),
    });
  }
  return candidates;
}
