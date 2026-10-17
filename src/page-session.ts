import { candidateLabel, contextLabels, documentPurpose, pagePurpose, sourceContext, sourceSnapshot, type CollectionCache, type SupplementalCache, type ContextCache } from './analyzer';
import type { Candidate, PagePurpose } from './types';

export function isCandidateCurrent(candidate: Candidate, collectionCache?: CollectionCache, supplementalCache?: SupplementalCache, contextCache?: ContextCache, commonPurpose?: PagePurpose | null): boolean {
  const label = candidateLabel(candidate.element);
  if (label !== candidate.label) return false;
  if (sourceContext(candidate.element) !== candidate.context) return false;
  const labels = contextLabels(candidate.element, contextCache);
  if (labels[0] !== candidate.sectionLabel || JSON.stringify(labels) !== JSON.stringify(candidate.contextLabels ?? [])) return false;
  if (pagePurpose(candidate.element, labels, commonPurpose) !== candidate.pagePurpose) return false;
  const current = sourceSnapshot(candidate.element, label, collectionCache, !!candidate.collectionDependent, !!candidate.supplementalDependent, supplementalCache);
  return !!candidate.snapshot && current.pageUrl === candidate.snapshot.pageUrl &&
    current.baseUrl === candidate.snapshot.baseUrl && current.attributes === candidate.snapshot.attributes;
}

export function areCandidatesCurrent(candidates: readonly Candidate[]): boolean {
  const collectionCache: CollectionCache = new WeakMap();
  const supplementalCache: SupplementalCache = new WeakMap();
  const contextCache: ContextCache = new WeakMap();
  const commonPurpose = documentPurpose() ?? null;
  return candidates.every(candidate => isCandidateCurrent(candidate, collectionCache, supplementalCache, contextCache, commonPurpose));
}

export function watchCandidates(getCandidates: () => Candidate[], onStale: () => void): () => void {
  let stopped = false;
  let scheduled: number | undefined;
  const check = () => {
    if (!stopped && !areCandidatesCurrent(getCandidates())) onStale();
  };
  const observer = new MutationObserver(records => {
    if (records.every(record => record.target instanceof Element && !!record.target.closest('[data-easyweb-host]'))) return;
    if (scheduled === undefined) scheduled = window.setTimeout(() => { scheduled = undefined; check(); }, 80);
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['href', 'target', 'onclick', 'aria-controls', 'aria-current', 'aria-expanded', 'download', 'type', 'form', 'id', 'role', 'disabled', 'aria-disabled', 'aria-hidden', 'hidden', 'class', 'style', 'aria-label', 'aria-labelledby', 'title', 'placeholder', 'contenteditable'],
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
