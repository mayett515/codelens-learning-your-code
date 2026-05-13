import { BranchLocalProposalApplyError } from '../branchLocalProposalApply';
import type { ProfileChangeProposal, ProfilePatch } from '../types';

export function formatRiskLabel(riskScore: number): string {
  if (riskScore >= 70) return 'High risk';
  if (riskScore >= 35) return 'Medium risk';
  return 'Low risk';
}

export function formatRiskDescription(proposal: ProfileChangeProposal): string {
  if (proposal.target.kind === 'profile_branch') {
    return `${formatRiskLabel(proposal.riskScore)}: branch-local only; no core change and no old notes rewritten.`;
  }
  return `${formatRiskLabel(proposal.riskScore)}: not branch-local; this review surface cannot apply it.`;
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

export function formatProposalReviewError(error: unknown): string {
  const code = errorCode(error);
  switch (code) {
    case 'branch_write_conflict':
      return 'The branch changed while this proposal was open. Refresh and review it again.';
    case 'proposal_write_conflict':
      return 'The proposal changed while this was open. Refresh the queue and try again.';
    case 'proposal_not_pending':
      return 'This proposal has already been reviewed.';
    case 'proposal_not_branch_target':
      return 'Only branch-local proposals can be applied here.';
    case 'proposal_not_found':
      return 'This proposal no longer exists.';
    case 'branch_not_found':
      return 'The target branch no longer exists.';
    case 'patch_conflict':
      return 'This proposal no longer fits the current branch state.';
    case 'proposal_review_time_invalid':
    case 'proposal_apply_time_invalid':
      return 'The proposal timestamp is newer than this review action. Refresh before continuing.';
    case 'base_profile_not_found':
      return 'The base profile for this proposal is no longer available. Refresh before applying.';
    default:
      return error instanceof Error ? error.message : 'Proposal review failed.';
  }
}

function errorCode(error: unknown): string | null {
  if (error instanceof BranchLocalProposalApplyError) {
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
