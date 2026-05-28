import { describe, expect, it, vi } from 'vitest';
import {
  CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
  type ConceptualizePromptClassification,
} from '../conceptualizePromptBuilder';
import {
  applyConceptualizeClassificationToCandidate,
  classifySaveCandidateWithConceptualize,
  ConceptualizeClassificationFailedError,
  runConceptualizeClassification,
} from '../conceptualizeClassification';
import { buildConceptualizeContextPackShadow } from '../conceptualizeContextPack';
import type { ConceptualizeProfileContext } from '../conceptualizeProfileContext';
import type { SaveModalCandidateData } from '../../types/saveModal';
import { unsafeConceptId } from '../../types/ids';
import { codingProfile } from '../../../ontology';

vi.mock('../../../../ai/queue', () => ({
  enqueue: vi.fn(),
}));

function context(): ConceptualizeProfileContext {
  return {
    profile: codingProfile,
    baseProfile: codingProfile,
    branches: [],
    selectionSnapshot: { baseProfileId: codingProfile.id },
    proposalTarget: { kind: 'base_profile', profileId: codingProfile.id },
    compositionStamp: {
      baseProfileId: codingProfile.id,
      activeProfileId: codingProfile.id,
      branchOrder: [],
      compositionHash: 'fnv1a32:testhash',
    },
    scopeLegend: {
      activeScopeId: codingProfile.id,
      scopes: [{ scopeId: codingProfile.id, label: codingProfile.label, kind: 'baseProfile' }],
    },
  };
}

function candidate(overrides: Partial<SaveModalCandidateData> = {}): SaveModalCandidateData {
  return {
    title: 'Closure keeps outer state',
    whatClicked: 'The returned function can still read the outer variable.',
    whyItMattered: 'It explains callbacks that remember setup state.',
    rawSnippet: 'const value = 1; return () => value;',
    snippetLang: 'ts',
    snippetSourcePath: 'src/example.ts',
    snippetStartLine: 1,
    snippetEndLine: 1,
    chatMessageId: 'message-1',
    sessionId: 'chat-1',
    derivedFromCaptureId: null,
    isNewLanguageForExistingConcept: true,
    linkedConceptName: 'Closure',
    linkedConceptLanguages: ['javascript'],
    linkedConceptId: null,
    extractionConfidence: 0.4,
    matchSimilarity: 0.75,
    conceptHint: {
      proposedName: 'Closure',
      proposedNormalizedKey: 'closure',
      proposedConceptType: 'mechanism',
      extractionConfidence: 0.4,
      linkedConceptId: null,
      linkedConceptName: 'Closure',
      linkedConceptLanguages: ['javascript'],
      isNewLanguageForExistingConcept: true,
    },
    rawProposedTypeNodeId: null,
    keywords: ['closure'],
    ...overrides,
  };
}

function classification(
  overrides: Partial<ConceptualizePromptClassification> = {},
): ConceptualizePromptClassification {
  return {
    primaryNodeRef: { scopeId: 'coding', nodeId: 'pattern' },
    noStrongMatch: false,
    suggestedNewConcept: null,
    confidence: 0.83,
    rationale: 'The capture describes a reusable pattern.',
    ...overrides,
  };
}

function validOutput(
  overrides: Partial<ConceptualizePromptClassification> = {},
): unknown {
  return {
    schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
    classification: classification(overrides),
    diagnostics: {
      candidateRefs: [
        { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 2, score: 0.45 },
      ],
    },
  };
}

describe('Conceptualize classification flip', () => {
  it('maps a validated scoped primary ref onto the existing save candidate shape', () => {
    const sourceCandidate = candidate();
    const pack = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: sourceCandidate,
      context: context(),
      now: () => 123,
    }).pack;

    const mapped = applyConceptualizeClassificationToCandidate({
      candidate: sourceCandidate,
      context: context(),
      pack,
      classification: classification(),
    });

    expect(mapped.conceptHint?.proposedConceptType).toBe('pattern');
    expect(mapped.conceptHint?.extractionConfidence).toBe(0.83);
    expect(mapped.extractionConfidence).toBe(0.83);
    expect(mapped.rawProposedTypeIdentity).toEqual({
      kind: 'scoped_ref',
      scopeId: 'coding',
      nodeId: 'pattern',
      source: 'conceptualize',
    });
    expect(mapped.rawProposedTypeNodeId).toBe('coding:pattern');
    expect(mapped.linkedConceptName).toBeNull();
    expect(mapped.matchSimilarity).toBeNull();
    expect(mapped.isNewLanguageForExistingConcept).toBe(false);
  });

  it('builds a valid concept hint even when the extractor candidate had none', () => {
    const sourceCandidate = candidate({
      conceptHint: null,
      linkedConceptName: null,
      linkedConceptLanguages: null,
      matchSimilarity: null,
      isNewLanguageForExistingConcept: false,
    });
    const pack = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: sourceCandidate,
      context: context(),
      now: () => 123,
    }).pack;

    const mapped = applyConceptualizeClassificationToCandidate({
      candidate: sourceCandidate,
      context: context(),
      pack,
      classification: classification(),
    });

    expect(mapped.conceptHint).toMatchObject({
      proposedName: 'Closure keeps outer state',
      proposedNormalizedKey: 'closure keeps outer state',
      proposedConceptType: 'pattern',
      extractionConfidence: 0.83,
    });
    expect(mapped.rawProposedTypeIdentity).toEqual({
      kind: 'scoped_ref',
      scopeId: 'coding',
      nodeId: 'pattern',
      source: 'conceptualize',
    });
    expect(mapped.rawProposedTypeNodeId).toBe('coding:pattern');
  });

  it('preserves linked concept metadata when Conceptualize keeps the same type', () => {
    const linkedConceptId = unsafeConceptId('c_123456789012345678901');
    const sourceCandidate = candidate({
      linkedConceptId,
      linkedConceptName: 'Closure',
      linkedConceptLanguages: ['javascript'],
      matchSimilarity: 0.75,
      isNewLanguageForExistingConcept: true,
      conceptHint: {
        proposedName: 'Closure',
        proposedNormalizedKey: 'closure',
        proposedConceptType: 'pattern',
        extractionConfidence: 0.4,
        linkedConceptId,
        linkedConceptName: 'Closure',
        linkedConceptLanguages: ['javascript'],
        isNewLanguageForExistingConcept: true,
      },
    });
    const pack = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: sourceCandidate,
      context: context(),
      now: () => 123,
    }).pack;

    const mapped = applyConceptualizeClassificationToCandidate({
      candidate: sourceCandidate,
      context: context(),
      pack,
      classification: classification(),
    });

    expect(mapped.linkedConceptId).toBe(linkedConceptId);
    expect(mapped.linkedConceptName).toBe('Closure');
    expect(mapped.linkedConceptLanguages).toEqual(['javascript']);
    expect(mapped.matchSimilarity).toBe(0.75);
    expect(mapped.isNewLanguageForExistingConcept).toBe(true);
    expect(mapped.conceptHint).toMatchObject({
      linkedConceptId,
      linkedConceptName: 'Closure',
      linkedConceptLanguages: ['javascript'],
      isNewLanguageForExistingConcept: true,
    });
  });

  it('keeps no-strong-match honest by removing the proposed type instead of defaulting', () => {
    const sourceCandidate = candidate();
    const pack = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: sourceCandidate,
      context: context(),
      now: () => 123,
    }).pack;

    const mapped = applyConceptualizeClassificationToCandidate({
      candidate: sourceCandidate,
      context: context(),
      pack,
      classification: classification({
        primaryNodeRef: null,
        noStrongMatch: true,
        suggestedNewConcept: {
          label: 'Hook Snapshot',
          kind: 'subcategory',
          parentNodeRef: { scopeId: 'coding', nodeId: 'mechanism' },
          meaning: 'A specific hook timing snapshot.',
          reason: 'The existing mechanism node is too broad.',
        },
        confidence: 0.36,
      }),
    });

    expect(mapped.conceptHint).toBeNull();
    expect(mapped.rawProposedTypeIdentity).toBeNull();
    expect(mapped.rawProposedTypeNodeId).toBeNull();
    expect(mapped.extractionConfidence).toBe(0.36);
    expect(mapped.linkedConceptName).toBeNull();
    expect(mapped.conceptualizeMissingConcept).toEqual({
      status: 'no_strong_match',
      confidence: 0.36,
      rationale: 'The capture describes a reusable pattern.',
      suggestedNewConcept: {
        label: 'Hook Snapshot',
        kind: 'subcategory',
        parentNodeRef: { scopeId: 'coding', nodeId: 'mechanism' },
        parentLabel: 'Mechanism',
        meaning: 'A specific hook timing snapshot.',
        reason: 'The existing mechanism node is too broad.',
      },
    });
  });

  it('runs the prompt builder and validator with a retry before returning a classification', async () => {
    const calls: string[] = [];

    const result = await runConceptualizeClassification(
      {
        candidateId: 'candidate-0',
        candidate: candidate(),
        context: context(),
      },
      {
        complete: async (_prompt, input) => {
          calls.push(input);
          return calls.length === 1
            ? JSON.stringify(validOutput({
                primaryNodeRef: { scopeId: 'coding', nodeId: 'not_real' },
              }))
            : JSON.stringify(validOutput());
        },
      },
    );

    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('KORDEX_CONTEXT_PAYLOAD_JSON');
    expect(calls[1]).toContain('Validation error:');
    expect(result.output.classification.primaryNodeRef)
      .toEqual({ scopeId: 'coding', nodeId: 'pattern' });
  });

  it('retries when the model returns non-JSON output before a valid classification', async () => {
    const calls: string[] = [];

    const result = await runConceptualizeClassification(
      {
        candidateId: 'candidate-0',
        candidate: candidate(),
        context: context(),
      },
      {
        complete: async (_prompt, input) => {
          calls.push(input);
          return calls.length === 1
            ? '```json\n{"schemaVersion":"wrong"}\n```'
            : JSON.stringify(validOutput());
        },
      },
    );

    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('Validation error:');
    expect(result.output.classification.primaryNodeRef)
      .toEqual({ scopeId: 'coding', nodeId: 'pattern' });
  });

  it('does not retry when the model call is aborted', async () => {
    const abort = new Error('The operation was aborted');
    abort.name = 'AbortError';
    let calls = 0;

    await expect(runConceptualizeClassification(
      {
        candidateId: 'candidate-0',
        candidate: candidate(),
        context: context(),
      },
      {
        complete: async () => {
          calls += 1;
          throw abort;
        },
      },
    )).rejects.toBe(abort);

    expect(calls).toBe(1);
  });

  it('rejects suggested new concepts as a real proposed type', async () => {
    const mapped = await classifySaveCandidateWithConceptualize(
      {
        candidateId: 'candidate-0',
        candidate: candidate(),
        context: context(),
      },
      {
        complete: async () =>
          JSON.stringify({
            schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
            classification: classification({
              primaryNodeRef: null,
              noStrongMatch: true,
              suggestedNewConcept: {
                label: 'Hook Snapshot',
                kind: 'subcategory',
                parentNodeRef: { scopeId: 'coding', nodeId: 'mechanism' },
                meaning: 'A specific hook timing snapshot.',
                reason: 'The existing mechanism node is too broad.',
              },
              confidence: 0.39,
            }),
            diagnostics: {
              candidateRefs: [
                { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 2, score: 0.52 },
              ],
            },
          }),
      },
    );

    expect(mapped.conceptHint).toBeNull();
    expect(mapped.rawProposedTypeIdentity).toBeNull();
    expect(mapped.rawProposedTypeNodeId).toBeNull();
    expect(mapped).not.toHaveProperty('suggestedNewConcept');
    expect(mapped).not.toHaveProperty('diagnostics');
    expect(mapped.conceptualizeMissingConcept).toMatchObject({
      status: 'no_strong_match',
      suggestedNewConcept: {
        label: 'Hook Snapshot',
        parentLabel: 'Mechanism',
      },
    });
    expect(mapped.conceptualizeNearMissCandidates).toEqual([
      { scopeId: 'coding', nodeId: 'mechanism', rank: 2, score: 0.52 },
    ]);
  });

  it('clears stale missing-concept review state after a strong match', () => {
    const sourceCandidate = candidate({
      conceptualizeMissingConcept: {
        status: 'no_strong_match',
        confidence: 0.2,
        rationale: 'Old missing state',
        suggestedNewConcept: null,
      },
    });
    const pack = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: sourceCandidate,
      context: context(),
      now: () => 123,
    }).pack;

    const mapped = applyConceptualizeClassificationToCandidate({
      candidate: sourceCandidate,
      context: context(),
      pack,
      classification: classification(),
    });

    expect(mapped.conceptHint?.proposedConceptType).toBe('pattern');
    expect(mapped.conceptualizeMissingConcept).toBeNull();
  });

  it('keeps hidden diagnostic candidates as internal near-miss correction context', async () => {
    const mapped = await classifySaveCandidateWithConceptualize(
      {
        candidateId: 'candidate-0',
        candidate: candidate(),
        context: context(),
      },
      {
        complete: async () =>
          JSON.stringify({
            schemaVersion: CONCEPTUALIZE_PROMPT_OUTPUT_VERSION,
            classification: classification(),
            diagnostics: {
              candidateRefs: [
                { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 2, score: 0.45 },
                { ref: { scopeId: 'coding', nodeId: 'mental_model' }, rank: 3 },
              ],
            },
          }),
      },
    );

    expect(mapped.conceptualizeNearMissCandidates).toEqual([
      { scopeId: 'coding', nodeId: 'mechanism', rank: 2, score: 0.45 },
      { scopeId: 'coding', nodeId: 'mental_model', rank: 3 },
    ]);
    expect(mapped).not.toHaveProperty('diagnostics');
  });

  it('defensively rejects diagnostic candidates that try to reuse primary rank', () => {
    const sourceCandidate = candidate();
    const pack = buildConceptualizeContextPackShadow({
      candidateId: 'candidate-0',
      candidate: sourceCandidate,
      context: context(),
      now: () => 123,
    }).pack;

    expect(() => applyConceptualizeClassificationToCandidate({
      candidate: sourceCandidate,
      context: context(),
      pack,
      classification: classification(),
      diagnosticCandidates: [
        { ref: { scopeId: 'coding', nodeId: 'mechanism' }, rank: 1, score: 0.45 },
      ],
    })).toThrow(/diagnostic candidate rank must be >= 2/);
  });

  it('throws when the classifier repeatedly violates the scoped ref contract', async () => {
    await expect(runConceptualizeClassification(
      {
        candidateId: 'candidate-0',
        candidate: candidate(),
        context: context(),
      },
      {
        complete: async () =>
          JSON.stringify(validOutput({
            primaryNodeRef: { scopeId: 'coding', nodeId: 'not_real' },
          })),
      },
    )).rejects.toBeInstanceOf(ConceptualizeClassificationFailedError);
  });
});
