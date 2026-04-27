import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureKeys, conceptKeys } from '../../data/query-keys';
import { linkCapturesToExistingConcept } from '../services/linkCapturesToExistingConcept';
import { promotionKeys } from '../data/queryKeys';
import type { LinkExistingInput, PromotionResult } from '../types/promotion';

export function useLinkClusterToExisting() {
  const queryClient = useQueryClient();
  return useMutation<PromotionResult, Error, LinkExistingInput>({
    mutationFn: (input) => linkCapturesToExistingConcept(input),
    onSuccess: (_result, input) => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.suggestions() });
      void queryClient.invalidateQueries({ queryKey: conceptKeys.byId(input.targetConceptId) });
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
    },
  });
}
