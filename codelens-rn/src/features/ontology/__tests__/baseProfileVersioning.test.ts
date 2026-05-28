import { describe, expect, it } from 'vitest';
import {
  BaseProfileVersioningError,
  assertBaseProfileProposalTargetsCurrentVersion,
} from '../baseProfileVersioning';
import { codingProfile } from '../profiles/codingProfile';
import type { DomainProfile, ProfileChangeProposal, ProfilePatch } from '../types';

function patch(): ProfilePatch {
  return {
    addItemTypeNodeIds: ['react_hook'],
  };
}

function proposal(overrides: Partial<ProfileChangeProposal> = {}): ProfileChangeProposal {
  return {
    id: 'proposal-1',
    proposalKind: 'ontology_node_patch',
    sourceKind: 'user',
    baseProfileId: 'coding',
    sourceBranchId: null,
    target: {
      kind: 'base_profile',
      profileId: 'coding',
    },
    targetProfileVersion: codingProfile.version,
    evidenceIds: ['ev-1'],
    patch: patch(),
    title: 'Add React hook type',
    summary: 'Create a new item type.',
    reason: 'The user created this while correcting Conceptualize.',
    riskScore: 70,
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

function errorCode(fn: () => void): string {
  try {
    fn();
  } catch (error) {
    if (error instanceof BaseProfileVersioningError) return error.code;
    throw error;
  }
  throw new Error('Expected BaseProfileVersioningError');
}

describe('base profile versioning guard', () => {
  it('accepts a base proposal targeting the current profile version', () => {
    expect(() =>
      assertBaseProfileProposalTargetsCurrentVersion({
        proposal: proposal(),
        baseProfile: codingProfile as DomainProfile<string>,
      }),
    ).not.toThrow();
  });

  it('rejects branch proposals so base apply cannot reuse branch operations', () => {
    expect(errorCode(() =>
      assertBaseProfileProposalTargetsCurrentVersion({
        proposal: proposal({
          target: { kind: 'profile_branch', branchId: 'branch-1' },
          targetProfileVersion: null,
        }),
        baseProfile: codingProfile as DomainProfile<string>,
      }),
    )).toBe('proposal_not_base_target');
  });

  it('rejects missing and stale target versions before base apply', () => {
    expect(errorCode(() =>
      assertBaseProfileProposalTargetsCurrentVersion({
        proposal: proposal({ targetProfileVersion: null }),
        baseProfile: codingProfile as DomainProfile<string>,
      }),
    )).toBe('target_profile_version_missing');

    expect(errorCode(() =>
      assertBaseProfileProposalTargetsCurrentVersion({
        proposal: proposal({ targetProfileVersion: codingProfile.version - 1 }),
        baseProfile: codingProfile as DomainProfile<string>,
      }),
    )).toBe('target_profile_version_stale');
  });

  it('rejects proposals for a different base profile id', () => {
    expect(errorCode(() =>
      assertBaseProfileProposalTargetsCurrentVersion({
        proposal: proposal({
          baseProfileId: 'photography',
          target: { kind: 'base_profile', profileId: 'photography' },
        }),
        baseProfile: codingProfile as DomainProfile<string>,
      }),
    )).toBe('proposal_base_mismatch');
  });
});
