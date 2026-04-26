import { describe, expect, it } from 'vitest';
import { sortCapturesForHub, sortConceptsForHub } from '../hubOrdering';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import type { LearningCapture, LearningConcept } from '../../types/learning';

function capture(overrides: Partial<LearningCapture>): LearningCapture {
  return {
    id: overrides.id!,
    title: 'Capture',
    whatClicked: 'clicked',
    whyItMattered: null,
    rawSnippet: 'const x = 1',
    snippetLang: null,
    snippetSource: null,
    chatMessageId: null,
    sessionId: null,
    state: 'unresolved',
    linkedConceptId: null,
    editableUntil: 1,
    extractionConfidence: null,
    derivedFromCaptureId: null,
    embeddingStatus: 'pending',
    embeddingRetryCount: 0,
    conceptHint: null,
    keywords: [],
    createdAt: overrides.createdAt ?? 1,
    updatedAt: 1,
    ...overrides,
  };
}

function concept(overrides: Partial<LearningConcept>): LearningConcept {
  return {
    id: overrides.id!,
    name: overrides.name ?? 'Concept',
    normalizedKey: 'concept',
    canonicalSummary: null,
    conceptType: 'mental_model',
    coreConcept: null,
    architecturalPattern: null,
    programmingParadigm: null,
    languageOrRuntime: [],
    surfaceFeatures: [],
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: [],
    familiarityScore: overrides.familiarityScore ?? 0,
    importanceScore: overrides.importanceScore ?? 0,
    createdAt: 1,
    updatedAt: overrides.updatedAt ?? 1,
    ...overrides,
  };
}

describe('Stage 4 hub ordering', () => {
  it('sorts captures by newest first and id as deterministic tie breaker', () => {
    const ordered = sortCapturesForHub([
      capture({ id: unsafeLearningCaptureId('lc_222222222222222222222'), createdAt: 10 }),
      capture({ id: unsafeLearningCaptureId('lc_111111111111111111111'), createdAt: 10 }),
      capture({ id: unsafeLearningCaptureId('lc_333333333333333333333'), createdAt: 5 }),
    ]);

    expect(ordered.map((item) => item.id)).toEqual([
      'lc_111111111111111111111',
      'lc_222222222222222222222',
      'lc_333333333333333333333',
    ]);
  });

  it('sorts concepts weakest first, then updated newest, then name', () => {
    const ordered = sortConceptsForHub([
      concept({ id: unsafeConceptId('c_111111111111111111111'), name: 'Beta', familiarityScore: 0.3, importanceScore: 0.2, updatedAt: 3 }),
      concept({ id: unsafeConceptId('c_222222222222222222222'), name: 'Alpha', familiarityScore: 0.1, importanceScore: 0.2, updatedAt: 1 }),
      concept({ id: unsafeConceptId('c_333333333333333333333'), name: 'Gamma', familiarityScore: 0.1, importanceScore: 0.2, updatedAt: 5 }),
    ]);

    expect(ordered.map((item) => item.name)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });
});
