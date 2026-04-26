import { useQuery } from '@tanstack/react-query';
import { getAllConcepts, getConceptById } from '../data/concepts';
import { getAllSessions } from '../data/learning-sessions';
import { retrieveRelatedConcepts } from '../application/retrieve';
import { buildEmbeddingInput } from '../lib/embedding-input';
import { learningKeys } from '../data/query-keys';
import type { ConceptId, Concept } from '../../../domain/types';
import type { RetrievalResult } from '../application/retrieve';

export function useAllConcepts() {
  return useQuery({
    queryKey: learningKeys.concepts.all,
    queryFn: getAllConcepts,
  });
}

export function useAllSessions() {
  return useQuery({
    queryKey: learningKeys.sessions.all,
    queryFn: getAllSessions,
  });
}

export function useConcept(id: ConceptId) {
  return useQuery({
    queryKey: learningKeys.concepts.detail(id),
    queryFn: () => getConceptById(id),
  });
}

export function useRelatedConcepts(conceptId: ConceptId, concept: Concept | undefined) {
  return useQuery<RetrievalResult[]>({
    queryKey: learningKeys.concepts.related(conceptId),
    queryFn: () =>
      retrieveRelatedConcepts(
        buildEmbeddingInput(concept!.name, concept!.summary, concept!.taxonomy),
        { limit: 3, excludeIds: [conceptId] },
      ),
    enabled: !!concept,
  });
}

export { useRecentCaptures } from './useRecentCaptures';
export { useConceptList } from './useConceptList';
export type { ConceptListFilters, ConceptListSort } from './useConceptList';
export { useRecentSessions } from './useRecentSessions';
export { useSessionFlashback } from './useSessionFlashback';
export type { SessionFlashbackData } from './useSessionFlashback';
export { useKnowledgeHealthConcepts } from './useKnowledgeHealthConcepts';
export { useConceptCaptures } from './useConceptCaptures';
