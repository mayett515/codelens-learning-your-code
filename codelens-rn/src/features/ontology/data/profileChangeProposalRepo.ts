import { and, asc, eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { profileChangeProposals } from './schema';
import {
  profileChangeProposalToRow,
  rowToProfileChangeProposal,
} from '../codecs/profileChangeProposal';
import type { ProfileChangeProposal, ProfileChangeProposalStatus } from '../types';

export async function insertProfileChangeProposal(
  proposal: ProfileChangeProposal,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.insert(profileChangeProposals).values(profileChangeProposalToRow(proposal));
}

export async function upsertProfileChangeProposal(
  proposal: ProfileChangeProposal,
  executor: DbOrTx = db,
): Promise<void> {
  const row = profileChangeProposalToRow(proposal);
  await executor
    .insert(profileChangeProposals)
    .values(row)
    .onConflictDoUpdate({
      target: profileChangeProposals.id,
      set: {
        proposalKind: row.proposalKind,
        sourceKind: row.sourceKind,
        baseProfileId: row.baseProfileId,
        sourceBranchId: row.sourceBranchId,
        targetKind: row.targetKind,
        targetProfileId: row.targetProfileId,
        targetBranchId: row.targetBranchId,
        evidenceIdsJson: row.evidenceIdsJson,
        patchJson: row.patchJson,
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
      },
    });
}

export async function updateProfileChangeProposalIfPending(
  proposal: ProfileChangeProposal,
  expectedUpdatedAt: number,
  executor: DbOrTx = db,
): Promise<boolean> {
  const row = profileChangeProposalToRow(proposal);
  const result = await executor
    .update(profileChangeProposals)
    .set({
      proposalKind: row.proposalKind,
      sourceKind: row.sourceKind,
      baseProfileId: row.baseProfileId,
      sourceBranchId: row.sourceBranchId,
      targetKind: row.targetKind,
      targetProfileId: row.targetProfileId,
      targetBranchId: row.targetBranchId,
      evidenceIdsJson: row.evidenceIdsJson,
      patchJson: row.patchJson,
      title: row.title,
      summary: row.summary,
      reason: row.reason,
      riskScore: row.riskScore,
      semanticConfidence: row.semanticConfidence,
      userFitConfidence: row.userFitConfidence,
      status: row.status,
      supersededByProposalId: row.supersededByProposalId,
      updatedAt: row.updatedAt,
      reviewedAt: row.reviewedAt,
      appliedAt: row.appliedAt,
    })
    .where(and(
      eq(profileChangeProposals.id, row.id),
      eq(profileChangeProposals.status, 'pending'),
      eq(profileChangeProposals.updatedAt, expectedUpdatedAt),
    ));

  const affectedRows = getAffectedRows(result);
  // Conditional writes must fail closed if a future driver stops exposing
  // affected-row counts; guessing success would mask write conflicts.
  return affectedRows !== undefined ? affectedRows > 0 : false;
}

export async function getProfileChangeProposalById(
  id: string,
  executor: DbOrTx = db,
): Promise<ProfileChangeProposal | undefined> {
  const rows = await executor
    .select()
    .from(profileChangeProposals)
    .where(eq(profileChangeProposals.id, id));
  return rows[0] ? rowToProfileChangeProposal(rows[0]) : undefined;
}

export async function listProfileChangeProposalsByStatus(
  status: ProfileChangeProposalStatus,
  executor: DbOrTx = db,
): Promise<ProfileChangeProposal[]> {
  const rows = await executor
    .select()
    .from(profileChangeProposals)
    .where(eq(profileChangeProposals.status, status))
    .orderBy(asc(profileChangeProposals.updatedAt), asc(profileChangeProposals.id));
  return rows.map(rowToProfileChangeProposal);
}

export async function listProfileChangeProposalsForBaseProfile(
  baseProfileId: string,
  executor: DbOrTx = db,
): Promise<ProfileChangeProposal[]> {
  const rows = await executor
    .select()
    .from(profileChangeProposals)
    .where(eq(profileChangeProposals.baseProfileId, baseProfileId))
    .orderBy(asc(profileChangeProposals.updatedAt), asc(profileChangeProposals.id));
  return rows.map(rowToProfileChangeProposal);
}

export async function listProfileChangeProposalsForTargetBranch(
  branchId: string,
  executor: DbOrTx = db,
): Promise<ProfileChangeProposal[]> {
  const rows = await executor
    .select()
    .from(profileChangeProposals)
    .where(and(
      eq(profileChangeProposals.targetKind, 'profile_branch'),
      eq(profileChangeProposals.targetBranchId, branchId),
    ))
    .orderBy(asc(profileChangeProposals.updatedAt), asc(profileChangeProposals.id));
  return rows.map(rowToProfileChangeProposal);
}

export async function deleteProfileChangeProposal(
  id: string,
  executor: DbOrTx = db,
): Promise<void> {
  await executor.delete(profileChangeProposals).where(eq(profileChangeProposals.id, id));
}

function getAffectedRows(result: unknown): number | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const record = result as Record<string, unknown>;
  if (typeof record['rowsAffected'] === 'number') return record['rowsAffected'];
  if (typeof record['changes'] === 'number') return record['changes'];
  return undefined;
}
