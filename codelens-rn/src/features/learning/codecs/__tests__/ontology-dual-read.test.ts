import { describe, expect, it } from 'vitest';
import { conceptRowToDomain } from '../concept';
import { newConceptId, newLearningCaptureId } from '../../types/ids';

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: newConceptId(),
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
    representativeCaptureIds: [newLearningCaptureId()],
    familiarityScore: 0.2,
    importanceScore: 0.7,
    languageSyntaxLegacy: null,
    taxonomy: { tags: [] },
    sessionIds: [],
    strength: 0.5,
    createdAt: '2026-04-26T00:00:00.000Z',
    updatedAt: '2026-04-26T00:00:00.000Z',
    ...overrides,
  };
}

describe('Ontology dual-read codec', () => {
  it('parses old row without new profile columns', () => {
    const result = conceptRowToDomain(baseRow());
    expect(result.conceptType).toBe('mechanism');
    expect(result.coreConcept).toBe('lexical scope');
    expect(result.architecturalPattern).toBeNull();
    expect(result.programmingParadigm).toBe('functional');
  });

  it('reads conceptType from typeNodeId when present', () => {
    const result = conceptRowToDomain(baseRow({
      typeNodeId: 'pattern',
      conceptType: 'mechanism',
    }));
    expect(result.conceptType).toBe('pattern');
  });

  it('falls back to conceptType when typeNodeId is empty string', () => {
    const result = conceptRowToDomain(baseRow({
      typeNodeId: '',
      conceptType: 'mental_model',
    }));
    expect(result.conceptType).toBe('mental_model');
  });

  it('reads metadata fields from metadataJson when present', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: {
        coreConcept: 'event loop',
        programmingParadigm: 'reactive',
      },
      coreConcept: 'lexical scope',
      programmingParadigm: 'functional',
    }));
    expect(result.coreConcept).toBe('event loop');
    expect(result.programmingParadigm).toBe('reactive');
    expect(result.architecturalPattern).toBeNull();
  });

  it('metadata_json wins when it disagrees with legacy columns', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: {
        coreConcept: 'json-value',
        architecturalPattern: 'json-pattern',
        programmingParadigm: 'json-paradigm',
      },
      coreConcept: 'legacy-value',
      architecturalPattern: 'legacy-pattern',
      programmingParadigm: 'legacy-paradigm',
    }));
    expect(result.coreConcept).toBe('json-value');
    expect(result.architecturalPattern).toBe('json-pattern');
    expect(result.programmingParadigm).toBe('json-paradigm');
  });

  it('falls back to legacy columns when metadataJson is empty object', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: {},
      coreConcept: 'legacy-core',
      programmingParadigm: 'legacy-paradigm',
    }));
    expect(result.coreConcept).toBe('legacy-core');
    expect(result.programmingParadigm).toBe('legacy-paradigm');
  });

  it('handles metadataJson as a JSON string (raw SQL result)', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: '{"coreConcept":"from-string"}',
      coreConcept: 'legacy',
    }));
    expect(result.coreConcept).toBe('from-string');
  });

  it('explicit null in metadataJson wins over legacy column value', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: { coreConcept: null },
      coreConcept: 'legacy-should-be-ignored',
    }));
    expect(result.coreConcept).toBeNull();
  });

  it('non-string value in metadataJson falls back to legacy column', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: { coreConcept: 42, architecturalPattern: { nested: true } },
      coreConcept: 'legacy-core',
      architecturalPattern: 'legacy-arch',
    }));
    expect(result.coreConcept).toBe('legacy-core');
    expect(result.architecturalPattern).toBe('legacy-arch');
  });

  it('malformed metadataJson string falls back to legacy columns', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: '{not valid json',
      coreConcept: 'fallback-core',
      programmingParadigm: 'fallback-paradigm',
    }));
    expect(result.coreConcept).toBe('fallback-core');
    expect(result.programmingParadigm).toBe('fallback-paradigm');
  });

  it('unknown keys in metadataJson are ignored', () => {
    const result = conceptRowToDomain(baseRow({
      metadataJson: {
        unknownKey: 'should-be-ignored',
        anotherKey: 123,
        coreConcept: 'known-value',
      },
      coreConcept: 'legacy',
    }));
    expect(result.coreConcept).toBe('known-value');
    // unknown keys don't surface anywhere on the domain object
    expect(Object.keys(result)).not.toContain('unknownKey');
    expect(Object.keys(result)).not.toContain('anotherKey');
  });

  it('handles all new fields together', () => {
    const result = conceptRowToDomain(baseRow({
      profileId: 'coding',
      typeNodeId: 'data_structure',
      metadataJson: {
        coreConcept: 'hash map',
        architecturalPattern: 'cache layer',
      },
      conceptType: 'mechanism',
      coreConcept: 'old-core',
      architecturalPattern: null,
      programmingParadigm: 'imperative',
    }));
    expect(result.conceptType).toBe('data_structure');
    expect(result.coreConcept).toBe('hash map');
    expect(result.architecturalPattern).toBe('cache layer');
    expect(result.programmingParadigm).toBe('imperative');
  });
});
