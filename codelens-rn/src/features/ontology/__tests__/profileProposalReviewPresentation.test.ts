import { describe, expect, it } from 'vitest';
import { BranchLocalProposalApplyError } from '../branchLocalProposalApply';
import {
  buildEditedProposalDraft,
  createProposalEditorModel,
  formatApplyActionLabel,
  formatApplySuccessMessage,
  formatConfidence,
  formatProposalFreshnessDescription,
  formatProposalFreshnessLabel,
  formatProposalEventSummary,
  formatProposalEventTimestamp,
  formatProposalReviewError,
  formatRefreshSuccessMessage,
  formatRiskDescription,
  formatRiskLabel,
  formatTarget,
  summarizePatch,
} from '../ui/profileProposalReviewPresentation';
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

function makeEvent(overrides: Partial<ProfileProposalEvent> = {}): ProfileProposalEvent {
  return {
    id: 'event-1',
    proposalId: 'proposal-1',
    action: 'applied',
    actorKind: 'user',
    actorId: null,
    baseProfileId: 'coding',
    proposalKind: 'ontology_node_patch',
    target: {
      kind: 'profile_branch',
      branchId: 'branch-1',
    },
    statusBefore: 'pending',
    statusAfter: 'accepted',
    proposalUpdatedAtBefore: 1,
    proposalUpdatedAtAfter: 2,
    branchUpdatedAtBefore: null,
    branchUpdatedAtAfter: null,
    reason: null,
    details: null,
    createdAt: 1767225600000,
    ...overrides,
  };
}

describe('profile proposal review presentation helpers', () => {
  it('builds editable proposal drafts for pending new-node proposals without changing target identity', () => {
    const proposal = makeProposal({
      patch: {
        addOntologyNodes: [{
          id: 'noise_control',
          label: 'Noise control',
          kind: 'subcategory',
          parentId: 'frontend',
          meaning: 'Original meaning.',
          useWhen: ['Use original.'],
          doNotUseWhen: [],
          examples: [],
          relatedNodeIds: ['frontend'],
          contrastNodeIds: [],
          status: 'suggested',
          createdBy: 'user',
          createdAt: 1,
          updatedAt: 1,
        }],
        addItemTypeNodeIds: ['noise_control'],
      },
      reason: 'Original proposal reason.',
      riskScore: 25,
    });

    const model = createProposalEditorModel(proposal);
    expect(model).toMatchObject({
      canEdit: true,
      nodeId: 'noise_control',
      draft: {
        label: 'Noise control',
        parentId: 'frontend',
        meaning: 'Original meaning.',
        reason: 'Original proposal reason.',
        riskScore: '25',
      },
    });

    if (!model.canEdit) throw new Error('Expected editable model');
    const result = buildEditedProposalDraft(proposal, {
      ...model.draft,
      label: 'Exposure planning',
      parentId: 'mechanism',
      meaning: 'Plans shutter, aperture, and ISO tradeoffs.',
      reason: 'The user narrowed the proposal before applying it.',
      riskScore: '30',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.draft).toMatchObject({
      title: 'Add Exposure planning type',
      summary: 'Create Exposure planning as an item type after user review.',
      reason: 'The user narrowed the proposal before applying it.',
      riskScore: 30,
    });
    expect(result.draft.patch.addOntologyNodes?.[0]).toMatchObject({
      id: 'noise_control',
      label: 'Exposure planning',
      kind: 'subcategory',
      parentId: 'mechanism',
      meaning: 'Plans shutter, aperture, and ISO tradeoffs.',
    });
    expect(result.draft.patch.addItemTypeNodeIds).toEqual(['noise_control']);
  });

  it('keeps unsupported proposal patches out of the editor and validates draft input', () => {
    const nonNodeProposal = makeProposal({
      patch: {
        addItemTypeNodeIds: ['noise_control'],
      },
    });
    expect(createProposalEditorModel(nonNodeProposal)).toMatchObject({
      canEdit: false,
    });

    const proposal = makeProposal({
      patch: {
        addOntologyNodes: [{
          id: 'noise_control',
          label: 'Noise control',
          kind: 'category',
          parentId: null,
          meaning: 'Original meaning.',
          useWhen: [],
          doNotUseWhen: [],
          examples: [],
          relatedNodeIds: [],
          contrastNodeIds: [],
          status: 'suggested',
          createdBy: 'user',
          createdAt: 1,
          updatedAt: 1,
        }],
        addItemTypeNodeIds: ['noise_control'],
      },
    });
    const model = createProposalEditorModel(proposal);
    if (!model.canEdit) throw new Error('Expected editable model');

    expect(buildEditedProposalDraft(proposal, {
      ...model.draft,
      label: '',
    })).toMatchObject({ ok: false, message: 'The edited proposal needs a label.' });
    expect(buildEditedProposalDraft(proposal, {
      ...model.draft,
      meaning: '',
    })).toMatchObject({ ok: false, message: 'The edited proposal needs a meaning.' });
    expect(buildEditedProposalDraft(proposal, {
      ...model.draft,
      riskScore: '150',
    })).toMatchObject({ ok: false, message: 'Risk must be a number from 0 to 100.' });
  });

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

  it('formats proposal freshness as apply readiness copy', () => {
    expect(formatProposalFreshnessLabel(null)).toBe('Checking target');
    expect(formatProposalFreshnessDescription(null)).toContain('checking');

    expect(formatProposalFreshnessLabel({
      status: 'fresh',
      reason: 'target_branch_updated_at_matches',
      canApply: true,
      canRefresh: false,
      expectedRevision: 2,
      currentRevision: 2,
    })).toBe('Ready to apply');

    expect(formatProposalFreshnessLabel({
      status: 'stale_refreshable',
      reason: 'target_branch_updated_at_changed',
      canApply: false,
      canRefresh: true,
      expectedRevision: 2,
      currentRevision: 5,
    })).toBe('Target changed');
    expect(formatProposalFreshnessDescription({
      status: 'stale_refreshable',
      reason: 'target_branch_updated_at_changed',
      canApply: false,
      canRefresh: true,
      expectedRevision: 2,
      currentRevision: 5,
    })).toContain('Refresh before applying');

    expect(formatProposalFreshnessLabel({
      status: 'conflicted',
      reason: 'patch_conflict',
      canApply: false,
      canRefresh: false,
      expectedRevision: 2,
      currentRevision: 5,
    })).toBe('Cannot safely refresh');

    expect(formatProposalFreshnessLabel({
      status: 'obsolete',
      reason: 'target_missing',
      canApply: false,
      canRefresh: false,
      expectedRevision: null,
      currentRevision: null,
    })).toBe('Target missing');
    expect(formatProposalFreshnessDescription({
      status: 'obsolete',
      reason: 'target_missing',
      canApply: false,
      canRefresh: false,
      expectedRevision: null,
      currentRevision: null,
    })).toContain('no longer exists');

    expect(formatProposalFreshnessDescription({
      status: 'unknown',
      reason: 'target_branch_updated_at_missing',
      canApply: false,
      canRefresh: false,
      expectedRevision: null,
      currentRevision: 5,
    })).toContain('missing its target snapshot');
  });

  it('formats target-specific apply labels and success messages', () => {
    expect(formatApplyActionLabel(makeProposal())).toBe('Apply to branch');
    expect(formatApplySuccessMessage(makeProposal())).toBe('Applied to branch.');
    expect(formatRefreshSuccessMessage(makeProposal({ id: 'proposal-2' }))).toContain('proposal-2');
    expect(formatRefreshSuccessMessage(makeProposal({ id: 'proposal-2' }))).toContain('Review it before applying');

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

  it('formats proposal event history as compact audit copy', () => {
    expect(formatProposalEventSummary(makeEvent())).toBe('Applied: pending to accepted.');
    expect(formatProposalEventSummary(makeEvent({
      action: 'rejected',
      statusAfter: 'rejected',
    }))).toBe('Rejected: pending to rejected.');
    expect(formatProposalEventSummary(makeEvent({
      action: 'postponed',
      statusAfter: 'postponed',
    }))).toBe('Postponed: pending to postponed.');
    expect(formatProposalEventSummary(makeEvent({
      action: 'asked_why',
      statusAfter: 'pending',
    }))).toBe('Asked why: reason opened while still pending.');
    expect(formatProposalEventSummary(makeEvent({
      action: 'superseded',
      statusAfter: 'superseded',
      details: {
        supersededByProposalId: 'proposal-2',
      },
    }))).toBe('Superseded: replaced by proposal-2.');
    expect(formatProposalEventTimestamp(makeEvent())).toBe('2026-01-01 00:00 UTC');
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
      ['proposal_not_refreshable', 'not refreshable'],
      ['proposal_refresh_time_invalid', 'timestamp'],
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
