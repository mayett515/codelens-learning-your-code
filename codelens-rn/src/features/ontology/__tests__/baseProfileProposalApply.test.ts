import { describe, expect, it } from 'vitest';
import { BaseProfileVersioningError } from '../baseProfileVersioning';
import {
  BaseProfileProposalApplyError,
  applyBaseProfileChangeProposal,
  applyBaseProfilePatchOperation,
  compileBaseProfileProposalApplyOperation,
} from '../baseProfileProposalApply';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfilePatch,
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

function makeDefinition(
  overrides: Partial<ProfileDefinition<string>> = {},
): ProfileDefinition<string> {
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

function makePatch(overrides: Partial<ProfilePatch<string>> = {}): ProfilePatch<string> {
  return {
    addOntologyNodes: [makeNode('noise_control')],
    addItemTypeNodeIds: ['noise_control'],
    ...overrides,
  };
}

function makeProposal(
  overrides: Partial<ProfileChangeProposal<string>> = {},
): ProfileChangeProposal<string> {
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
    patch: makePatch(),
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

function expectApplyErrorCode(fn: () => unknown, code: BaseProfileProposalApplyError['code']): void {
  try {
    fn();
    throw new Error('Expected BaseProfileProposalApplyError');
  } catch (error) {
    expect(error).toBeInstanceOf(BaseProfileProposalApplyError);
    expect((error as BaseProfileProposalApplyError).code).toBe(code);
  }
}

function expectVersioningErrorCode(fn: () => unknown, code: BaseProfileVersioningError['code']): void {
  try {
    fn();
    throw new Error('Expected BaseProfileVersioningError');
  } catch (error) {
    expect(error).toBeInstanceOf(BaseProfileVersioningError);
    expect((error as BaseProfileVersioningError).code).toBe(code);
  }
}

describe('base profile proposal apply helpers', () => {
  it('applies a pending base-target proposal to a new profile definition version', () => {
    const definition = makeDefinition();
    const proposal = makeProposal();
    const now = 1_800_000_000_000;

    const result = applyBaseProfileChangeProposal({
      proposal,
      profileDefinition: definition,
      now,
    });

    expect(result.operation).toMatchObject({
      kind: 'apply_profile_patch_to_base_profile',
      proposalId: 'proposal-1',
      baseProfileId: 'coding',
      expectedProposalUpdatedAt: 2,
      expectedProfileVersion: 4,
      expectedProfileDefinitionUpdatedAt: 2,
      appliedAt: now,
    });
    expect(result.profileDefinition).not.toBe(definition);
    expect(result.profileDefinition.profile).not.toBe(definition.profile);
    expect(result.profileDefinition.version).toBe(5);
    expect(result.profileDefinition.profile.version).toBe(5);
    expect(result.profileDefinition.updatedAt).toBe(now);
    expect(result.profileDefinition.profile.ontology.nodes.some((node) => node.id === 'noise_control')).toBe(true);
    expect(result.profileDefinition.profile.ontology.itemTypeNodeIds).toContain('noise_control');

    expect(result.proposal.status).toBe('accepted');
    expect(result.proposal.reviewedAt).toBe(now);
    expect(result.proposal.appliedAt).toBe(now);
    expect(result.proposal.updatedAt).toBe(now);
    expect(result.proposal.patch).not.toBe(proposal.patch);

    expect(definition.version).toBe(4);
    expect(definition.profile.ontology.nodes.some((node) => node.id === 'noise_control')).toBe(false);
    expect(proposal.status).toBe('pending');
  });

  it('merges patch fields into the base profile without losing existing profile data', () => {
    const proposal = makeProposal({
      patch: makePatch({
        addOntologyNodes: [makeNode('star_trails')],
        addItemTypeNodeIds: ['star_trails'],
        overrideLabels: {
          itemSingular: 'Technique',
          flashback: {
            emptyLabel: 'No night notes yet',
          },
        },
        overrideGraph: {
          nodeColors: {
            star_trails: '#222222',
          },
        },
      }),
    });

    const result = applyBaseProfileChangeProposal({
      proposal,
      profileDefinition: makeDefinition(),
      now: 3,
    });

    expect(result.profileDefinition.profile.labels.itemSingular).toBe('Technique');
    expect(result.profileDefinition.profile.labels.flashback.emptyLabel).toBe('No night notes yet');
    expect(result.profileDefinition.profile.labels.flashback.fallbackTitle).toBe(codingProfile.labels.flashback.fallbackTitle);
    expect(result.profileDefinition.profile.graph.nodeColors).toMatchObject({
      star_trails: '#222222',
    });
    expect(result.profileDefinition.profile.ontology.itemTypeNodeIds).toContain('star_trails');
    expect(result.profileDefinition.profile.metadataFields.length).toBe(codingProfile.metadataFields.length);
  });

  it('treats overrideOntology nodes as additive compatibility fields', () => {
    const proposal = makeProposal({
      patch: makePatch({
        addOntologyNodes: [],
        addItemTypeNodeIds: [],
        overrideOntology: {
          nodes: [makeNode('manual_family')],
        },
      }),
    });

    const result = applyBaseProfileChangeProposal({
      proposal,
      profileDefinition: makeDefinition(),
      now: 3,
    });

    expect(result.profileDefinition.profile.ontology.nodes.some((node) => node.id === 'manual_family')).toBe(true);
  });

  it('compiles a cloned operation before applying it', () => {
    const proposal = makeProposal();
    const operation = compileBaseProfileProposalApplyOperation({
      proposal,
      profileDefinition: makeDefinition(),
      now: 3,
    });

    expect(operation.patch).toEqual(proposal.patch);
    expect(operation.patch).not.toBe(proposal.patch);

    const changedDefinition = makeDefinition({ updatedAt: 99 });
    expectApplyErrorCode(
      () => applyBaseProfilePatchOperation({ profileDefinition: changedDefinition, operation }),
      'profile_definition_changed_after_compile',
    );
  });

  it('rejects stale or missing base target versions before base apply', () => {
    expectVersioningErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({ targetProfileVersion: 3 }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'target_profile_version_stale',
    );

    expectVersioningErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({ targetProfileVersion: null }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'target_profile_version_missing',
    );
  });

  it('rejects branch targets, non-pending proposals, branch merges, and invalid apply time', () => {
    expectVersioningErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          target: { kind: 'profile_branch', branchId: 'branch-1' },
          targetProfileVersion: null,
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'proposal_not_base_target',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({ status: 'postponed' }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'proposal_not_pending',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          proposalKind: 'branch_merge',
          sourceBranchId: 'branch-1',
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'proposal_kind_not_supported',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal(),
        profileDefinition: makeDefinition(),
        now: 1,
      }),
      'proposal_apply_time_invalid',
    );
  });

  it('rejects patch conflicts against the current base profile', () => {
    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [makeNode('mechanism')],
            addItemTypeNodeIds: ['mechanism'],
          }),
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [],
            addItemTypeNodeIds: ['missing_node'],
          }),
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            overrideOntologyNodes: [makeNode('missing_node')],
          }),
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [],
            addItemTypeNodeIds: [],
            overrideOntologyNodes: [makeNode('mechanism')],
            overrideOntology: {
              nodes: [makeNode('mechanism')],
            },
          }),
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'patch_conflict',
    );
  });

  it('treats relationship type ids as opaque strings while rejecting conflicts', () => {
    const result = applyBaseProfileChangeProposal({
      proposal: makeProposal({
        patch: makePatch({
          addOntologyNodes: [],
          addItemTypeNodeIds: [],
          addRelationshipTypeNodeIds: ['causes_noise'],
        }),
      }),
      profileDefinition: makeDefinition(),
      now: 3,
    });

    expect(result.profileDefinition.profile.ontology.relationshipTypeNodeIds).toContain('causes_noise');

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [],
            addItemTypeNodeIds: [],
            addRelationshipTypeNodeIds: ['related'],
          }),
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBaseProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [],
            addItemTypeNodeIds: [],
            addRelationshipTypeNodeIds: ['causes_noise'],
            overrideOntology: {
              relationshipTypeNodeIds: ['causes_noise'],
            },
          }),
        }),
        profileDefinition: makeDefinition(),
        now: 3,
      }),
      'patch_conflict',
    );
  });
});
