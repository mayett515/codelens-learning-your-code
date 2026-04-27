import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conceptKeys } from '../../data/query-keys';
import { retrievalKeys } from '../../retrieval/data/queryKeys';
import { applyReviewRating } from '../services/applyReviewRating';
import { reviewKeys } from '../data/queryKeys';
import type { ApplyReviewRatingInput } from '../types/review';

export function useApplyReviewRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyReviewRatingInput) => applyReviewRating(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: conceptKeys.all });
      queryClient.invalidateQueries({ queryKey: conceptKeys.byId(input.conceptId) });
      queryClient.invalidateQueries({ queryKey: retrievalKeys.all() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.events(input.conceptId) });
    },
  });
}
