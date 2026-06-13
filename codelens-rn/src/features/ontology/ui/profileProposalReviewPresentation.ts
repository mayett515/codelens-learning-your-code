import { BranchLocalProposalApplyError } from '../branchLocalProposalApply';
import { BaseProfileProposalApplyError } from '../baseProfileProposalApply';
import { BaseProfileVersioningError } from '../baseProfileVersioning';
import type {
  CheckerProposalMapperExplanation,
  CheckerProposalSkippedFinding,
} from '../checkerProposalMapper';
import type { ProfileProposalFreshness } from '../profileProposalFreshness';
import type {
  OntologyNode,
  ProfileChangeProposal,
  ProfileChangeProposalTargetKind,
  ProfilePatch,
  ProfileProposalEvent,
} from '../types';

export interface ProposalEditorDraftState {
  label: string;
  parentId: string;
  meaning: string;
  reason: string;
  riskScore: string;
}

export type ProposalEditorModel =
  | {
      canEdit: true;
      nodeId: string;
      draft: ProposalEditorDraftState;
    }
  | {
      canEdit: false;
      reason: string;
    };

export type BuildEditedProposalDraftResult =
  | {
      ok: true;
      draft: {
        patch: ProfilePatch;
        title: string;
        summary: string;
        reason?: string | undefined;
        riskScore: number;
      };
    }
  | {
      ok: false;
      message: string;
    };

export interface CheckerRunPresentationInput {
  proposals: readonly Pick<ProfileChangeProposal, 'id'>[];
  explanation: CheckerProposalMapperExplanation;
}

export function formatRiskLabel(riskScore: number): string {
  if (riskScore >= 70) return 'High risk';
  if (riskScore >= 35) return 'Medium risk';
  return 'Low risk';
}

export function formatRiskDescription(proposal: ProfileChangeProposal): string {
  if (proposal.target.kind === 'profile_branch') {
    return `${formatRiskLabel(proposal.riskScore)}: branch-local only; no core change and no old notes rewritten.`;
  }
  return 'High risk: base/core change; affects derived branches. Old notes are not rewritten automatically.';
}

export function formatConfidence(value: number | null | undefined): string {
  if (typeof value !== 'number') return 'unknown';
  return `${Math.round(value * 100)}%`;
}

export function formatTarget(proposal: ProfileChangeProposal): string {
  if (proposal.target.kind === 'profile_branch') {
    return `Branch ${proposal.target.branchId ?? 'unknown'}`;
  }
  return `Core ${proposal.target.profileId ?? proposal.baseProfileId}`;
}

export function formatProposalFreshnessLabel(
  freshness: ProfileProposalFreshness | null | undefined,
): string {
  if (!freshness) return 'Checking target';
  switch (freshness.status) {
    case 'fresh':
      return 'Ready to apply';
    case 'stale_refreshable':
      return 'Target changed';
    case 'conflicted':
      return 'Cannot safely refresh';
    case 'obsolete':
      return 'Target missing';
    case 'unknown':
      return 'Cannot verify freshness';
  }
}

export function formatProposalFreshnessDescription(
  freshness: ProfileProposalFreshness | null | undefined,
): string {
  if (!freshness) {
    return 'Kordex is checking the proposal target before Apply is available.';
  }
  switch (freshness.status) {
    case 'fresh':
      return 'The target still matches the proposal snapshot, and the patch validates against the current target.';
    case 'stale_refreshable':
      return 'The target changed after this proposal was created. Refresh before applying.';
    case 'conflicted':
      return 'The target changed in a way this patch no longer fits. Create a replacement proposal instead of applying this one.';
    case 'obsolete':
      return 'The target branch or base profile no longer exists.';
    case 'unknown':
      if (
        freshness.reason === 'target_branch_updated_at_missing' ||
        freshness.reason === 'target_profile_version_missing'
      ) {
        return 'This older proposal is missing its target snapshot, so Apply stays blocked.';
      }
      return 'Kordex cannot prove this proposal still fits the current target, so Apply stays blocked.';
  }
}

export function summarizePatch(patch: ProfilePatch): string[] {
  const lines: string[] = [];
  pushNamedCount(lines, patch.addOntologyNodes, 'new ontology node');
  pushNamedCount(lines, patch.overrideOntologyNodes, 'ontology node override');
  pushCount(lines, patch.addItemTypeNodeIds?.length, 'new item type');
  pushCount(lines, patch.addRelationshipTypeNodeIds?.length, 'new relationship type');
  pushCount(lines, patch.overrideMetadataFields?.length, 'metadata field change');
  if (patch.overrideLabels && Object.keys(patch.overrideLabels).length > 0) lines.push('label changes');
  if (patch.overrideGraph && Object.keys(patch.overrideGraph).length > 0) lines.push('graph display changes');
  if (patch.overrideOntology && Object.keys(patch.overrideOntology).length > 0) lines.push('ontology profile changes');
  return lines.length > 0 ? lines : ['profile patch'];
}

export function formatApplyActionLabel(proposal: ProfileChangeProposal): string {
  return proposal.target.kind === 'base_profile' ? 'Apply to core' : 'Apply to branch';
}

export function formatApplySuccessMessage(proposal: ProfileChangeProposal): string {
  if (proposal.target.kind === 'base_profile') {
    return 'Applied to base profile. Derived branches now compose against the new version.';
  }
  return 'Applied to branch.';
}

export function formatRefreshSuccessMessage(proposal: ProfileChangeProposal): string {
  return `Created refreshed proposal ${proposal.id}. Review it before applying.`;
}

export function formatCheckerRunSummary(input: CheckerRunPresentationInput): string {
  if (input.proposals.length === 1) {
    return 'Checker created 1 pending proposal. Review it before applying.';
  }
  if (input.proposals.length > 1) {
    return `Checker created ${input.proposals.length} pending proposals. Review them before applying.`;
  }
  if (input.explanation.skippedFindings.length > 0) {
    return 'Checker finished without new proposals. Review the skipped findings below.';
  }
  return 'Checker found no new branch-local proposals.';
}

export function formatCheckerSkipReason(skip: CheckerProposalSkippedFinding): string {
  const label = skip.label.trim() || 'Finding';
  switch (skip.reason) {
    case 'no-active-branch':
      return `${label}: needs an active branch before Kordex can create branch-local proposals.`;
    case 'invalid-node-id':
      return `${label}: the label could not become a stable ontology node id.`;
    case 'unknown-evidence':
      return `${label}: referenced evidence outside the checker context.`;
    case 'duplicate-output-node':
      return `${label}: duplicates an existing or already suggested ontology node.`;
    case 'duplicate-pending-proposal':
      return skip.existingProposalId
        ? `${label}: already has pending proposal ${skip.existingProposalId}.`
        : `${label}: already has a pending checker proposal.`;
    case 'proposal-cap':
      return `${label}: held back by the per-run proposal cap.`;
    case 'patch-conflict':
      return `${label}: no longer fits the current branch state.`;
  }
}

export function formatProposalEventSummary(event: ProfileProposalEvent): string {
  switch (event.action) {
    case 'applied':
      return `Applied: ${event.statusBefore} to ${event.statusAfter}.`;
    case 'rejected':
      return `Rejected: ${event.statusBefore} to ${event.statusAfter}.`;
    case 'postponed':
      return `Postponed: ${event.statusBefore} to ${event.statusAfter}.`;
    case 'asked_why':
      return 'Asked why: reason opened while still pending.';
    case 'superseded': {
      const replacementId = typeof event.details?.['supersededByProposalId'] === 'string'
        ? event.details['supersededByProposalId']
        : null;
      return replacementId
        ? `Superseded: replaced by ${replacementId}.`
        : 'Superseded: replaced by a newer proposal.';
    }
  }
}

export function formatProposalEventTimestamp(event: ProfileProposalEvent): string {
  if (!Number.isFinite(event.createdAt)) return 'unknown time';
  return `${new Date(event.createdAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function formatProposalReviewError(
  error: unknown,
  targetKind?: ProfileChangeProposalTargetKind,
): string {
  const code = errorCode(error);
  switch (code) {
    case 'branch_write_conflict':
      return 'The branch changed while this proposal was open. Refresh and review it again.';
    case 'proposal_write_conflict':
      return 'The proposal changed while this was open. Refresh the queue and try again.';
    case 'proposal_not_refreshable':
      return 'This proposal is not refreshable from its current target state.';
    case 'proposal_refresh_time_invalid':
      return 'The proposal timestamp is newer than this refresh action. Refresh the queue and try again.';
    case 'proposal_edit_time_invalid':
      return 'The proposal timestamp is newer than this edit. Refresh the queue and try again.';
    case 'proposal_target_switch_time_invalid':
      return 'The proposal timestamp is newer than this target switch. Refresh the queue and try again.';
    case 'replacement_proposal_invalid':
      return 'Kordex could not create a safe replacement proposal. Refresh and try again.';
    case 'context_pack_invalid':
      return 'Checker context could not be assembled safely. Refresh and run the checker again.';
    case 'checker_output_invalid':
      return 'Checker output was not valid enough to create proposals. Run it again after checking the model connection.';
    case 'checker_model_missing':
      return 'Checker model adapter is not available yet.';
    case 'profile_definition_write_conflict':
      return 'The base profile changed while this proposal was open. Refresh and review it again.';
    case 'proposal_not_pending':
      return 'This proposal has already been reviewed.';
    case 'proposal_not_branch_target':
      return 'Only branch-local proposals can be applied here.';
    case 'proposal_not_base_target':
      return 'Only base-profile proposals can use the core apply path.';
    case 'proposal_kind_not_supported':
      return 'This proposal type needs a dedicated apply flow and cannot be applied here yet.';
    case 'patch_not_single_additive_item_type':
      return 'This proposal patch needs a dedicated target-switching flow before it can move to core.';
    case 'target_branch_missing':
      return 'This proposal is missing its branch target snapshot.';
    case 'base_profile_missing':
      return 'Kordex needs the current base profile version before it can move this proposal to core.';
    case 'proposal_not_found':
      return 'This proposal no longer exists.';
    case 'branch_not_found':
      return 'The target branch no longer exists.';
    case 'branch_base_mismatch':
      return 'The active branch does not belong to the selected base profile. Check the active profile selection and run the checker again.';
    case 'profile_definition_not_found':
      return 'The target base profile no longer exists.';
    case 'patch_conflict':
      if (targetKind === 'base_profile') {
        return 'The base profile has changed, so this proposal can no longer apply cleanly.';
      }
      return 'This proposal no longer fits the current branch state.';
    case 'proposal_review_time_invalid':
    case 'proposal_apply_time_invalid':
      return 'The proposal timestamp is newer than this review action. Refresh before continuing.';
    case 'profile_definition_base_mismatch':
    case 'profile_definition_changed_after_compile':
      return 'The base profile changed while this operation was being prepared. Refresh before applying.';
    case 'target_profile_version_stale':
      return 'This suggestion targets an older base profile version. Reject or postpone it before continuing.';
    case 'target_profile_version_missing':
      return 'This suggestion is missing its base profile version snapshot and cannot be applied.';
    case 'proposal_base_mismatch':
      return 'This suggestion targets a different base profile than the current one.';
    case 'base_profile_not_found':
      return 'The base profile for this proposal is no longer available. Refresh before applying.';
    case 'proposal_target_not_supported':
      return 'This proposal target cannot be applied in this review surface yet.';
    default:
      return error instanceof Error ? error.message : 'Proposal review failed.';
  }
}

export function formatTargetSwitchFailureMessage(error: unknown): string {
  if (errorCode(error) === 'patch_conflict') {
    return 'This proposal cannot move to core because part of the patch only fits the branch target. Edit the parent or keep it branch-local.';
  }
  return formatProposalReviewError(error, 'base_profile');
}

export function createProposalEditorModel(proposal: ProfileChangeProposal): ProposalEditorModel {
  const node = proposal.patch.addOntologyNodes?.[0];
  if (!node) {
    return {
      canEdit: false,
      reason: 'This patch needs a dedicated editor before it can be changed here.',
    };
  }

  if (!proposal.patch.addItemTypeNodeIds?.includes(node.id)) {
    return {
      canEdit: false,
      reason: 'This proposal does not add an item type, so this editor cannot safely change it.',
    };
  }

  return {
    canEdit: true,
    nodeId: node.id,
    draft: {
      label: node.label,
      parentId: node.parentId ?? '',
      meaning: node.meaning,
      reason: proposal.reason,
      riskScore: String(proposal.riskScore),
    },
  };
}

export function buildEditedProposalDraft(
  proposal: ProfileChangeProposal,
  draft: ProposalEditorDraftState,
): BuildEditedProposalDraftResult {
  const node = proposal.patch.addOntologyNodes?.[0];
  if (!node) {
    return {
      ok: false,
      message: 'This proposal patch cannot be edited in this review surface yet.',
    };
  }

  const label = draft.label.trim();
  if (!label) {
    return {
      ok: false,
      message: 'The edited proposal needs a label.',
    };
  }

  const meaning = draft.meaning.trim();
  if (!meaning) {
    return {
      ok: false,
      message: 'The edited proposal needs a meaning.',
    };
  }

  const riskScore = Number(draft.riskScore);
  if (!Number.isFinite(riskScore) || riskScore < 0 || riskScore > 100) {
    return {
      ok: false,
      message: 'Risk must be a number from 0 to 100.',
    };
  }

  const parentId = draft.parentId.trim() || null;
  const editedNode: OntologyNode = {
    ...node,
    label,
    kind: parentId ? 'subcategory' : 'category',
    parentId,
    meaning,
  };
  const addItemTypeNodeIds = proposal.patch.addItemTypeNodeIds?.includes(node.id)
    ? proposal.patch.addItemTypeNodeIds
    : [node.id, ...(proposal.patch.addItemTypeNodeIds ?? [])];
  const reason = draft.reason.trim();

  return {
    ok: true,
    draft: {
      patch: {
        ...proposal.patch,
        addOntologyNodes: [editedNode, ...(proposal.patch.addOntologyNodes ?? []).slice(1)],
        addItemTypeNodeIds,
      },
      title: `Add ${label} type`,
      summary: `Create ${label} as an item type after user review.`,
      ...(reason ? { reason } : {}),
      riskScore,
    },
  };
}

function errorCode(error: unknown): string | null {
  if (error instanceof BranchLocalProposalApplyError) {
    return error.code;
  }
  if (error instanceof BaseProfileProposalApplyError || error instanceof BaseProfileVersioningError) {
    return error.code;
  }
  if (error && typeof error === 'object' && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return null;
}

function pushCount(lines: string[], count: number | undefined, singular: string): void {
  if (!count) return;
  lines.push(`${count} ${singular}${count === 1 ? '' : 's'}`);
}

function pushNamedCount(
  lines: string[],
  items: ReadonlyArray<{ id: string; label?: string }> | undefined,
  singular: string,
): void {
  if (!items || items.length === 0) return;
  const suffix = items
    .slice(0, 3)
    .map((item) => item.label || item.id)
    .join(', ');
  const more = items.length > 3 ? ` +${items.length - 3} more` : '';
  lines.push(`${items.length} ${singular}${items.length === 1 ? '' : 's'}: ${suffix}${more}`);
}
