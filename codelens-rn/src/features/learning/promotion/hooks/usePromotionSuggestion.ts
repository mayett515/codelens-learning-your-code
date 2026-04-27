import { useQuery } from '@tanstack/react-query';
import { getCapturesByIds } from '../../data/captureRepo';
import { getSuggestionByFingerprint } from '../data/suggestionsCacheRepo';
import { promotionKeys } from '../data/queryKeys';
import type { PromotionSuggestionWithCaptures } from '../types/promotion';

export function usePromotionSuggestion(fingerprint: string | null) {
  return useQuery<PromotionSuggestionWithCaptures | null>({
    queryKey: promotionKeys.suggestionByFingerprint(fingerprint ?? 'none'),
    queryFn: async () => {
      if (!fingerprint) return null;
      const suggestion = await getSuggestionByFingerprint(fingerprint);
      if (!suggestion) return null;
      const captures = await getCapturesByIds(suggestion.captureIds);
      return { suggestion, captures };
    },
    enabled: !!fingerprint,
  });
}
