import { isVisible } from './analyzer';
import type { Candidate } from './types';

export function locateOriginal(candidate: Candidate, close: () => void): void {
  close();
  if (!isVisible(candidate.element)) return;
  const element = candidate.element;
  // 이전 주입 인스턴스의 강조도 먼저 해제하여 그 임시 상태를 원본으로 저장하지 않습니다.
  element.dispatchEvent(new Event('easyweb:clear-highlight'));
  const hadStyle = element.getAttribute('style') !== null;
  element.scrollIntoView({ block: 'center', behavior: 'instant' });
  const previousTabindex = element.getAttribute('tabindex');
  const changedTabindex = element.tabIndex < 0;
  if (changedTabindex) element.tabIndex = -1;
  element.focus({ preventScroll: true });
  const outline = element.style.getPropertyValue('outline');
  const priority = element.style.getPropertyPriority('outline');
  const offset = element.style.getPropertyValue('outline-offset');
  const offsetPriority = element.style.getPropertyPriority('outline-offset');
  element.style.setProperty('outline', '4px solid #087e76', 'important');
  element.style.setProperty('outline-offset', '5px', 'important');
  const appliedOutline = element.style.getPropertyValue('outline');
  let timer: number | undefined;
  const restore = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    if (element.style.getPropertyValue('outline') === appliedOutline) {
      if (outline) element.style.setProperty('outline', outline, priority); else element.style.removeProperty('outline');
    }
    if (element.style.getPropertyValue('outline-offset') === '5px') {
      if (offset) element.style.setProperty('outline-offset', offset, offsetPriority); else element.style.removeProperty('outline-offset');
    }
    if (changedTabindex && element.getAttribute('tabindex') === '-1') {
      if (previousTabindex === null) element.removeAttribute('tabindex'); else element.setAttribute('tabindex', previousTabindex);
    }
    // CSSOM 변경 뒤 속성을 직렬화해서 확인해야 Chromium에서 빈 style이 되살아나지 않습니다.
    if (!hadStyle && element.getAttribute('style') === '') element.removeAttribute('style');
    element.removeEventListener('easyweb:clear-highlight', restore);
  };
  element.addEventListener('easyweb:clear-highlight', restore, { once: true });
  timer = window.setTimeout(restore, 3500);
}
