import { useQuery } from '@tanstack/react-query';
import { getLearningConceptList } from '../data/conceptRepo';
import { conceptKeys } from '../data/query-keys';
import type { ConceptType } from '../types/learning';

export type ConceptListSort = 'weakest' | 'strongest' | 'newest' | 'alphabetical';
export interface ConceptListFilters {
  /** Preferred: filter by profile/base IDs so type node ids stay scoped. */
  profileIds?: string[];
  /** Compatibility alias for a single profile filter. */
  profileId?: string;
  /** Preferred: filter by ontology type node IDs. */
  typeNodeIds?: ConceptType[];
  /** Legacy compatibility alias for single type filter. */
  conceptType?: ConceptType;
}

function matchesTypeFilters(
  conceptType: ConceptType,
  filters: ConceptListFilters,
): boolean {
  const allowed = new Set<ConceptType>([
    ...(filters.typeNodeIds ?? []),
    ...(filters.conceptType ? [filters.conceptType] : []),
  ]);
  if (allowed.size === 0) return true;
  return allowed.has(conceptType);
}

function matchesProfileFilters(
  profileId: string,
  filters: ConceptListFilters,
): boolean {
  const allowed = new Set<string>([
    ...(filters.profileIds ?? []),
    ...(filters.profileId ? [filters.profileId] : []),
  ]);
  if (allowed.size === 0) return true;
  return allowed.has(profileId);
}

export function matchesConceptListFilters(
  concept: { profileId: string; conceptType: ConceptType },
  filters: ConceptListFilters,
): boolean {
  return matchesProfileFilters(concept.profileId, filters)
    && matchesTypeFilters(concept.conceptType, filters);
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
      const hasTypeFilter =
        (filters.typeNodeIds && filters.typeNodeIds.length > 0) ||
        filters.conceptType !== undefined;
      const hasProfileFilter =
        (filters.profileIds && filters.profileIds.length > 0) ||
        filters.profileId !== undefined;
      const filtered = hasTypeFilter || hasProfileFilter
        ? concepts.filter((concept) => matchesConceptListFilters(concept, filters))
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
