import { describe, expect, it } from 'vitest';
import { buildLearningConceptEmbeddingText } from '../services/conceptEmbedding';
import { conceptRowToDomain } from '../../codecs/concept';
import { newConceptId, newLearningCaptureId } from '../../types/ids';
import type { LearningConcept } from '../../types/learning';

function makeConcept(overrides: Partial<LearningConcept> = {}): LearningConcept {
  return {
    id: newConceptId(),
    name: 'Closure',
    normalizedKey: 'closure',
    canonicalSummary: 'A function retains lexical scope.',
    conceptType: 'mechanism',
    coreConcept: 'lexical scope',
    architecturalPattern: null,
    programmingParadigm: 'functional',
    languageOrRuntime: ['javascript'],
    surfaceFeatures: ['closures'],
    prerequisites: [],
    relatedConcepts: [],
    contrastConcepts: [],
    representativeCaptureIds: [],
    familiarityScore: 0.2,
    importanceScore: 0.7,
    createdAt: 1_771_900_000_000,
    updatedAt: 1_771_900_000_000,
    ...overrides,
  };
}

describe('buildLearningConceptEmbeddingText', () => {
  it('includes name, summary, coreConcept, conceptType, languages, and surface features', () => {
    const text = buildLearningConceptEmbeddingText(makeConcept());
    expect(text).toContain('Closure');
    expect(text).toContain('A function retains lexical scope.');
    expect(text).toContain('lexical scope');
    expect(text).toContain('mechanism');
    expect(text).toContain('javascript');
    expect(text).toContain('closures');
  });

  it('includes programmingParadigm when present', () => {
    const text = buildLearningConceptEmbeddingText(makeConcept({ programmingParadigm: 'reactive' }));
    expect(text).toContain('reactive');
  });

  it('includes architecturalPattern when present', () => {
    const text = buildLearningConceptEmbeddingText(makeConcept({ architecturalPattern: 'repository' }));
    expect(text).toContain('repository');
  });

  it('omits null fields from embedding text', () => {
    const text = buildLearningConceptEmbeddingText(makeConcept({
      canonicalSummary: null,
      coreConcept: null,
      programmingParadigm: null,
    }));
    expect(text).toContain('Closure');
    expect(text).toContain('mechanism');
    // null fields must not produce the word "null" in the output
    expect(text).not.toContain('null');
  });

  it('metadata_json.coreConcept flows through conceptRowToDomain into embedding text', () => {
    const captureId = newLearningCaptureId();
    const row = {
      id: newConceptId(),
      name: 'Event Loop',
      summary: '',
      normalizedKey: 'event loop',
      canonicalSummary: null,
      conceptType: 'mechanism' as const,
      coreConcept: 'legacy-core',
      architecturalPattern: null,
      programmingParadigm: null,
      metadataJson: { coreConcept: 'async event processing' },
      languageOrRuntime: ['javascript'],
      surfaceFeatures: [],
      prerequisites: [],
      relatedConcepts: [],
      contrastConcepts: [],
      representativeCaptureIds: [captureId],
      familiarityScore: 0.3,
      importanceScore: 0.6,
      languageSyntaxLegacy: null,
      taxonomy: { tags: [] },
      sessionIds: [],
      strength: 0.5,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
    };

    const concept = conceptRowToDomain(row);
    expect(concept.coreConcept).toBe('async event processing');

    const text = buildLearningConceptEmbeddingText(concept);
    expect(text).toContain('async event processing');
    expect(text).not.toContain('legacy-core');
  });
});
