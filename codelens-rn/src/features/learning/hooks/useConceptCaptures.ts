import { useQuery } from '@tanstack/react-query';
import { getCapturesByConceptId } from '../data/captureRepo';
import { captureKeys } from '../data/query-keys';
import type { ConceptId } from '../types/ids';

export function useConceptCaptures(conceptId: ConceptId | null) {
  return useQuery({
    queryKey: captureKeys.byConcept(conceptId),
    queryFn: () => (conceptId ? getCapturesByConceptId(conceptId) : Promise.resolve([])),
    enabled: conceptId !== null,
  });
}
