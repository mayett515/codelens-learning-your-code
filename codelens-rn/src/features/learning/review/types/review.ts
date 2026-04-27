import type { ConceptId, ReviewEventId } from '../../types/ids';

export type ReviewRating = 'strong' | 'partial' | 'weak';
export type ReviewRatingOrSkip = ReviewRating | 'skip';

export interface ReviewEvent {
  id: ReviewEventId;
  conceptId: ConceptId;
  rating: ReviewRating;
  delta: number;
  familiarityBefore: number;
  familiarityAfter: number;
  userRecallText: string | null;
  createdAt: number;
}

export interface ReviewSettings {
  enableReviewMode: boolean;
  weakConceptThreshold: number;
  recordRecallText: boolean;
}

export interface ApplyReviewRatingInput {
  conceptId: ConceptId;
  rating: ReviewRatingOrSkip;
  recallText?: string;
  recordRecallText?: boolean;
  sessionStart?: number;
  now?: number;
}
