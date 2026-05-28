import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import { BaseProfileVersioningError } from '../baseProfileVersioning';
import {
  applyBaseProfileChangeProposal,
  type BaseProfileProposalApplyResult,
} from '../baseProfileProposalApply';
import type {
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileProposalEvent,
  ProfileProposalEventActorKind,
} from '../types';
import {
  getProfileChangeProposalById,
  updateProfileChangeProposalIfPending,
} from './profileChangeProposalRepo';
import {
  getProfileDefinitionById,
  updateProfileDefinitionIfUnchanged,
} from './profileDefinitionRepo';
import { insertProfileProposalEvent } from './profileProposalEventRepo';

export type BaseProfileProposalApplyServiceErrorCode =
  | 'proposal_not_found'
  | 'profile_definition_not_found'
  | 'profile_definition_write_conflict'
  | 'proposal_write_conflict';

export class BaseProfileProposalApplyServiceError extends Error {
  constructor(
    public readonly code: BaseProfileProposalApplyServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BaseProfileProposalApplyServiceError';
  }
}

export interface BaseProfileProposalApplyServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getProposalById(id: string, executor: DbOrTx): Promise<ProfileChangeProposal | undefined>;
  getProfileDefinitionById(id: string, executor: DbOrTx): Promise<ProfileDefinition | undefined>;
  saveProfileDefinitionIfUnchanged(
    definition: ProfileDefinition,
    expectedVersion: number,
    expectedUpdatedAt: number,
    executor: DbOrTx,
  ): Promise<boolean>;
  saveProposalIfPending(proposal: ProfileChangeProposal, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  insertEvent(event: ProfileProposalEvent, executor: DbOrTx): Promise<void>;
  newEventId(): string;
}

export interface ApplyPendingBaseProfileChangeProposalInput {
  proposalId: string;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  reason?: string | null | undefined;
  deps?: Partial<BaseProfileProposalApplyServiceDependencies>;
}

function resolveDeps(
  deps: Partial<BaseProfileProposalApplyServiceDependencies> | undefined,
): BaseProfileProposalApplyServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getProposalById: getProfileChangeProposalById,
    getProfileDefinitionById,
    saveProfileDefinitionIfUnchanged: updateProfileDefinitionIfUnchanged,
    saveProposalIfPending: updateProfileChangeProposalIfPending,
    insertEvent: insertProfileProposalEvent,
    newEventId: () => `proposal_event_${nanoid(21)}`,
    ...deps,
  };
}

/**
 * Applies one pending base-profile proposal inside a transaction.
 *
 * UI callers must handle the full apply surface: service lookup/write
 * conflicts, pure patch-apply validation errors, and base-versioning errors.
 */
export async function applyPendingBaseProfileChangeProposal<TItemTypeNodeId extends string = string>(
  input: ApplyPendingBaseProfileChangeProposalInput,
): Promise<BaseProfileProposalApplyResult<TItemTypeNodeId>> {
  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new BaseProfileProposalApplyServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    if (proposal.target.kind !== 'base_profile' || !proposal.target.profileId) {
      throw new BaseProfileVersioningError(
        'proposal_not_base_target',
        `Proposal ${proposal.id} does not target a base profile.`,
      );
    }

    const definition = await deps.getProfileDefinitionById(proposal.target.profileId, tx);
    if (!definition) {
      throw new BaseProfileProposalApplyServiceError(
        'profile_definition_not_found',
        `Profile definition ${proposal.target.profileId} for proposal ${proposal.id} was not found.`,
      );
    }

    const result = applyBaseProfileChangeProposal({
      proposal: proposal as ProfileChangeProposal<TItemTypeNodeId>,
      profileDefinition: definition as ProfileDefinition<TItemTypeNodeId>,
      now: input.now,
    });

    const definitionSaved = await deps.saveProfileDefinitionIfUnchanged(
      result.profileDefinition,
      result.operation.expectedProfileVersion,
      result.operation.expectedProfileDefinitionUpdatedAt,
      tx,
    );
    if (!definitionSaved) {
      throw new BaseProfileProposalApplyServiceError(
        'profile_definition_write_conflict',
        `Profile definition ${result.operation.baseProfileId} changed before proposal ${proposal.id} could be applied.`,
      );
    }

    const proposalSaved = await deps.saveProposalIfPending(
      result.proposal,
      result.operation.expectedProposalUpdatedAt,
      tx,
    );
    if (!proposalSaved) {
      throw new BaseProfileProposalApplyServiceError(
        'proposal_write_conflict',
        `Profile change proposal ${proposal.id} changed before it could be marked accepted.`,
      );
    }

    await deps.insertEvent({
      id: deps.newEventId(),
      proposalId: proposal.id,
      action: 'applied',
      actorKind: input.actorKind ?? 'user',
      actorId: input.actorId ?? null,
      baseProfileId: proposal.baseProfileId,
      proposalKind: proposal.proposalKind,
      target: proposal.target,
      statusBefore: proposal.status,
      statusAfter: result.proposal.status,
      proposalUpdatedAtBefore: proposal.updatedAt,
      proposalUpdatedAtAfter: result.proposal.updatedAt,
      branchUpdatedAtBefore: null,
      branchUpdatedAtAfter: null,
      reason: input.reason ?? null,
      details: {
        operationKind: result.operation.kind,
        profileVersionBefore: result.operation.expectedProfileVersion,
        profileVersionAfter: result.profileDefinition.version,
      },
      createdAt: input.now,
    }, tx);

    return result;
  });
}
