import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { BranchLocalProposalApplyError } from '../branchLocalProposalApply';
import {
  BranchLocalProposalApplyServiceError,
  applyPendingBranchLocalProfileChangeProposal,
  type BranchLocalProposalApplyServiceDependencies,
} from '../data/branchLocalProposalApplyService';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileProposalEvent,
} from '../types';

function makeNode(id: string, overrides: Partial<OntologyNode> = {}): OntologyNode {
  return {
    id,
    label: id,
    kind: 'category',
    parentId: null,
    meaning: `meaning of ${id}`,
    useWhen: ['testing'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'user',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function makeBranch(overrides: Partial<ProfileBranch<string>> = {}): ProfileBranch<string> {
  return {
    id: 'branch-1',
    parentProfileId: 'coding',
    branchKind: 'project',
    name: 'Project branch',
    overlay: {
      id: 'overlay-1',
      kind: 'project',
    },
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function makeProposal(overrides: Partial<ProfileChangeProposal<string>> = {}): ProfileChangeProposal<string> {
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
      addOntologyNodes: [makeNode('noise_control')],
      addItemTypeNodeIds: ['noise_control'],
    },
    title: 'Add noise control',
    summary: 'Repeated corrections point to a branch-local subtype.',
    reason: 'The user corrected captures from ISO to noise control several times.',
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

function expectServiceErrorCode(
  error: unknown,
  code: BranchLocalProposalApplyServiceError['code'],
): void {
  expect(error).toBeInstanceOf(BranchLocalProposalApplyServiceError);
  expect((error as BranchLocalProposalApplyServiceError).code).toBe(code);
}

function expectApplyErrorCode(
  error: unknown,
  code: BranchLocalProposalApplyError['code'],
): void {
  expect(error).toBeInstanceOf(BranchLocalProposalApplyError);
  expect((error as BranchLocalProposalApplyError).code).toBe(code);
}

describe('applyPendingBranchLocalProfileChangeProposal', () => {
  const baseProfile = codingProfile as DomainProfile<string>;
  const tx = { kind: 'tx' } as unknown as DbOrTx;

  it('loads proposal and branch in one transaction, applies the pure helper, and persists both results', async () => {
    const calls: string[] = [];
    let savedBranch: ProfileBranch | undefined;
    let savedProposal: ProfileChangeProposal | undefined;
    let savedEvent: ProfileProposalEvent | undefined;
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => {
        calls.push('transaction');
        return callback(tx);
      },
      getProposalById: async (id, executor) => {
        calls.push(`getProposal:${id}`);
        expect(executor).toBe(tx);
        return makeProposal();
      },
      getBranchById: async (id, executor) => {
        calls.push(`getBranch:${id}`);
        expect(executor).toBe(tx);
        return makeBranch();
      },
      saveBranchIfUnchanged: async (branch, expectedUpdatedAt, executor) => {
        calls.push(`saveBranch:${branch.id}:${expectedUpdatedAt}`);
        expect(executor).toBe(tx);
        savedBranch = branch;
        return true;
      },
      saveProposalIfPending: async (proposal, expectedUpdatedAt, executor) => {
        calls.push(`saveProposal:${proposal.id}:${expectedUpdatedAt}`);
        expect(executor).toBe(tx);
        savedProposal = proposal;
        return true;
      },
      insertEvent: async (event, executor) => {
        calls.push(`insertEvent:${event.id}:${event.action}`);
        expect(executor).toBe(tx);
        savedEvent = event;
      },
      newEventId: () => 'event-1',
    };

    const result = await applyPendingBranchLocalProfileChangeProposal({
      proposalId: 'proposal-1',
      baseProfile,
      now: 3,
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'getBranch:branch-1',
      'saveBranch:branch-1:2',
      'saveProposal:proposal-1:2',
      'insertEvent:event-1:applied',
    ]);
    expect(result).toEqual({
      operation: result.operation,
      branch: savedBranch,
      proposal: savedProposal,
    });
    expect(result.operation).toMatchObject({
      proposalId: 'proposal-1',
      branchId: 'branch-1',
      expectedProposalUpdatedAt: 2,
      expectedBranchUpdatedAt: 2,
      appliedAt: 3,
    });
    expect(savedBranch?.overlay.addOntologyNodes?.map((node) => node.id)).toEqual(['noise_control']);
    expect(savedProposal?.status).toBe('accepted');
    expect(savedProposal?.reviewedAt).toBe(3);
    expect(savedProposal?.appliedAt).toBe(3);
    expect(savedEvent).toEqual({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'applied',
      actorKind: 'user',
      actorId: null,
      baseProfileId: 'coding',
      proposalKind: 'ontology_node_patch',
      target: {
        kind: 'profile_branch',
        branchId: 'branch-1',
      },
      statusBefore: 'pending',
      statusAfter: 'accepted',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 3,
      branchUpdatedAtBefore: 2,
      branchUpdatedAtAfter: 3,
      reason: null,
      details: {
        operationKind: 'apply_profile_patch_to_branch_overlay',
      },
      createdAt: 3,
    });
  });

  it('fails before loading a branch when the proposal does not exist', async () => {
    const calls: string[] = [];
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return undefined;
      },
      getBranchById: async () => {
        calls.push('getBranch');
        return makeBranch();
      },
      saveBranchIfUnchanged: async () => {
        calls.push('saveBranch');
        return true;
      },
      saveProposalIfPending: async () => {
        calls.push('saveProposal');
        return true;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await applyPendingBranchLocalProfileChangeProposal({
        proposalId: 'missing-proposal',
        baseProfile,
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_not_found');
    expect(calls).toEqual(['getProposal']);
  });

  it('fails before writing when the target branch is missing', async () => {
    const calls: string[] = [];
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal();
      },
      getBranchById: async () => {
        calls.push('getBranch');
        return undefined;
      },
      saveBranchIfUnchanged: async () => {
        calls.push('saveBranch');
        return true;
      },
      saveProposalIfPending: async () => {
        calls.push('saveProposal');
        return true;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await applyPendingBranchLocalProfileChangeProposal({
        proposalId: 'proposal-1',
        baseProfile,
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'branch_not_found');
    expect(calls).toEqual(['getProposal', 'getBranch']);
  });

  it('propagates branch-local apply errors and performs no writes', async () => {
    const calls: string[] = [];
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal({
          target: {
            kind: 'base_profile',
            profileId: 'coding',
          },
        });
      },
      getBranchById: async () => {
        calls.push('getBranch');
        return makeBranch();
      },
      saveBranchIfUnchanged: async () => {
        calls.push('saveBranch');
        return true;
      },
      saveProposalIfPending: async () => {
        calls.push('saveProposal');
        return true;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await applyPendingBranchLocalProfileChangeProposal({
        proposalId: 'proposal-1',
        baseProfile,
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectApplyErrorCode(caught, 'proposal_not_branch_target');
    expect(calls).toEqual(['getProposal']);
  });

  it('propagates pure helper validation errors from loaded proposals and performs no writes', async () => {
    const calls: string[] = [];
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal({
          status: 'accepted',
          reviewedAt: 2,
          appliedAt: 2,
        });
      },
      getBranchById: async () => {
        calls.push('getBranch');
        return makeBranch();
      },
      saveBranchIfUnchanged: async () => {
        calls.push('saveBranch');
        return true;
      },
      saveProposalIfPending: async () => {
        calls.push('saveProposal');
        return true;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await applyPendingBranchLocalProfileChangeProposal({
        proposalId: 'proposal-1',
        baseProfile,
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectApplyErrorCode(caught, 'proposal_not_pending');
    expect(calls).toEqual(['getProposal', 'getBranch']);
  });

  it('fails atomically when the branch conditional write detects drift', async () => {
    const calls: string[] = [];
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal();
      },
      getBranchById: async () => {
        calls.push('getBranch');
        return makeBranch();
      },
      saveBranchIfUnchanged: async (_branch, expectedUpdatedAt) => {
        calls.push(`saveBranch:${expectedUpdatedAt}`);
        return false;
      },
      saveProposalIfPending: async () => {
        calls.push('saveProposal');
        return true;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await applyPendingBranchLocalProfileChangeProposal({
        proposalId: 'proposal-1',
        baseProfile,
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'branch_write_conflict');
    expect(calls).toEqual(['getProposal', 'getBranch', 'saveBranch:2']);
  });

  it('fails atomically when the proposal conditional write detects drift', async () => {
    const calls: string[] = [];
    const deps: BranchLocalProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal();
      },
      getBranchById: async () => {
        calls.push('getBranch');
        return makeBranch();
      },
      saveBranchIfUnchanged: async (_branch, expectedUpdatedAt) => {
        calls.push(`saveBranch:${expectedUpdatedAt}`);
        return true;
      },
      saveProposalIfPending: async (_proposal, expectedUpdatedAt) => {
        calls.push(`saveProposal:${expectedUpdatedAt}`);
        return false;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await applyPendingBranchLocalProfileChangeProposal({
        proposalId: 'proposal-1',
        baseProfile,
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_write_conflict');
    expect(calls).toEqual(['getProposal', 'getBranch', 'saveBranch:2', 'saveProposal:2']);
  });
});
