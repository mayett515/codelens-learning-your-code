import { describe, expect, it, vi, beforeEach } from 'vitest';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import type { LearningConcept } from '../../types/learning';

const mocks = vi.hoisted(() => ({
  tx: {},
  getLearningConceptById: vi.fn(),
  updateConceptFamiliarity: vi.fn(),
  insertReviewEvent: vi.fn(),
}));

vi.mock('../../../../db/client', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn(mocks.tx)),
  },
}));

vi.mock('../../data/conceptRepo', () => ({
  getLearningConceptById: mocks.getLearningConceptById,
  updateConceptFamiliarity: mocks.updateConceptFamiliarity,
}));

vi.mock('../data/reviewEventsRepo', () => ({
  insertReviewEvent: mocks.insertReviewEvent,
}));

import { applyReviewRating, REVIEW_RATING_DELTAS } from '../services/applyReviewRating';
import { ReviewEventRowCodec } from '../codecs/reviewEvent';

const conceptId = unsafeConceptId('c_111111111111111111111');
const captureId = unsafeLearningCaptureId('lc_222222222222222222222');

function concept(overrides: Partial<LearningConcept> = {}): LearningConcept {
  return {
    id: conceptId,
    name: 'Closure',
    normalizedKey: 'closure',
    canonicalSummary: 'Closures keep lexical scope.',
    conceptType: 'mechanism',
    coreConcept: 'lexical scope',
    architecturalPattern: null,
    programmingParadigm: null,
    languageOrRuntime: ['typescript'],
    surfaceFeatures: ['inner function'],
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: [captureId],
    familiarityScore: 0.5,
    importanceScore: 0.8,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('Stage 7 review contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLearningConceptById.mockResolvedValue(concept());
  });

  it('uses locked deltas for explicit self-ratings', () => {
    expect(REVIEW_RATING_DELTAS).toEqual({
      strong: 0.10,
      partial: 0.05,
      weak: -0.05,
    });
  });

  it('increments familiarity for strong ratings and writes one audit row', async () => {
    await applyReviewRating({ conceptId, rating: 'strong', now: 100 });

    expect(mocks.updateConceptFamiliarity).toHaveBeenCalledWith(conceptId, 0.6, 100, mocks.tx);
    expect(mocks.insertReviewEvent).toHaveBeenCalledTimes(1);
    expect(mocks.insertReviewEvent.mock.calls[0][0]).toMatchObject({
      conceptId,
      rating: 'strong',
      delta: 0.10,
      familiarityBefore: 0.5,
      familiarityAfter: 0.6,
      userRecallText: null,
      createdAt: 100,
    });
  });

  it('increments familiarity for partial ratings', async () => {
    await applyReviewRating({ conceptId, rating: 'partial', now: 100 });
    expect(mocks.updateConceptFamiliarity).toHaveBeenCalledWith(conceptId, 0.55, 100, mocks.tx);
  });

  it('decrements familiarity for weak ratings and clamps at zero', async () => {
    mocks.getLearningConceptById.mockResolvedValue(concept({ familiarityScore: 0.03 }));
    await applyReviewRating({ conceptId, rating: 'weak', now: 100 });
    expect(mocks.updateConceptFamiliarity).toHaveBeenCalledWith(conceptId, 0, 100, mocks.tx);
  });

  it('skip writes no audit row and leaves familiarity untouched', async () => {
    await applyReviewRating({ conceptId, rating: 'skip', now: 100 });
    expect(mocks.updateConceptFamiliarity).not.toHaveBeenCalled();
    expect(mocks.insertReviewEvent).not.toHaveBeenCalled();
  });

  it('persists recall text only when the user opts in', async () => {
    await applyReviewRating({
      conceptId,
      rating: 'partial',
      recallText: 'x'.repeat(2100),
      recordRecallText: true,
      now: 100,
    });
    expect(mocks.insertReviewEvent.mock.calls[0][0].userRecallText).toHaveLength(2000);

    vi.clearAllMocks();
    mocks.getLearningConceptById.mockResolvedValue(concept());
    await applyReviewRating({
      conceptId,
      rating: 'partial',
      recallText: 'private note',
      recordRecallText: false,
      now: 100,
    });
    expect(mocks.insertReviewEvent.mock.calls[0][0].userRecallText).toBeNull();
  });

  it('validates review event rows at the boundary', () => {
    expect(() =>
      ReviewEventRowCodec.parse({
        id: 'rev_333333333333333333333',
        conceptId,
        rating: 'strong',
        delta: 0.1,
        familiarityBefore: 0.5,
        familiarityAfter: 0.6,
        userRecallText: null,
        createdAt: 100,
      }),
    ).not.toThrow();
    expect(() =>
      ReviewEventRowCodec.parse({
        id: 'rev_333333333333333333333',
        conceptId,
        rating: 'skip',
        delta: 0,
        familiarityBefore: 0.5,
        familiarityAfter: 0.5,
        userRecallText: null,
        createdAt: 100,
      }),
    ).toThrow();
  });
});
