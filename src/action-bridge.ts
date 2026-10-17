import { isVisible } from './analyzer';
import { isCandidateCurrent } from './page-session';
import type { Candidate } from './types';

export type LocateResult = { ok: true } | {
  ok: false;
  reason: 'unavailable' | 'changed' | 'outside-viewport' | 'covered' | 'focus-failed';
};

function exposedInViewport(element: HTMLElement): 'outside-viewport' | 'covered' | null {
  let intersects = false;
  for (const rect of element.getClientRects()) {
    const left = Math.max(0, rect.left);
    const right = Math.min(window.innerWidth, rect.right);
    const top = Math.max(0, rect.top);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    if (right <= left || bottom <= top) continue;
    intersects = true;
    // 원본 제어 일부라도 실제로 드러나는지 확인합니다. 팝업 너머에 초점만 주고
    // 위치 안내가 끝났다고 판단하지 않습니다.
    const points = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]];
    for (const [x, y] of points) {
      const hit = document.elementFromPoint(left + (right - left) * x!, top + (bottom - top) * y!);
      if (hit && (hit === element || element.contains(hit))) return null;
    }
  }
  return intersects ? 'covered' : 'outside-viewport';
}

export function locateOriginal(candidate: Candidate, close: () => void): LocateResult {
  close();
  if (!isVisible(candidate.element)) return { ok: false, reason: 'unavailable' };
  const element = candidate.element;
  // 이전 주입 인스턴스의 강조도 먼저 해제하여 그 임시 상태를 원본으로 저장하지 않습니다.
  element.dispatchEvent(new Event('easyweb:clear-highlight'));
  element.scrollIntoView({ block: 'center', behavior: 'instant' });
  if (!isVisible(element)) return { ok: false, reason: 'unavailable' };
  const exposure = exposedInViewport(element);
  if (exposure) return { ok: false, reason: exposure };
  const previousTabindex = element.getAttribute('tabindex');
  // href 없는 a는 tabIndex가 0이어도 실제로는 focus()를 받지 않을 수 있습니다.
  const changedTabindex = element.tabIndex < 0 || element.matches('a:not([href]):not([tabindex])');
  if (changedTabindex) element.tabIndex = -1;
  const restoreTabindex = () => {
    if (changedTabindex && element.getAttribute('tabindex') === '-1') {
      if (previousTabindex === null) element.removeAttribute('tabindex'); else element.setAttribute('tabindex', previousTabindex);
    }
  };
  element.focus({ preventScroll: true });
  // focus/scroll 처리 중 원본 사이트가 팝업을 열거나 제어를 교체할 수도 있습니다.
  const afterFocus = !isVisible(element) ? 'unavailable' : candidate.snapshot && !isCandidateCurrent(candidate) ? 'changed' : exposedInViewport(element) ??
    (document.activeElement === element || !!document.activeElement && element.contains(document.activeElement) ? null : 'focus-failed');
  if (afterFocus) {
    restoreTabindex();
    return { ok: false, reason: afterFocus };
  }
  // 원본의 focus 핸들러가 만든 스타일도 사이트 상태로 보존합니다.
  const hadStyle = element.getAttribute('style') !== null;
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
    if (element.style.getPropertyValue('outline') === appliedOutline && element.style.getPropertyPriority('outline') === 'important') {
      if (outline) element.style.setProperty('outline', outline, priority); else element.style.removeProperty('outline');
    }
    if (element.style.getPropertyValue('outline-offset') === '5px' && element.style.getPropertyPriority('outline-offset') === 'important') {
      if (offset) element.style.setProperty('outline-offset', offset, offsetPriority); else element.style.removeProperty('outline-offset');
    }
    restoreTabindex();
    // CSSOM 변경 뒤 속성을 직렬화해서 확인해야 Chromium에서 빈 style이 되살아나지 않습니다.
    if (!hadStyle && element.getAttribute('style') === '') element.removeAttribute('style');
    element.removeEventListener('easyweb:clear-highlight', restore);
  };
  element.addEventListener('easyweb:clear-highlight', restore, { once: true });
  timer = window.setTimeout(restore, 3500);
  return { ok: true };
}
