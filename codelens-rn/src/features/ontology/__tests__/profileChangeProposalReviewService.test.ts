import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import {
  ProfileChangeProposalReviewServiceError,
  setPendingProfileChangeProposalReviewStatus,
  type ProfileChangeProposalReviewServiceDependencies,
} from '../data/profileChangeProposalReviewService';
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
  code: ProfileChangeProposalReviewServiceError['code'],
): void {
  expect(error).toBeInstanceOf(ProfileChangeProposalReviewServiceError);
  expect((error as ProfileChangeProposalReviewServiceError).code).toBe(code);
}

describe('setPendingProfileChangeProposalReviewStatus', () => {
  const tx = { kind: 'tx' } as unknown as DbOrTx;

  it('marks a pending proposal rejected inside one transaction', async () => {
    const calls: string[] = [];
    let savedProposal: ProfileChangeProposal | undefined;
    let savedEvent: ProfileProposalEvent | undefined;
    const deps: ProfileChangeProposalReviewServiceDependencies = {
      transaction: async (callback) => {
        calls.push('transaction');
        return callback(tx);
      },
      getProposalById: async (id, executor) => {
        calls.push(`getProposal:${id}`);
        expect(executor).toBe(tx);
        return makeProposal();
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

    const result = await setPendingProfileChangeProposalReviewStatus({
      proposalId: 'proposal-1',
      status: 'rejected',
      now: 3,
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'saveProposal:proposal-1:2',
      'insertEvent:event-1:rejected',
    ]);
    expect(result).toBe(savedProposal);
    expect(result).toMatchObject({
      id: 'proposal-1',
      status: 'rejected',
      reviewedAt: 3,
      appliedAt: null,
      updatedAt: 3,
    });
    expect(savedEvent).toEqual({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'rejected',
      actorKind: 'user',
      actorId: null,
      baseProfileId: 'coding',
      proposalKind: 'ontology_node_patch',
      target: {
        kind: 'profile_branch',
        branchId: 'branch-1',
      },
      statusBefore: 'pending',
      statusAfter: 'rejected',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 3,
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      reason: null,
      details: null,
      createdAt: 3,
    });
  });

  it('marks a pending proposal postponed without applying it', async () => {
    let savedEvent: ProfileProposalEvent | undefined;
    const deps: ProfileChangeProposalReviewServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal(),
      saveProposalIfPending: async (proposal) => {
        expect(proposal.status).toBe('postponed');
        expect(proposal.appliedAt).toBeNull();
        return true;
      },
      insertEvent: async (event) => {
        savedEvent = event;
      },
      newEventId: () => 'event-2',
    };

    const result = await setPendingProfileChangeProposalReviewStatus({
      proposalId: 'proposal-1',
      status: 'postponed',
      now: 4,
      deps,
    });

    expect(result.status).toBe('postponed');
    expect(result.reviewedAt).toBe(4);
    expect(savedEvent).toMatchObject({
      id: 'event-2',
      proposalId: 'proposal-1',
      action: 'postponed',
      statusBefore: 'pending',
      statusAfter: 'postponed',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 4,
      createdAt: 4,
    });
  });

  it('fails before writing when the proposal is missing', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalReviewServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return undefined;
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
      await setPendingProfileChangeProposalReviewStatus({
        proposalId: 'missing',
        status: 'rejected',
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_not_found');
    expect(calls).toEqual(['getProposal']);
  });

  it('fails before writing when the proposal is already reviewed', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalReviewServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal({
          status: 'accepted',
          reviewedAt: 2,
          appliedAt: 2,
        });
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
      await setPendingProfileChangeProposalReviewStatus({
        proposalId: 'proposal-1',
        status: 'rejected',
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_not_pending');
    expect(calls).toEqual(['getProposal']);
  });

  it('rejects review timestamps older than the proposal', async () => {
    const deps: ProfileChangeProposalReviewServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal({ updatedAt: 10 }),
      saveProposalIfPending: async () => true,
      insertEvent: async () => {
        throw new Error('event should not be inserted');
      },
      newEventId: () => 'event-1',
    };

    let caught: unknown;
    try {
      await setPendingProfileChangeProposalReviewStatus({
        proposalId: 'proposal-1',
        status: 'postponed',
        now: 9,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_review_time_invalid');
  });

  it('fails atomically when the conditional proposal write detects drift', async () => {
    const calls: string[] = [];
    const deps: ProfileChangeProposalReviewServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return makeProposal();
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
      await setPendingProfileChangeProposalReviewStatus({
        proposalId: 'proposal-1',
        status: 'rejected',
        now: 3,
        deps,
      });
    } catch (error) {
      caught = error;
    }

    expectServiceErrorCode(caught, 'proposal_write_conflict');
    expect(calls).toEqual(['getProposal', 'saveProposal:2']);
  });
});
