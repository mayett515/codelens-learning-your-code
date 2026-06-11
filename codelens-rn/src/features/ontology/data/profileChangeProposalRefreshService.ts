import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import { BaseProfileProposalApplyError, compileBaseProfileProposalApplyOperation } from '../baseProfileProposalApply';
import { BranchLocalProposalApplyError, compileBranchLocalProposalApplyOperation } from '../branchLocalProposalApply';
import { ProfileNotFoundError } from '../profileRegistry';
import type {
  DomainProfile,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileProposalEvent,
  ProfileProposalEventActorKind,
  ProfileRegistry,
} from '../types';
import { getProfileBranchById } from './profileBranchRepo';
import {
  getProfileChangeProposalById,
  insertProfileChangeProposal,
  updateProfileChangeProposalIfPending,
} from './profileChangeProposalRepo';
import { getProfileDefinitionById } from './profileDefinitionRepo';
import { insertProfileProposalEvent } from './profileProposalEventRepo';
import { loadDefaultProfileRegistry } from './profileRegistryBootstrap';

export type ProfileChangeProposalRefreshServiceErrorCode =
  | 'proposal_not_found'
  | 'proposal_not_pending'
  | 'proposal_not_refreshable'
  | 'proposal_target_not_supported'
  | 'branch_not_found'
  | 'profile_definition_not_found'
  | 'base_profile_not_found'
  | 'proposal_refresh_time_invalid'
  | 'proposal_write_conflict';

export class ProfileChangeProposalRefreshServiceError extends Error {
  constructor(
    public readonly code: ProfileChangeProposalRefreshServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileChangeProposalRefreshServiceError';
  }
}

export interface ProfileChangeProposalRefreshServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getProposalById(id: string, executor: DbOrTx): Promise<ProfileChangeProposal | undefined>;
  getBranchById(id: string, executor: DbOrTx): Promise<ProfileBranch | undefined>;
  getProfileDefinitionById(id: string, executor: DbOrTx): Promise<ProfileDefinition | undefined>;
  insertProposal(proposal: ProfileChangeProposal, executor: DbOrTx): Promise<void>;
  saveProposalIfPending(proposal: ProfileChangeProposal, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  insertEvent(event: ProfileProposalEvent, executor: DbOrTx): Promise<void>;
  loadRegistry(): Promise<ProfileRegistry>;
  newProposalId(): string;
  newEventId(): string;
}

export interface RefreshStaleProfileChangeProposalInput {
  proposalId: string;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  reason?: string | null | undefined;
  deps?: Partial<ProfileChangeProposalRefreshServiceDependencies>;
}

export interface RefreshStaleProfileChangeProposalResult {
  proposal: ProfileChangeProposal;
  supersededProposal: ProfileChangeProposal;
}

type RefreshBasis = {
  previousRevision: number | null;
  refreshedRevision: number;
};

function resolveDeps(
  deps: Partial<ProfileChangeProposalRefreshServiceDependencies> | undefined,
): ProfileChangeProposalRefreshServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getProposalById: getProfileChangeProposalById,
    getBranchById: getProfileBranchById,
    getProfileDefinitionById,
    insertProposal: insertProfileChangeProposal,
    saveProposalIfPending: updateProfileChangeProposalIfPending,
    insertEvent: insertProfileProposalEvent,
    loadRegistry: () => loadDefaultProfileRegistry(),
    newProposalId: () => `proposal_${nanoid(21)}`,
    newEventId: () => `proposal_event_${nanoid(21)}`,
    ...deps,
  };
}

export async function refreshStaleProfileChangeProposal(
  input: RefreshStaleProfileChangeProposalInput,
): Promise<RefreshStaleProfileChangeProposalResult> {
  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new ProfileChangeProposalRefreshServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    validateRefreshInput(proposal, input.now);

    const { replacement, basis } = await buildReplacementProposal({
      proposal,
      now: input.now,
      refreshReason: input.reason ?? null,
      deps,
      tx,
    });

    await deps.insertProposal(replacement, tx);

    const supersededProposal: ProfileChangeProposal = {
      ...proposal,
      status: 'superseded',
      supersededByProposalId: replacement.id,
      reviewedAt: input.now,
      appliedAt: null,
      updatedAt: input.now,
    };
    const saved = await deps.saveProposalIfPending(supersededProposal, proposal.updatedAt, tx);
    if (!saved) {
      throw new ProfileChangeProposalRefreshServiceError(
        'proposal_write_conflict',
        `Profile change proposal ${proposal.id} changed before it could be refreshed.`,
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
      branchUpdatedAtBefore: proposal.target.kind === 'profile_branch' ? basis.previousRevision : null,
      branchUpdatedAtAfter: proposal.target.kind === 'profile_branch' ? basis.refreshedRevision : null,
      reason: input.reason ?? null,
      details: {
        supersededByProposalId: replacement.id,
        refreshKind: 'target_rebase',
        previousTargetRevision: basis.previousRevision,
        refreshedTargetRevision: basis.refreshedRevision,
      },
      createdAt: input.now,
    }, tx);

    return {
      proposal: replacement,
      supersededProposal,
    };
  });
}

function validateRefreshInput(proposal: ProfileChangeProposal, now: number): void {
  if (proposal.status !== 'pending') {
    throw new ProfileChangeProposalRefreshServiceError(
      'proposal_not_pending',
      `Only pending proposals can be refreshed. Proposal ${proposal.id} has status ${proposal.status}.`,
    );
  }

  if (now < proposal.createdAt || now < proposal.updatedAt) {
    throw new ProfileChangeProposalRefreshServiceError(
      'proposal_refresh_time_invalid',
      `Refresh time ${now} is older than proposal ${proposal.id} timestamps.`,
    );
  }
}

async function buildReplacementProposal(input: {
  proposal: ProfileChangeProposal;
  now: number;
  refreshReason: string | null;
  deps: ProfileChangeProposalRefreshServiceDependencies;
  tx: DbOrTx;
}): Promise<{ replacement: ProfileChangeProposal; basis: RefreshBasis }> {
  if (input.proposal.target.kind === 'profile_branch') {
    return buildBranchReplacementProposal(input);
  }
  if (input.proposal.target.kind === 'base_profile') {
    return buildBaseReplacementProposal(input);
  }
  throw new ProfileChangeProposalRefreshServiceError(
    'proposal_target_not_supported',
    `Proposal ${input.proposal.id} target is not supported for refresh.`,
  );
}

async function buildBranchReplacementProposal(input: {
  proposal: ProfileChangeProposal;
  now: number;
  refreshReason: string | null;
  deps: ProfileChangeProposalRefreshServiceDependencies;
  tx: DbOrTx;
}): Promise<{ replacement: ProfileChangeProposal; basis: RefreshBasis }> {
  const branchId = input.proposal.target.branchId;
  if (!branchId) {
    throw new ProfileChangeProposalRefreshServiceError(
      'proposal_target_not_supported',
      `Proposal ${input.proposal.id} does not name a target branch.`,
    );
  }

  const branch = await input.deps.getBranchById(branchId, input.tx);
  if (!branch) {
    throw new ProfileChangeProposalRefreshServiceError(
      'branch_not_found',
      `Profile branch ${branchId} for proposal ${input.proposal.id} was not found.`,
    );
  }

  const previousRevision = input.proposal.targetBranchUpdatedAt ?? null;
  if (previousRevision == null || previousRevision === branch.updatedAt) {
    throw new ProfileChangeProposalRefreshServiceError(
      'proposal_not_refreshable',
      `Proposal ${input.proposal.id} is not stale against branch ${branchId}.`,
    );
  }

  const registry = await input.deps.loadRegistry();
  let baseProfile: DomainProfile;
  try {
    baseProfile = registry.getProfile(input.proposal.baseProfileId);
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      throw new ProfileChangeProposalRefreshServiceError(
        'base_profile_not_found',
        `Base profile ${input.proposal.baseProfileId} for proposal ${input.proposal.id} was not found.`,
      );
    }
    throw error;
  }

  compileBranchLocalProposalApplyOperation({
    proposal: input.proposal,
    baseProfile,
    branch,
    now: input.now,
  });

  return {
    replacement: createReplacementProposal({
      proposal: input.proposal,
      now: input.now,
      refreshReason: input.refreshReason,
      newProposalId: input.deps.newProposalId(),
      targetProfileVersion: null,
      targetBranchUpdatedAt: branch.updatedAt,
      previousRevision,
      refreshedRevision: branch.updatedAt,
    }),
    basis: {
      previousRevision,
      refreshedRevision: branch.updatedAt,
    },
  };
}

async function buildBaseReplacementProposal(input: {
  proposal: ProfileChangeProposal;
  now: number;
  refreshReason: string | null;
  deps: ProfileChangeProposalRefreshServiceDependencies;
  tx: DbOrTx;
}): Promise<{ replacement: ProfileChangeProposal; basis: RefreshBasis }> {
  const profileId = input.proposal.target.profileId ?? input.proposal.baseProfileId;
  const definition = await input.deps.getProfileDefinitionById(profileId, input.tx);
  if (!definition) {
    throw new ProfileChangeProposalRefreshServiceError(
      'profile_definition_not_found',
      `Profile definition ${profileId} for proposal ${input.proposal.id} was not found.`,
    );
  }

  const previousRevision = input.proposal.targetProfileVersion ?? null;
  if (previousRevision == null || previousRevision === definition.version) {
    throw new ProfileChangeProposalRefreshServiceError(
      'proposal_not_refreshable',
      `Proposal ${input.proposal.id} is not stale against base profile ${profileId}.`,
    );
  }

  compileBaseProfileProposalApplyOperation({
    proposal: {
      ...input.proposal,
      targetProfileVersion: definition.version,
    },
    profileDefinition: definition,
    now: input.now,
  });

  return {
    replacement: createReplacementProposal({
      proposal: input.proposal,
      now: input.now,
      refreshReason: input.refreshReason,
      newProposalId: input.deps.newProposalId(),
      targetProfileVersion: definition.version,
      targetBranchUpdatedAt: null,
      previousRevision,
      refreshedRevision: definition.version,
    }),
    basis: {
      previousRevision,
      refreshedRevision: definition.version,
    },
  };
}

function createReplacementProposal(input: {
  proposal: ProfileChangeProposal;
  now: number;
  refreshReason: string | null;
  newProposalId: string;
  targetProfileVersion: number | null;
  targetBranchUpdatedAt: number | null;
  previousRevision: number | null;
  refreshedRevision: number;
}): ProfileChangeProposal {
  return {
    ...input.proposal,
    id: input.newProposalId,
    targetProfileVersion: input.targetProfileVersion,
    targetBranchUpdatedAt: input.targetBranchUpdatedAt,
    reason: formatReplacementReason(input),
    status: 'pending',
    supersededByProposalId: null,
    createdAt: input.now,
    updatedAt: input.now,
    reviewedAt: null,
    appliedAt: null,
  };
}

function formatReplacementReason(input: {
  proposal: ProfileChangeProposal;
  refreshReason: string | null;
  previousRevision: number | null;
  refreshedRevision: number;
}): string {
  const refreshLines = [
    `Refreshed replacement for proposal ${input.proposal.id}.`,
    `Target revision changed from ${input.previousRevision ?? 'unknown'} to ${input.refreshedRevision}.`,
  ];
  if (input.refreshReason) {
    refreshLines.push(`Refresh note: ${input.refreshReason}`);
  }
  return [input.proposal.reason, refreshLines.join('\n')]
    .filter((part) => part.trim().length > 0)
    .join('\n\n');
}
