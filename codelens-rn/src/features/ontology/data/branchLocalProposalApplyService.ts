import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import {
  BranchLocalProposalApplyError,
  applyBranchLocalProfileChangeProposal,
  type BranchLocalProposalApplyResult,
} from '../branchLocalProposalApply';
import type {
  DomainProfile,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileProposalEvent,
  ProfileProposalEventActorKind,
} from '../types';
import { getProfileBranchById, updateProfileBranchIfUnchanged } from './profileBranchRepo';
import {
  getProfileChangeProposalById,
  updateProfileChangeProposalIfPending,
} from './profileChangeProposalRepo';
import { insertProfileProposalEvent } from './profileProposalEventRepo';

export type BranchLocalProposalApplyServiceErrorCode =
  | 'proposal_not_found'
  | 'branch_not_found'
  | 'branch_write_conflict'
  | 'proposal_write_conflict';

export class BranchLocalProposalApplyServiceError extends Error {
  constructor(
    public readonly code: BranchLocalProposalApplyServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BranchLocalProposalApplyServiceError';
  }
}

export interface BranchLocalProposalApplyServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getProposalById(id: string, executor: DbOrTx): Promise<ProfileChangeProposal | undefined>;
  getBranchById(id: string, executor: DbOrTx): Promise<ProfileBranch | undefined>;
  saveBranchIfUnchanged(branch: ProfileBranch, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  saveProposalIfPending(proposal: ProfileChangeProposal, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  insertEvent(event: ProfileProposalEvent, executor: DbOrTx): Promise<void>;
  newEventId(): string;
}

export interface ApplyPendingBranchLocalProfileChangeProposalInput<TItemTypeNodeId extends string = string> {
  proposalId: string;
  baseProfile: DomainProfile<TItemTypeNodeId>;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  reason?: string | null | undefined;
  deps?: Partial<BranchLocalProposalApplyServiceDependencies>;
}

function resolveDeps(
  deps: Partial<BranchLocalProposalApplyServiceDependencies> | undefined,
): BranchLocalProposalApplyServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getProposalById: getProfileChangeProposalById,
    getBranchById: getProfileBranchById,
    saveBranchIfUnchanged: updateProfileBranchIfUnchanged,
    saveProposalIfPending: updateProfileChangeProposalIfPending,
    insertEvent: insertProfileProposalEvent,
    newEventId: () => `proposal_event_${nanoid(21)}`,
    ...deps,
  };
}

export async function applyPendingBranchLocalProfileChangeProposal<TItemTypeNodeId extends string = string>(
  input: ApplyPendingBranchLocalProfileChangeProposalInput<TItemTypeNodeId>,
): Promise<BranchLocalProposalApplyResult<TItemTypeNodeId>> {
  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new BranchLocalProposalApplyServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    if (proposal.target.kind !== 'profile_branch' || !proposal.target.branchId) {
      throw new BranchLocalProposalApplyError(
        'proposal_not_branch_target',
        `Proposal ${proposal.id} is not a profile-branch target proposal.`,
      );
    }

    const branch = await deps.getBranchById(proposal.target.branchId, tx);
    if (!branch) {
      throw new BranchLocalProposalApplyServiceError(
        'branch_not_found',
        `Profile branch ${proposal.target.branchId} for proposal ${proposal.id} was not found.`,
      );
    }

    const result = applyBranchLocalProfileChangeProposal({
      proposal: proposal as ProfileChangeProposal<TItemTypeNodeId>,
      baseProfile: input.baseProfile,
      branch: branch as ProfileBranch<TItemTypeNodeId>,
      now: input.now,
    });

    const branchSaved = await deps.saveBranchIfUnchanged(
      result.branch,
      result.operation.expectedBranchUpdatedAt,
      tx,
    );
    if (!branchSaved) {
      throw new BranchLocalProposalApplyServiceError(
        'branch_write_conflict',
        `Profile branch ${result.operation.branchId} changed before proposal ${proposal.id} could be applied.`,
      );
    }

    const proposalSaved = await deps.saveProposalIfPending(
      result.proposal,
      result.operation.expectedProposalUpdatedAt,
      tx,
    );
    if (!proposalSaved) {
      throw new BranchLocalProposalApplyServiceError(
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
      branchUpdatedAtBefore: branch.updatedAt,
      branchUpdatedAtAfter: result.branch.updatedAt,
      reason: input.reason ?? null,
      details: {
        operationKind: result.operation.kind,
      },
      createdAt: input.now,
    }, tx);

    return result;
  });
}
