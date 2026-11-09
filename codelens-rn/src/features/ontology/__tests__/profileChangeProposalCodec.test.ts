import { describe, expect, it } from 'vitest';
import { profileChangeProposalToRow, rowToProfileChangeProposal } from '../codecs/profileChangeProposal';
import type { ProfileChangeProposal, ProfilePatch } from '../types';

function validPatch(overrides: Partial<ProfilePatch> = {}): ProfilePatch {
  return {
    addItemTypeNodeIds: ['react_hook'],
    ...overrides,
  };
}

function validProposal(overrides: Partial<ProfileChangeProposal> = {}): ProfileChangeProposal {
  return {
    id: 'proposal-1',
    proposalKind: 'classification_patch',
    sourceKind: 'checker',
    baseProfileId: 'coding',
    sourceBranchId: null,
    target: {
      kind: 'profile_branch',
      branchId: 'branch-1',
    },
    evidenceIds: ['ev-1'],
    patch: validPatch(),
    title: 'Add React hook type',
    summary: 'Suggests a new item type for repeated corrections.',
    reason: 'The user corrected several captures into this concept family.',
    riskScore: 35,
    semanticConfidence: 0.8,
    userFitConfidence: 0.7,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: 1,
    updatedAt: 2,
    reviewedAt: null,
    appliedAt: null,
    ...overrides,
  };
}

describe('profile change proposal codec', () => {
  it('validates and maps a proposal to a DB row', () => {
    const row = profileChangeProposalToRow(validProposal());

    expect(row).toMatchObject({
      id: 'proposal-1',
      proposalKind: 'classification_patch',
      sourceKind: 'checker',
      baseProfileId: 'coding',
      sourceBranchId: null,
      targetKind: 'profile_branch',
      targetProfileId: null,
      targetBranchId: 'branch-1',
      targetProfileVersion: null,
      targetBranchUpdatedAt: null,
      evidenceIdsJson: ['ev-1'],
      patchJson: { addItemTypeNodeIds: ['react_hook'] },
      riskScore: 35,
      status: 'pending',
    });
  });

  it('parses JSON-backed row fields into the domain shape', () => {
    const proposal = rowToProfileChangeProposal({
      id: 'proposal-1',
      proposalKind: 'classification_patch',
      sourceKind: 'checker',
      baseProfileId: 'coding',
      sourceBranchId: null,
      targetKind: 'profile_branch',
      targetProfileId: null,
      targetBranchId: 'branch-1',
      targetProfileVersion: null,
      targetBranchUpdatedAt: 2000,
      evidenceIdsJson: '["ev-1"]',
      patchJson: '{"addItemTypeNodeIds":["react_hook"]}',
      title: 'Add React hook type',
      summary: 'Suggests a new item type for repeated corrections.',
      reason: 'The user corrected several captures into this concept family.',
      riskScore: 35,
      semanticConfidence: 0.8,
      userFitConfidence: 0.7,
      status: 'pending',
      supersededByProposalId: null,
      createdAt: 1,
      updatedAt: 2,
      reviewedAt: null,
      appliedAt: null,
    } as unknown as Parameters<typeof rowToProfileChangeProposal>[0]);

    expect(proposal.evidenceIds).toEqual(['ev-1']);
    expect(proposal.patch).toEqual({ addItemTypeNodeIds: ['react_hook'] });
    expect(proposal.target).toEqual({ kind: 'profile_branch', profileId: null, branchId: 'branch-1' });
    expect(proposal.targetProfileVersion).toBeNull();
    expect(proposal.targetBranchUpdatedAt).toBe(2000);
  });

  it('stores a target profile version for base-profile proposals', () => {
    const row = profileChangeProposalToRow(validProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 3,
    }));

    expect(row.targetKind).toBe('base_profile');
    expect(row.targetProfileId).toBe('coding');
    expect(row.targetBranchId).toBeNull();
    expect(row.targetProfileVersion).toBe(3);
    expect(row.targetBranchUpdatedAt).toBeNull();
  });

  it('stores a target branch revision for branch proposals', () => {
    const row = profileChangeProposalToRow(validProposal({
      targetBranchUpdatedAt: 2000,
    }));

    expect(row.targetKind).toBe('profile_branch');
    expect(row.targetBranchId).toBe('branch-1');
    expect(row.targetProfileVersion).toBeNull();
    expect(row.targetBranchUpdatedAt).toBe(2000);
  });
});
