import type { Candidate, SourceSnapshot } from './types';
import { sourceAction } from './action-policy';

const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 140);
const editableRoleSelector = ['textbox', 'searchbox', 'combobox', 'spinbutton', 'slider'].map(role => `[role~="${role}"]`).join(', ');
const editableSelector = `input, textarea, select, [contenteditable]:not([contenteditable="false"]), ${editableRoleSelector}`;

export function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]')) return false;
  if (element.closest('[data-easyweb-host]')) return false;
  if (!element.getClientRects().length) return false;
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  }
  return !element.matches(':disabled, [aria-disabled="true"]');
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
  const searchRole = element.matches('input[type="search"], [role~="searchbox"]') || !!element.closest('[role~="search"], search');
  if (textInput && !searchRole && !/검색|search/i.test(label)) return '';
  const safe = label || (textInput && searchRole ? '검색' : '');
  return safe.length <= 100 ? safe : '';
}

export function sectionLabel(element: HTMLElement): string | undefined {
  let parent = element.parentElement;
  for (let level = 0; parent && parent !== document.body && level < 6; level++, parent = parent.parentElement) {
    const headings = [...parent.querySelectorAll<HTMLElement>(':scope > h1, :scope > h2, :scope > h3')];
    const preceding = headings.filter(heading => !!(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING));
    const label = preceding.at(-1);
    if (label) {
      const text = clean(staticText(label));
      if (text && text.length <= 60) return text;
    }
  }
  return undefined;
}

export function sourceSnapshot(element: HTMLElement): SourceSnapshot {
  return {
    pageUrl: location.href,
    baseUrl: document.baseURI,
    attributes: JSON.stringify([
      ...['href', 'target', 'onclick', 'aria-controls', 'download', 'type', 'role', 'contenteditable'].map(name => element.getAttribute(name)),
      sourceAction(element),
    ]),
  };
}

export function analyzePage(): Candidate[] {
  const elements = document.querySelectorAll<HTMLElement>('a[href], button, [role~="button"], input[type="submit"], input[type="button"], input[type="search"], input[type="text"], input:not([type]), [role~="searchbox"], [role~="textbox"], textarea');
  const candidates: Candidate[] = [];
  for (const element of elements) {
    const label = candidateLabel(element);
    if (!label) continue;
    const { href, action, target } = sourceAction(element);
    candidates.push({
      element, label, href, action, target,
      context: element.closest('footer, [role~="contentinfo"]') ? 'footer' : element.closest('header, nav, [role~="navigation"], [role~="banner"]') ? 'primary' : 'body',
      score: 0, reasons: [],
      snapshot: sourceSnapshot(element),
      sectionLabel: sectionLabel(element),
    });
  }
  return candidates;
}
