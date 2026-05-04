import { describe, expect, it } from 'vitest';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import { conceptRowToRetrievedPayload } from '../data/rowMappers';

const conceptId = unsafeConceptId('c_111111111111111111111');
const captureId = unsafeLearningCaptureId('lc_222222222222222222222');

function baseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: conceptId,
    name: 'Closure',
    concept_type: 'mechanism',
    canonical_summary: 'A function retains lexical scope.',
    core_concept: 'lexical scope',
    language_or_runtime_json: ['javascript'],
    surface_features_json: ['closures'],
    familiarity_score: 0.2,
    importance_score: 0.7,
    representative_capture_ids_json: [captureId],
    created_at: 1_771_900_000_000,
    last_accessed_at: null,
    ...overrides,
  };
}

describe('conceptRowToRetrievedPayload dual-read', () => {
  it('parses old row without new columns', () => {
    const result = conceptRowToRetrievedPayload(baseRow());
    expect(result.typeNodeId).toBe('mechanism');
    expect(result.coreConcept).toBe('lexical scope');
    expect(result.name).toBe('Closure');
  });

  it('prefers type_node_id over concept_type when non-empty', () => {
    const result = conceptRowToRetrievedPayload(baseRow({
      type_node_id: 'pattern',
      concept_type: 'mechanism',
    }));
    expect(result.typeNodeId).toBe('pattern');
  });

  it('falls back to concept_type when type_node_id is empty string', () => {
    const result = conceptRowToRetrievedPayload(baseRow({
      type_node_id: '',
      concept_type: 'mental_model',
    }));
    expect(result.typeNodeId).toBe('mental_model');
  });

  it('falls back to concept_type when type_node_id is absent', () => {
    const result = conceptRowToRetrievedPayload(baseRow({ concept_type: 'data_structure' }));
    expect(result.typeNodeId).toBe('data_structure');
  });

  it('prefers metadata_json coreConcept over legacy core_concept column', () => {
    const result = conceptRowToRetrievedPayload(baseRow({
      metadata_json: '{"coreConcept":"from-json"}',
      core_concept: 'from-legacy',
    }));
    expect(result.coreConcept).toBe('from-json');
  });

  it('prefers metadata_json as parsed object (Drizzle mode)', () => {
    const result = conceptRowToRetrievedPayload(baseRow({
      metadata_json: { coreConcept: 'from-object' },
      core_concept: 'from-legacy',
    }));
    expect(result.coreConcept).toBe('from-object');
  });

  it('falls back to core_concept when metadata_json is absent', () => {
    const result = conceptRowToRetrievedPayload(baseRow({ core_concept: 'only-legacy' }));
    expect(result.coreConcept).toBe('only-legacy');
  });

  it('falls back to core_concept on malformed metadata_json string', () => {
    const result = conceptRowToRetrievedPayload(baseRow({
      metadata_json: '{bad json',
      core_concept: 'fallback-value',
    }));
    expect(result.coreConcept).toBe('fallback-value');
  });

  it('yields null coreConcept when both metadata_json and legacy column are null', () => {
    const result = conceptRowToRetrievedPayload(baseRow({
      metadata_json: '{}',
      core_concept: null,
    }));
    expect(result.coreConcept).toBeNull();
  });
});
