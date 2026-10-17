import { candidateLabel, contextLabels, documentPurpose, pagePurpose, sourceContext, sourceSnapshot, type CollectionCache, type SupplementalCache, type ContextCache } from './analyzer';
import type { Candidate, PagePurpose } from './types';
import { institutionEvidence, type InstitutionEvidenceCache } from './institution-evidence';
import { contentEvidence, type ContentEvidenceCache } from './content-evidence';
import { relationEvidence, createRelationCache, type RelationCache } from './relations';
import { createNavigationCache, type NavigationCache } from './navigation-utility';

export function isCandidateCurrent(candidate: Candidate, collectionCache?: CollectionCache, supplementalCache?: SupplementalCache, contextCache?: ContextCache, commonPurpose?: PagePurpose | null, contentCache?: ContentEvidenceCache, institutionCache?: InstitutionEvidenceCache, navigationCache?: NavigationCache, relationCache?: RelationCache): boolean {
  const label = candidateLabel(candidate.element);
  if (label !== candidate.label) return false;
  if (sourceContext(candidate.element) !== candidate.context) return false;
  const labels = contextLabels(candidate.element, contextCache);
  if (labels[0] !== candidate.sectionLabel || JSON.stringify(labels) !== JSON.stringify(candidate.contextLabels ?? [])) return false;
  if (pagePurpose(candidate.element, labels, commonPurpose) !== candidate.pagePurpose) return false;
  if (candidate.institutionEvidence) {
    const previous = candidate.institutionEvidence;
    const evidence = institutionEvidence(candidate, institutionCache);
    if (!evidence || evidence.adapter !== previous.adapter || evidence.version !== previous.version
      || evidence.rule !== previous.rule || evidence.category !== previous.category || evidence.score !== previous.score
      || evidence.pageTask !== previous.pageTask || evidence.readonlyPanel !== previous.readonlyPanel || evidence.contentScope !== previous.contentScope
      || evidence.fingerprint !== previous.fingerprint || evidence.dependencies.length !== previous.dependencies.length
      || evidence.dependencies.some((node, index) => node !== previous.dependencies[index])) return false;
  }
  if (candidate.relationEvidence) {
    const previous = candidate.relationEvidence;
    const evidence = relationEvidence(candidate, relationCache);
    if (!evidence || evidence.rule !== previous.rule || evidence.category !== previous.category || evidence.score !== previous.score
      || evidence.pageTask !== previous.pageTask || evidence.contentScope !== previous.contentScope || evidence.relatedLabel !== previous.relatedLabel
      || evidence.fingerprint !== previous.fingerprint || evidence.dependencies.length !== previous.dependencies.length
      || evidence.dependencies.some((node, index) => node !== previous.dependencies[index])) return false;
  }
  if (candidate.contentEvidence) {
    const previous = candidate.contentEvidence;
    const evidence = contentEvidence(candidate, contentCache, supplementalCache);
    if (!evidence || evidence.level !== previous.level || evidence.rule !== previous.rule || evidence.taskGroup !== previous.taskGroup
      || evidence.fingerprint !== previous.fingerprint || evidence.dependencies.length !== previous.dependencies.length
      || evidence.dependencies.some((node, index) => node !== previous.dependencies[index])) return false;
  }
  const current = sourceSnapshot(candidate.element, label, collectionCache, !!candidate.collectionDependent, !!candidate.supplementalDependent, supplementalCache, navigationCache);
  return !!candidate.snapshot && current.pageUrl === candidate.snapshot.pageUrl &&
    current.baseUrl === candidate.snapshot.baseUrl && current.attributes === candidate.snapshot.attributes;
}

export function areCandidatesCurrent(candidates: readonly Candidate[]): boolean {
  const collectionCache: CollectionCache = new WeakMap();
  const supplementalCache: SupplementalCache = new WeakMap();
  const contextCache: ContextCache = new WeakMap();
  const contentCache: ContentEvidenceCache = new WeakMap();
  const institutionCache: InstitutionEvidenceCache = new WeakMap();
  const navigationCache = createNavigationCache();
  const relationCache = createRelationCache();
  const commonPurpose = documentPurpose() ?? null;
  return candidates.every(candidate => isCandidateCurrent(candidate, collectionCache, supplementalCache, contextCache, commonPurpose, contentCache, institutionCache, navigationCache, relationCache));
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
    attributeFilter: ['href', 'action', 'method', 'onsubmit', 'rel', 'target', 'onclick', 'aria-controls', 'aria-current', 'aria-selected', 'aria-expanded', 'aria-haspopup', 'download', 'type', 'form', 'id', 'role', 'tabindex', 'disabled', 'aria-disabled', 'aria-hidden', 'hidden', 'class', 'style', 'aria-label', 'aria-labelledby', 'title', 'placeholder', 'contenteditable'],
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
