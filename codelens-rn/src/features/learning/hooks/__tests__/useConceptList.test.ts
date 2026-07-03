import { describe, expect, it, vi } from 'vitest';
import { unsafeConceptId } from '../../types/ids';
import { matchesConceptListFilters } from '../useConceptList';
import type { LearningConcept } from '../../types/learning';

vi.mock('../../data/conceptRepo', () => ({
  getLearningConceptList: vi.fn(),
}));

function concept(overrides: Partial<LearningConcept> = {}): LearningConcept {
  return {
    id: unsafeConceptId('c_111111111111111111111'),
    profileId: 'coding',
    name: 'Composition',
    normalizedKey: 'composition',
    canonicalSummary: null,
    conceptType: 'composition',
    coreConcept: null,
    architecturalPattern: null,
    programmingParadigm: null,
    languageOrRuntime: [],
    surfaceFeatures: [],
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: [],
    familiarityScore: 0.5,
    importanceScore: 0.5,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('matchesConceptListFilters', () => {
  it('scopes equal type node ids by profile id', () => {
    const codingComposition = concept({
      id: unsafeConceptId('c_111111111111111111111'),
      profileId: 'coding',
      conceptType: 'composition',
    });
    const photographyComposition = concept({
      id: unsafeConceptId('c_222222222222222222222'),
      profileId: 'photography',
      conceptType: 'composition',
    });

    expect(matchesConceptListFilters(codingComposition, {
      profileIds: ['coding'],
      typeNodeIds: ['composition'],
    })).toBe(true);
    expect(matchesConceptListFilters(photographyComposition, {
      profileIds: ['coding'],
      typeNodeIds: ['composition'],
    })).toBe(false);
    expect(matchesConceptListFilters(photographyComposition, {
      profileId: 'photography',
      conceptType: 'composition',
    })).toBe(true);
  });
});
