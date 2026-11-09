import type { ProfileChangeProposal } from '../types';
import type { profileChangeProposals } from '../data/schema';
import { parseProfilePatch, parseProposalEvidenceIds, validateProfileChangeProposal } from '@kordex/core/codecs/profileChangeProposal';

export * from '@kordex/core/codecs/profileChangeProposal';


export function rowToProfileChangeProposal(
  row: typeof profileChangeProposals.$inferSelect,
): ProfileChangeProposal {
  return validateProfileChangeProposal({
    id: row.id,
    proposalKind: row.proposalKind,
    sourceKind: row.sourceKind,
    baseProfileId: row.baseProfileId,
    sourceBranchId: row.sourceBranchId,
    target: {
      kind: row.targetKind,
      profileId: row.targetProfileId,
      branchId: row.targetBranchId,
    },
    targetProfileVersion: row.targetProfileVersion,
    targetBranchUpdatedAt: row.targetBranchUpdatedAt,
    evidenceIds: parseProposalEvidenceIds(row.evidenceIdsJson),
    patch: parseProfilePatch(row.patchJson),
    title: row.title,
    summary: row.summary,
    reason: row.reason,
    riskScore: row.riskScore,
    semanticConfidence: row.semanticConfidence,
    userFitConfidence: row.userFitConfidence,
    status: row.status,
    supersededByProposalId: row.supersededByProposalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewedAt: row.reviewedAt,
    appliedAt: row.appliedAt,
  });
}


export function profileChangeProposalToRow(
  proposal: ProfileChangeProposal,
): typeof profileChangeProposals.$inferInsert {
  const parsed = validateProfileChangeProposal(proposal);
  return {
    id: parsed.id,
    proposalKind: parsed.proposalKind,
    sourceKind: parsed.sourceKind,
    baseProfileId: parsed.baseProfileId,
    sourceBranchId: parsed.sourceBranchId ?? null,
    targetKind: parsed.target.kind,
    targetProfileId: parsed.target.kind === 'base_profile' ? parsed.target.profileId ?? null : null,
    targetBranchId: parsed.target.kind === 'profile_branch' ? parsed.target.branchId ?? null : null,
    targetProfileVersion: parsed.target.kind === 'base_profile' ? parsed.targetProfileVersion ?? null : null,
    targetBranchUpdatedAt: parsed.target.kind === 'profile_branch' ? parsed.targetBranchUpdatedAt ?? null : null,
    evidenceIdsJson: [...parsed.evidenceIds],
    patchJson: parsed.patch,
    title: parsed.title,
    summary: parsed.summary,
    reason: parsed.reason,
    riskScore: parsed.riskScore,
    semanticConfidence: parsed.semanticConfidence ?? null,
    userFitConfidence: parsed.userFitConfidence ?? null,
    status: parsed.status,
    supersededByProposalId: parsed.supersededByProposalId ?? null,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    reviewedAt: parsed.reviewedAt ?? null,
    appliedAt: parsed.appliedAt ?? null,
  };
}
