import { describe, expect, it, vi } from 'vitest';
import type { DbOrTx } from '../../../db/client';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {},
}));

vi.mock('../../../db/client', () => ({
  db: mockDb,
}));

import { BranchLocalProposalApplyError } from '../branchLocalProposalApply';
import { BaseProfileProposalApplyError } from '../baseProfileProposalApply';
import {
  createEditedProfileChangeProposalReplacement,
  ProfileChangeProposalEditServiceError,
  type ProfileChangeProposalEditServiceDependencies,
} from '../data/profileChangeProposalEditService';
import { ProfileChangeProposalLifecycleServiceError } from '../data/profileChangeProposalLifecycleService';
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
  overrides: Partial<ProfileChangeProposalEditServiceDependencies> = {},
): ProfileChangeProposalEditServiceDependencies {
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

function expectEditErrorCode(
  error: unknown,
  code: ProfileChangeProposalEditServiceError['code'],
): void {
  expect(error).toBeInstanceOf(ProfileChangeProposalEditServiceError);
  expect((error as ProfileChangeProposalEditServiceError).code).toBe(code);
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected promise to reject');
}

describe('createEditedProfileChangeProposalReplacement', () => {
  it('creates an edited branch replacement and supersedes the original proposal atomically', async () => {
    const calls: string[] = [];
    const tx = { kind: 'tx' } as unknown as DbOrTx;
    const proposals = new Map<string, ProfileChangeProposal>([
      ['proposal-1', makeProposal()],
    ]);
    let insertedEvent: ProfileProposalEvent | undefined;
    const editedPatch = {
      addOntologyNodes: [makeNode('exposure_planning', {
        label: 'Exposure planning',
        parentId: 'mechanism',
        meaning: 'Plans shutter, aperture, and ISO tradeoffs.',
      })],
      addItemTypeNodeIds: ['exposure_planning'],
    };
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
        return makeBranch({ updatedAt: 8 });
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

    const result = await createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: editedPatch,
        title: 'Add exposure planning',
        summary: 'Create a narrower branch-local type from an edited draft.',
        reason: 'The suggestion was close, but the label and meaning needed tightening.',
        semanticConfidence: null,
      },
      supersedeReason: 'User edited the draft before applying.',
      deps,
    });

    expect(calls).toEqual([
      'transaction',
      'getProposal:proposal-1',
      'getBranch:branch-1',
      'insertProposal:proposal-2',
      'getProposal:proposal-1',
      'getProposal:proposal-2',
      'saveProposal:proposal-1:3',
      'insertEvent:event-1:superseded',
    ]);
    expect(result.proposal).toMatchObject({
      id: 'proposal-2',
      sourceKind: 'user',
      target: {
        kind: 'profile_branch',
        branchId: 'branch-1',
      },
      targetProfileVersion: null,
      targetBranchUpdatedAt: 8,
      patch: editedPatch,
      title: 'Add exposure planning',
      summary: 'Create a narrower branch-local type from an edited draft.',
      riskScore: 20,
      semanticConfidence: null,
      userFitConfidence: 0.7,
      status: 'pending',
      supersededByProposalId: null,
      createdAt: 10,
      updatedAt: 10,
      reviewedAt: null,
      appliedAt: null,
    });
    expect(result.proposal.patch).toEqual(editedPatch);
    expect(result.proposal.patch).not.toBe(editedPatch);
    expect(result.proposal.patch.addOntologyNodes).not.toBe(editedPatch.addOntologyNodes);
    expect(result.proposal.reason).toContain('The suggestion was close');
    expect(result.proposal.reason).toContain('Edited replacement for proposal proposal-1');
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
      reason: 'User edited the draft before applying.',
      details: {
        supersededByProposalId: 'proposal-2',
      },
    });
  });

  it('creates edited base-profile replacements against the current base version', async () => {
    let insertedProposal: ProfileChangeProposal | undefined;
    const deps = makeDeps({
      getProposalById: async (id) => id === 'proposal-1'
        ? makeProposal({
          target: {
            kind: 'base_profile',
            profileId: 'coding',
          },
          targetProfileVersion: 3,
          targetBranchUpdatedAt: null,
          riskScore: 70,
        })
        : insertedProposal,
      getProfileDefinitionById: async () => makeDefinition({
        version: 6,
        profile: makeProfile({ version: 6 }),
      }),
      insertProposal: async (proposal) => {
        insertedProposal = proposal;
      },
    });

    const result = await createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: {
          addOntologyNodes: [makeNode('exposure_planning')],
          addItemTypeNodeIds: ['exposure_planning'],
        },
        riskScore: 65,
      },
      deps,
    });

    expect(result.proposal).toMatchObject({
      id: 'proposal-2',
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 6,
      targetBranchUpdatedAt: null,
      riskScore: 65,
      status: 'pending',
    });
  });

  it('rejects non-pending proposals before loading a target', async () => {
    const calls: string[] = [];
    const error = await captureRejection(createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: {
          addItemTypeNodeIds: ['noise_control'],
        },
      },
      deps: makeDeps({
        getProposalById: async () => makeProposal({
          status: 'postponed',
          reviewedAt: 4,
        }),
        getBranchById: async () => {
          calls.push('getBranch');
          return makeBranch();
        },
        insertProposal: async () => {
          calls.push('insertProposal');
        },
      }),
    }));

    expectEditErrorCode(error, 'proposal_not_pending');
    expect(calls).toEqual([]);
  });

  it('reports missing proposals without writes', async () => {
    const calls: string[] = [];
    const error = await captureRejection(createEditedProfileChangeProposalReplacement({
      proposalId: 'missing-proposal',
      now: 10,
      draft: {
        patch: {
          addItemTypeNodeIds: ['exposure_planning'],
        },
      },
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

    expectEditErrorCode(error, 'proposal_not_found');
    expect(calls).toEqual([]);
  });

  it('propagates edited patch conflicts before inserting a replacement', async () => {
    const calls: string[] = [];
    const error = await captureRejection(createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: {
          addOntologyNodes: [makeNode('noise_control')],
          addItemTypeNodeIds: ['noise_control'],
        },
      },
      deps: makeDeps({
        getBranchById: async () => makeBranch({
          updatedAt: 8,
          overlay: {
            id: 'overlay-1',
            kind: 'project',
            addOntologyNodes: [makeNode('noise_control')],
            addItemTypeNodeIds: ['noise_control'],
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

  it('rejects edited parent ids that are not target item types before inserting a replacement', async () => {
    const calls: string[] = [];
    const error = await captureRejection(createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: {
          addOntologyNodes: [makeNode('exposure_planning', {
            parentId: 'missing_parent',
          })],
          addItemTypeNodeIds: ['exposure_planning'],
        },
      },
      deps: makeDeps({
        getBranchById: async () => makeBranch({ updatedAt: 8 }),
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

  it('propagates base-profile patch conflicts before inserting a replacement', async () => {
    const calls: string[] = [];
    const error = await captureRejection(createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: {
          addOntologyNodes: [makeNode('mechanism')],
        },
      },
      deps: makeDeps({
        getProposalById: async () => makeProposal({
          target: {
            kind: 'base_profile',
            profileId: 'coding',
          },
          targetProfileVersion: 3,
          targetBranchUpdatedAt: null,
        }),
        getProfileDefinitionById: async () => makeDefinition({
          version: 6,
          profile: makeProfile({ version: 6 }),
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

    expect(error).toBeInstanceOf(BaseProfileProposalApplyError);
    expect((error as BaseProfileProposalApplyError).code).toBe('patch_conflict');
    expect(calls).toEqual([]);
  });

  it('fails closed when superseding detects proposal drift after replacement insert', async () => {
    const calls: string[] = [];
    let insertedProposal: ProfileChangeProposal | undefined;
    const error = await captureRejection(createEditedProfileChangeProposalReplacement({
      proposalId: 'proposal-1',
      now: 10,
      draft: {
        patch: {
          addOntologyNodes: [makeNode('exposure_planning')],
          addItemTypeNodeIds: ['exposure_planning'],
        },
      },
      deps: makeDeps({
        getProposalById: async (id) => id === 'proposal-1'
          ? makeProposal()
          : insertedProposal,
        insertProposal: async (proposal) => {
          calls.push(`insertProposal:${proposal.id}`);
          insertedProposal = proposal;
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

    expect(error).toBeInstanceOf(ProfileChangeProposalLifecycleServiceError);
    expect((error as ProfileChangeProposalLifecycleServiceError).code).toBe('proposal_write_conflict');
    expect(calls).toEqual(['insertProposal:proposal-2', 'saveProposal']);
  });
});
