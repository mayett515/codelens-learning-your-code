import { useQuery } from '@tanstack/react-query';
import { fetchEgoGraphData, fetchFullGraphData } from '../data/graphQueries';
import { graphKeys } from '../data/graphKeys';
import type { ConceptId } from '@/src/features/learning';

export function useGraphForFocal(conceptId: ConceptId | null) {
  return useQuery({
    queryKey: conceptId ? graphKeys.ego(conceptId) : graphKeys.full(),
    queryFn: () => {
      if (!conceptId) return fetchFullGraphData();
      return fetchEgoGraphData(conceptId);
    },
  });
}
