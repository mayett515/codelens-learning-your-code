import { useQuery } from '@tanstack/react-query';
import { fetchEgoGraphData, fetchFullGraphData } from '../data/graphQueries';
import { graphKeys } from '../data/graphKeys';
import type { ConceptId } from '@/src/features/learning';

export function useGraphForFocal(
  conceptId: ConceptId | null,
  profileId?: string | null | undefined,
) {
  return useQuery({
    queryKey: conceptId ? graphKeys.ego(conceptId, profileId) : graphKeys.full(profileId),
    queryFn: () => {
      if (!conceptId) return fetchFullGraphData(profileId);
      return fetchEgoGraphData(conceptId, profileId);
    },
  });
}
