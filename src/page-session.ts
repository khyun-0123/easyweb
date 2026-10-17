import { candidateLabel, sectionLabel, sourceSnapshot } from './analyzer';
import type { Candidate } from './types';

export function isCandidateCurrent(candidate: Candidate): boolean {
  if (candidateLabel(candidate.element) !== candidate.label) return false;
  if (sectionLabel(candidate.element) !== candidate.sectionLabel) return false;
  const current = sourceSnapshot(candidate.element);
  return !!candidate.snapshot && current.pageUrl === candidate.snapshot.pageUrl &&
    current.baseUrl === candidate.snapshot.baseUrl && current.attributes === candidate.snapshot.attributes;
}

export function watchCandidates(getCandidates: () => Candidate[], onStale: () => void): () => void {
  let stopped = false;
  let scheduled: number | undefined;
  const check = () => {
    if (!stopped && getCandidates().some(candidate => !isCandidateCurrent(candidate))) onStale();
  };
  const observer = new MutationObserver(records => {
    if (records.every(record => record.target instanceof Element && !!record.target.closest('[data-easyweb-host]'))) return;
    if (scheduled === undefined) scheduled = window.setTimeout(() => { scheduled = undefined; check(); }, 80);
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['href', 'target', 'onclick', 'aria-controls', 'download', 'type', 'role', 'disabled', 'aria-disabled', 'aria-hidden', 'hidden', 'class', 'style', 'aria-label', 'aria-labelledby', 'title', 'placeholder', 'contenteditable'],
  });
  // 원본 history를 교체하지 않고 쉬운 화면이 열린 동안만 URL을 감시합니다.
  const interval = window.setInterval(check, 300);
  window.addEventListener('popstate', check);
  window.addEventListener('hashchange', check);
  return () => {
    stopped = true;
    observer.disconnect();
    window.clearInterval(interval);
    if (scheduled !== undefined) window.clearTimeout(scheduled);
    window.removeEventListener('popstate', check);
    window.removeEventListener('hashchange', check);
  };
}
