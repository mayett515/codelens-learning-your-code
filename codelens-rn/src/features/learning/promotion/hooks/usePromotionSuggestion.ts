import { useQuery } from '@tanstack/react-query';
import { getCapturesByIds } from '../../data/captureRepo';
import { getSuggestionByFingerprint } from '../data/suggestionsCacheRepo';
import { promotionKeys } from '../data/queryKeys';
import type { LearningCapture } from '../../types/learning';
import type { PromotionSuggestionWithCaptures } from '../types/promotion';

export function usePromotionSuggestion(
  fingerprint: string | null,
  profileId?: string | null | undefined,
) {
  return useQuery<PromotionSuggestionWithCaptures | null>({
    queryKey: promotionKeys.suggestionByFingerprint(fingerprint ?? 'none', profileId),
    queryFn: async () => {
      if (!fingerprint) return null;
      const suggestion = await getSuggestionByFingerprint(fingerprint);
      if (!suggestion) return null;
      const captures = await getCapturesByIds(suggestion.captureIds);
      const suggestionProfileId = commonProfileId(captures);
      if (!suggestionProfileId) return null;
      if (profileId && suggestionProfileId !== profileId) return null;
      return { suggestion, profileId: suggestionProfileId, captures };
    },
    enabled: !!fingerprint,
  });
}

export function commonProfileId(captures: readonly LearningCapture[]): string | null {
  if (captures.length === 0) return null;
  const profileId = captures[0]!.profileId;
  return captures.every((capture) => capture.profileId === profileId) ? profileId : null;
}
