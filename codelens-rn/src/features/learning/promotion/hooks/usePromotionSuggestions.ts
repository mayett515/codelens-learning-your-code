import { useQuery } from '@tanstack/react-query';
import { getPromotionSuggestions } from '../data/suggestionsCacheRepo';
import { promotionKeys } from '../data/queryKeys';

export function usePromotionSuggestions({ limit }: { limit?: number } = {}) {
  return useQuery({
    queryKey: promotionKeys.suggestionsWithLimit(limit),
    queryFn: () => getPromotionSuggestions(limit),
  });
}
