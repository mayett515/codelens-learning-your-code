import type { ProfileChangeProposal } from './types';

export type ProfileProposalFreshnessStatus =
  | 'fresh'
  | 'unknown'
  | 'stale_refreshable'
  | 'conflicted'
  | 'obsolete';

export type ProfileProposalPatchValidation = 'valid' | 'conflicted' | 'unknown';

export type ProfileProposalFreshnessReason =
  | 'base_target_mismatch'
  | 'branch_target_mismatch'
  | 'target_missing'
  | 'patch_conflict'
  | 'patch_validation_unknown'
  | 'target_profile_version_missing'
  | 'target_profile_version_unknown'
  | 'target_profile_version_matches'
  | 'target_profile_version_changed'
  | 'target_branch_updated_at_missing'
  | 'target_branch_updated_at_unknown'
  | 'target_branch_updated_at_matches'
  | 'target_branch_updated_at_changed';

export type ProfileProposalTargetFacts =
  | {
      kind: 'base_profile';
      profileId: string;
      exists: boolean;
      currentVersion?: number | null | undefined;
      patchValidation?: ProfileProposalPatchValidation | undefined;
    }
  | {
      kind: 'profile_branch';
      branchId: string;
      exists: boolean;
      currentUpdatedAt?: number | null | undefined;
      patchValidation?: ProfileProposalPatchValidation | undefined;
    };

export interface ProfileProposalFreshness {
  status: ProfileProposalFreshnessStatus;
  reason: ProfileProposalFreshnessReason;
  canApply: boolean;
  canRefresh: boolean;
  expectedRevision: number | null;
  currentRevision: number | null;
}

export function evaluateProfileProposalFreshness(input: {
  proposal: ProfileChangeProposal;
  target: ProfileProposalTargetFacts;
}): ProfileProposalFreshness {
  const { proposal, target } = input;
  const targetMatch = assertTargetFactsMatchProposal(proposal, target);
  if (targetMatch) return targetMatch;

  if (!target.exists) {
    return freshness('obsolete', 'target_missing');
  }

  if ((target.patchValidation ?? 'unknown') === 'conflicted') {
    return freshness('conflicted', 'patch_conflict');
  }

  if (target.kind === 'base_profile') {
    return evaluateBaseProfileFreshness(proposal, target);
  }
  return evaluateBranchFreshness(proposal, target);
}

function evaluateBaseProfileFreshness(
  proposal: ProfileChangeProposal,
  target: Extract<ProfileProposalTargetFacts, { kind: 'base_profile' }>,
): ProfileProposalFreshness {
  const expectedRevision = proposal.targetProfileVersion ?? null;
  const currentRevision = target.currentVersion ?? null;
  if (expectedRevision == null) {
    return freshness('unknown', 'target_profile_version_missing', expectedRevision, currentRevision);
  }
  if (currentRevision == null) {
    return freshness('unknown', 'target_profile_version_unknown', expectedRevision, currentRevision);
  }
  if (expectedRevision !== currentRevision) {
    return freshness('stale_refreshable', 'target_profile_version_changed', expectedRevision, currentRevision);
  }
  if ((target.patchValidation ?? 'unknown') !== 'valid') {
    // Fresh means both the target basis and patch validity are known-good.
    return freshness('unknown', 'patch_validation_unknown', expectedRevision, currentRevision);
  }
  return freshness('fresh', 'target_profile_version_matches', expectedRevision, currentRevision);
}

function evaluateBranchFreshness(
  proposal: ProfileChangeProposal,
  target: Extract<ProfileProposalTargetFacts, { kind: 'profile_branch' }>,
): ProfileProposalFreshness {
  const expectedRevision = proposal.targetBranchUpdatedAt ?? null;
  const currentRevision = target.currentUpdatedAt ?? null;
  if (expectedRevision == null) {
    return freshness('unknown', 'target_branch_updated_at_missing', expectedRevision, currentRevision);
  }
  if (currentRevision == null) {
    return freshness('unknown', 'target_branch_updated_at_unknown', expectedRevision, currentRevision);
  }
  if (expectedRevision !== currentRevision) {
    return freshness('stale_refreshable', 'target_branch_updated_at_changed', expectedRevision, currentRevision);
  }
  if ((target.patchValidation ?? 'unknown') !== 'valid') {
    // Fresh means both the target basis and patch validity are known-good.
    return freshness('unknown', 'patch_validation_unknown', expectedRevision, currentRevision);
  }
  return freshness('fresh', 'target_branch_updated_at_matches', expectedRevision, currentRevision);
}

function assertTargetFactsMatchProposal(
  proposal: ProfileChangeProposal,
  target: ProfileProposalTargetFacts,
): ProfileProposalFreshness | null {
  if (proposal.target.kind === 'base_profile') {
    if (target.kind !== 'base_profile' || target.profileId !== proposal.target.profileId) {
      return freshness('obsolete', 'base_target_mismatch');
    }
    return null;
  }

  if (target.kind !== 'profile_branch' || target.branchId !== proposal.target.branchId) {
    return freshness('obsolete', 'branch_target_mismatch');
  }
  return null;
}

function freshness(
  status: ProfileProposalFreshnessStatus,
  reason: ProfileProposalFreshnessReason,
  expectedRevision: number | null = null,
  currentRevision: number | null = null,
): ProfileProposalFreshness {
  return {
    status,
    reason,
    canApply: status === 'fresh',
    canRefresh: status === 'stale_refreshable',
    expectedRevision,
    currentRevision,
  };
}
