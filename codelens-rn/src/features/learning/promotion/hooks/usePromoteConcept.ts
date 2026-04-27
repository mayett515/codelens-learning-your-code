import { useMutation, useQueryClient } from '@tanstack/react-query';
import { captureKeys, conceptKeys } from '../../data/query-keys';
import { promoteToConcept } from '../services/promoteToConcept';
import { promotionKeys } from '../data/queryKeys';
import { retrievalKeys } from '../../retrieval/data/queryKeys';
import type { PromotionConfirmInput, PromotionResult } from '../types/promotion';

export function usePromoteConcept() {
  const queryClient = useQueryClient();
  return useMutation<PromotionResult, Error, PromotionConfirmInput>({
    mutationFn: (input) => promoteToConcept(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: promotionKeys.suggestions() });
      void queryClient.invalidateQueries({ queryKey: conceptKeys.all });
      void queryClient.invalidateQueries({ queryKey: captureKeys.all });
      void queryClient.invalidateQueries({ queryKey: retrievalKeys.all() });
    },
  });
}
