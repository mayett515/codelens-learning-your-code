import { describe, expect, it } from 'vitest';
import { parseActiveSelectionSnapshot, validateOntologyCorrectionEvidenceForWrite } from '../codecs/ontologyCorrectionEvidence';
import type { OntologyCorrectionEvidence } from '../types';

function validEvidence(
  overrides: Partial<OntologyCorrectionEvidence> = {},
): OntologyCorrectionEvidence {
  return {
    id: 'ev-1',
    profileId: 'coding',
    activeSelectionSnapshot: {
      baseProfileId: 'coding',
      projectBranchIds: ['project-branch-1'],
      learningBranchIds: ['learning-branch-1'],
      personalBranchIds: ['personal-branch-1'],
    },
    subjectKind: 'item',
    subjectId: 'concept-1',
    field: 'typeNodeId',
    previousTypeNodeId: 'mechanism',
    correctedTypeNodeId: 'pattern',
    rawProposedTypeNodeId: null,
    reason: 'Reviewed by user',
    source: 'user',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe('ontology correction evidence codec', () => {

  it('parses active selection snapshot JSON from sqlite or backup rows', () => {
    const snapshot = parseActiveSelectionSnapshot(JSON.stringify({
      baseProfileId: 'coding',
      projectBranchIds: ['project-branch-1'],
    }));

    expect(snapshot).toEqual({
      baseProfileId: 'coding',
      projectBranchIds: ['project-branch-1'],
    });
  });

  it('rejects target/apply fields so evidence does not become an implicit patch command', () => {
    expect(() => validateOntologyCorrectionEvidenceForWrite({
      ...validEvidence(),
      targetLayerId: 'personal',
    })).toThrow();

    expect(() => parseActiveSelectionSnapshot({
      baseProfileId: 'coding',
      applyToBranchId: 'personal-branch-1',
    })).toThrow();
  });

  it('rejects profile and active selection base mismatches', () => {
    expect(() => validateOntologyCorrectionEvidenceForWrite(validEvidence({
      activeSelectionSnapshot: { baseProfileId: 'photography' },
    }))).toThrow(/profileId must match activeSelectionSnapshot\.baseProfileId/);
  });

  it('rejects no-op evidence where previous and corrected type ids match', () => {
    expect(() => validateOntologyCorrectionEvidenceForWrite(validEvidence({
      previousTypeNodeId: 'pattern',
      correctedTypeNodeId: 'pattern',
    }))).toThrow(/previousTypeNodeId and correctedTypeNodeId must differ/);
  });

  it('rejects malformed near-miss candidate snapshots', () => {
    expect(() => validateOntologyCorrectionEvidenceForWrite(validEvidence({
      nearMissCandidates: [
        { scopeId: 'coding', nodeId: 'pattern', rank: 1 },
      ],
    }))).toThrow();
  });
});
