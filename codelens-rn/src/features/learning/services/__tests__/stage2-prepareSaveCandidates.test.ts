import { describe, expect, it, vi } from 'vitest';
import { prepareSaveCandidates } from '../prepareSaveCandidates';
import { unsafeConceptId } from '../../types/ids';
import type { ConceptMatch } from '../conceptMatchPreCheck';

vi.mock('../../../../ai/queue', () => ({
  enqueue: vi.fn(),
}));

vi.mock('../conceptMatchPreCheck', () => ({
  conceptMatchPreCheck: vi.fn(),
}));

const conceptId = unsafeConceptId('c_123456789012345678901');

describe('Stage 2 prepareSaveCandidates', () => {
  it('maps extractor output to save modal candidate data with match similarity', async () => {
    const matches: ConceptMatch[] = [
      {
        similarity: 0.72,
        concept: {
          id: conceptId,
          name: 'Closure',
          normalizedKey: 'closure',
          canonicalSummary: null,
          conceptType: 'mechanism',
          coreConcept: 'lexical scope',
          architecturalPattern: null,
          programmingParadigm: null,
          languageOrRuntime: ['javascript'],
          surfaceFeatures: [],
          prerequisites: [],
          relatedConcepts: [],
          contrastConcepts: [],
          representativeCaptureIds: [],
          familiarityScore: 0,
          importanceScore: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    ];

    const candidates = await prepareSaveCandidates(
      {
        selectedText: 'const value = 1; return () => value;',
        snippetLang: 'typescript',
      },
      {
        preCheck: async () => matches,
        complete: async () =>
          JSON.stringify({
            candidates: [
              {
                title: 'Closure keeps outer state',
                whatClicked: 'The returned function can still read the outer variable.',
                whyItMattered: null,
                rawSnippet: 'const value = 1; return () => value;',
                conceptHint: {
                  proposedName: 'Closure',
                  proposedNormalizedKey: 'closure',
                  proposedConceptType: 'mechanism',
                  extractionConfidence: 0.9,
                  linkedConceptId: conceptId,
                  linkedConceptName: 'Closure',
                  linkedConceptLanguages: ['javascript'],
                  isNewLanguageForExistingConcept: true,
                },
              },
            ],
          }),
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      linkedConceptId: conceptId,
      matchSimilarity: 0.72,
      snippetLang: 'typescript',
      isNewLanguageForExistingConcept: true,
    });
  });
});
