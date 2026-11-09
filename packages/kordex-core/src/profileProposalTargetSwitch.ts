import type { ProfileChangeProposal, ProfilePatch } from './types';

export const BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE = 70;

export type ProposalTargetSwitchBlockReason =
  | 'proposal_not_pending'
  | 'proposal_not_branch_target'
  | 'proposal_kind_not_supported'
  | 'patch_not_single_additive_item_type'
  | 'target_branch_missing'
  | 'base_profile_missing';

export interface ProposalTargetSwitchModel {
  canSwitch: boolean;
  fromLabel: string;
  toLabel: string;
  actionLabel: string;
  confirmationTitle: string;
  confirmationBody: string;
  replacementPreview: ProposalTargetSwitchReplacementPreview | null;
  blockReason?: ProposalTargetSwitchBlockReason | undefined;
  blockMessage?: string | undefined;
}

export interface ProposalTargetSwitchReplacementPreview {
  target: {
    kind: 'base_profile';
    profileId: string;
  };
  targetProfileVersion: number;
  targetBranchUpdatedAt: null;
  sourceKind: ProfileChangeProposal['sourceKind'];
  riskScore: number;
  patch: ProfilePatch;
  evidenceIds: readonly string[];
  semanticConfidence: number | null;
  userFitConfidence: number | null;
}

export interface CreateProposalTargetSwitchModelInput {
  proposal: ProfileChangeProposal;
  baseProfileVersion?: number | null | undefined;
  baseProfileLabel?: string | null | undefined;
  branchLabel?: string | null | undefined;
}

export function createProposalTargetSwitchModel(
  input: CreateProposalTargetSwitchModelInput,
): ProposalTargetSwitchModel {
  const baseLabel = cleanLabel(input.baseProfileLabel) ?? input.proposal.baseProfileId;
  const branchLabel = cleanLabel(input.branchLabel) ?? input.proposal.target.branchId ?? 'target branch';
  const fromLabel = `Branch ${branchLabel}`;
  const toLabel = `Core ${baseLabel}`;
  const common = {
    fromLabel,
    toLabel,
    actionLabel: 'Move proposal to core',
    confirmationTitle: 'Move proposal from branch to core?',
    confirmationBody: [
      `This keeps the proposal pending, but changes its review target from ${fromLabel} to ${toLabel}.`,
      'If later applied, the change affects the shared base profile for future composed runtime profiles.',
      'Old notes are not rewritten automatically. Switching target is not Apply; Apply remains a separate action.',
    ].join(' '),
  };

  const blockReason = targetSwitchBlockReason(input.proposal, input.baseProfileVersion);
  if (blockReason) {
    return {
      ...common,
      canSwitch: false,
      replacementPreview: null,
      blockReason,
      blockMessage: formatTargetSwitchBlockReason(blockReason),
    };
  }

  return {
    ...common,
    canSwitch: true,
    replacementPreview: {
      target: {
        kind: 'base_profile',
        profileId: input.proposal.baseProfileId,
      },
      targetProfileVersion: input.baseProfileVersion!,
      targetBranchUpdatedAt: null,
      sourceKind: input.proposal.sourceKind,
      riskScore: BASE_PROFILE_ADDITIVE_TARGET_SWITCH_RISK_SCORE,
      patch: input.proposal.patch,
      evidenceIds: [...input.proposal.evidenceIds],
      semanticConfidence: input.proposal.semanticConfidence ?? null,
      userFitConfidence: input.proposal.userFitConfidence ?? null,
    },
  };
}

export function targetSwitchBlockReason(
  proposal: ProfileChangeProposal,
  baseProfileVersion: number | null | undefined,
): ProposalTargetSwitchBlockReason | null {
  if (proposal.status !== 'pending') return 'proposal_not_pending';
  if (proposal.target.kind !== 'profile_branch') return 'proposal_not_branch_target';
  if (!proposal.target.branchId) return 'target_branch_missing';
  if (!Number.isInteger(baseProfileVersion) || Number(baseProfileVersion) < 0) return 'base_profile_missing';
  if (proposal.proposalKind !== 'ontology_node_patch') return 'proposal_kind_not_supported';
  if (!isSingleAdditiveItemTypePatch(proposal.patch)) return 'patch_not_single_additive_item_type';
  return null;
}

export function formatTargetSwitchBlockReason(reason: ProposalTargetSwitchBlockReason): string {
  switch (reason) {
    case 'proposal_not_pending':
      return 'Only pending proposals can be moved to core.';
    case 'proposal_not_branch_target':
      return 'Only branch-local proposals can be moved to core in this first slice.';
    case 'proposal_kind_not_supported':
      return 'Only additive ontology-node proposals can be moved to core in this first slice.';
    case 'patch_not_single_additive_item_type':
      return 'This proposal patch needs a dedicated target-switching flow before it can move to core.';
    case 'target_branch_missing':
      return 'This proposal is missing its branch target snapshot.';
    case 'base_profile_missing':
      return 'The current base profile version is required before Kordex can create a core replacement.';
  }
}

const TARGET_SWITCH_PROFILE_PATCH_FIELD_KEYS = [
  'addOntologyNodes',
  'overrideOntologyNodes',
  'addItemTypeNodeIds',
  'addRelationshipTypeNodeIds',
  'overrideLabels',
  'overrideMetadataFields',
  'overrideGraph',
  'overrideOntology',
] as const satisfies readonly (keyof ProfilePatch)[];
type MissingTargetSwitchProfilePatchKey = Exclude<keyof ProfilePatch, typeof TARGET_SWITCH_PROFILE_PATCH_FIELD_KEYS[number]>;
const TARGET_SWITCH_PROFILE_PATCH_FIELD_COVERAGE: Record<MissingTargetSwitchProfilePatchKey, never> = {};
void TARGET_SWITCH_PROFILE_PATCH_FIELD_COVERAGE;

function isSingleAdditiveItemTypePatch(patch: ProfilePatch): boolean {
  const addedNodes = patch.addOntologyNodes ?? [];
  if (addedNodes.length !== 1) return false;
  const addedNode = addedNodes[0];
  if (!addedNode) return false;
  if (patch.addItemTypeNodeIds?.length !== 1 || patch.addItemTypeNodeIds[0] !== addedNode.id) return false;
  if (hasEntries(patch.overrideOntologyNodes)) return false;
  if (hasEntries(patch.addRelationshipTypeNodeIds)) return false;
  if (hasEntries(patch.overrideMetadataFields)) return false;
  if (hasObjectEntries(patch.overrideLabels)) return false;
  if (hasObjectEntries(patch.overrideGraph)) return false;
  if (hasObjectEntries(patch.overrideOntology)) return false;
  return true;
}

function hasEntries(value: readonly unknown[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasObjectEntries(value: object | null | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function cleanLabel(value: string | null | undefined): string | null {
  const label = value?.trim();
  return label ? label : null;
}
