import { useQuery } from '@tanstack/react-query';
import { getLearningConceptList } from '../data/conceptRepo';
import { conceptKeys } from '../data/query-keys';
import type { ConceptType } from '../types/learning';

export type ConceptListSort = 'weakest' | 'strongest' | 'newest' | 'alphabetical';
export interface ConceptListFilters {
  conceptType?: ConceptType;
}

export function useConceptList({
  sort = 'weakest',
  filters = {},
}: {
  sort?: ConceptListSort;
  filters?: ConceptListFilters;
} = {}) {
  return useQuery({
    queryKey: conceptKeys.list(sort, filters),
    queryFn: async () => {
      const concepts = await getLearningConceptList();
      const filtered = filters.conceptType
        ? concepts.filter((concept) => concept.conceptType === filters.conceptType)
        : concepts;

      if (sort === 'strongest') {
        return [...filtered].reverse();
      }
      if (sort === 'newest') {
        return [...filtered].sort((left, right) => right.updatedAt - left.updatedAt);
      }
      if (sort === 'alphabetical') {
        return [...filtered].sort((left, right) => left.name.localeCompare(right.name));
      }
      return filtered;
    },
  });
}
