import { useQuery } from '@tanstack/react-query';
import { getCapturesByIds } from '../../data/captureRepo';
import { getPromotionSuggestions } from '../data/suggestionsCacheRepo';
import { promotionKeys } from '../data/queryKeys';
import { commonProfileId } from './usePromotionSuggestion';

export function usePromotionSuggestions({
  limit,
  profileId,
}: {
  limit?: number;
  profileId?: string | null | undefined;
} = {}) {
  return useQuery({
    queryKey: promotionKeys.suggestionsWithLimit(limit, profileId),
    queryFn: async () => {
      if (!profileId) return getPromotionSuggestions(limit);
      const suggestions = await getPromotionSuggestions(undefined);
      const filtered = [];
      for (const suggestion of suggestions) {
        const captures = await getCapturesByIds(suggestion.captureIds);
        if (commonProfileId(captures) === profileId) filtered.push(suggestion);
      }
      return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
    },
  });
}
