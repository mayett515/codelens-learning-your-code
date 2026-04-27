import { useQuery } from '@tanstack/react-query';
import { getCaptureById } from '../../data/captureRepo';
import { captureKeys } from '../../data/query-keys';
import type { LearningCaptureId } from '../../types/ids';
import type { PromotionReviewModel } from '../types/promotion';

export function useSingleCapturePromotion(captureId: LearningCaptureId | null) {
  return useQuery<PromotionReviewModel | null>({
    queryKey: captureId ? captureKeys.byId(captureId) : captureKeys.byId(null as never),
    queryFn: async () => {
      if (!captureId) return null;
      const capture = await getCaptureById(captureId);
      if (!capture) return null;
      return {
        fingerprint: null,
        proposedName: capture.conceptHint?.proposedName ?? capture.title,
        proposedConceptType: capture.conceptHint?.proposedConceptType ?? 'mental_model',
        captures: [capture],
        sharedKeywords: capture.keywords,
        source: 'single_capture',
      };
    },
    enabled: captureId !== null,
  });
}
