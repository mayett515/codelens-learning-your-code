import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import { compileBaseProfileProposalApplyOperation } from '../baseProfileProposalApply';
import { compileBranchLocalProposalApplyOperation } from '../branchLocalProposalApply';
import { parseProfilePatch, validateProfileChangeProposal } from '../codecs/profileChangeProposal';
import { ProfileNotFoundError } from '../profileRegistry';
import type {
  DomainProfile,
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfilePatch,
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
import { supersedePendingProfileChangeProposal } from './profileChangeProposalLifecycleService';
import { getProfileDefinitionById } from './profileDefinitionRepo';
import { insertProfileProposalEvent } from './profileProposalEventRepo';
import { loadDefaultProfileRegistry } from './profileRegistryBootstrap';

export type ProfileChangeProposalEditServiceErrorCode =
  | 'proposal_not_found'
  | 'proposal_not_pending'
  | 'proposal_target_not_supported'
  | 'branch_not_found'
  | 'profile_definition_not_found'
  | 'base_profile_not_found'
  | 'proposal_edit_time_invalid'
  | 'replacement_proposal_invalid';

export class ProfileChangeProposalEditServiceError extends Error {
  constructor(
    public readonly code: ProfileChangeProposalEditServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileChangeProposalEditServiceError';
  }
}

export interface ProfileChangeProposalEditServiceDependencies {
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

export interface EditProfileChangeProposalDraftInput {
  patch: ProfilePatch;
  title?: string | null | undefined;
  summary?: string | null | undefined;
  reason?: string | null | undefined;
  riskScore?: number | undefined;
  semanticConfidence?: number | null | undefined;
  userFitConfidence?: number | null | undefined;
}

export interface CreateEditedProfileChangeProposalReplacementInput {
  proposalId: string;
  draft: EditProfileChangeProposalDraftInput;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  supersedeReason?: string | null | undefined;
  deps?: Partial<ProfileChangeProposalEditServiceDependencies>;
}

export interface CreateEditedProfileChangeProposalReplacementResult {
  proposal: ProfileChangeProposal;
  supersededProposal: ProfileChangeProposal;
}

type ReplacementBasis = {
  targetProfileVersion: number | null;
  targetBranchUpdatedAt: number | null;
};

type ReplacementTargetContext =
  | {
      kind: 'profile_branch';
      basis: ReplacementBasis;
      branch: ProfileBranch;
      baseProfile: DomainProfile;
    }
  | {
      kind: 'base_profile';
      basis: ReplacementBasis;
      profileDefinition: ProfileDefinition;
    };

function resolveDeps(
  deps: Partial<ProfileChangeProposalEditServiceDependencies> | undefined,
): ProfileChangeProposalEditServiceDependencies {
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

export async function createEditedProfileChangeProposalReplacement(
  input: CreateEditedProfileChangeProposalReplacementInput,
): Promise<CreateEditedProfileChangeProposalReplacementResult> {
  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new ProfileChangeProposalEditServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    validateEditInput(proposal, input.now);

    const targetContext = await resolveReplacementTargetContext({
      proposal,
      deps,
      tx,
    });
    const replacement = createReplacementProposal({
      proposal,
      draft: input.draft,
      now: input.now,
      newProposalId: deps.newProposalId(),
      basis: targetContext.basis,
    });
    if (replacement.id === proposal.id) {
      throw new ProfileChangeProposalEditServiceError(
        'replacement_proposal_invalid',
        `Edited replacement proposal id must differ from ${proposal.id}.`,
      );
    }

    validateReplacementAgainstTarget({
      replacement,
      targetContext,
      now: input.now,
    });

    await deps.insertProposal(replacement, tx);
    const supersededProposal = await supersedePendingProfileChangeProposal({
      proposalId: proposal.id,
      supersededByProposalId: replacement.id,
      now: input.now,
      actorKind: input.actorKind ?? 'user',
      actorId: input.actorId ?? null,
      reason: input.supersedeReason ?? `User edited proposal ${proposal.id} into replacement ${replacement.id}.`,
      deps: {
        transaction: (callback) => callback(tx),
        getProposalById: deps.getProposalById,
        saveProposalIfPending: deps.saveProposalIfPending,
        insertEvent: deps.insertEvent,
        newEventId: deps.newEventId,
      },
    });

    return {
      proposal: replacement,
      supersededProposal,
    };
  });
}

function validateEditInput(proposal: ProfileChangeProposal, now: number): void {
  if (proposal.status !== 'pending') {
    throw new ProfileChangeProposalEditServiceError(
      'proposal_not_pending',
      `Only pending proposals can be edited. Proposal ${proposal.id} has status ${proposal.status}.`,
    );
  }

  if (now < proposal.createdAt || now < proposal.updatedAt) {
    throw new ProfileChangeProposalEditServiceError(
      'proposal_edit_time_invalid',
      `Edit time ${now} is older than proposal ${proposal.id} timestamps.`,
    );
  }
}

async function resolveReplacementTargetContext(input: {
  proposal: ProfileChangeProposal;
  deps: ProfileChangeProposalEditServiceDependencies;
  tx: DbOrTx;
}): Promise<ReplacementTargetContext> {
  if (input.proposal.target.kind === 'profile_branch') {
    return resolveBranchReplacementTargetContext(input);
  }
  if (input.proposal.target.kind === 'base_profile') {
    return resolveBaseReplacementTargetContext(input);
  }
  throw new ProfileChangeProposalEditServiceError(
    'proposal_target_not_supported',
    `Proposal ${input.proposal.id} target is not supported for editing.`,
  );
}

async function resolveBranchReplacementTargetContext(input: {
  proposal: ProfileChangeProposal;
  deps: ProfileChangeProposalEditServiceDependencies;
  tx: DbOrTx;
}): Promise<ReplacementTargetContext> {
  const branchId = input.proposal.target.branchId;
  if (!branchId) {
    throw new ProfileChangeProposalEditServiceError(
      'proposal_target_not_supported',
      `Proposal ${input.proposal.id} does not name a target branch.`,
    );
  }

  const branch = await input.deps.getBranchById(branchId, input.tx);
  if (!branch) {
    throw new ProfileChangeProposalEditServiceError(
      'branch_not_found',
      `Profile branch ${branchId} for proposal ${input.proposal.id} was not found.`,
    );
  }

  const registry = await input.deps.loadRegistry();
  let baseProfile: DomainProfile;
  try {
    baseProfile = registry.getProfile(input.proposal.baseProfileId);
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      throw new ProfileChangeProposalEditServiceError(
        'base_profile_not_found',
        `Base profile ${input.proposal.baseProfileId} for proposal ${input.proposal.id} was not found.`,
      );
    }
    throw error;
  }

  return {
    kind: 'profile_branch',
    basis: {
      targetProfileVersion: null,
      targetBranchUpdatedAt: branch.updatedAt,
    },
    branch,
    baseProfile,
  };
}

async function resolveBaseReplacementTargetContext(input: {
  proposal: ProfileChangeProposal;
  deps: ProfileChangeProposalEditServiceDependencies;
  tx: DbOrTx;
}): Promise<ReplacementTargetContext> {
  const profileId = input.proposal.target.profileId ?? input.proposal.baseProfileId;
  const definition = await input.deps.getProfileDefinitionById(profileId, input.tx);
  if (!definition) {
    throw new ProfileChangeProposalEditServiceError(
      'profile_definition_not_found',
      `Profile definition ${profileId} for proposal ${input.proposal.id} was not found.`,
    );
  }

  return {
    kind: 'base_profile',
    basis: {
      targetProfileVersion: definition.version,
      targetBranchUpdatedAt: null,
    },
    profileDefinition: definition,
  };
}

function validateReplacementAgainstTarget(input: {
  replacement: ProfileChangeProposal;
  targetContext: ReplacementTargetContext;
  now: number;
}): void {
  if (input.targetContext.kind === 'profile_branch') {
    compileBranchLocalProposalApplyOperation({
      proposal: input.replacement,
      baseProfile: input.targetContext.baseProfile,
      branch: input.targetContext.branch,
      now: input.now,
    });
    return;
  }

  compileBaseProfileProposalApplyOperation({
    proposal: input.replacement,
    profileDefinition: input.targetContext.profileDefinition,
    now: input.now,
  });
}

function createReplacementProposal(input: {
  proposal: ProfileChangeProposal;
  draft: EditProfileChangeProposalDraftInput;
  now: number;
  newProposalId: string;
  basis: ReplacementBasis;
}): ProfileChangeProposal {
  return validateProfileChangeProposal({
    ...input.proposal,
    id: input.newProposalId,
    sourceKind: 'user',
    targetProfileVersion: input.basis.targetProfileVersion,
    targetBranchUpdatedAt: input.basis.targetBranchUpdatedAt,
    patch: cloneProfilePatch(input.draft.patch),
    title: nonEmptyText(input.draft.title) ?? input.proposal.title,
    summary: input.draft.summary ?? input.proposal.summary,
    reason: formatEditedReplacementReason(input),
    riskScore: input.draft.riskScore ?? input.proposal.riskScore,
    semanticConfidence: input.draft.semanticConfidence !== undefined
      ? input.draft.semanticConfidence
      : input.proposal.semanticConfidence ?? null,
    userFitConfidence: input.draft.userFitConfidence !== undefined
      ? input.draft.userFitConfidence
      : input.proposal.userFitConfidence ?? null,
    status: 'pending',
    supersededByProposalId: null,
    createdAt: input.now,
    updatedAt: input.now,
    reviewedAt: null,
    appliedAt: null,
  });
}

function cloneProfilePatch(patch: ProfilePatch): ProfilePatch {
  return parseProfilePatch(patch);
}

function formatEditedReplacementReason(input: {
  proposal: ProfileChangeProposal;
  draft: EditProfileChangeProposalDraftInput;
}): string {
  const reason = nonEmptyText(input.draft.reason) ?? input.proposal.reason;
  const footer = `Edited replacement for proposal ${input.proposal.id}.`;
  return [reason, footer]
    .filter((part) => part.trim().length > 0)
    .join('\n\n');
}

function nonEmptyText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
