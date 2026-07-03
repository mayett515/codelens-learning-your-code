import { nanoid } from 'nanoid';
import { db, type DbOrTx } from '../../../db/client';
import { compileBaseProfileProposalApplyOperation } from '../baseProfileProposalApply';
import { parseProfilePatch, validateProfileChangeProposal } from '../codecs/profileChangeProposal';
import {
  createProposalTargetSwitchModel,
  formatTargetSwitchBlockReason,
  targetSwitchBlockReason,
  type ProposalTargetSwitchBlockReason,
} from '../profileProposalTargetSwitch';
import type {
  ProfileBranch,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfilePatch,
  ProfileProposalEvent,
  ProfileProposalEventActorKind,
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

export type ProfileChangeProposalTargetSwitchServiceErrorCode =
  | 'proposal_not_found'
  | 'branch_not_found'
  | 'proposal_branch_base_mismatch'
  | 'profile_definition_not_found'
  | 'proposal_target_switch_time_invalid'
  | 'replacement_proposal_invalid'
  | ProposalTargetSwitchBlockReason;

export class ProfileChangeProposalTargetSwitchServiceError extends Error {
  constructor(
    public readonly code: ProfileChangeProposalTargetSwitchServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProfileChangeProposalTargetSwitchServiceError';
  }
}

export interface ProfileChangeProposalTargetSwitchServiceDependencies {
  transaction<T>(callback: (tx: DbOrTx) => Promise<T>): Promise<T>;
  getProposalById(id: string, executor: DbOrTx): Promise<ProfileChangeProposal | undefined>;
  getBranchById(id: string, executor: DbOrTx): Promise<ProfileBranch | undefined>;
  getProfileDefinitionById(id: string, executor: DbOrTx): Promise<ProfileDefinition | undefined>;
  insertProposal(proposal: ProfileChangeProposal, executor: DbOrTx): Promise<void>;
  saveProposalIfPending(proposal: ProfileChangeProposal, expectedUpdatedAt: number, executor: DbOrTx): Promise<boolean>;
  insertEvent(event: ProfileProposalEvent, executor: DbOrTx): Promise<void>;
  newProposalId(): string;
  newEventId(): string;
}

export interface SwitchProfileChangeProposalTargetToBaseInput {
  proposalId: string;
  now: number;
  actorKind?: ProfileProposalEventActorKind | undefined;
  actorId?: string | null | undefined;
  reason?: string | null | undefined;
  deps?: Partial<ProfileChangeProposalTargetSwitchServiceDependencies> | undefined;
}

export interface SwitchProfileChangeProposalTargetToBaseResult {
  proposal: ProfileChangeProposal;
  supersededProposal: ProfileChangeProposal;
}

function resolveDeps(
  deps: Partial<ProfileChangeProposalTargetSwitchServiceDependencies> | undefined,
): ProfileChangeProposalTargetSwitchServiceDependencies {
  return {
    transaction: (callback) => db.transaction(callback),
    getProposalById: getProfileChangeProposalById,
    getBranchById: getProfileBranchById,
    getProfileDefinitionById,
    insertProposal: insertProfileChangeProposal,
    saveProposalIfPending: updateProfileChangeProposalIfPending,
    insertEvent: insertProfileProposalEvent,
    newProposalId: () => `proposal_${nanoid(21)}`,
    newEventId: () => `proposal_event_${nanoid(21)}`,
    ...deps,
  };
}

export async function switchProfileChangeProposalTargetToBase(
  input: SwitchProfileChangeProposalTargetToBaseInput,
): Promise<SwitchProfileChangeProposalTargetToBaseResult> {
  const deps = resolveDeps(input.deps);

  return deps.transaction(async (tx) => {
    const proposal = await deps.getProposalById(input.proposalId, tx);
    if (!proposal) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        'proposal_not_found',
        `Profile change proposal ${input.proposalId} was not found.`,
      );
    }

    validateSwitchTime(proposal, input.now);
    const staticBlockReason = targetSwitchBlockReason(proposal, 0);
    if (staticBlockReason) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        staticBlockReason,
        formatTargetSwitchBlockReason(staticBlockReason),
      );
    }

    const branchId = proposal.target.kind === 'profile_branch' ? proposal.target.branchId : null;
    const branch = branchId ? await deps.getBranchById(branchId, tx) : undefined;
    if (branchId && !branch) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        'branch_not_found',
        `Profile branch ${branchId} for proposal ${proposal.id} was not found.`,
      );
    }
    if (branch && branch.parentProfileId !== proposal.baseProfileId) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        'proposal_branch_base_mismatch',
        `Profile branch ${branch.id} belongs to ${branch.parentProfileId}, not proposal base profile ${proposal.baseProfileId}.`,
      );
    }

    const definition = await deps.getProfileDefinitionById(proposal.baseProfileId, tx);
    if (!definition) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        'profile_definition_not_found',
        `Profile definition ${proposal.baseProfileId} for proposal ${proposal.id} was not found.`,
      );
    }

    const switchModel = createProposalTargetSwitchModel({
      proposal,
      baseProfileVersion: definition.version,
      baseProfileLabel: definition.label,
      branchLabel: branch?.name,
    });
    if (!switchModel.canSwitch || !switchModel.replacementPreview) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        switchModel.blockReason ?? 'replacement_proposal_invalid',
        switchModel.blockMessage ?? `Proposal ${proposal.id} cannot be moved to core.`,
      );
    }

    const replacement = createBaseTargetReplacementProposal({
      proposal,
      newProposalId: deps.newProposalId(),
      now: input.now,
      baseProfileVersion: switchModel.replacementPreview.targetProfileVersion,
      riskScore: switchModel.replacementPreview.riskScore,
    });
    if (replacement.id === proposal.id) {
      throw new ProfileChangeProposalTargetSwitchServiceError(
        'replacement_proposal_invalid',
        `Target-switch replacement proposal id must differ from ${proposal.id}.`,
      );
    }

    compileBaseProfileProposalApplyOperation({
      proposal: replacement,
      profileDefinition: definition,
      now: input.now,
    });

    await deps.insertProposal(replacement, tx);
    const supersededProposal = await supersedePendingProfileChangeProposal({
      proposalId: proposal.id,
      supersededByProposalId: replacement.id,
      now: input.now,
      actorKind: input.actorKind ?? 'user',
      actorId: input.actorId ?? null,
      reason: input.reason ?? formatDefaultSupersedeReason(proposal, replacement),
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

function validateSwitchTime(proposal: ProfileChangeProposal, now: number): void {
  if (now < proposal.createdAt || now < proposal.updatedAt) {
    throw new ProfileChangeProposalTargetSwitchServiceError(
      'proposal_target_switch_time_invalid',
      `Target switch time ${now} is older than proposal ${proposal.id} timestamps.`,
    );
  }
}

function createBaseTargetReplacementProposal(input: {
  proposal: ProfileChangeProposal;
  newProposalId: string;
  now: number;
  baseProfileVersion: number;
  riskScore: number;
}): ProfileChangeProposal {
  const firstNodeLabel = input.proposal.patch.addOntologyNodes?.[0]?.label;
  return validateProfileChangeProposal({
    ...input.proposal,
    id: input.newProposalId,
    // The idea's provenance stays with the original producer; user agency is captured by the supersede audit event.
    sourceKind: input.proposal.sourceKind,
    target: {
      kind: 'base_profile',
      profileId: input.proposal.baseProfileId,
    },
    targetProfileVersion: input.baseProfileVersion,
    targetBranchUpdatedAt: null,
    patch: cloneProfilePatch(input.proposal.patch),
    summary: firstNodeLabel
      ? `Create ${firstNodeLabel} as a base/core item type after target-switch review.`
      : 'Review this proposal as a base/core profile change after target-switch review.',
    riskScore: input.riskScore,
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

function formatDefaultSupersedeReason(
  proposal: ProfileChangeProposal,
  replacement: ProfileChangeProposal,
): string {
  return `User moved proposal ${proposal.id} from branch ${proposal.target.branchId ?? 'unknown'} to base profile ${proposal.baseProfileId} as replacement ${replacement.id}.`;
}
