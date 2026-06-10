import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import type {
  ProfileChangeProposal,
  ProfileProposalEvent,
  ProfileProposalEventActorKind,
} from '../types';
import {
  getProfileChangeProposalById,
  updateProfileChangeProposalIfPending,
} from './profileChangeProposalRepo';
import { insertProfileProposalEvent } from './profileProposalEventRepo';

export type ProfileChangeProposalLifecycleServiceErrorCode =
  | 'proposal_not_found'
  | 'replacement_proposal_not_found'
  | 'proposal_not_pending'
  | 'replacement_proposal_not_pending'
  | 'replacement_proposal_invalid'
  | 'proposal_lifecycle_time_invalid'
  | 'proposal_write_conflict';

export class ProfileChangeProposalLifecycleServiceError extends Error {
  constructor(
    public readonly code: ProfileChangeProposalLifecycleServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileChangeProposalLifecycleServiceError';
  }
}

export interface ProfileChangeProposalLifecycleServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getProposalById(id: string, executor: DbOrTx): Promise<ProfileChangeProposal | undefined>;
  saveProposalIfPending(proposal: ProfileChangeProposal, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  insertEvent(event: ProfileProposalEvent, executor: DbOrTx): Promise<void>;
  newEventId(): string;
}

export interface SupersedePendingProfileChangeProposalInput {
  proposalId: string;
  supersededByProposalId: string;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  reason?: string | null | undefined;
  deps?: Partial<ProfileChangeProposalLifecycleServiceDependencies>;
}

function resolveDeps(
  deps: Partial<ProfileChangeProposalLifecycleServiceDependencies> | undefined,
): ProfileChangeProposalLifecycleServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getProposalById: getProfileChangeProposalById,
    saveProposalIfPending: updateProfileChangeProposalIfPending,
    insertEvent: insertProfileProposalEvent,
    newEventId: () => `proposal_event_${nanoid(21)}`,
    ...deps,
  };
}

export async function supersedePendingProfileChangeProposal(
  input: SupersedePendingProfileChangeProposalInput,
): Promise<ProfileChangeProposal> {
  if (input.proposalId === input.supersededByProposalId) {
    throw new ProfileChangeProposalLifecycleServiceError(
      'replacement_proposal_invalid',
      `Proposal ${input.proposalId} cannot supersede itself.`,
    );
  }

  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new ProfileChangeProposalLifecycleServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    const replacement = await deps.getProposalById(input.supersededByProposalId, tx);
    if (!replacement) {
      throw new ProfileChangeProposalLifecycleServiceError(
        'replacement_proposal_not_found',
        `Replacement profile change proposal ${input.supersededByProposalId} was not found.`,
      );
    }

    validateLifecycleInputs(proposal, replacement, input.now);

    const supersededProposal: ProfileChangeProposal = {
      ...proposal,
      status: 'superseded',
      supersededByProposalId: replacement.id,
      reviewedAt: input.now,
      updatedAt: input.now,
      appliedAt: null,
    };
    const saved = await deps.saveProposalIfPending(supersededProposal, proposal.updatedAt, tx);
    if (!saved) {
      throw new ProfileChangeProposalLifecycleServiceError(
        'proposal_write_conflict',
        `Profile change proposal ${proposal.id} changed before it could be superseded.`,
      );
    }

    await deps.insertEvent({
      id: deps.newEventId(),
      proposalId: proposal.id,
      action: 'superseded',
      actorKind: input.actorKind ?? 'user',
      actorId: input.actorId ?? null,
      baseProfileId: proposal.baseProfileId,
      proposalKind: proposal.proposalKind,
      target: proposal.target,
      statusBefore: proposal.status,
      statusAfter: supersededProposal.status,
      proposalUpdatedAtBefore: proposal.updatedAt,
      proposalUpdatedAtAfter: supersededProposal.updatedAt,
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      reason: input.reason ?? null,
      details: {
        supersededByProposalId: replacement.id,
      },
      createdAt: input.now,
    }, tx);

    return supersededProposal;
  });
}

function validateLifecycleInputs(
  proposal: ProfileChangeProposal,
  replacement: ProfileChangeProposal,
  now: number,
): void {
  if (proposal.status !== 'pending') {
    throw new ProfileChangeProposalLifecycleServiceError(
      'proposal_not_pending',
      `Only pending proposals can be superseded. Proposal ${proposal.id} has status ${proposal.status}.`,
    );
  }

  if (replacement.status !== 'pending') {
    throw new ProfileChangeProposalLifecycleServiceError(
      'replacement_proposal_not_pending',
      `Only pending proposals can replace another pending proposal. Proposal ${replacement.id} has status ${replacement.status}.`,
    );
  }

  if (replacement.baseProfileId !== proposal.baseProfileId) {
    throw new ProfileChangeProposalLifecycleServiceError(
      'replacement_proposal_invalid',
      `Replacement proposal ${replacement.id} targets base profile ${replacement.baseProfileId}, not ${proposal.baseProfileId}.`,
    );
  }

  if (
    now < proposal.createdAt ||
    now < proposal.updatedAt ||
    now < replacement.createdAt ||
    now < replacement.updatedAt
  ) {
    throw new ProfileChangeProposalLifecycleServiceError(
      'proposal_lifecycle_time_invalid',
      `Lifecycle time ${now} is older than proposal timestamps.`,
    );
  }
}
