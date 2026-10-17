import type { Candidate, SourceSnapshot, PagePurpose } from './types';
import { sourceAction } from './action-policy';

const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 140);
const editableRoleSelector = ['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider'].map(role => `[role~="${role}" i]`).join(', ');
const editableSelector = `input, textarea, select, [contenteditable]:not([contenteditable="false" i]), ${editableRoleSelector}`;

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

export function contextLabels(element: HTMLElement): string[] {
  const labels: string[] = [];
  const add = (text: string) => { if (text && text.length <= 60 && !labels.includes(text)) labels.push(text); };
  let parent = element.parentElement;
  for (let level = 0; parent && parent !== document.body && level < 10; level++, parent = parent.parentElement) {
    const headings = [...parent.querySelectorAll<HTMLElement>(':scope > :is(h1,h2,h3), :scope > :is(div,section) > :is(h1,h2,h3), :scope > :is(div,section) > :is(div,section) > :is(h1,h2,h3)')];
    const preceding = headings.filter(heading => {
      let branch = heading;
      while (branch.parentElement && branch.parentElement !== parent) branch = branch.parentElement;
      // 같은 내용 상자 안에서 이미 읽은 하위 표제가 상위 표제를 덮지 않게 합니다.
      if (branch !== heading && branch.contains(element)) return false;
      return !heading.closest('header, nav, footer, [role~="banner"], [role~="navigation"], [role~="contentinfo"]') && isVisible(heading) && !!(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    const label = preceding.at(-1);
    if (label) {
      const text = clean(staticText(label));
      add(text);
    }
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

function documentPurpose(): PagePurpose | undefined {
  // 현재 URL의 경로와 명시된 페이지 표제만 분류하며 title·검색 쿼리·입력값은 읽지 않습니다.
  if (/(?:^|[\/_.-])academic[-_]?calendar(?:[\/_.-]|$)/i.test(location.pathname)) return 'academic-calendar';
  if (/(?:^|[\/_.-])(?:faq|qna|qa|help|answerquestions)(?:[\/_.-]|$)/i.test(location.pathname)) return 'help';
  const headings = document.querySelectorAll<HTMLElement>('main > h1, [role~="main"] > h1, .page-title > h1, .page-title > h2, .page-title > h3');
  for (const heading of headings) {
    if (!isVisible(heading)) continue;
    const text = clean(staticText(heading));
    if (text.length > 60) continue;
    if (/학사\s*일정|academic\s+calendar/i.test(text)) return 'academic-calendar';
    if (/^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A|도움말|Help)$/i.test(text)) return 'help';
  }
  return undefined;
}

export function pagePurpose(element: HTMLElement, labels = contextLabels(element), common = documentPurpose()): PagePurpose | undefined {
  if (common) return common;
  if (labels.some(text => /^(?:자주\s*(?:찾는|묻는)\s*질문(?:\s*\(FAQ\))?|FAQ|Q\s*&\s*A|도움말|Help)$/i.test(text))) return 'help';
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

export function sourceSnapshot(element: HTMLElement, safeLabel = candidateLabel(element)): SourceSnapshot {
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
      sourceAction(element, safeLabel),
    ]),
  };
}

export function analyzePage(): Candidate[] {
  const commonPurpose = documentPurpose();
  const selector = 'a[href], button, [role~="button"], input[type="submit"], input[type="button"], input[type="search"], input[type="text"], input:not([type]), [role~="searchbox"], [role~="textbox"], textarea';
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
    const labels = contextLabels(element);
    candidates.push({
      element, label, href, action, target,
      destinationHost, opensNewWindow,
      context: sourceContext(element),
      score: 0, reasons: [],
      snapshot: sourceSnapshot(element, label),
      sectionLabel: labels[0], contextLabels: labels, pagePurpose: pagePurpose(element, labels, commonPurpose),
    });
  }
  return candidates;
}
