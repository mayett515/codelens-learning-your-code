import { useQuery } from '@tanstack/react-query';
import { getKnowledgeHealthConcepts } from '../data/conceptRepo';
import { conceptKeys } from '../data/query-keys';
import { matchesConceptListFilters, type ConceptListFilters } from './useConceptList';

export function useKnowledgeHealthConcepts({
  filters = {},
}: {
  filters?: ConceptListFilters;
} = {}) {
  return useQuery({
    queryKey: conceptKeys.health(filters),
    queryFn: async () => {
      const concepts = await getKnowledgeHealthConcepts();
      const hasFilter =
        (filters.profileIds && filters.profileIds.length > 0) ||
        filters.profileId !== undefined ||
        (filters.typeNodeIds && filters.typeNodeIds.length > 0) ||
        filters.conceptType !== undefined;
      return hasFilter
        ? concepts.filter((concept) => matchesConceptListFilters(concept, filters))
        : concepts;
    },
  });
}
