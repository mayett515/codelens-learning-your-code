import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../db/client', () => ({
  db: {},
}));

import { loadProfileProposalFreshness } from '../data/profileProposalFreshnessService';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileRegistry,
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
    name: 'React branch',
    overlay: {
      id: 'overlay-1',
      kind: 'project',
    },
    createdAt: 1,
    updatedAt: 2,
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

function makeRegistry(profile: DomainProfile<string> = makeProfile()): ProfileRegistry<string> {
  return {
    getProfile: vi.fn(() => profile),
    listProfiles: vi.fn(() => [{
      id: profile.id,
      version: profile.version,
      label: profile.label,
      description: profile.description,
    }]),
  };
}

describe('loadProfileProposalFreshness', () => {
  it('marks a current branch proposal fresh when its patch still validates', async () => {
    const freshness = await loadProfileProposalFreshness({
      proposal: makeProposal(),
      now: 3,
      deps: {
        getBranchById: async () => makeBranch(),
        loadRegistry: async () => makeRegistry(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'fresh',
      canApply: true,
      expectedRevision: 2,
      currentRevision: 2,
    });
  });

  it('marks changed branch proposals stale-refreshable when the patch still fits', async () => {
    const freshness = await loadProfileProposalFreshness({
      proposal: makeProposal(),
      now: 3,
      deps: {
        getBranchById: async () => makeBranch({ updatedAt: 5 }),
        loadRegistry: async () => makeRegistry(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'stale_refreshable',
      reason: 'target_branch_updated_at_changed',
      canApply: false,
      canRefresh: true,
      expectedRevision: 2,
      currentRevision: 5,
    });
  });

  it('reports branch proposals conflicted when target drift makes the patch invalid', async () => {
    const freshness = await loadProfileProposalFreshness({
      proposal: makeProposal(),
      now: 3,
      deps: {
        getBranchById: async () => makeBranch({
          updatedAt: 5,
          overlay: {
            id: 'overlay-1',
            kind: 'project',
            addOntologyNodes: [makeNode('noise_control')],
            addItemTypeNodeIds: ['noise_control'],
          },
        }),
        loadRegistry: async () => makeRegistry(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'conflicted',
      reason: 'patch_conflict',
      canApply: false,
      canRefresh: false,
    });
  });

  it('marks missing branch targets obsolete', async () => {
    const freshness = await loadProfileProposalFreshness({
      proposal: makeProposal(),
      now: 3,
      deps: {
        getBranchById: async () => undefined,
        loadRegistry: async () => makeRegistry(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'obsolete',
      reason: 'target_missing',
      canApply: false,
    });
  });

  it('checks persisted base profile versions without mutating definitions', async () => {
    const proposal = makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 3,
      targetBranchUpdatedAt: null,
    });
    const freshness = await loadProfileProposalFreshness({
      proposal,
      now: 3,
      deps: {
        getProfileDefinitionById: async () => makeDefinition(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'stale_refreshable',
      reason: 'target_profile_version_changed',
      expectedRevision: 3,
      currentRevision: 4,
    });
  });

  it('marks current base-profile proposals fresh when the patch still validates', async () => {
    const proposal = makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 4,
      targetBranchUpdatedAt: null,
    });
    const freshness = await loadProfileProposalFreshness({
      proposal,
      now: 3,
      deps: {
        getProfileDefinitionById: async () => makeDefinition(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'fresh',
      reason: 'target_profile_version_matches',
      canApply: true,
      canRefresh: false,
      expectedRevision: 4,
      currentRevision: 4,
    });
  });

  it('marks legacy base-profile proposals unknown when the target version snapshot is missing', async () => {
    const proposal = makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: null,
      targetBranchUpdatedAt: null,
    });
    const freshness = await loadProfileProposalFreshness({
      proposal,
      now: 3,
      deps: {
        getProfileDefinitionById: async () => makeDefinition(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'unknown',
      reason: 'target_profile_version_missing',
      canApply: false,
      canRefresh: false,
      expectedRevision: null,
      currentRevision: 4,
    });
  });

  it('marks missing base profile targets obsolete', async () => {
    const proposal = makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 4,
      targetBranchUpdatedAt: null,
    });
    const freshness = await loadProfileProposalFreshness({
      proposal,
      now: 3,
      deps: {
        getProfileDefinitionById: async () => undefined,
      },
    });

    expect(freshness).toMatchObject({
      status: 'obsolete',
      reason: 'target_missing',
      canApply: false,
      canRefresh: false,
    });
  });

  it('reports base profile patch conflicts before stale-refreshable status', async () => {
    const proposal = makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 3,
      targetBranchUpdatedAt: null,
      patch: {
        addOntologyNodes: [makeNode('mechanism')],
      },
    });

    const freshness = await loadProfileProposalFreshness({
      proposal,
      now: 3,
      deps: {
        getProfileDefinitionById: async () => makeDefinition(),
      },
    });

    expect(freshness).toMatchObject({
      status: 'conflicted',
      reason: 'patch_conflict',
      canApply: false,
      canRefresh: false,
    });
  });
});
