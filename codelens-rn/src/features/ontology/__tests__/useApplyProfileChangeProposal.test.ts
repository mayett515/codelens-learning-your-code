import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import { codingProfile } from '../profiles/codingProfile';
import { ProfileNotFoundError } from '../profileRegistry';
import {
  ProfileProposalApplyHookError,
  applyProfileChangeProposal,
} from '../hooks/useApplyProfileChangeProposal';
import type { DomainProfile, ProfileChangeProposal, ProfileRegistry } from '../types';

function makeProposal(overrides: Partial<ProfileChangeProposal> = {}): ProfileChangeProposal {
  return {
    id: 'proposal-1',
    proposalKind: 'ontology_node_patch',
    sourceKind: 'checker',
    baseProfileId: 'coding',
    sourceBranchId: null,
    target: {
      kind: 'profile_branch',
      branchId: 'branch-1',
    },
    evidenceIds: ['evidence-1'],
    patch: {
      addItemTypeNodeIds: ['noise_control'],
    },
    title: 'Add noise control',
    summary: 'Repeated corrections point to a new subtype.',
    reason: 'The user corrected this several times.',
    riskScore: 20,
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

function makeRegistry(profile: DomainProfile<string> = codingProfile as DomainProfile<string>): ProfileRegistry<string> {
  return {
    getProfile: vi.fn((id: string) => {
      if (id !== profile.id) throw new ProfileNotFoundError(id);
      return profile;
    }),
    listProfiles: vi.fn(() => [{
      id: profile.id,
      version: profile.version,
      label: profile.label,
      description: profile.description,
    }]),
  };
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('applyProfileChangeProposal', () => {
  it('routes branch-target proposals through the branch apply service with a loaded base profile', async () => {
    const registry = makeRegistry();
    const branchResult = { operation: {}, branch: {}, proposal: {} };
    const applyBranch = vi.fn(async () => branchResult as never);
    const applyBase = vi.fn(async () => ({ operation: {}, profileDefinition: {}, proposal: {} } as never));

    const result = await applyProfileChangeProposal(makeProposal(), {
      now: () => 10,
      loadRegistry: async () => registry,
      applyBranch,
      applyBase,
    });

    expect(result).toBe(branchResult);
    expect(registry.getProfile).toHaveBeenCalledWith('coding');
    expect(applyBranch).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      baseProfile: codingProfile,
      now: 10,
      actorKind: 'user',
    });
    expect(applyBase).not.toHaveBeenCalled();
  });

  it('routes base-target proposals through the base apply service without loading the registry', async () => {
    const loadRegistry = vi.fn(async () => makeRegistry());
    const baseResult = { operation: {}, profileDefinition: {}, proposal: {} };
    const applyBranch = vi.fn(async () => ({ operation: {}, branch: {}, proposal: {} } as never));
    const applyBase = vi.fn(async () => baseResult as never);

    const result = await applyProfileChangeProposal(makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 4,
    }), {
      now: () => 20,
      loadRegistry,
      applyBranch,
      applyBase,
    });

    expect(result).toBe(baseResult);
    expect(loadRegistry).not.toHaveBeenCalled();
    expect(applyBranch).not.toHaveBeenCalled();
    expect(applyBase).toHaveBeenCalledWith({
      proposalId: 'proposal-1',
      now: 20,
      actorKind: 'user',
    });
  });

  it('maps missing branch base profiles to the hook error code used by presentation copy', async () => {
    const error = await captureRejection(applyProfileChangeProposal(makeProposal({
      baseProfileId: 'missing-profile',
    }), {
      now: () => 10,
      loadRegistry: async () => makeRegistry(),
      applyBranch: vi.fn(),
      applyBase: vi.fn(),
    }));

    expect(error).toBeInstanceOf(ProfileProposalApplyHookError);
    expect((error as ProfileProposalApplyHookError).code).toBe('base_profile_not_found');
  });
});
