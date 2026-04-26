import { describe, expect, it, vi } from 'vitest';
import { unsafeConceptId } from '../../types/ids';
import type { LearningConcept } from '../../types/learning';

const mocks = vi.hoisted(() => ({
  enqueueEmbed: vi.fn(),
  topMatches: vi.fn(),
  getLearningConceptById: vi.fn(),
}));

vi.mock('../../../../ai/embed', () => ({
  enqueueEmbed: mocks.enqueueEmbed,
}));

vi.mock('../../../../ai/scopes', () => ({
  getEmbedConfig: () => ({ provider: 'openrouter', model: 'test-model' }),
}));

vi.mock('../../../../composition', () => ({
  vectorStore: {
    topMatches: mocks.topMatches,
  },
}));

vi.mock('../../data/conceptRepo', () => ({
  getLearningConceptById: mocks.getLearningConceptById,
}));

const conceptId = unsafeConceptId('c_123456789012345678901');
const concept: LearningConcept = {
  id: conceptId,
  name: 'Closure',
  normalizedKey: 'closure',
  canonicalSummary: null,
  conceptType: 'mechanism',
  coreConcept: null,
  architecturalPattern: null,
  programmingParadigm: null,
  languageOrRuntime: [],
  surfaceFeatures: [],
  prerequisites: [],
  relatedConcepts: [],
  contrastConcepts: [],
  representativeCaptureIds: [],
  familiarityScore: 0,
  importanceScore: 0,
  createdAt: 0,
  updatedAt: 0,
};

describe('conceptMatchPreCheck', () => {
  it('skips legacy vector matches before loading Stage 1 concepts', async () => {
    const { conceptMatchPreCheck } = await import('../conceptMatchPreCheck');
    mocks.enqueueEmbed.mockResolvedValueOnce(new Float32Array([1, 0]));
    mocks.topMatches.mockResolvedValueOnce([
      { id: 'legacy-concept-id', cosine: 0.9, score: 0.9 },
      { id: conceptId, cosine: 0.8, score: 0.8 },
      { id: 'c_belowthresholdxxxxxxxx', cosine: 0.4, score: 0.4 },
    ]);
    mocks.getLearningConceptById.mockResolvedValueOnce(concept);

    const matches = await conceptMatchPreCheck('selected code', { threshold: 0.6, limit: 3 });

    expect(mocks.getLearningConceptById).toHaveBeenCalledTimes(1);
    expect(mocks.getLearningConceptById).toHaveBeenCalledWith(conceptId);
    expect(matches).toEqual([{ concept, similarity: 0.8 }]);
  });
});
