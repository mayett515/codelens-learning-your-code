import { z } from 'zod';
import { isConceptId, isReviewEventId, unsafeConceptId, unsafeReviewEventId } from '../../types/ids';
import type { ReviewEvent } from '../types/review';

export const ReviewRatingCodec = z.enum(['strong', 'partial', 'weak']);

export const ReviewEventRowCodec = z.object({
  id: z.string().refine(isReviewEventId),
  conceptId: z.string().refine(isConceptId),
  rating: ReviewRatingCodec,
  delta: z.number(),
  familiarityBefore: z.number().min(0).max(1),
  familiarityAfter: z.number().min(0).max(1),
  userRecallText: z.string().max(2000).nullable(),
  createdAt: z.number().int().positive(),
});

export function reviewEventRowToDomain(row: {
  id: string;
  conceptId: string;
  rating: string;
  delta: number;
  familiarityBefore: number;
  familiarityAfter: number;
  userRecallText: string | null;
  createdAt: number;
}): ReviewEvent {
  const parsed = ReviewEventRowCodec.parse(row);
  return {
    ...parsed,
    id: unsafeReviewEventId(parsed.id),
    conceptId: unsafeConceptId(parsed.conceptId),
  };
}
