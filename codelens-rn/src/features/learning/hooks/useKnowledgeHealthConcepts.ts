import { useQuery } from '@tanstack/react-query';
import { getKnowledgeHealthConcepts } from '../data/conceptRepo';
import { conceptKeys } from '../data/query-keys';

export function useKnowledgeHealthConcepts() {
  return useQuery({
    queryKey: conceptKeys.health,
    queryFn: () => getKnowledgeHealthConcepts(),
  });
}
