import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { BaseProfileProposalApplyError } from '../baseProfileProposalApply';
import { BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE } from '../profileProposalTargetSwitch';
import {
  ProfileChangeProposalTargetSwitchServiceError,
  switchProfileChangeProposalTargetToBase,
  type ProfileChangeProposalTargetSwitchServiceDependencies,
} from '../data/profileChangeProposalTargetSwitchService';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileProposalEvent,
} from '../types';

function makeNode(id: string, overrides: Partial<OntologyNode> = {}): OntologyNode {
  return {
    id,
    label: id.replace(/_/g, ' '),
    kind: 'category',
    parentId: null,
    meaning: `meaning of ${id}`,
    useWhen: ['testing'],
    doNotUseWhen: [],
    examples: ['example'],
    relatedNodeIds: [],
    contrastNodeIds: [],
    status: 'active',
    createdBy: 'model',
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
    name: 'React project',
    overlay: {
      id: 'overlay-1',
      kind: 'project',
    },
    createdAt: 1,
    updatedAt: 5,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<DomainProfile<string>> = {}): DomainProfile<string> {
  return {
    ...(codingProfile as DomainProfile<string>),
    version: 7,
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
    updatedAt: 6,
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
    targetProfileVersion: null,
    targetBranchUpdatedAt: 2,
    evidenceIds: ['evidence-1'],
    patch: {
      addOntologyNodes: [makeNode('render_timing', {
        label: 'Render timing',
      })],
      addItemTypeNodeIds: ['render_timing'],
    },
    title: 'Add Render timing type',
    summary: 'Create Render timing as a branch-local item type after checker review.',
    reason: 'Repeated corrections point to render timing.',
    riskScore: 20,
    semanticConfidence: 0.8,
    userFitConfidence: 0.7,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: 1,
    updatedAt: 3,
    reviewedAt: null,
    appliedAt: null,
    ...overrides,
  };
}

function makeDeps(
  overrides: Partial<ProfileChangeProposalTargetSwitchServiceDependencies> = {},
): ProfileChangeProposalTargetSwitchServiceDependencies {
  const tx = { kind: 'tx' } as unknown as DbOrTx;
  return {
    transaction: async (callback) => callback(tx),
    getProposalById: async () => makeProposal(),
    getBranchById: async () => makeBranch(),
    getProfileDefinitionById: async () => makeDefinition(),
    insertProposal: async () => {},
    saveProposalIfPending: async () => true,
    insertEvent: async () => {},
    newProposalId: () => 'proposal-2',
    newEventId: () => 'event-1',
    ...overrides,
  };
}

function expectSwitchErrorCode(
  error: unknown,
  code: ProfileChangeProposalTargetSwitchServiceError['code'],
): void {
  expect(error).toBeInstanceOf(ProfileChangeProposalTargetSwitchServiceError);
  expect((error as ProfileChangeProposalTargetSwitchServiceError).code).toBe(code);
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('switchProfileChangeProposalTargetToBase', () => {
  it('creates a base-targeted replacement and supersedes the branch proposal atomically', async () => {
    const calls: string[] = [];
    const tx = { kind: 'tx' } as unknown as DbOrTx;
    const proposals = new Map<string, ProfileChangeProposal>([
      ['proposal-1', makeProposal()],
    ]);
    let insertedEvent: ProfileProposalEvent | undefined;
    const deps = makeDeps({
      transaction: async (callback) => {
        calls.push('transaction');
        return callback(tx);
      },
      getProposalById: async (id, executor) => {
        calls.push(`getProposal:${id}`);
        expect(executor).toBe(tx);
        return proposals.get(id);
      },
      getBranchById: async (id, executor) => {
        calls.push(`getBranch:${id}`);
        expect(executor).toBe(tx);
        return makeBranch();
      },
      getProfileDefinitionById: async (id, executor) => {
        calls.push(`getDefinition:${id}`);
        expect(executor).toBe(tx);
        return makeDefinition({
          version: 7,
          profile: makeProfile({ version: 7 }),
        });
      },
      insertProposal: async (proposal, executor) => {
        calls.push(`insertProposal:${proposal.id}`);
        expect(executor).toBe(tx);
        proposals.set(proposal.id, proposal);
      },
      saveProposalIfPending: async (proposal, expectedUpdatedAt, executor) => {
        calls.push(`saveProposal:${proposal.id}:${expectedUpdatedAt}`);
        expect(executor).toBe(tx);
        const current = proposals.get(proposal.id);
        if (!current || current.status !== 'pending' || current.updatedAt !== expectedUpdatedAt) return false;
        proposals.set(proposal.id, proposal);
        return true;
      },
      insertEvent: async (event, executor) => {
        calls.push(`insertEvent:${event.id}:${event.action}`);
        expect(executor).toBe(tx);
        insertedEvent = event;
      },
    });

    const result = await switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      reason: 'Promote this proposal to core review.',
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'getBranch:branch-1',
      'getDefinition:coding',
      'insertProposal:proposal-2',
      'getProposal:proposal-1',
      'getProposal:proposal-2',
      'saveProposal:proposal-1:3',
      'insertEvent:event-1:superseded',
    ]);
    expect(result.proposal).toMatchObject({
      id: 'proposal-2',
      proposalKind: 'ontology_node_patch',
      sourceKind: 'checker',
      baseProfileId: 'coding',
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 7,
      targetBranchUpdatedAt: null,
      evidenceIds: ['evidence-1'],
      title: 'Add Render timing type',
      summary: 'Create Render timing as a base/core item type after target-switch review.',
      reason: 'Repeated corrections point to render timing.',
      riskScore: BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE,
      semanticConfidence: 0.8,
      userFitConfidence: 0.7,
      status: 'pending',
      supersededByProposalId: null,
      createdAt: 10,
      updatedAt: 10,
      reviewedAt: null,
      appliedAt: null,
    });
    expect(result.proposal.patch).toEqual(makeProposal().patch);
    expect(result.proposal.patch).not.toBe(makeProposal().patch);
    expect(result.supersededProposal).toMatchObject({
      id: 'proposal-1',
      status: 'superseded',
      supersededByProposalId: 'proposal-2',
      reviewedAt: 10,
      updatedAt: 10,
      appliedAt: null,
    });
    expect(insertedEvent).toMatchObject({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'superseded',
      actorKind: 'user',
      reason: 'Promote this proposal to core review.',
      details: {
        supersededByProposalId: 'proposal-2',
      },
    });
  });

  it('fails static eligibility before loading branch or base rows', async () => {
    const calls: string[] = [];
    const error = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      deps: makeDeps({
        getProposalById: async () => makeProposal({
          status: 'accepted',
          reviewedAt: 4,
          appliedAt: 4,
        }),
        getBranchById: async () => {
          calls.push('getBranch');
          return makeBranch();
        },
        getProfileDefinitionById: async () => {
          calls.push('getDefinition');
          return makeDefinition();
        },
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));

    expectSwitchErrorCode(error, 'proposal_not_pending');
    expect(calls).toEqual([]);
  });

  it('dry-runs against the base profile and writes nothing on patch conflicts', async () => {
    const calls: string[] = [];
    const branchOnlyParentProposal = makeProposal({
      patch: {
        addOntologyNodes: [makeNode('branch_child', {
          parentId: 'branch_only_parent',
        })],
        addItemTypeNodeIds: ['branch_child'],
      },
    });
    const error = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      deps: makeDeps({
        getProposalById: async () => branchOnlyParentProposal,
        insertProposal: async () => {
          calls.push('insertProposal');
        },
        saveProposalIfPending: async () => {
          calls.push('saveProposal');
          return true;
        },
        insertEvent: async () => {
          calls.push('insertEvent');
        },
      }),
    }));

    expect(error).toBeInstanceOf(BaseProfileProposalApplyError);
    expect((error as BaseProfileProposalApplyError).code).toBe('patch_conflict');
    expect(calls).toEqual([]);
  });

  it('reports missing rows without writes', async () => {
    const calls: string[] = [];
    const missingProposal = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'missing',
      now: 10,
      deps: makeDeps({
        getProposalById: async () => undefined,
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));
    expectSwitchErrorCode(missingProposal, 'proposal_not_found');

    const missingBranch = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      deps: makeDeps({
        getBranchById: async () => undefined,
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));
    expectSwitchErrorCode(missingBranch, 'branch_not_found');

    const missingDefinition = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      deps: makeDeps({
        getProfileDefinitionById: async () => undefined,
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));
    expectSwitchErrorCode(missingDefinition, 'profile_definition_not_found');
    expect(calls).toEqual([]);
  });

  it('rejects branches that belong to a different base profile before creating replacements', async () => {
    const calls: string[] = [];
    const error = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      deps: makeDeps({
        getBranchById: async () => makeBranch({ parentProfileId: 'photography' }),
        insertProposal: async () => {
          calls.push('insertProposal');
        },
        saveProposalIfPending: async () => {
          calls.push('saveProposal');
          return true;
        },
        insertEvent: async () => {
          calls.push('insertEvent');
        },
      }),
    }));

    expectSwitchErrorCode(error, 'proposal_branch_base_mismatch');
    expect(calls).toEqual([]);
  });

  it('rolls back inserted replacements when superseding detects write drift', async () => {
    const calls: string[] = [];
    const error = await captureRejection(switchProfileChangeProposalTargetToBase({
      proposalId: 'proposal-1',
      now: 10,
      deps: makeDeps({
        insertProposal: async (proposal) => {
          calls.push(`insertProposal:${proposal.id}`);
        },
        saveProposalIfPending: async () => {
          calls.push('saveProposal');
          return false;
        },
      }),
    }));

    expect(calls).toEqual([
      'insertProposal:proposal-2',
      'saveProposal',
    ]);
    expect(error).toMatchObject({
      code: 'proposal_write_conflict',
    });
  });
});
