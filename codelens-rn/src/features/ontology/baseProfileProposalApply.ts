import { composeDomainProfile } from './profileComposition';
import { validateProfileChangeProposal } from './codecs/profileChangeProposal';
import { assertBaseProfileProposalTargetsCurrentVersion } from './baseProfileVersioning';
import type {
  BoundaryRule,
  DomainLabelOverrides,
  DomainProfile,
  GraphProfileOverrides,
  MetadataFieldDefinition,
  OntologyNode,
  ProfileChangeProposal,
  ProfileDefinition,
  ProfileOverlay,
  ProfilePatch,
} from './types';

export type BaseProfileProposalApplyErrorCode =
  | 'proposal_not_pending'
  | 'proposal_kind_not_supported'
  | 'proposal_apply_time_invalid'
  | 'profile_definition_base_mismatch'
  | 'profile_definition_changed_after_compile'
  | 'patch_conflict';

export class BaseProfileProposalApplyError extends Error {
  constructor(
    public readonly code: BaseProfileProposalApplyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BaseProfileProposalApplyError';
  }
}

export interface BaseProfilePatchOperation<TItemTypeNodeId extends string = string> {
  kind: 'apply_profile_patch_to_base_profile';
  proposalId: string;
  baseProfileId: string;
  expectedProposalUpdatedAt: number;
  expectedProfileVersion: number;
  expectedProfileDefinitionUpdatedAt: number;
  patch: ProfilePatch<TItemTypeNodeId>;
  appliedAt: number;
}

export interface BaseProfileProposalApplyInput<TItemTypeNodeId extends string = string> {
  proposal: ProfileChangeProposal<TItemTypeNodeId>;
  profileDefinition: ProfileDefinition<TItemTypeNodeId>;
  now: number;
}

export interface BaseProfileProposalApplyResult<TItemTypeNodeId extends string = string> {
  operation: BaseProfilePatchOperation<TItemTypeNodeId>;
  profileDefinition: ProfileDefinition<TItemTypeNodeId>;
  proposal: ProfileChangeProposal<TItemTypeNodeId>;
}

export function compileBaseProfileProposalApplyOperation<TItemTypeNodeId extends string = string>(
  input: BaseProfileProposalApplyInput<TItemTypeNodeId>,
): BaseProfilePatchOperation<TItemTypeNodeId> {
  const proposal = validateProfileChangeProposal(input.proposal) as ProfileChangeProposal<TItemTypeNodeId>;
  assertBaseProfileProposal(proposal, input.profileDefinition, input.now);
  assertPatchAppliesToCurrentBaseProfile(proposal.patch, input.profileDefinition.profile);

  return {
    kind: 'apply_profile_patch_to_base_profile',
    proposalId: proposal.id,
    baseProfileId: proposal.baseProfileId,
    expectedProposalUpdatedAt: proposal.updatedAt,
    expectedProfileVersion: input.profileDefinition.version,
    expectedProfileDefinitionUpdatedAt: input.profileDefinition.updatedAt,
    patch: clonePatch(proposal.patch),
    appliedAt: input.now,
  };
}

export function applyBaseProfilePatchOperation<TItemTypeNodeId extends string = string>(
  input: {
    profileDefinition: ProfileDefinition<TItemTypeNodeId>;
    operation: BaseProfilePatchOperation<TItemTypeNodeId>;
  },
): ProfileDefinition<TItemTypeNodeId> {
  const { profileDefinition, operation } = input;

  if (profileDefinition.id !== operation.baseProfileId || profileDefinition.profile.id !== operation.baseProfileId) {
    throw new BaseProfileProposalApplyError(
      'profile_definition_base_mismatch',
      `Operation targets base profile ${operation.baseProfileId}, but definition ${profileDefinition.id} was provided.`,
    );
  }

  if (
    profileDefinition.version !== operation.expectedProfileVersion ||
    profileDefinition.profile.version !== operation.expectedProfileVersion ||
    profileDefinition.updatedAt !== operation.expectedProfileDefinitionUpdatedAt
  ) {
    throw new BaseProfileProposalApplyError(
      'profile_definition_changed_after_compile',
      `Operation expected profile ${profileDefinition.id} at version ${operation.expectedProfileVersion} and updatedAt ${operation.expectedProfileDefinitionUpdatedAt}.`,
    );
  }

  const nextVersion = operation.expectedProfileVersion + 1;
  // The patch becomes a synthetic one-shot overlay only so the existing
  // composition code can apply the same merge rules. We persist the resulting
  // base definition, not a composed runtime profile or project branch overlay.
  const nextProfile = composeDomainProfile(profileDefinition.profile, [
    patchToOverlay(operation.proposalId, operation.patch),
  ]);
  const versionedProfile: DomainProfile<TItemTypeNodeId> = {
    ...nextProfile,
    version: nextVersion,
  };

  return {
    ...profileDefinition,
    label: versionedProfile.label,
    description: versionedProfile.description,
    version: nextVersion,
    profile: versionedProfile,
    updatedAt: operation.appliedAt,
  };
}

export function applyBaseProfileChangeProposal<TItemTypeNodeId extends string = string>(
  input: BaseProfileProposalApplyInput<TItemTypeNodeId>,
): BaseProfileProposalApplyResult<TItemTypeNodeId> {
  const operation = compileBaseProfileProposalApplyOperation(input);
  const profileDefinition = applyBaseProfilePatchOperation({
    profileDefinition: input.profileDefinition,
    operation,
  });
  const proposal = validateProfileChangeProposal({
    ...input.proposal,
    patch: clonePatch(input.proposal.patch),
    status: 'accepted',
    reviewedAt: input.now,
    appliedAt: input.now,
    updatedAt: input.now,
  }) as ProfileChangeProposal<TItemTypeNodeId>;

  return { operation, profileDefinition, proposal };
}

function assertBaseProfileProposal<TItemTypeNodeId extends string>(
  proposal: ProfileChangeProposal<TItemTypeNodeId>,
  profileDefinition: ProfileDefinition<TItemTypeNodeId>,
  now: number,
): void {
  if (proposal.status !== 'pending') {
    throw new BaseProfileProposalApplyError(
      'proposal_not_pending',
      `Only pending proposals can be applied. Proposal ${proposal.id} has status ${proposal.status}.`,
    );
  }

  if (proposal.proposalKind === 'branch_merge') {
    throw new BaseProfileProposalApplyError(
      'proposal_kind_not_supported',
      `Branch merge proposal ${proposal.id} needs a dedicated base-merge helper.`,
    );
  }

  if (now < proposal.createdAt || now < proposal.updatedAt) {
    throw new BaseProfileProposalApplyError(
      'proposal_apply_time_invalid',
      `Apply time ${now} is older than proposal ${proposal.id} timestamps.`,
    );
  }

  assertBaseProfileProposalTargetsCurrentVersion({
    proposal,
    baseProfile: profileDefinition.profile,
  });
}

function assertPatchAppliesToCurrentBaseProfile<TItemTypeNodeId extends string>(
  patch: ProfilePatch<TItemTypeNodeId>,
  profile: DomainProfile<TItemTypeNodeId>,
): void {
  const currentNodeIds = new Set(profile.ontology.nodes.map((node) => node.id));
  const addedNodeIds = new Set<string>();

  for (const node of patch.addOntologyNodes ?? []) {
    assertUniquePatchId(addedNodeIds, node.id, 'addOntologyNodes');
    if (currentNodeIds.has(node.id)) {
      throwPatchConflict(`Cannot add ontology node ${node.id}; it already exists in the target base profile.`);
    }
  }

  const overrideNodeIds = new Set<string>();
  for (const node of patch.overrideOntologyNodes ?? []) {
    assertUniquePatchId(overrideNodeIds, node.id, 'overrideOntologyNodes');
    if (!currentNodeIds.has(node.id)) {
      throwPatchConflict(`Cannot override ontology node ${node.id}; it does not exist in the target base profile.`);
    }
  }

  const overrideOntologyNodes = patch.overrideOntology?.nodes ?? [];
  // This legacy-shaped field is additive in composition, despite its name.
  // Keep base apply validation aligned so it cannot silently replace nodes.
  for (const node of overrideOntologyNodes) {
    assertUniquePatchId(addedNodeIds, node.id, 'overrideOntology.nodes');
    if (currentNodeIds.has(node.id)) {
      throwPatchConflict(`Cannot add overrideOntology node ${node.id}; it already exists in the target base profile.`);
    }
  }

  const currentItemTypeIds = new Set(profile.ontology.itemTypeNodeIds);
  const itemTypeIds = [
    ...(patch.addItemTypeNodeIds ?? []),
    ...(patch.overrideOntology?.itemTypeNodeIds ?? []),
  ];
  const seenItemTypeIds = new Set<string>();
  for (const id of itemTypeIds) {
    assertUniquePatchId(seenItemTypeIds, id, 'itemTypeNodeIds');
    if (currentItemTypeIds.has(id as TItemTypeNodeId)) {
      throwPatchConflict(`Cannot add item type ${id}; it already exists in the target base profile.`);
    }
    if (!currentNodeIds.has(id) && !addedNodeIds.has(id)) {
      throwPatchConflict(`Cannot add item type ${id}; no matching ontology node exists or is added by this patch.`);
    }
  }
  const patchItemTypeIds = new Set<string>([
    ...profile.ontology.itemTypeNodeIds,
    ...itemTypeIds,
  ]);
  assertPatchParentIds(patch.addOntologyNodes ?? [], patchItemTypeIds, 'addOntologyNodes');
  assertPatchParentIds(patch.overrideOntologyNodes ?? [], patchItemTypeIds, 'overrideOntologyNodes');
  assertPatchParentIds(overrideOntologyNodes, patchItemTypeIds, 'overrideOntology.nodes');

  const currentRelationshipTypeIds = new Set(profile.ontology.relationshipTypeNodeIds);
  const relationshipTypeIds = [
    ...(patch.addRelationshipTypeNodeIds ?? []),
    ...(patch.overrideOntology?.relationshipTypeNodeIds ?? []),
  ];
  const seenRelationshipTypeIds = new Set<string>();
  for (const id of relationshipTypeIds) {
    assertUniquePatchId(seenRelationshipTypeIds, id, 'relationshipTypeNodeIds');
    if (currentRelationshipTypeIds.has(id)) {
      throwPatchConflict(`Cannot add relationship type ${id}; it already exists in the target base profile.`);
    }
    // Relationship type ids are currently opaque profile relationship ids.
    // The base coding profile uses ids like "prerequisite" and "related"
    // without corresponding ontology nodes, so this intentionally validates
    // duplicate/conflict behavior but not node existence.
  }
}

function assertPatchParentIds(
  nodes: readonly OntologyNode[],
  itemTypeIds: ReadonlySet<string>,
  field: string,
): void {
  for (const node of nodes) {
    if (!node.parentId) continue;
    if (node.parentId === node.id) {
      throwPatchConflict(`Cannot set ontology node ${node.id} as its own parent in ${field}.`);
    }
    if (!itemTypeIds.has(node.parentId)) {
      throwPatchConflict(`Cannot set parent ${node.parentId} for ontology node ${node.id}; parent is not an item type in the target base profile or patch.`);
    }
  }
}

function patchToOverlay<TItemTypeNodeId extends string>(
  proposalId: string,
  patch: ProfilePatch<TItemTypeNodeId>,
): ProfileOverlay<TItemTypeNodeId> {
  // The kind is only an adapter into composeDomainProfile's overlay contract.
  // This helper applies exactly one overlay, so it does not select a runtime
  // branch layer or store branch-local state.
  return {
    id: `base-apply:${proposalId}`,
    kind: 'project',
    ...clonePatch(patch),
  };
}

function throwPatchConflict(message: string): never {
  throw new BaseProfileProposalApplyError('patch_conflict', message);
}

function assertUniquePatchId(seen: Set<string>, id: string, field: string): void {
  if (seen.has(id)) {
    throwPatchConflict(`Duplicate id ${id} in patch field ${field}.`);
  }
  seen.add(id);
}

function cloneBoundaryRule(rule: BoundaryRule): BoundaryRule {
  return {
    ...rule,
    evidenceIds: [...rule.evidenceIds],
  };
}

function cloneOntologyNode(node: OntologyNode): OntologyNode {
  return {
    ...node,
    useWhen: [...node.useWhen],
    doNotUseWhen: node.doNotUseWhen.map(cloneBoundaryRule),
    examples: [...node.examples],
    relatedNodeIds: [...node.relatedNodeIds],
    contrastNodeIds: [...node.contrastNodeIds],
  };
}

function cloneMetadataField(field: MetadataFieldDefinition): MetadataFieldDefinition {
  return {
    ...field,
    appliesTo: [...field.appliesTo],
    examples: [...field.examples],
    ...(field.enumOptions
      ? { enumOptions: field.enumOptions.map((option) => ({ ...option })) }
      : {}),
  };
}

function clonePatch<TItemTypeNodeId extends string>(
  patch: ProfilePatch<TItemTypeNodeId>,
): ProfilePatch<TItemTypeNodeId> {
  return {
    ...optionalArray('addOntologyNodes', patch.addOntologyNodes?.map(cloneOntologyNode)),
    ...optionalArray('overrideOntologyNodes', patch.overrideOntologyNodes?.map(cloneOntologyNode)),
    ...optionalArray('addItemTypeNodeIds', patch.addItemTypeNodeIds ? [...patch.addItemTypeNodeIds] : undefined),
    ...optionalArray('addRelationshipTypeNodeIds', patch.addRelationshipTypeNodeIds ? [...patch.addRelationshipTypeNodeIds] : undefined),
    ...optionalObject('overrideLabels', cloneLabelOverrides(patch.overrideLabels)),
    ...optionalArray('overrideMetadataFields', patch.overrideMetadataFields?.map(cloneMetadataField)),
    ...optionalObject('overrideGraph', cloneGraphOverrides(patch.overrideGraph)),
    ...optionalObject('overrideOntology', cloneOntologyOverride(patch.overrideOntology)),
  };
}

const PROFILE_PATCH_CLONE_FIELD_KEYS = [
  'addOntologyNodes',
  'overrideOntologyNodes',
  'addItemTypeNodeIds',
  'addRelationshipTypeNodeIds',
  'overrideLabels',
  'overrideMetadataFields',
  'overrideGraph',
  'overrideOntology',
] as const satisfies readonly (keyof ProfilePatch)[];
type MissingProfilePatchCloneKey = Exclude<keyof ProfilePatch, typeof PROFILE_PATCH_CLONE_FIELD_KEYS[number]>;
const PROFILE_PATCH_CLONE_FIELD_COVERAGE: Record<MissingProfilePatchCloneKey, never> = {};
void PROFILE_PATCH_CLONE_FIELD_COVERAGE;

function cloneLabelOverrides(
  labels: DomainLabelOverrides | undefined,
): DomainLabelOverrides | undefined {
  if (!labels) return undefined;
  return {
    ...labels,
    ...(labels.flashback ? { flashback: { ...labels.flashback } } : {}),
  };
}

function cloneGraphOverrides<TItemTypeNodeId extends string>(
  graph: GraphProfileOverrides<TItemTypeNodeId> | undefined,
): GraphProfileOverrides<TItemTypeNodeId> | undefined {
  if (!graph) return undefined;
  return {
    ...graph,
    ...(graph.nodeColors ? { nodeColors: { ...graph.nodeColors } } : {}),
    ...(graph.relationshipLabels ? { relationshipLabels: { ...graph.relationshipLabels } } : {}),
    ...(graph.relationshipSectionLabels ? { relationshipSectionLabels: { ...graph.relationshipSectionLabels } } : {}),
    ...(graph.modeLabels ? { modeLabels: { ...graph.modeLabels } } : {}),
    ...(graph.statusLabels ? { statusLabels: { ...graph.statusLabels } } : {}),
    ...(graph.tooltipLabels ? { tooltipLabels: { ...graph.tooltipLabels } } : {}),
    ...(graph.legendHelperLabels ? { legendHelperLabels: { ...graph.legendHelperLabels } } : {}),
  };
}

function cloneOntologyOverride<TItemTypeNodeId extends string>(
  override: ProfilePatch<TItemTypeNodeId>['overrideOntology'],
): ProfilePatch<TItemTypeNodeId>['overrideOntology'] {
  if (!override) return undefined;
  return {
    ...optionalArray('nodes', override.nodes?.map(cloneOntologyNode)),
    ...optionalArray('itemTypeNodeIds', override.itemTypeNodeIds ? [...override.itemTypeNodeIds] : undefined),
    ...optionalArray('relationshipTypeNodeIds', override.relationshipTypeNodeIds ? [...override.relationshipTypeNodeIds] : undefined),
  };
}

function optionalArray<K extends string, T>(
  key: K,
  value: readonly T[] | undefined,
): { [P in K]: readonly T[] } | Record<string, never> {
  return value && value.length > 0 ? { [key]: value } as { [P in K]: readonly T[] } : {};
}

function optionalObject<K extends string, T extends object>(
  key: K,
  value: T | undefined,
): { [P in K]: T } | Record<string, never> {
  return value && Object.keys(value).length > 0 ? { [key]: value } as { [P in K]: T } : {};
}
