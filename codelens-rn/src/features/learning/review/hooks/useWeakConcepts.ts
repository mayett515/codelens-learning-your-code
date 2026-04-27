import { useQuery } from '@tanstack/react-query';
import { getLearningConceptList } from '../../data/conceptRepo';
import { computeStrength } from '../../strength/computeStrength';
import { reviewKeys } from '../data/queryKeys';

export function useWeakConcepts(threshold: number) {
  return useQuery({
    queryKey: reviewKeys.weakConcepts(threshold),
    queryFn: async () => {
      const concepts = await getLearningConceptList();
      return concepts
        .filter((concept) => computeStrength(concept.familiarityScore, concept.importanceScore) < threshold)
        .sort((left, right) => {
          const leftStrength = computeStrength(left.familiarityScore, left.importanceScore);
          const rightStrength = computeStrength(right.familiarityScore, right.importanceScore);
          if (leftStrength !== rightStrength) return leftStrength - rightStrength;
          const leftAccess = 'lastAccessedAt' in left && typeof left.lastAccessedAt === 'number'
            ? left.lastAccessedAt
            : Number.NEGATIVE_INFINITY;
          const rightAccess = 'lastAccessedAt' in right && typeof right.lastAccessedAt === 'number'
            ? right.lastAccessedAt
            : Number.NEGATIVE_INFINITY;
          if (leftAccess !== rightAccess) return leftAccess - rightAccess;
          if (left.updatedAt !== right.updatedAt) return left.updatedAt - right.updatedAt;
          return left.name.localeCompare(right.name);
        })
        .slice(0, 50);
    },
  });
}
