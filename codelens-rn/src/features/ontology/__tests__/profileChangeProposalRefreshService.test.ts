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
  ProfileChangeProposalRefreshServiceError,
  refreshStaleProfileChangeProposal,
  type ProfileChangeProposalRefreshServiceDependencies,
} from '../data/profileChangeProposalRefreshService';
import { codingProfile } from '../profiles/codingProfile';
import { ProfileNotFoundError } from '../profileRegistry';
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
    updatedAt: 5,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<DomainProfile<string>> = {}): DomainProfile<string> {
  return {
    ...(codingProfile as DomainProfile<string>),
    version: 5,
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
    updatedAt: 5,
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
    updatedAt: 3,
    reviewedAt: null,
    appliedAt: null,
    ...overrides,
  };
}

function makeDeps(
  overrides: Partial<ProfileChangeProposalRefreshServiceDependencies> = {},
): ProfileChangeProposalRefreshServiceDependencies {
  const tx = { kind: 'tx' } as unknown as DbOrTx;
  return {
    transaction: async (callback) => callback(tx),
    getProposalById: async () => makeProposal(),
    getBranchById: async () => makeBranch(),
    getProfileDefinitionById: async () => makeDefinition(),
    insertProposal: async () => {},
    saveProposalIfPending: async () => true,
    insertEvent: async () => {},
    loadRegistry: async () => ({
      getProfile: () => codingProfile as DomainProfile<string>,
      listProfiles: () => [],
    }),
    newProposalId: () => 'proposal-2',
    newEventId: () => 'event-1',
    ...overrides,
  };
}

function expectRefreshErrorCode(
  error: unknown,
  code: ProfileChangeProposalRefreshServiceError['code'],
): void {
  expect(error).toBeInstanceOf(ProfileChangeProposalRefreshServiceError);
  expect((error as ProfileChangeProposalRefreshServiceError).code).toBe(code);
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('refreshStaleProfileChangeProposal', () => {
  it('creates a refreshed branch proposal and supersedes the stale proposal atomically', async () => {
    const calls: string[] = [];
    let insertedProposal: ProfileChangeProposal | undefined;
    let supersededProposal: ProfileChangeProposal | undefined;
    let insertedEvent: ProfileProposalEvent | undefined;
    const tx = { kind: 'tx' } as unknown as DbOrTx;
    const deps = makeDeps({
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
        return makeBranch({ updatedAt: 5 });
      },
      insertProposal: async (proposal, executor) => {
        calls.push(`insertProposal:${proposal.id}`);
        expect(executor).toBe(tx);
        insertedProposal = proposal;
      },
      saveProposalIfPending: async (proposal, expectedUpdatedAt, executor) => {
        calls.push(`saveProposal:${proposal.id}:${expectedUpdatedAt}`);
        expect(executor).toBe(tx);
        supersededProposal = proposal;
        return true;
      },
      insertEvent: async (event, executor) => {
        calls.push(`insertEvent:${event.id}:${event.action}`);
        expect(executor).toBe(tx);
        insertedEvent = event;
      },
    });

    const result = await refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      reason: 'Target changed while reviewing.',
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'getBranch:branch-1',
      'insertProposal:proposal-2',
      'saveProposal:proposal-1:3',
      'insertEvent:event-1:superseded',
    ]);
    expect(result).toEqual({
      proposal: insertedProposal,
      supersededProposal,
    });
    expect(insertedProposal).toMatchObject({
      id: 'proposal-2',
      status: 'pending',
      targetBranchUpdatedAt: 5,
      targetProfileVersion: null,
      createdAt: 7,
      updatedAt: 7,
      reviewedAt: null,
      appliedAt: null,
    });
    expect(insertedProposal?.reason).toContain('Refreshed replacement for proposal proposal-1');
    expect(supersededProposal).toMatchObject({
      id: 'proposal-1',
      status: 'superseded',
      supersededByProposalId: 'proposal-2',
      reviewedAt: 7,
      appliedAt: null,
      updatedAt: 7,
    });
    expect(insertedEvent).toMatchObject({
      id: 'event-1',
      proposalId: 'proposal-1',
      action: 'superseded',
      statusBefore: 'pending',
      statusAfter: 'superseded',
      branchUpdatedAtBefore: 2,
      branchUpdatedAtAfter: 5,
      details: {
        supersededByProposalId: 'proposal-2',
        refreshKind: 'target_rebase',
        previousTargetRevision: 2,
        refreshedTargetRevision: 5,
      },
    });
  });

  it('refreshes stale base proposals by snapshotting the current base version', async () => {
    let insertedProposal: ProfileChangeProposal | undefined;
    const deps = makeDeps({
      getProposalById: async () => makeProposal({
        target: {
          kind: 'base_profile',
          profileId: 'coding',
        },
        targetProfileVersion: 3,
        targetBranchUpdatedAt: null,
        riskScore: 70,
      }),
      getProfileDefinitionById: async () => makeDefinition({
        version: 5,
        profile: makeProfile({ version: 5 }),
      }),
      insertProposal: async (proposal) => {
        insertedProposal = proposal;
      },
    });

    await refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps,
    });

    expect(insertedProposal).toMatchObject({
      id: 'proposal-2',
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 5,
      targetBranchUpdatedAt: null,
      status: 'pending',
    });
  });

  it('rejects proposals that are not stale against their target', async () => {
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        getBranchById: async () => makeBranch({ updatedAt: 2 }),
      }),
    }));

    expectRefreshErrorCode(error, 'proposal_not_refreshable');
  });

  it('reports missing proposals without writes', async () => {
    const calls: string[] = [];
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'missing-proposal',
      now: 7,
      deps: makeDeps({
        getProposalById: async () => undefined,
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

    expectRefreshErrorCode(error, 'proposal_not_found');
    expect(calls).toEqual([]);
  });

  it('rejects non-pending proposals before loading the target', async () => {
    const calls: string[] = [];
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        getProposalById: async () => makeProposal({
          status: 'accepted',
          reviewedAt: 4,
        }),
        getBranchById: async () => {
          calls.push('getBranch');
          return makeBranch();
        },
      }),
    }));

    expectRefreshErrorCode(error, 'proposal_not_pending');
    expect(calls).toEqual([]);
  });

  it('reports missing branch targets without writes', async () => {
    const calls: string[] = [];
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        getBranchById: async () => undefined,
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));

    expectRefreshErrorCode(error, 'branch_not_found');
    expect(calls).toEqual([]);
  });

  it('reports missing profile definitions for stale base proposals', async () => {
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        getProposalById: async () => makeProposal({
          target: {
            kind: 'base_profile',
            profileId: 'coding',
          },
          targetProfileVersion: 3,
          targetBranchUpdatedAt: null,
        }),
        getProfileDefinitionById: async () => undefined,
      }),
    }));

    expectRefreshErrorCode(error, 'profile_definition_not_found');
  });

  it('reports missing base profiles while dry-running branch refresh patches', async () => {
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        loadRegistry: async () => ({
          getProfile: () => {
            throw new ProfileNotFoundError('missing-profile');
          },
          listProfiles: () => [],
        }),
      }),
    }));

    expectRefreshErrorCode(error, 'base_profile_not_found');
  });

  it('rejects unsupported proposal targets before writes', async () => {
    const calls: string[] = [];
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        getProposalById: async () => makeProposal({
          target: {
            kind: 'legacy_target',
          } as never,
        }),
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));

    expectRefreshErrorCode(error, 'proposal_target_not_supported');
    expect(calls).toEqual([]);
  });

  it('propagates patch conflicts and performs no writes', async () => {
    const calls: string[] = [];
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        getBranchById: async () => makeBranch({
          updatedAt: 5,
          overlay: {
            id: 'overlay-1',
            kind: 'project',
            addOntologyNodes: [makeNode('noise_control')],
          },
        }),
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

    expect(error).toBeInstanceOf(BranchLocalProposalApplyError);
    expect((error as BranchLocalProposalApplyError).code).toBe('patch_conflict');
    expect(calls).toEqual([]);
  });

  it('fails closed when the old proposal conditional write detects drift', async () => {
    const calls: string[] = [];
    const error = await captureRejection(refreshStaleProfileChangeProposal({
      proposalId: 'proposal-1',
      now: 7,
      deps: makeDeps({
        insertProposal: async () => {
          calls.push('insertProposal');
        },
        saveProposalIfPending: async () => {
          calls.push('saveProposal');
          return false;
        },
        insertEvent: async () => {
          calls.push('insertEvent');
        },
      }),
    }));

    expectRefreshErrorCode(error, 'proposal_write_conflict');
    expect(calls).toEqual(['insertProposal', 'saveProposal']);
  });
});
