import { describe, expect, it } from 'vitest';
import { captureRowToDomain, ConceptHintCodec, KeywordsCodec } from '../capture';
import {
  ConceptIdArrayCodec,
  conceptRowToDomain,
  LanguageOrRuntimeCodec,
  normalizeConceptKey,
  RepresentativeCaptureIdsCodec,
  SurfaceFeaturesCodec,
} from '../concept';
import { newConceptId, newLearningCaptureId } from '../../types/ids';

describe('Stage 1 codecs', () => {
  it('round-trips capture JSON columns loudly', () => {
    const conceptHint = {
      proposedName: 'Closure',
      proposedNormalizedKey: 'closure',
      proposedConceptType: 'mechanism',
      extractionConfidence: 0.91,
      linkedConceptId: null,
      linkedConceptName: null,
      linkedConceptLanguages: null,
      isNewLanguageForExistingConcept: false,
    };

    expect(ConceptHintCodec.parse(JSON.parse(JSON.stringify(conceptHint)))).toEqual(conceptHint);
    expect(KeywordsCodec.parse(JSON.parse(JSON.stringify(['scope', 'closure'])))).toEqual([
      'scope',
      'closure',
    ]);
    expect(() => KeywordsCodec.parse(JSON.parse('{"not":"an array"}'))).toThrow();
  });

  it('maps capture rows without silent JSON fallbacks', () => {
    const captureId = newLearningCaptureId();
    const conceptId = newConceptId();
    const row = {
      id: captureId,
      title: 'Closure clicked',
      whatClicked: 'The callback keeps the outer value.',
      whyItMattered: null,
      rawSnippet: 'const value = 1; return () => value;',
      snippetLang: 'typescript',
      snippetSourcePath: 'src/example.ts',
      snippetStartLine: 1,
      snippetEndLine: 2,
      chatMessageId: null,
      sessionId: null,
      state: 'linked' as const,
      linkedConceptId: conceptId,
      editableUntil: 1_772_000_000_000,
      extractionConfidence: 0.8,
      derivedFromCaptureId: null,
      embeddingStatus: 'pending' as const,
      embeddingRetryCount: 0,
      conceptHint: null,
      keywords: ['closure'],
      createdAt: 1_771_900_000_000,
      updatedAt: 1_771_900_000_000,
    };

    expect(captureRowToDomain(row)).toMatchObject({
      id: captureId,
      linkedConceptId: conceptId,
      keywords: ['closure'],
      snippetSource: { path: 'src/example.ts', startLine: 1, endLine: 2 },
    });

    expect(() => captureRowToDomain({ ...row, keywords: '{"bad":true}' as unknown as string[] })).toThrow();
  });

  it('round-trips concept JSON columns and branded references', () => {
    const conceptId = newConceptId();
    const captureId = newLearningCaptureId();

    expect(LanguageOrRuntimeCodec.parse(['typescript', 'react native'])).toEqual([
      'typescript',
      'react native',
    ]);
    expect(SurfaceFeaturesCodec.parse(['hooks'])).toEqual(['hooks']);
    expect(ConceptIdArrayCodec.parse([conceptId])).toEqual([conceptId]);
    expect(RepresentativeCaptureIdsCodec.parse([captureId])).toEqual([captureId]);
    expect(() => ConceptIdArrayCodec.parse(['not-a-concept-id'])).toThrow();
  });

  it('maps concept rows and normalizes keys', () => {
    const conceptId = newConceptId();
    const captureId = newLearningCaptureId();
    const row = {
      id: conceptId,
      name: 'Closure',
      summary: 'Legacy summary',
      normalizedKey: 'closure',
      canonicalSummary: 'A function retains lexical scope.',
      conceptType: 'mechanism' as const,
      coreConcept: 'lexical scope',
      architecturalPattern: null,
      programmingParadigm: 'functional',
      languageOrRuntime: ['javascript'],
      surfaceFeatures: ['closures'],
      prerequisites: [],
      relatedConcepts: [],
      contrastConcepts: [],
      representativeCaptureIds: [captureId],
      familiarityScore: 0.2,
      importanceScore: 0.7,
      languageSyntaxLegacy: null,
      taxonomy: { tags: [] },
      sessionIds: [],
      strength: 0.5,
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
    };

    expect(normalizeConceptKey('  Async   Iterator  ')).toBe('async iterator');
    expect(conceptRowToDomain(row)).toMatchObject({
      id: conceptId,
      normalizedKey: 'closure',
      representativeCaptureIds: [captureId],
      familiarityScore: 0.2,
    });
    expect(() =>
      conceptRowToDomain({ ...row, languageOrRuntime: '{"bad":true}' as unknown as string[] }),
    ).toThrow();
  });
});
