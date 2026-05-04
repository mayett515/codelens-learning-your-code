import { describe, expect, it } from 'vitest';
import {
  buildCaptureClassificationJson,
  parseClassificationJsonToConceptHint,
  captureRowToDomain,
} from '../capture';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import type { ConceptHint } from '../../types/learning';

function makeHint(overrides: Partial<ConceptHint> = {}): ConceptHint {
  return {
    proposedName: 'Closure',
    proposedNormalizedKey: 'closure',
    proposedConceptType: 'mechanism',
    extractionConfidence: 0.9,
    linkedConceptId: null,
    linkedConceptName: null,
    linkedConceptLanguages: ['javascript'],
    isNewLanguageForExistingConcept: false,
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: unsafeLearningCaptureId('lc_111111111111111111111'),
    title: 'Test Capture',
    whatClicked: 'some snippet',
    whyItMattered: null,
    rawSnippet: 'const x = () => y;',
    snippetLang: null,
    snippetSourcePath: null,
    snippetStartLine: null,
    snippetEndLine: null,
    chatMessageId: null,
    sessionId: null,
    state: 'unresolved',
    linkedConceptId: null,
    editableUntil: 0,
    extractionConfidence: null,
    derivedFromCaptureId: null,
    embeddingStatus: 'pending',
    embeddingRetryCount: 0,
    conceptHint: null,
    keywords: [],
    createdAt: 1_771_900_000_000,
    updatedAt: 1_771_900_000_000,
    ...overrides,
  };
}

describe('buildCaptureClassificationJson', () => {
  it('maps hint fields to classification shape with profileId and proposedTypeNodeId', () => {
    const hint = makeHint();
    const cj = buildCaptureClassificationJson(hint);
    expect(cj.profileId).toBe('coding');
    expect(cj.proposedTypeNodeId).toBe('mechanism');
    expect(cj.proposedName).toBe('Closure');
    expect(cj.proposedNormalizedKey).toBe('closure');
    expect(cj.extractionConfidence).toBe(0.9);
    expect(cj.linkedConceptId).toBeNull();
    expect(cj.linkedConceptLanguages).toEqual(['javascript']);
    expect(cj.isNewLanguageForExistingConcept).toBe(false);
  });

  it('preserves non-null linkedConceptId', () => {
    const hint = makeHint({ linkedConceptId: unsafeConceptId('c_111111111111111111111') });
    const cj = buildCaptureClassificationJson(hint);
    expect(cj.linkedConceptId).toBe('c_111111111111111111111');
  });
});

describe('parseClassificationJsonToConceptHint', () => {
  it('returns null for null input', () => {
    expect(parseClassificationJsonToConceptHint(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseClassificationJsonToConceptHint(undefined)).toBeNull();
  });

  it('returns null for malformed JSON string', () => {
    expect(parseClassificationJsonToConceptHint('{bad json')).toBeNull();
  });

  it('returns null when proposedTypeNodeId is absent', () => {
    expect(parseClassificationJsonToConceptHint({ proposedName: 'X' })).toBeNull();
  });

  it('returns null when profileId is absent or not coding', () => {
    const classification = buildCaptureClassificationJson(makeHint());
    expect(parseClassificationJsonToConceptHint({ ...classification, profileId: undefined })).toBeNull();
    expect(parseClassificationJsonToConceptHint({ ...classification, profileId: 'photography' })).toBeNull();
  });

  it('returns null when proposedTypeNodeId is not a valid concept type', () => {
    const cj = { ...buildCaptureClassificationJson(makeHint()), proposedTypeNodeId: 'not_a_real_type' };
    expect(parseClassificationJsonToConceptHint(cj)).toBeNull();
  });

  it('round-trips a hint through buildCaptureClassificationJson (object input)', () => {
    const hint = makeHint();
    const recovered = parseClassificationJsonToConceptHint(buildCaptureClassificationJson(hint));
    expect(recovered).toEqual(hint);
  });

  it('round-trips a hint from a JSON string (legacy storage mode)', () => {
    const hint = makeHint();
    const jsonString = JSON.stringify(buildCaptureClassificationJson(hint));
    const recovered = parseClassificationJsonToConceptHint(jsonString);
    expect(recovered).toEqual(hint);
  });
});

describe('captureRowToDomain - conceptHint/classificationJson fallback', () => {
  it('reads conceptHint when present, ignores classificationJson', () => {
    const hint = makeHint({ proposedConceptType: 'mental_model' });
    const otherHint = makeHint({ proposedConceptType: 'pattern' });
    const row = makeRow({
      conceptHint: hint,
      classificationJson: buildCaptureClassificationJson(otherHint),
    });
    const capture = captureRowToDomain(row);
    expect(capture.conceptHint?.proposedConceptType).toBe('mental_model');
  });

  it('falls back to classificationJson when conceptHint is null', () => {
    const hint = makeHint();
    const row = makeRow({ conceptHint: null, classificationJson: buildCaptureClassificationJson(hint) });
    const capture = captureRowToDomain(row);
    expect(capture.conceptHint).toEqual(hint);
  });

  it('returns null conceptHint when both conceptHint and classificationJson are null', () => {
    const row = makeRow({ conceptHint: null, classificationJson: null });
    expect(captureRowToDomain(row).conceptHint).toBeNull();
  });

  it('returns null conceptHint on old row without classificationJson column', () => {
    const row = makeRow({ conceptHint: null });
    expect(captureRowToDomain(row).conceptHint).toBeNull();
  });
});
