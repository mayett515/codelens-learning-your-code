import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import {
  ProfileChangeProposalLifecycleServiceError,
  supersedePendingProfileChangeProposal,
  type ProfileChangeProposalLifecycleServiceDependencies,
} from '../data/profileChangeProposalLifecycleService';
import type { ProfileChangeProposal, ProfileProposalEvent } from '../types';

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

function expectServiceErrorCode(
  error: unknown,
  code: ProfileChangeProposalLifecycleServiceError['code'],
): void {
  expect(error).toBeInstanceOf(ProfileChangeProposalLifecycleServiceError);
  expect((error as ProfileChangeProposalLifecycleServiceError).code).toBe(code);
}

describe('supersedePendingProfileChangeProposal', () => {
  const tx = { kind: 'tx' } as unknown as DbOrTx;

  it('marks an old pending proposal superseded and records the replacement event atomically', async () => {
    const calls: string[] = [];
    let savedProposal: ProfileChangeProposal | undefined;
    let savedEvent: ProfileProposalEvent | undefined;
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => {
        calls.push('transaction');
        return callback(tx);
      },
      getProposalById: async (id, executor) => {
        calls.push(`getProposal:${id}`);
        expect(executor).toBe(tx);
        return id === 'proposal-1'
          ? makeProposal()
          : makeProposal({ id: 'proposal-2', updatedAt: 3 });
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

    const result = await supersedePendingProfileChangeProposal({
      proposalId: 'proposal-1',
      supersededByProposalId: 'proposal-2',
      now: 4,
      reason: 'Edited into a narrower proposal.',
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'getProposal:proposal-2',
      'saveProposal:proposal-1:2',
      'insertEvent:event-1:superseded',
    ]);
    expect(result).toBe(savedProposal);
    expect(result).toMatchObject({
      id: 'proposal-1',
      status: 'superseded',
      supersededByProposalId: 'proposal-2',
      reviewedAt: 4,
      appliedAt: null,
      updatedAt: 4,
    });
    expect(savedEvent).toEqual({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'superseded',
      actorKind: 'user',
      actorId: null,
      baseProfileId: 'coding',
      proposalKind: 'ontology_node_patch',
      target: {
        kind: 'profile_branch',
        branchId: 'branch-1',
      },
      statusBefore: 'pending',
      statusAfter: 'superseded',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 4,
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      reason: 'Edited into a narrower proposal.',
      details: {
        supersededByProposalId: 'proposal-2',
      },
      createdAt: 4,
    });
  });

  it('fails before writing when the replacement proposal is missing', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async (id) => {
        calls.push(`getProposal:${id}`);
        return id === 'proposal-1' ? makeProposal() : undefined;
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
      await supersedePendingProfileChangeProposal({
        proposalId: 'proposal-1',
        supersededByProposalId: 'missing',
        now: 4,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'replacement_proposal_not_found');
    expect(calls).toEqual(['getProposal:proposal-1', 'getProposal:missing']);
  });

  it('rejects replacements across different base profiles', async () => {
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async (id) => id === 'proposal-1'
        ? makeProposal()
        : makeProposal({ id: 'proposal-2', baseProfileId: 'photography' }),
      saveProposalIfPending: async () => true,
      insertEvent: async () => {
        throw new Error('event should not be inserted');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await supersedePendingProfileChangeProposal({
        proposalId: 'proposal-1',
        supersededByProposalId: 'proposal-2',
        now: 4,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'replacement_proposal_invalid');
  });

  it('rejects self-superseding before opening a transaction', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => {
        calls.push('transaction');
        return callback(tx);
      },
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal();
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
      await supersedePendingProfileChangeProposal({
        proposalId: 'proposal-1',
        supersededByProposalId: 'proposal-1',
        now: 4,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'replacement_proposal_invalid');
    expect(calls).toEqual([]);
  });

  it('rejects superseding a proposal that was already superseded', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async (id) => {
        calls.push(`getProposal:${id}`);
        return id === 'proposal-1'
          ? makeProposal({
            status: 'superseded',
            supersededByProposalId: 'proposal-0',
            reviewedAt: 3,
            updatedAt: 3,
          })
          : makeProposal({ id: 'proposal-2', updatedAt: 3 });
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
      await supersedePendingProfileChangeProposal({
        proposalId: 'proposal-1',
        supersededByProposalId: 'proposal-2',
        now: 4,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_not_pending');
    expect(calls).toEqual(['getProposal:proposal-1', 'getProposal:proposal-2']);
  });

  it('rejects lifecycle timestamps older than the replacement proposal', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async (id) => {
        calls.push(`getProposal:${id}`);
        return id === 'proposal-1'
          ? makeProposal()
          : makeProposal({ id: 'proposal-2', updatedAt: 5 });
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
      await supersedePendingProfileChangeProposal({
        proposalId: 'proposal-1',
        supersededByProposalId: 'proposal-2',
        now: 4,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_lifecycle_time_invalid');
    expect(calls).toEqual(['getProposal:proposal-1', 'getProposal:proposal-2']);
  });

  it('fails atomically when the conditional write detects proposal drift', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalLifecycleServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async (id) => {
        calls.push(`getProposal:${id}`);
        return id === 'proposal-1'
          ? makeProposal()
          : makeProposal({ id: 'proposal-2' });
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
      await supersedePendingProfileChangeProposal({
        proposalId: 'proposal-1',
        supersededByProposalId: 'proposal-2',
        now: 4,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_write_conflict');
    expect(calls).toEqual([
      'getProposal:proposal-1',
      'getProposal:proposal-2',
      'saveProposal:2',
    ]);
  });
});
