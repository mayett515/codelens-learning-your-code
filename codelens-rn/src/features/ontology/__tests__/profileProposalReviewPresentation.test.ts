import { describe, expect, it } from 'vitest';
import { BranchLocalProposalApplyError } from '../branchLocalProposalApply';
import {
  formatApplyActionLabel,
  formatApplySuccessMessage,
  formatConfidence,
  formatProposalReviewError,
  formatRiskDescription,
  formatRiskLabel,
  formatTarget,
  summarizePatch,
} from '../ui/profileProposalReviewPresentation';
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
      branchId: 'branch-1',
    },
    evidenceIds: ['evidence-1'],
    patch: {
      addOntologyNodes: [],
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

describe('profile proposal review presentation helpers', () => {
  it('formats risk as blast-radius language rather than a bare score', () => {
    expect(formatRiskLabel(10)).toBe('Low risk');
    expect(formatRiskLabel(40)).toBe('Medium risk');
    expect(formatRiskLabel(90)).toBe('High risk');
    expect(formatRiskDescription(makeProposal())).toContain('branch-local only');
    expect(formatRiskDescription(makeProposal())).toContain('no old notes rewritten');
    expect(formatRiskDescription(makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      riskScore: 10,
    }))).toContain('base/core change');
    expect(formatRiskDescription(makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
      riskScore: 10,
    }))).toContain('affects derived branches');
  });

  it('formats target and confidence labels', () => {
    expect(formatTarget(makeProposal())).toBe('Branch branch-1');
    expect(formatTarget(makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'photography',
      },
    }))).toBe('Core photography');
    expect(formatConfidence(0.734)).toBe('73%');
    expect(formatConfidence(null)).toBe('unknown');
  });

  it('formats target-specific apply labels and success messages', () => {
    expect(formatApplyActionLabel(makeProposal())).toBe('Apply to branch');
    expect(formatApplySuccessMessage(makeProposal())).toBe('Applied to branch.');

    const baseProposal = makeProposal({
      target: {
        kind: 'base_profile',
        profileId: 'coding',
      },
    });
    expect(formatApplyActionLabel(baseProposal)).toBe('Apply to core');
    expect(formatApplySuccessMessage(baseProposal)).toContain('Applied to base profile');
    expect(formatApplySuccessMessage(baseProposal)).toContain('Derived branches');
  });

  it('summarizes patch operations for compact review cards', () => {
    expect(summarizePatch({
      addOntologyNodes: [{
        id: 'noise_control',
        label: 'Noise control',
        kind: 'subcategory',
        parentId: 'frontend',
        meaning: 'Noise handling in night photography.',
        useWhen: [],
        doNotUseWhen: [],
        examples: [],
        relatedNodeIds: [],
        contrastNodeIds: [],
        status: 'active',
        createdBy: 'user',
        createdAt: 1,
        updatedAt: 1,
      }],
      addItemTypeNodeIds: ['noise_control'],
      addRelationshipTypeNodeIds: ['causes_noise'],
      overrideLabels: { itemSingular: 'Topic' },
    })).toEqual([
      '1 new ontology node: Noise control',
      '1 new item type',
      '1 new relationship type',
      'label changes',
    ]);
  });

  it('maps apply and service errors to user-facing review text', () => {
    const cases = [
      ['branch_write_conflict', 'branch changed'],
      ['proposal_write_conflict', 'proposal changed'],
      ['profile_definition_write_conflict', 'base profile changed'],
      ['proposal_not_pending', 'already been reviewed'],
      ['proposal_not_branch_target', 'branch-local proposals'],
      ['proposal_not_base_target', 'base-profile proposals'],
      ['proposal_kind_not_supported', 'dedicated apply flow'],
      ['proposal_not_found', 'no longer exists'],
      ['branch_not_found', 'target branch'],
      ['profile_definition_not_found', 'target base profile'],
      ['proposal_review_time_invalid', 'timestamp'],
      ['proposal_apply_time_invalid', 'timestamp'],
      ['profile_definition_base_mismatch', 'base profile changed'],
      ['profile_definition_changed_after_compile', 'base profile changed'],
      ['target_profile_version_stale', 'older base profile version'],
      ['target_profile_version_missing', 'missing its base profile version'],
      ['proposal_base_mismatch', 'different base profile'],
      ['base_profile_not_found', 'base profile'],
      ['proposal_target_not_supported', 'target cannot be applied'],
    ] as const;

    for (const [code, text] of cases) {
      expect(formatProposalReviewError({ code })).toContain(text);
    }
    expect(formatProposalReviewError(new BranchLocalProposalApplyError(
      'patch_conflict',
      'patch conflict',
    ))).toContain('current branch state');
    expect(formatProposalReviewError(
      new BranchLocalProposalApplyError('patch_conflict', 'patch conflict'),
      'base_profile',
    )).toContain('base profile has changed');
  });
});
