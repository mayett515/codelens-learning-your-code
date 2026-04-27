import { db } from '../../../../db/client';
import { getLearningConceptById, updateConceptFamiliarity } from '../../data/conceptRepo';
import { newReviewEventId } from '../../types/ids';
import { insertReviewEvent } from '../data/reviewEventsRepo';
import type { ApplyReviewRatingInput, ReviewRating } from '../types/review';

export const REVIEW_RATING_DELTAS: Record<ReviewRating, number> = {
  strong: 0.10,
  partial: 0.05,
  weak: -0.05,
};

const committedReviewSessions = new Set<string>();

export async function applyReviewRating(input: ApplyReviewRatingInput): Promise<void> {
  if (input.rating === 'skip') return;

  const rating: ReviewRating = input.rating;
  const delta = REVIEW_RATING_DELTAS[rating];
  const now = input.now ?? Date.now();
  const idempotencyKey = input.sessionStart === undefined
    ? null
    : `${input.conceptId}:${input.sessionStart}`;
  if (idempotencyKey !== null && committedReviewSessions.has(idempotencyKey)) {
    throw new Error('This review rating was already saved');
  }
  if (idempotencyKey !== null) committedReviewSessions.add(idempotencyKey);
  const recallText = input.recordRecallText ? truncateRecall(input.recallText ?? '') : null;

  try {
    await db.transaction(async (tx) => {
      const concept = await getLearningConceptById(input.conceptId, tx);
      if (!concept) throw new Error('This concept was deleted');

      const familiarityBefore = concept.familiarityScore;
      const familiarityAfter = clamp01(familiarityBefore + delta);
      await updateConceptFamiliarity(input.conceptId, familiarityAfter, now, tx);
      await insertReviewEvent({
        id: newReviewEventId(),
        conceptId: input.conceptId,
        rating,
        delta,
        familiarityBefore,
        familiarityAfter,
        userRecallText: recallText,
        createdAt: now,
      }, tx);
    });
  } catch (error) {
    if (idempotencyKey !== null) committedReviewSessions.delete(idempotencyKey);
    throw error;
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(6))));
}

function truncateRecall(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2000);
}
