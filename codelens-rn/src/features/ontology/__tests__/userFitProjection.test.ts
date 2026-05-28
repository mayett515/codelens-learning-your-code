import { describe, expect, it } from 'vitest';
import {
  profileChangeProposalTargetKey,
  projectUserFitSignals,
  userFitActiveSelectionScopeKey,
} from '../userFitProjection';
import type {
  OntologyCorrectionEvidence,
  ProfileChangeProposalTarget,
  ProfileProposalEvent,
} from '../types';

function correction(
  overrides: Partial<OntologyCorrectionEvidence> = {},
): OntologyCorrectionEvidence {
  return {
    id: 'evidence-1',
    profileId: 'coding',
    activeSelectionSnapshot: {
      baseProfileId: 'coding',
      projectBranchIds: ['react-project'],
    },
    subjectKind: 'capture',
    subjectId: 'capture-1',
    field: 'typeNodeId',
    previousTypeNodeId: 'star_trails',
    correctedTypeNodeId: 'long_exposure',
    nearMissCandidates: [
      {
        scopeId: 'coding',
        nodeId: 'long_exposure',
        rank: 2,
        score: 0.69,
      },
    ],
    source: 'user',
    createdAt: 100,
    ...overrides,
  };
}

function proposalEvent(
  overrides: Partial<ProfileProposalEvent> = {},
): ProfileProposalEvent {
  return {
    id: 'event-1',
    proposalId: 'proposal-1',
    action: 'applied',
    actorKind: 'user',
    baseProfileId: 'coding',
    proposalKind: 'classification_patch',
    target: { kind: 'profile_branch', branchId: 'react-project' },
    statusBefore: 'pending',
    statusAfter: 'accepted',
    proposalUpdatedAtBefore: 10,
    proposalUpdatedAtAfter: 20,
    createdAt: 110,
    ...overrides,
  };
}

describe('user-fit projection', () => {
  it('returns neutral empty output when no facts are supplied', () => {
    expect(projectUserFitSignals({ baseProfileId: 'coding' })).toEqual({
      baseProfileId: 'coding',
      nodeSignals: [],
      proposalSignals: [],
      summary: {
        correctionEvidenceCount: 0,
        proposalEventCount: 0,
        missingConceptCorrectionCount: 0,
        nearMissHitCount: 0,
        omittedNodeSignalCount: 0,
        omittedProposalSignalCount: 0,
      },
    });
  });

  it('projects correction evidence into bounded node signals without mutating profiles', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      correctionEvidence: [
        correction(),
        correction({
          id: 'evidence-2',
          previousTypeNodeId: null,
          correctedTypeNodeId: 'long_exposure',
          nearMissCandidates: [],
          createdAt: 120,
        }),
        correction({
          id: 'other-profile',
          profileId: 'photography',
          createdAt: 140,
        }),
      ],
    });

    expect(projection.summary).toEqual({
      correctionEvidenceCount: 2,
      proposalEventCount: 0,
      missingConceptCorrectionCount: 1,
      nearMissHitCount: 1,
      omittedNodeSignalCount: 0,
      omittedProposalSignalCount: 0,
    });

    expect(projection.nodeSignals).toEqual([
      {
        baseProfileId: 'coding',
        scopeId: 'base:coding|project:react-project|learning:-|personal:-',
        activeSelectionSnapshot: {
          baseProfileId: 'coding',
          projectBranchIds: ['react-project'],
          learningBranchIds: [],
          personalBranchIds: [],
        },
        nodeId: 'long_exposure',
        userFitConfidence: 0.789,
        score: 0.578,
        positiveCorrectionCount: 2,
        negativeCorrectionCount: 0,
        missingConceptCorrectionCount: 1,
        nearMissHitCount: 1,
        evidenceIds: ['evidence-1', 'evidence-2'],
        latestAt: 120,
      },
      {
        baseProfileId: 'coding',
        scopeId: 'base:coding|project:react-project|learning:-|personal:-',
        activeSelectionSnapshot: {
          baseProfileId: 'coding',
          projectBranchIds: ['react-project'],
          learningBranchIds: [],
          personalBranchIds: [],
        },
        nodeId: 'star_trails',
        userFitConfidence: 0.333,
        score: -0.334,
        positiveCorrectionCount: 0,
        negativeCorrectionCount: 1,
        missingConceptCorrectionCount: 0,
        nearMissHitCount: 0,
        evidenceIds: ['evidence-1'],
        latestAt: 100,
      },
    ]);
  });

  it('projects proposal event decisions separately from correction evidence', () => {
    const target: ProfileChangeProposalTarget = {
      kind: 'profile_branch',
      branchId: 'react-project',
    };

    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      proposalEvents: [
        proposalEvent({ id: 'event-1', action: 'applied', target, createdAt: 100 }),
        proposalEvent({
          id: 'event-2',
          action: 'rejected',
          target,
          statusAfter: 'rejected',
          createdAt: 120,
        }),
        proposalEvent({
          id: 'event-3',
          action: 'asked_why',
          target,
          statusAfter: 'pending',
          createdAt: 130,
        }),
        proposalEvent({
          id: 'other-profile',
          baseProfileId: 'photography',
          target,
          createdAt: 140,
        }),
      ],
    });

    expect(projection.summary.proposalEventCount).toBe(3);
    expect(projection.proposalSignals).toEqual([
      {
        baseProfileId: 'coding',
        proposalKind: 'classification_patch',
        target,
        targetKey: 'profile_branch:react-project',
        userFitConfidence: 0.5,
        score: 0,
        appliedCount: 1,
        rejectedCount: 1,
        postponedCount: 0,
        askedWhyCount: 1,
        eventIds: ['event-1', 'event-2', 'event-3'],
        latestAt: 130,
      },
    ]);

    target.branchId = 'changed-after-projection';
    expect(projection.proposalSignals[0]!.target).toEqual({
      kind: 'profile_branch',
      branchId: 'react-project',
    });
  });

  it('keeps asked-why neutral and treats postponed as mild negative evidence', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      proposalEvents: [
        proposalEvent({
          id: 'asked-why',
          action: 'asked_why',
          target: { kind: 'base_profile', profileId: 'coding' },
          createdAt: 100,
        }),
        proposalEvent({
          id: 'postponed',
          action: 'postponed',
          proposalKind: 'relationship_patch',
          target: { kind: 'profile_branch', branchId: 'react-project' },
          statusAfter: 'postponed',
          createdAt: 110,
        }),
      ],
    });

    expect(projection.proposalSignals).toEqual([
      expect.objectContaining({
        targetKey: 'profile_branch:react-project',
        userFitConfidence: 0.426,
        score: -0.148,
        postponedCount: 1,
      }),
      expect.objectContaining({
        targetKey: 'base_profile:coding',
        userFitConfidence: 0.5,
        score: 0,
        askedWhyCount: 1,
      }),
    ]);
  });

  it('caps output while reporting omitted signal counts', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      maxNodeSignals: 1,
      maxProposalSignals: 0,
      correctionEvidence: [
        correction({ id: 'evidence-1', correctedTypeNodeId: 'long_exposure' }),
        correction({
          id: 'evidence-2',
          previousTypeNodeId: 'slow_shutter',
          correctedTypeNodeId: 'light_painting',
          nearMissCandidates: [],
          createdAt: 130,
        }),
      ],
      proposalEvents: [
        proposalEvent({ id: 'event-1' }),
        proposalEvent({
          id: 'event-2',
          proposalKind: 'relationship_patch',
          target: { kind: 'profile_branch', branchId: 'work-notes' },
        }),
      ],
    });

    expect(projection.nodeSignals).toHaveLength(1);
    expect(projection.proposalSignals).toHaveLength(0);
    expect(projection.summary.omittedNodeSignalCount).toBe(3);
    expect(projection.summary.omittedProposalSignalCount).toBe(2);
  });

  it('normalizes malformed limits and ignores non-matching near-miss candidates', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      maxNodeSignals: Number.NaN,
      maxProposalSignals: -1,
      correctionEvidence: [
        correction({
          nearMissCandidates: [
            {
              scopeId: 'coding',
              nodeId: 'star_trails',
              rank: 2,
              score: 0.61,
            },
          ],
        }),
      ],
      proposalEvents: [
        proposalEvent({ id: 'event-1' }),
      ],
    });

    expect(projection.nodeSignals).toHaveLength(2);
    expect(projection.proposalSignals).toHaveLength(0);
    expect(projection.summary.nearMissHitCount).toBe(0);
    expect(projection.summary.omittedNodeSignalCount).toBe(0);
    expect(projection.summary.omittedProposalSignalCount).toBe(1);
  });

  it('separates base-profile and branch-scoped correction signals', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      correctionEvidence: [
        correction({
          id: 'base-scope',
          activeSelectionSnapshot: {
            baseProfileId: 'coding',
          },
          previousTypeNodeId: null,
          correctedTypeNodeId: 'long_exposure',
          nearMissCandidates: [],
          createdAt: 100,
        }),
        correction({
          id: 'react-scope',
          activeSelectionSnapshot: {
            baseProfileId: 'coding',
            projectBranchIds: ['react-project'],
          },
          previousTypeNodeId: null,
          correctedTypeNodeId: 'long_exposure',
          nearMissCandidates: [],
          createdAt: 120,
        }),
      ],
    });

    expect(projection.nodeSignals).toEqual([
      expect.objectContaining({
        scopeId: 'base:coding|project:react-project|learning:-|personal:-',
        nodeId: 'long_exposure',
        evidenceIds: ['react-scope'],
      }),
      expect.objectContaining({
        scopeId: 'base:coding|project:-|learning:-|personal:-',
        nodeId: 'long_exposure',
        evidenceIds: ['base-scope'],
      }),
    ]);
  });

  it('folds matching near-miss hits into the active correction scope', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      correctionEvidence: [
        correction({
          id: 'react-near-miss',
          activeSelectionSnapshot: {
            baseProfileId: 'coding',
            projectBranchIds: ['react-project'],
          },
          previousTypeNodeId: null,
          correctedTypeNodeId: 'long_exposure',
          nearMissCandidates: [
            {
              scopeId: 'coding',
              nodeId: 'long_exposure',
              rank: 2,
              score: 0.69,
            },
          ],
        }),
      ],
    });

    expect(projection.nodeSignals).toHaveLength(1);
    expect(projection.nodeSignals[0]).toEqual(expect.objectContaining({
      scopeId: 'base:coding|project:react-project|learning:-|personal:-',
      nodeId: 'long_exposure',
      nearMissHitCount: 1,
      evidenceIds: ['react-near-miss'],
    }));
  });

  it('does not create a second scope from cross-scope near-miss diagnostics', () => {
    const projection = projectUserFitSignals({
      baseProfileId: 'coding',
      correctionEvidence: [
        correction({
          id: 'cross-scope-near-miss',
          activeSelectionSnapshot: {
            baseProfileId: 'coding',
            projectBranchIds: ['react-project'],
          },
          previousTypeNodeId: null,
          correctedTypeNodeId: 'long_exposure',
          nearMissCandidates: [
            {
              scopeId: 'base:photography|project:-|learning:-|personal:-',
              nodeId: 'long_exposure',
              rank: 2,
              score: 0.69,
            },
          ],
        }),
      ],
    });

    expect(projection.nodeSignals).toHaveLength(1);
    expect(projection.nodeSignals[0]).toEqual(expect.objectContaining({
      scopeId: 'base:coding|project:react-project|learning:-|personal:-',
      nodeId: 'long_exposure',
      nearMissHitCount: 1,
      evidenceIds: ['cross-scope-near-miss'],
    }));
    expect(projection.nodeSignals.some((signal) =>
      signal.scopeId.includes('photography')
    )).toBe(false);
  });

  it('formats proposal target keys deterministically', () => {
    expect(profileChangeProposalTargetKey({
      kind: 'base_profile',
      profileId: 'coding',
    })).toBe('base_profile:coding');
    expect(profileChangeProposalTargetKey({
      kind: 'profile_branch',
      branchId: 'react-project',
    })).toBe('profile_branch:react-project');
    expect(profileChangeProposalTargetKey({
      kind: 'profile_branch',
    })).toBe('profile_branch:<missing>');
  });

  it('formats active selection scope keys deterministically while preserving branch order', () => {
    expect(userFitActiveSelectionScopeKey({
      baseProfileId: 'coding',
      projectBranchIds: ['react-project', 'work ui'],
      learningBranchIds: ['typescript'],
      personalBranchIds: ['matthias'],
    })).toBe('base:coding|project:react-project,work%20ui|learning:typescript|personal:matthias');
  });
});
