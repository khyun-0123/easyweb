import type { Candidate, RelationEvidence } from './types';
import { serviceRelation, type ServiceRelationCache } from './service-relations';
import { documentRelation, type DocumentRelationCache } from './document-relations';

export interface RelationCache { service: ServiceRelationCache; document: DocumentRelationCache }
export const createRelationCache = (): RelationCache => ({ service: new WeakMap(), document: new WeakMap() });

// Only semantic source relationships are supplied here. The shared classifier
// owns command/label safety and source actions. Each later currentness batch
// re-establishes the same relation with fresh caches and actual node identities.
export function relationEvidence(candidate: Candidate, cache?: RelationCache): RelationEvidence | undefined {
  return documentRelation(candidate, cache?.document) ?? serviceRelation(candidate, cache?.service);
}
