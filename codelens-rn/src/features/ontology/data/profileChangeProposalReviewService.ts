import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import type {
  ProfileChangeProposal,
  ProfileProposalEvent,
  ProfileProposalEventAction,
  ProfileProposalEventActorKind,
} from '../types';
import {
  getProfileChangeProposalById,
  updateProfileChangeProposalIfPending,
} from './profileChangeProposalRepo';
import { insertProfileProposalEvent } from './profileProposalEventRepo';

export type ProfileChangeProposalReviewStatus = 'rejected' | 'postponed';

export type ProfileChangeProposalReviewServiceErrorCode =
  | 'proposal_not_found'
  | 'proposal_not_pending'
  | 'proposal_review_time_invalid'
  | 'proposal_write_conflict';

export class ProfileChangeProposalReviewServiceError extends Error {
  constructor(
    public readonly code: ProfileChangeProposalReviewServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileChangeProposalReviewServiceError';
  }
}

export interface ProfileChangeProposalReviewServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getProposalById(id: string, executor: DbOrTx): Promise<ProfileChangeProposal | undefined>;
  saveProposalIfPending(proposal: ProfileChangeProposal, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  insertEvent(event: ProfileProposalEvent, executor: DbOrTx): Promise<void>;
  newEventId(): string;
}

export interface SetPendingProfileChangeProposalReviewStatusInput {
  proposalId: string;
  status: ProfileChangeProposalReviewStatus;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  reason?: string | null | undefined;
  deps?: Partial<ProfileChangeProposalReviewServiceDependencies>;
}

function resolveDeps(
  deps: Partial<ProfileChangeProposalReviewServiceDependencies> | undefined,
): ProfileChangeProposalReviewServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getProposalById: getProfileChangeProposalById,
    saveProposalIfPending: updateProfileChangeProposalIfPending,
    insertEvent: insertProfileProposalEvent,
    newEventId: () => `proposal_event_${nanoid(21)}`,
    ...deps,
  };
}

export async function setPendingProfileChangeProposalReviewStatus(
  input: SetPendingProfileChangeProposalReviewStatusInput,
): Promise<ProfileChangeProposal> {
  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new ProfileChangeProposalReviewServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    if (proposal.status !== 'pending') {
      throw new ProfileChangeProposalReviewServiceError(
        'proposal_not_pending',
        `Only pending proposals can be reviewed. Proposal ${proposal.id} has status ${proposal.status}.`,
      );
    }

    if (input.now < proposal.createdAt || input.now < proposal.updatedAt) {
      throw new ProfileChangeProposalReviewServiceError(
        'proposal_review_time_invalid',
        `Review time ${input.now} is older than proposal ${proposal.id} timestamps.`,
      );
    }

    const reviewedProposal: ProfileChangeProposal = {
      ...proposal,
      status: input.status,
      reviewedAt: input.now,
      updatedAt: input.now,
      appliedAt: null,
    };
    const saved = await deps.saveProposalIfPending(reviewedProposal, proposal.updatedAt, tx);
    if (!saved) {
      throw new ProfileChangeProposalReviewServiceError(
        'proposal_write_conflict',
        `Profile change proposal ${proposal.id} changed before review status could be saved.`,
      );
    }

    await deps.insertEvent({
      id: deps.newEventId(),
      proposalId: proposal.id,
      action: proposalEventActionForStatus(input.status),
      actorKind: input.actorKind ?? 'user',
      actorId: input.actorId ?? null,
      baseProfileId: proposal.baseProfileId,
      proposalKind: proposal.proposalKind,
      target: proposal.target,
      statusBefore: proposal.status,
      statusAfter: reviewedProposal.status,
      proposalUpdatedAtBefore: proposal.updatedAt,
      proposalUpdatedAtAfter: reviewedProposal.updatedAt,
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      reason: input.reason ?? null,
      details: null,
      createdAt: input.now,
    }, tx);

    return reviewedProposal;
  });
}

function proposalEventActionForStatus(status: ProfileChangeProposalReviewStatus): ProfileProposalEventAction {
  return status;
}
