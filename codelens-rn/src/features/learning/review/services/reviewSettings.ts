import { z } from 'zod';
import type { ReviewSettings } from '../types/review';

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  enableReviewMode: true,
  weakConceptThreshold: 0.4,
  recordRecallText: false,
};

export const ReviewSettingsCodec = z.object({
  enableReviewMode: z.boolean().default(true),
  weakConceptThreshold: z.number().min(0).max(1).default(0.4),
  recordRecallText: z.boolean().default(false),
});

export function parseReviewSettings(input: unknown): ReviewSettings {
  return ReviewSettingsCodec.parse({
    ...DEFAULT_REVIEW_SETTINGS,
    ...(typeof input === 'object' && input !== null ? input : {}),
  });
}
