import type { Candidate } from './types';

const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, 140);

export function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  if (element.closest('[data-easyweb-host]')) return false;
  if (!element.getClientRects().length) return false;
  for (let parent: HTMLElement | null = element; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  }
  return !element.matches(':disabled, [aria-disabled="true"]');
}

function getLabel(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const label = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
    if (clean(label)) return clean(label);
  }
  const label = element.getAttribute('aria-label') || element.getAttribute('title');
  if (label) return clean(label);
  // 입력창의 value는 읽지 않습니다. submit/button의 value는 버튼 문구입니다.
  if (element instanceof HTMLInputElement) {
    return ['button', 'submit'].includes(element.type) ? clean(element.value) : '';
  }
  const text = element.innerText || element.textContent || '';
  return clean(text) || clean(element.querySelector('img')?.alt ?? '');
}

export function analyzePage(): Candidate[] {
  const elements = document.querySelectorAll<HTMLElement>('a[href], button, [role="button"], input[type="submit"], input[type="button"], input[type="search"], input[placeholder], [role="searchbox"]');
  const candidates: Candidate[] = [];
  for (const element of elements) {
    if (!isVisible(element)) continue;
    const isTextInput = element.matches('input:not([type="submit"]):not([type="button"]), [role="searchbox"]');
    if (element instanceof HTMLInputElement && !['search', 'text', 'submit', 'button'].includes(element.type)) continue;
    // 비밀번호·개인정보 입력창을 기능 후보로 사용하지 않습니다.
    if (isTextInput && !element.matches('input[type="search"], [role="searchbox"]') && !/검색|search/i.test(element.getAttribute('placeholder') ?? '')) continue;
    const label = getLabel(element) || (isTextInput ? clean(element.getAttribute('placeholder') ?? '검색') : '');
    if (!label || label.length > 100) continue;
    let href: string | undefined;
    let action: Candidate['action'] = 'locate';
    if (element instanceof HTMLAnchorElement) {
      const raw = element.getAttribute('href')?.trim() ?? '';
      try {
        const url = new URL(raw, document.baseURI);
        const isFragment = url.origin === location.origin && url.pathname === location.pathname && url.search === location.search && !!url.hash;
        // javascript:·다운로드·앵커·이벤트 기반 동작은 원본에서 사용하게 합니다.
        if (/^https?:$/.test(url.protocol) && raw && !raw.startsWith('#') && !isFragment && !element.hasAttribute('download') && !element.hasAttribute('onclick') && !element.hasAttribute('aria-controls')) {
          href = url.href;
          action = 'navigate';
        }
      } catch { /* 올바르지 않은 링크는 원본 위치로 안내합니다. */ }
    }
    candidates.push({
      element, label, href, action,
      context: element.closest('footer, [role="contentinfo"]') ? 'footer' : element.closest('header, nav, [role="navigation"], [role="banner"]') ? 'primary' : 'body',
      score: 0, reasons: [],
    });
  }
  return candidates;
}
