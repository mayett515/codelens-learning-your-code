import { describe, expect, it } from 'vitest';
import {
  BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE,
  createProposalTargetSwitchModel,
  formatTargetSwitchBlockReason,
  targetSwitchBlockReason,
} from '../profileProposalTargetSwitch';
import type { ProfileChangeProposal } from '../types';

function makeProposal(overrides: Partial<ProfileChangeProposal> = {}): ProfileChangeProposal {
  return {
    id: 'proposal-1',
    proposalKind: 'ontology_node_patch',
    sourceKind: 'checker',
    baseProfileId: 'coding',
    sourceBranchId: null,
    target: {
      kind: 'profile_branch',
      branchId: 'react-project',
    },
    targetProfileVersion: null,
    targetBranchUpdatedAt: 12,
    evidenceIds: ['evidence-1', 'evidence-2'],
    patch: {
      addOntologyNodes: [{
        id: 'render_timing',
        label: 'Render timing',
        kind: 'subcategory',
        parentId: 'frontend',
        meaning: 'Timing around React render and commit work.',
        useWhen: ['Use for render/commit timing.'],
        doNotUseWhen: [],
        examples: [],
        relatedNodeIds: [],
        contrastNodeIds: [],
        status: 'active',
        createdBy: 'model',
        createdAt: 1,
        updatedAt: 1,
      }],
      addItemTypeNodeIds: ['render_timing'],
    },
    title: 'Add Render timing type',
    summary: 'Create Render timing as a branch-local item type after checker review.',
    reason: 'Repeated corrections point to this missing type.',
    riskScore: 20,
    semanticConfidence: 0.82,
    userFitConfidence: 0.75,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: 10,
    updatedAt: 11,
    reviewedAt: null,
    appliedAt: null,
    ...overrides,
  };
}

describe('profile proposal target switch helper', () => {
  it('previews explicit branch-to-base replacement fields without mutating the original proposal', () => {
    const proposal = makeProposal();
    const model = createProposalTargetSwitchModel({
      proposal,
      baseProfileVersion: 7,
      baseProfileLabel: 'Coding Core',
      branchLabel: 'React Project',
    });

    expect(model).toMatchObject({
      canSwitch: true,
      fromLabel: 'Branch React Project',
      toLabel: 'Core Coding Core',
      actionLabel: 'Move proposal to core',
    });
    expect(model.confirmationBody).toContain('keeps the proposal pending');
    expect(model.confirmationBody).toContain('Apply remains a separate action');
    expect(model.replacementPreview).toMatchObject({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 7,
      targetBranchUpdatedAt: null,
      sourceKind: 'checker',
      riskScore: BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE,
      evidenceIds: ['evidence-1', 'evidence-2'],
      semanticConfidence: 0.82,
      userFitConfidence: 0.75,
    });
    expect(model.replacementPreview?.patch).toBe(proposal.patch);
    expect(proposal).toMatchObject({
      target: {
        kind: 'profile_branch',
        branchId: 'react-project',
      },
      targetProfileVersion: null,
      targetBranchUpdatedAt: 12,
      riskScore: 20,
    });
  });

  it('blocks scopes outside the first target-switching slice', () => {
    expect(targetSwitchBlockReason(makeProposal({ status: 'accepted' }), 7)).toBe('proposal_not_pending');
    expect(targetSwitchBlockReason(makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      targetProfileVersion: 7,
      targetBranchUpdatedAt: null,
    }), 7)).toBe('proposal_not_branch_target');
    expect(targetSwitchBlockReason(makeProposal({
      proposalKind: 'relationship_patch',
    }), 7)).toBe('proposal_kind_not_supported');
    expect(targetSwitchBlockReason(makeProposal(), null)).toBe('base_profile_missing');
  });

  it('blocks non-single-additive item-type patches', () => {
    const multiNode = makeProposal({
      patch: {
        addOntologyNodes: [
          ...makeProposal().patch.addOntologyNodes!,
          {
            ...makeProposal().patch.addOntologyNodes![0]!,
            id: 'second_node',
            label: 'Second node',
          },
        ],
        addItemTypeNodeIds: ['render_timing', 'second_node'],
      },
    });
    expect(targetSwitchBlockReason(multiNode, 7)).toBe('patch_not_single_additive_item_type');

    const nonItemTypeAdd = makeProposal({
      patch: {
        addOntologyNodes: makeProposal().patch.addOntologyNodes,
        addItemTypeNodeIds: [],
      },
    });
    expect(targetSwitchBlockReason(nonItemTypeAdd, 7)).toBe('patch_not_single_additive_item_type');

    const graphOverride = makeProposal({
      patch: {
        ...makeProposal().patch,
        overrideGraph: {
          nodeColors: {
            render_timing: '#ffffff',
          },
        },
      },
    });
    expect(targetSwitchBlockReason(graphOverride, 7)).toBe('patch_not_single_additive_item_type');
  });

  it('formats block reasons for review copy', () => {
    expect(formatTargetSwitchBlockReason('proposal_not_branch_target')).toContain('branch-local');
    expect(formatTargetSwitchBlockReason('patch_not_single_additive_item_type')).toContain('dedicated');

    const model = createProposalTargetSwitchModel({
      proposal: makeProposal({ status: 'rejected' }),
      baseProfileVersion: 7,
    });
    expect(model).toMatchObject({
      canSwitch: false,
      replacementPreview: null,
      blockReason: 'proposal_not_pending',
    });
    expect(model.blockMessage).toContain('pending');
  });
});
