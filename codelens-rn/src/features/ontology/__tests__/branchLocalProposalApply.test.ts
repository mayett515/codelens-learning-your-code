import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BranchLocalProposalApplyError,
  applyBranchLocalProfileChangeProposal,
  applyBranchLocalProfilePatchOperation,
  compileBranchLocalProposalApplyOperation,
} from '../branchLocalProposalApply';
import { composeRuntimeDomainProfileFromBranches } from '../profileBranches';
import { codingProfile } from '../profiles/codingProfile';
import type {
  DomainProfile,
  OntologyNode,
  ProfileBranch,
  ProfileChangeProposal,
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

function makePatch(overrides: Partial<ProfilePatch<string>> = {}): ProfilePatch<string> {
  return {
    addOntologyNodes: [makeNode('noise_control')],
    addItemTypeNodeIds: ['noise_control'],
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
    patch: makePatch(),
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

function expectApplyErrorCode(fn: () => unknown, code: BranchLocalProposalApplyError['code']): void {
  try {
    fn();
    throw new Error('Expected BranchLocalProposalApplyError');
  } catch (error) {
    expect(error).toBeInstanceOf(BranchLocalProposalApplyError);
    expect((error as BranchLocalProposalApplyError).code).toBe(code);
  }
}

describe('branch-local proposal apply helpers', () => {
  const baseProfile = codingProfile as DomainProfile<string>;

  it('applies a pending branch-target proposal to one branch overlay and accepts the proposal', () => {
    const branch = makeBranch();
    const proposal = makeProposal();
    const now = 1_800_000_000_000;

    const result = applyBranchLocalProfileChangeProposal({
      proposal,
      baseProfile,
      branch,
      now,
    });

    expect(result.operation).toMatchObject({
      kind: 'apply_profile_patch_to_branch_overlay',
      proposalId: 'proposal-1',
      baseProfileId: 'coding',
      branchId: 'branch-1',
      expectedProposalUpdatedAt: 2,
      expectedBranchUpdatedAt: 2,
      appliedAt: now,
    });

    expect(result.branch).not.toBe(branch);
    expect(result.branch.overlay).not.toBe(branch.overlay);
    expect(result.branch.overlay.id).toBe('overlay-1');
    expect(result.branch.overlay.kind).toBe('project');
    expect(result.branch.overlay.addOntologyNodes?.map((node) => node.id)).toEqual(['noise_control']);
    expect(result.branch.overlay.addItemTypeNodeIds).toEqual(['noise_control']);
    expect(result.branch.updatedAt).toBe(now);

    expect(result.proposal.status).toBe('accepted');
    expect(result.proposal.patch).not.toBe(proposal.patch);
    expect(result.proposal.reviewedAt).toBe(now);
    expect(result.proposal.appliedAt).toBe(now);
    expect(result.proposal.updatedAt).toBe(now);

    expect(branch.overlay.addOntologyNodes).toBeUndefined();
    expect(proposal.status).toBe('pending');

    const composed = composeRuntimeDomainProfileFromBranches({
      baseProfile,
      branches: [result.branch],
    });
    expect(composed.ontology.nodes.some((node) => node.id === 'noise_control')).toBe(true);
    expect(composed.ontology.itemTypeNodeIds).toContain('noise_control');
  });

  it('merges patch fields into existing branch overlay fields without losing existing branch changes', () => {
    const branch = makeBranch({
      overlay: {
        id: 'overlay-1',
        kind: 'project',
        addOntologyNodes: [makeNode('existing_branch_type')],
        addItemTypeNodeIds: ['existing_branch_type'],
        overrideLabels: {
          hubTitle: 'Night Photography',
          flashback: {
            emptyLabel: 'No night notes yet',
          },
        },
        overrideGraph: {
          nodeColors: {
            existing_branch_type: '#111111',
          },
        },
      },
    });
    const proposal = makeProposal({
      patch: makePatch({
        addOntologyNodes: [makeNode('star_trails')],
        addItemTypeNodeIds: ['star_trails'],
        overrideLabels: {
          itemSingular: 'Technique',
          flashback: {
            fallbackTitle: 'Night session',
          },
        },
        overrideGraph: {
          nodeColors: {
            star_trails: '#222222',
          },
        },
      }),
    });

    const result = applyBranchLocalProfileChangeProposal({
      proposal,
      baseProfile,
      branch,
      now: 3,
    });

    expect(result.branch.overlay.addOntologyNodes?.map((node) => node.id)).toEqual([
      'existing_branch_type',
      'star_trails',
    ]);
    expect(result.branch.overlay.addItemTypeNodeIds).toEqual([
      'existing_branch_type',
      'star_trails',
    ]);
    expect(result.branch.overlay.overrideLabels?.hubTitle).toBe('Night Photography');
    expect(result.branch.overlay.overrideLabels?.itemSingular).toBe('Technique');
    expect(result.branch.overlay.overrideLabels?.flashback?.emptyLabel).toBe('No night notes yet');
    expect(result.branch.overlay.overrideLabels?.flashback?.fallbackTitle).toBe('Night session');
    expect(result.branch.overlay.overrideGraph?.nodeColors).toEqual({
      existing_branch_type: '#111111',
      star_trails: '#222222',
    });
  });

  it('compiles a cloned typed operation before applying it', () => {
    const node = makeNode('manual_type');
    const proposal = makeProposal({
      sourceKind: 'user',
      proposalKind: 'manual_draft',
      evidenceIds: [],
      patch: makePatch({
        addOntologyNodes: [node],
        addItemTypeNodeIds: ['manual_type'],
      }),
    });
    const operation = compileBranchLocalProposalApplyOperation({
      proposal,
      baseProfile,
      branch: makeBranch(),
      now: 5,
    });

    expect(operation.patch).not.toBe(proposal.patch);
    expect(operation.patch.addOntologyNodes).not.toBe(proposal.patch.addOntologyNodes);
    expect(operation.patch.addOntologyNodes?.[0]).not.toBe(node);

    const branch = applyBranchLocalProfilePatchOperation({
      branch: makeBranch(),
      operation,
    });
    expect(branch.overlay.addItemTypeNodeIds).toEqual(['manual_type']);
  });

  it('rejects non-pending, base-target, mismatched branch, and mismatched base proposals', () => {
    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({ status: 'postponed' }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'proposal_not_pending',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          proposalKind: 'branch_merge',
          sourceBranchId: 'source-branch',
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'proposal_kind_not_supported',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          target: {
            kind: 'base_profile',
            profileId: 'coding',
          },
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'proposal_not_branch_target',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          target: {
            kind: 'profile_branch',
            branchId: 'other-branch',
          },
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'proposal_branch_mismatch',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({ baseProfileId: 'photography' }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'proposal_base_mismatch',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({ updatedAt: 5 }),
        baseProfile,
        branch: makeBranch(),
        now: 4,
      }),
      'proposal_apply_time_invalid',
    );
  });

  it('rejects stale add-node and invalid item-type patches before mutating a branch', () => {
    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [makeNode('mechanism')],
            addItemTypeNodeIds: ['mechanism'],
          }),
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          patch: makePatch({
            addOntologyNodes: [makeNode('duplicate'), makeNode('duplicate')],
            addItemTypeNodeIds: ['duplicate'],
          }),
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          patch: {
            addItemTypeNodeIds: ['missing_node'],
          },
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          patch: {
            overrideOntologyNodes: [makeNode('unknown_override')],
          },
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'patch_conflict',
    );
  });

  it('treats relationship type ids as opaque strings while rejecting duplicates', () => {
    const result = applyBranchLocalProfileChangeProposal({
      proposal: makeProposal({
        patch: {
          addRelationshipTypeNodeIds: ['causes_noise'],
        },
      }),
      baseProfile,
      branch: makeBranch(),
      now: 3,
    });

    expect(result.branch.overlay.addRelationshipTypeNodeIds).toEqual(['causes_noise']);

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          patch: {
            addRelationshipTypeNodeIds: ['related'],
          },
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'patch_conflict',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal({
          patch: {
            addRelationshipTypeNodeIds: ['causes_noise', 'causes_noise'],
          },
        }),
        baseProfile,
        branch: makeBranch(),
        now: 3,
      }),
      'patch_conflict',
    );
  });

  it('rejects branch kind mismatches and operation/branch mismatches', () => {
    expectApplyErrorCode(
      () => applyBranchLocalProfileChangeProposal({
        proposal: makeProposal(),
        baseProfile,
        branch: makeBranch({
          overlay: {
            id: 'overlay-1',
            kind: 'personal',
          },
        }),
        now: 3,
      }),
      'branch_kind_mismatch',
    );

    expectApplyErrorCode(
      () => applyBranchLocalProfilePatchOperation({
        branch: makeBranch({ id: 'wrong-branch' }),
        operation: {
          kind: 'apply_profile_patch_to_branch_overlay',
          proposalId: 'proposal-1',
          baseProfileId: 'coding',
          branchId: 'branch-1',
          expectedProposalUpdatedAt: 2,
          expectedBranchUpdatedAt: 2,
          patch: makePatch(),
          appliedAt: 1,
        },
      }),
      'proposal_branch_mismatch',
    );

    const operation = compileBranchLocalProposalApplyOperation({
      proposal: makeProposal(),
      baseProfile,
      branch: makeBranch(),
      now: 3,
    });
    expectApplyErrorCode(
      () => applyBranchLocalProfilePatchOperation({
        branch: makeBranch({ updatedAt: 4 }),
        operation,
      }),
      'branch_changed_after_compile',
    );
  });

  it('keeps branch-local apply helpers pure and free of persistence imports', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '..', 'branchLocalProposalApply.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from ['"][^'"]*db\/client/);
    expect(source).not.toContain('insertProfile');
    expect(source).not.toContain('upsertProfile');
    expect(source).not.toContain('executeSync');
    expect(source).not.toContain('sqlite');
    expect(source).not.toContain('drizzle');
  });
});
