import { describe, expect, it } from 'vitest';
import {
  ontologyCorrectionEvidenceToRow,
  parseActiveSelectionSnapshot,
  rowToOntologyCorrectionEvidence,
  validateOntologyCorrectionEvidenceForWrite,
} from '../codecs/ontologyCorrectionEvidence';
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
  it('maps a valid evidence record to a DB row', () => {
    expect(ontologyCorrectionEvidenceToRow(validEvidence())).toEqual({
      id: 'ev-1',
      profileId: 'coding',
      activeSelectionSnapshotJson: {
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
      nearMissCandidatesJson: null,
      reason: 'Reviewed by user',
      source: 'user',
      createdAt: 1_700_000_000_000,
    });
  });

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

  it('converts a DB row back to the domain evidence model', () => {
    const evidence = rowToOntologyCorrectionEvidence({
      id: 'ev-1',
      profileId: 'coding',
      activeSelectionSnapshotJson: JSON.stringify({
        baseProfileId: 'coding',
        projectBranchIds: ['project-branch-1'],
      }),
      subjectKind: 'item',
      subjectId: 'concept-1',
      field: 'typeNodeId',
      previousTypeNodeId: 'mechanism',
      correctedTypeNodeId: 'pattern',
      rawProposedTypeNodeId: 'hallucinated_runtime_kind',
      nearMissCandidatesJson: JSON.stringify([
        { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
      ]),
      reason: null,
      source: 'user',
      createdAt: 1,
    });

    expect(evidence).toEqual(validEvidence({
      activeSelectionSnapshot: {
        baseProfileId: 'coding',
        projectBranchIds: ['project-branch-1'],
      },
      reason: null,
      rawProposedTypeNodeId: 'hallucinated_runtime_kind',
      nearMissCandidates: [
        { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
      ],
      createdAt: 1,
    }));
  });

  it('maps correction near-miss candidates to and from the DB JSON column', () => {
    const evidence = validEvidence({
      nearMissCandidates: [
        { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
        { scopeId: 'coding', nodeId: 'mental_model', rank: 3 },
      ],
    });

    const row = ontologyCorrectionEvidenceToRow(evidence);
    expect(row.nearMissCandidatesJson).toEqual([
      { scopeId: 'coding', nodeId: 'pattern', rank: 2, score: 0.69 },
      { scopeId: 'coding', nodeId: 'mental_model', rank: 3 },
    ]);

    const roundTripRow: Parameters<typeof rowToOntologyCorrectionEvidence>[0] = {
      ...row,
      previousTypeNodeId: row.previousTypeNodeId ?? null,
      rawProposedTypeNodeId: row.rawProposedTypeNodeId ?? null,
      nearMissCandidatesJson: JSON.stringify(row.nearMissCandidatesJson),
      reason: row.reason ?? null,
    };
    expect(rowToOntologyCorrectionEvidence(roundTripRow)).toEqual(evidence);
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
