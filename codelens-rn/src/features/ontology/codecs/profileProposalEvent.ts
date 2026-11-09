import type { profileProposalEvents } from '../data/schema';
import type { ProfileProposalEvent } from '../types';
import { parseProfileProposalEventDetails, validateProfileProposalEvent } from '@kordex/core/codecs/profileProposalEvent';

export * from '@kordex/core/codecs/profileProposalEvent';


export function rowToProfileProposalEvent(
  row: typeof profileProposalEvents.$inferSelect,
): ProfileProposalEvent {
  return validateProfileProposalEvent({
    id: row.id,
    proposalId: row.proposalId,
    action: row.action,
    actorKind: row.actorKind,
    actorId: row.actorId,
    baseProfileId: row.baseProfileId,
    proposalKind: row.proposalKind,
    target: {
      kind: row.targetKind,
      profileId: row.targetProfileId,
      branchId: row.targetBranchId,
    },
    statusBefore: row.statusBefore,
    statusAfter: row.statusAfter,
    proposalUpdatedAtBefore: row.proposalUpdatedAtBefore,
    proposalUpdatedAtAfter: row.proposalUpdatedAtAfter,
    branchUpdatedAtBefore: row.branchUpdatedAtBefore,
    branchUpdatedAtAfter: row.branchUpdatedAtAfter,
    reason: row.reason,
    details: parseProfileProposalEventDetails(row.detailsJson),
    createdAt: row.createdAt,
  });
}


export function profileProposalEventToRow(
  event: ProfileProposalEvent,
): typeof profileProposalEvents.$inferInsert {
  const parsed = validateProfileProposalEvent(event);
  return {
    id: parsed.id,
    proposalId: parsed.proposalId,
    action: parsed.action,
    actorKind: parsed.actorKind,
    actorId: parsed.actorId ?? null,
    baseProfileId: parsed.baseProfileId,
    proposalKind: parsed.proposalKind,
    targetKind: parsed.target.kind,
    targetProfileId: parsed.target.kind === 'base_profile' ? parsed.target.profileId ?? null : null,
    targetBranchId: parsed.target.kind === 'profile_branch' ? parsed.target.branchId ?? null : null,
    statusBefore: parsed.statusBefore,
    statusAfter: parsed.statusAfter,
    proposalUpdatedAtBefore: parsed.proposalUpdatedAtBefore,
    proposalUpdatedAtAfter: parsed.proposalUpdatedAtAfter,
    branchUpdatedAtBefore: parsed.branchUpdatedAtBefore ?? null,
    branchUpdatedAtAfter: parsed.branchUpdatedAtAfter ?? null,
    reason: parsed.reason ?? null,
    detailsJson: parsed.details ?? null,
    createdAt: parsed.createdAt,
  };
}
