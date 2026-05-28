import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { BaseProfileVersioningError } from '../baseProfileVersioning';
import {
  BaseProfileProposalApplyServiceError,
  applyPendingBaseProfileChangeProposal,
  type BaseProfileProposalApplyServiceDependencies,
} from '../data/baseProfileProposalApplyService';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileChangeProposal,
  ProfileDefinition,
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

function makeProfile(overrides: Partial<DomainProfile<string>> = {}): DomainProfile<string> {
  return {
    ...(codingProfile as DomainProfile<string>),
    version: 4,
    ...overrides,
  };
}

function makeDefinition(overrides: Partial<ProfileDefinition<string>> = {}): ProfileDefinition<string> {
  const profile = overrides.profile ?? makeProfile();
  return {
    id: profile.id,
    label: profile.label,
    description: profile.description,
    version: profile.version,
    sourceKind: 'user',
    profile,
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
      kind: 'base_profile',
      profileId: 'coding',
    },
    targetProfileVersion: 4,
    evidenceIds: ['evidence-1'],
    patch: {
      addOntologyNodes: [makeNode('noise_control')],
      addItemTypeNodeIds: ['noise_control'],
    },
    title: 'Add noise control',
    summary: 'Repeated corrections point to a base subtype.',
    reason: 'The user corrected captures from ISO to noise control several times.',
    riskScore: 70,
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
  code: BaseProfileProposalApplyServiceError['code'],
): void {
  expect(error).toBeInstanceOf(BaseProfileProposalApplyServiceError);
  expect((error as BaseProfileProposalApplyServiceError).code).toBe(code);
}

function expectVersioningErrorCode(
  error: unknown,
  code: BaseProfileVersioningError['code'],
): void {
  expect(error).toBeInstanceOf(BaseProfileVersioningError);
  expect((error as BaseProfileVersioningError).code).toBe(code);
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('applyPendingBaseProfileChangeProposal', () => {
  const tx = { kind: 'tx' } as unknown as DbOrTx;

  it('loads proposal and profile definition in one transaction, applies the pure helper, and writes event', async () => {
    const calls: string[] = [];
    let savedDefinition: ProfileDefinition | undefined;
    let savedProposal: ProfileChangeProposal | undefined;
    let savedEvent: ProfileProposalEvent | undefined;
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => {
        calls.push('transaction');
        return callback(tx);
      },
      getProposalById: async (id, executor) => {
        calls.push(`getProposal:${id}`);
        expect(executor).toBe(tx);
        return makeProposal();
      },
      getProfileDefinitionById: async (id, executor) => {
        calls.push(`getDefinition:${id}`);
        expect(executor).toBe(tx);
        return makeDefinition();
      },
      saveProfileDefinitionIfUnchanged: async (definition, expectedVersion, expectedUpdatedAt, executor) => {
        calls.push(`saveDefinition:${definition.id}:${expectedVersion}:${expectedUpdatedAt}`);
        expect(executor).toBe(tx);
        savedDefinition = definition;
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

    const result = await applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'getDefinition:coding',
      'saveDefinition:coding:4:2',
      'saveProposal:proposal-1:2',
      'insertEvent:event-1:applied',
    ]);
    expect(result).toEqual({
      operation: result.operation,
      profileDefinition: savedDefinition,
      proposal: savedProposal,
    });
    expect(result.operation).toMatchObject({
      proposalId: 'proposal-1',
      baseProfileId: 'coding',
      expectedProposalUpdatedAt: 2,
      expectedProfileVersion: 4,
      expectedProfileDefinitionUpdatedAt: 2,
      appliedAt: 3,
    });
    expect(savedDefinition?.version).toBe(5);
    expect(savedDefinition?.profile.ontology.itemTypeNodeIds).toContain('noise_control');
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
        kind: 'base_profile',
        profileId: 'coding',
      },
      statusBefore: 'pending',
      statusAfter: 'accepted',
      proposalUpdatedAtBefore: 2,
      proposalUpdatedAtAfter: 3,
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      reason: null,
      details: {
        operationKind: 'apply_profile_patch_to_base_profile',
        profileVersionBefore: 4,
        profileVersionAfter: 5,
      },
      createdAt: 3,
    });
  });

  it('propagates explicit actor and reason metadata into the applied event', async () => {
    let savedEvent: ProfileProposalEvent | undefined;
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal(),
      getProfileDefinitionById: async () => makeDefinition(),
      saveProfileDefinitionIfUnchanged: async () => true,
      saveProposalIfPending: async () => true,
      insertEvent: async (event) => {
        savedEvent = event;
      },
      newEventId: () => 'event-1',
    };

    await applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      actorKind: 'system',
      actorId: 'checker-1',
      reason: 'Accepted from proposal review',
      deps,
    });

    expect(savedEvent).toMatchObject({
      actorKind: 'system',
      actorId: 'checker-1',
      reason: 'Accepted from proposal review',
    });
  });

  it('fails before loading a profile definition when the proposal does not exist', async () => {
    const calls: string[] = [];
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => {
        calls.push('getProposal');
        return undefined;
      },
      getProfileDefinitionById: async () => {
        calls.push('getDefinition');
        return makeDefinition();
      },
      saveProfileDefinitionIfUnchanged: async () => true,
      saveProposalIfPending: async () => true,
      insertEvent: async () => {},
      newEventId: () => 'event-1',
    };

    const error = await captureRejection(applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    }));
    expectServiceErrorCode(error, 'proposal_not_found');
    expect(calls).toEqual(['getProposal']);
  });

  it('fails before loading a profile definition for non-base proposals', async () => {
    const calls: string[] = [];
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal({
        target: { kind: 'profile_branch', branchId: 'branch-1' },
        targetProfileVersion: null,
      }),
      getProfileDefinitionById: async () => {
        calls.push('getDefinition');
        return makeDefinition();
      },
      saveProfileDefinitionIfUnchanged: async () => true,
      saveProposalIfPending: async () => true,
      insertEvent: async () => {},
      newEventId: () => 'event-1',
    };

    const error = await captureRejection(applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    }));
    expectVersioningErrorCode(error, 'proposal_not_base_target');
    expect(calls).toEqual([]);
  });

  it('fails when the target profile definition is missing', async () => {
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal(),
      getProfileDefinitionById: async () => undefined,
      saveProfileDefinitionIfUnchanged: async () => true,
      saveProposalIfPending: async () => true,
      insertEvent: async () => {},
      newEventId: () => 'event-1',
    };

    const error = await captureRejection(applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    }));
    expectServiceErrorCode(error, 'profile_definition_not_found');
  });

  it('fails closed on profile-definition write conflict before proposal/event writes', async () => {
    const calls: string[] = [];
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal(),
      getProfileDefinitionById: async () => makeDefinition(),
      saveProfileDefinitionIfUnchanged: async () => {
        calls.push('saveDefinition');
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

    const error = await captureRejection(applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    }));
    expectServiceErrorCode(error, 'profile_definition_write_conflict');
    expect(calls).toEqual(['saveDefinition']);
  });

  it('fails closed on proposal write conflict before event writes', async () => {
    const calls: string[] = [];
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal(),
      getProfileDefinitionById: async () => makeDefinition(),
      saveProfileDefinitionIfUnchanged: async () => {
        calls.push('saveDefinition');
        return true;
      },
      saveProposalIfPending: async () => {
        calls.push('saveProposal');
        return false;
      },
      insertEvent: async () => {
        calls.push('insertEvent');
      },
      newEventId: () => 'event-1',
    };

    const error = await captureRejection(applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    }));
    expectServiceErrorCode(error, 'proposal_write_conflict');
    expect(calls).toEqual(['saveDefinition', 'saveProposal']);
  });

  it('rejects stale target profile versions before writes', async () => {
    const calls: string[] = [];
    const deps: BaseProfileProposalApplyServiceDependencies = {
      transaction: async (callback) => callback(tx),
      getProposalById: async () => makeProposal({ targetProfileVersion: 3 }),
      getProfileDefinitionById: async () => makeDefinition(),
      saveProfileDefinitionIfUnchanged: async () => {
        calls.push('saveDefinition');
        return true;
      },
      saveProposalIfPending: async () => true,
      insertEvent: async () => {},
      newEventId: () => 'event-1',
    };

    const error = await captureRejection(applyPendingBaseProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 3,
      deps,
    }));
    expectVersioningErrorCode(error, 'target_profile_version_stale');
    expect(calls).toEqual([]);
  });
});
