import { describe, expect, it } from 'vitest';
import {
  parseProfilePatch,
  profileChangeProposalToRow,
  rowToProfileChangeProposal,
  validateProfileChangeProposal,
} from '../codecs/profileChangeProposal';
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
  });

  it('rejects target shapes that mix base-profile and branch targets', () => {
    expect(() => validateProfileChangeProposal(validProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
        branchId: 'branch-1',
      },
    }))).toThrow(/Base-profile proposals require profileId/);
  });

  it('rejects empty patches so proposals cannot be no-op rows', () => {
    expect(() => parseProfilePatch({})).toThrow(/patch must contain at least one operation/);
  });

  it('requires evidence or a source branch for non-manual system suggestions', () => {
    expect(() => validateProfileChangeProposal(validProposal({
      sourceKind: 'model',
      evidenceIds: [],
      sourceBranchId: null,
    }))).toThrow(/require evidence ids or a source branch id/);
  });

  it('allows a branch merge proposal to be explained by its source branch', () => {
    expect(() => validateProfileChangeProposal(validProposal({
      proposalKind: 'branch_merge',
      sourceKind: 'system',
      sourceBranchId: 'branch-1',
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      evidenceIds: [],
      patch: validPatch({ addRelationshipTypeNodeIds: ['depends_on_query_key'] }),
    }))).not.toThrow();
  });

  it('keeps applied proposals behind accepted review state', () => {
    expect(() => validateProfileChangeProposal(validProposal({
      status: 'rejected',
      reviewedAt: 3,
      appliedAt: 4,
    }))).toThrow(/Only accepted proposals may be marked applied/);

    expect(() => validateProfileChangeProposal(validProposal({
      status: 'accepted',
      reviewedAt: null,
      appliedAt: 4,
    }))).toThrow(/Accepted proposals require reviewedAt/);
  });
});
