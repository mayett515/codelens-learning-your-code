import { describe, expect, it } from 'vitest';
import { evaluateProfileProposalFreshness } from '../profileProposalFreshness';
import type { ProfileChangeProposal } from '../types';

function proposal(overrides: Partial<ProfileChangeProposal> = {}): ProfileChangeProposal {
  return {
    id: 'proposal-1',
    proposalKind: 'ontology_node_patch',
    sourceKind: 'user',
    baseProfileId: 'coding',
    sourceBranchId: 'react-branch',
    target: {
      kind: 'profile_branch',
      branchId: 'react-branch',
    },
    targetProfileVersion: null,
    targetBranchUpdatedAt: 100,
    evidenceIds: ['ev-1'],
    patch: {
      addItemTypeNodeIds: ['react_hook'],
    },
    title: 'Add React hook type',
    summary: 'Create a branch-local type.',
    reason: 'The user created this during Conceptualize.',
    riskScore: 25,
    semanticConfidence: null,
    userFitConfidence: 1,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: 1,
    updatedAt: 2,
    reviewedAt: null,
    appliedAt: null,
    ...overrides,
  };
}

describe('profile proposal freshness', () => {
  it('marks branch proposals fresh only when revision and patch validation are current', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal(),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: true,
        currentUpdatedAt: 100,
        patchValidation: 'valid',
      },
    })).toMatchObject({
      status: 'fresh',
      reason: 'target_branch_updated_at_matches',
      canApply: true,
      canRefresh: false,
      expectedRevision: 100,
      currentRevision: 100,
    });
  });

  it('marks changed branch targets stale-refreshable without mutating proposal status', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal({ status: 'pending' }),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: true,
        currentUpdatedAt: 140,
        patchValidation: 'unknown',
      },
    })).toMatchObject({
      status: 'stale_refreshable',
      reason: 'target_branch_updated_at_changed',
      canApply: false,
      canRefresh: true,
      expectedRevision: 100,
      currentRevision: 140,
    });
  });

  it('keeps legacy branch proposals without a revision snapshot unknown', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal({ targetBranchUpdatedAt: null }),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: true,
        currentUpdatedAt: 100,
        patchValidation: 'valid',
      },
    })).toMatchObject({
      status: 'unknown',
      reason: 'target_branch_updated_at_missing',
      canApply: false,
      canRefresh: false,
    });
  });

  it('does not call an unvalidated same-revision proposal fresh', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal(),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: true,
        currentUpdatedAt: 100,
        patchValidation: 'unknown',
      },
    })).toMatchObject({
      status: 'unknown',
      reason: 'patch_validation_unknown',
      canApply: false,
    });
  });

  it('reports patch conflicts before stale-refreshable status', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal(),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: true,
        currentUpdatedAt: 140,
        patchValidation: 'conflicted',
      },
    })).toMatchObject({
      status: 'conflicted',
      reason: 'patch_conflict',
      canApply: false,
      canRefresh: false,
    });
  });

  it('uses base profile versions for base-targeted proposals', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal({
        sourceBranchId: null,
        target: { kind: 'base_profile', profileId: 'coding' },
        targetProfileVersion: 7,
        targetBranchUpdatedAt: null,
      }),
      target: {
        kind: 'base_profile',
        profileId: 'coding',
        exists: true,
        currentVersion: 9,
        patchValidation: 'valid',
      },
    })).toMatchObject({
      status: 'stale_refreshable',
      reason: 'target_profile_version_changed',
      expectedRevision: 7,
      currentRevision: 9,
    });
  });

  it('marks missing or mismatched targets obsolete', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal(),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: false,
        currentUpdatedAt: null,
        patchValidation: 'unknown',
      },
    })).toMatchObject({
      status: 'obsolete',
      reason: 'target_missing',
    });

    expect(evaluateProfileProposalFreshness({
      proposal: proposal(),
      target: {
        kind: 'profile_branch',
        branchId: 'vue-branch',
        exists: true,
        currentUpdatedAt: 100,
        patchValidation: 'valid',
      },
    })).toMatchObject({
      status: 'obsolete',
      reason: 'branch_target_mismatch',
    });
  });

  it('marks branch and base target fact mismatches obsolete', () => {
    expect(evaluateProfileProposalFreshness({
      proposal: proposal(),
      target: {
        kind: 'base_profile',
        profileId: 'coding',
        exists: true,
        currentVersion: 1,
        patchValidation: 'valid',
      },
    })).toMatchObject({
      status: 'obsolete',
      reason: 'branch_target_mismatch',
    });

    expect(evaluateProfileProposalFreshness({
      proposal: proposal({
        sourceBranchId: null,
        target: { kind: 'base_profile', profileId: 'coding' },
        targetProfileVersion: 7,
        targetBranchUpdatedAt: null,
      }),
      target: {
        kind: 'profile_branch',
        branchId: 'react-branch',
        exists: true,
        currentUpdatedAt: 100,
        patchValidation: 'valid',
      },
    })).toMatchObject({
      status: 'obsolete',
      reason: 'base_target_mismatch',
    });
  });
});
