import { useQuery } from '@tanstack/react-query';
import { getCapturesByConceptId } from '../../data/captureRepo';
import { getLearningConceptById } from '../../data/conceptRepo';
import { reviewKeys } from '../data/queryKeys';
import type { ConceptId } from '../../types/ids';

export function useReviewSession(conceptId: ConceptId | null) {
  return useQuery({
    queryKey: conceptId ? reviewKeys.session(conceptId) : [...reviewKeys.all(), 'session', 'none'] as const,
    queryFn: async () => {
      if (!conceptId) return null;
      const [concept, captures] = await Promise.all([
        getLearningConceptById(conceptId),
        getCapturesByConceptId(conceptId),
      ]);
      if (!concept) return null;
      return {
        concept,
        captures: captures
          .sort((left, right) => right.createdAt - left.createdAt || String(left.id).localeCompare(String(right.id)))
          .slice(0, 10),
      };
    },
    enabled: !!conceptId,
  });
}
