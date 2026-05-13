import { composeRuntimeDomainProfileFromBranches } from './profileBranches';
import { validateProfileChangeProposal } from './codecs/profileChangeProposal';
import type {
  BoundaryRule,
  DomainLabelOverrides,
  DomainProfile,
  GraphProfileOverrides,
  MetadataFieldDefinition,
  OntologyNode,
  OntologyProfile,
  ProfileBranch,
  ProfileChangeProposal,
  ProfilePatch,
} from './types';

export type BranchLocalProposalApplyErrorCode =
  | 'proposal_not_pending'
  | 'proposal_kind_not_supported'
  | 'proposal_not_branch_target'
  | 'proposal_branch_mismatch'
  | 'branch_changed_after_compile'
  | 'proposal_base_mismatch'
  | 'proposal_apply_time_invalid'
  | 'branch_kind_mismatch'
  | 'patch_conflict';

export class BranchLocalProposalApplyError extends Error {
  constructor(
    public readonly code: BranchLocalProposalApplyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BranchLocalProposalApplyError';
  }
}

export interface BranchLocalProfilePatchOperation<TItemTypeNodeId extends string = string> {
  kind: 'apply_profile_patch_to_branch_overlay';
  proposalId: string;
  baseProfileId: string;
  branchId: string;
  expectedProposalUpdatedAt: number;
  expectedBranchUpdatedAt: number;
  patch: ProfilePatch<TItemTypeNodeId>;
  appliedAt: number;
}

export interface BranchLocalProposalApplyInput<TItemTypeNodeId extends string = string> {
  proposal: ProfileChangeProposal<TItemTypeNodeId>;
  baseProfile: DomainProfile<TItemTypeNodeId>;
  branch: ProfileBranch<TItemTypeNodeId>;
  now: number;
}

export interface BranchLocalProposalApplyResult<TItemTypeNodeId extends string = string> {
  operation: BranchLocalProfilePatchOperation<TItemTypeNodeId>;
  branch: ProfileBranch<TItemTypeNodeId>;
  proposal: ProfileChangeProposal<TItemTypeNodeId>;
}

export function compileBranchLocalProposalApplyOperation<TItemTypeNodeId extends string = string>(
  input: BranchLocalProposalApplyInput<TItemTypeNodeId>,
): BranchLocalProfilePatchOperation<TItemTypeNodeId> {
  const proposal = validateProfileChangeProposal(input.proposal) as ProfileChangeProposal<TItemTypeNodeId>;
  assertBranchLocalProposal(proposal, input.baseProfile, input.branch, input.now);
  assertPatchAppliesToCurrentBranchProfile(proposal.patch, input.baseProfile, input.branch);

  return {
    kind: 'apply_profile_patch_to_branch_overlay',
    proposalId: proposal.id,
    baseProfileId: proposal.baseProfileId,
    branchId: input.branch.id,
    expectedProposalUpdatedAt: proposal.updatedAt,
    expectedBranchUpdatedAt: input.branch.updatedAt,
    patch: clonePatch(proposal.patch),
    appliedAt: input.now,
  };
}

export function applyBranchLocalProfilePatchOperation<TItemTypeNodeId extends string = string>(
  input: {
    branch: ProfileBranch<TItemTypeNodeId>;
    operation: BranchLocalProfilePatchOperation<TItemTypeNodeId>;
  },
): ProfileBranch<TItemTypeNodeId> {
  if (input.branch.id !== input.operation.branchId) {
    throw new BranchLocalProposalApplyError(
      'proposal_branch_mismatch',
      `Operation targets branch ${input.operation.branchId}, but branch ${input.branch.id} was provided.`,
    );
  }

  if (input.branch.updatedAt !== input.operation.expectedBranchUpdatedAt) {
    throw new BranchLocalProposalApplyError(
      'branch_changed_after_compile',
      `Operation expected branch ${input.branch.id} at updatedAt ${input.operation.expectedBranchUpdatedAt}, but current updatedAt is ${input.branch.updatedAt}.`,
    );
  }

  if (input.branch.parentProfileId !== input.operation.baseProfileId) {
    throw new BranchLocalProposalApplyError(
      'proposal_base_mismatch',
      `Operation targets base profile ${input.operation.baseProfileId}, but branch belongs to ${input.branch.parentProfileId}.`,
    );
  }

  if (input.branch.branchKind !== input.branch.overlay.kind) {
    throw new BranchLocalProposalApplyError(
      'branch_kind_mismatch',
      `Branch kind ${input.branch.branchKind} does not match overlay kind ${input.branch.overlay.kind}.`,
    );
  }

  return {
    ...input.branch,
    overlay: {
      id: input.branch.overlay.id,
      kind: input.branch.overlay.kind,
      ...mergePatchFieldsIntoOverlay(input.branch.overlay, input.operation.patch),
    },
    updatedAt: input.operation.appliedAt,
  };
}

export function applyBranchLocalProfileChangeProposal<TItemTypeNodeId extends string = string>(
  input: BranchLocalProposalApplyInput<TItemTypeNodeId>,
): BranchLocalProposalApplyResult<TItemTypeNodeId> {
  const operation = compileBranchLocalProposalApplyOperation(input);
  const branch = applyBranchLocalProfilePatchOperation({
    branch: input.branch,
    operation,
  });
  const proposal: ProfileChangeProposal<TItemTypeNodeId> = validateProfileChangeProposal({
    ...input.proposal,
    patch: clonePatch(input.proposal.patch),
    status: 'accepted',
    reviewedAt: input.now,
    appliedAt: input.now,
    updatedAt: input.now,
  }) as ProfileChangeProposal<TItemTypeNodeId>;

  return { operation, branch, proposal };
}

function assertBranchLocalProposal<TItemTypeNodeId extends string>(
  proposal: ProfileChangeProposal<TItemTypeNodeId>,
  baseProfile: DomainProfile<TItemTypeNodeId>,
  branch: ProfileBranch<TItemTypeNodeId>,
  now: number,
): void {
  if (proposal.status !== 'pending') {
    throw new BranchLocalProposalApplyError(
      'proposal_not_pending',
      `Only pending proposals can be applied. Proposal ${proposal.id} has status ${proposal.status}.`,
    );
  }

  if (proposal.proposalKind === 'branch_merge') {
    throw new BranchLocalProposalApplyError(
      'proposal_kind_not_supported',
      `Branch merge proposal ${proposal.id} cannot be applied by the branch-local patch helper.`,
    );
  }

  if (now < proposal.createdAt || now < proposal.updatedAt) {
    throw new BranchLocalProposalApplyError(
      'proposal_apply_time_invalid',
      `Apply time ${now} is older than proposal ${proposal.id} timestamps.`,
    );
  }

  if (proposal.target.kind !== 'profile_branch' || !proposal.target.branchId) {
    throw new BranchLocalProposalApplyError(
      'proposal_not_branch_target',
      `Proposal ${proposal.id} is not a profile-branch target proposal.`,
    );
  }

  if (proposal.target.branchId !== branch.id) {
    throw new BranchLocalProposalApplyError(
      'proposal_branch_mismatch',
      `Proposal ${proposal.id} targets branch ${proposal.target.branchId}, but branch ${branch.id} was provided.`,
    );
  }

  if (proposal.baseProfileId !== baseProfile.id || branch.parentProfileId !== baseProfile.id) {
    throw new BranchLocalProposalApplyError(
      'proposal_base_mismatch',
      `Proposal/base/branch parent mismatch for proposal ${proposal.id}.`,
    );
  }

  if (branch.branchKind !== branch.overlay.kind) {
    throw new BranchLocalProposalApplyError(
      'branch_kind_mismatch',
      `Branch kind ${branch.branchKind} does not match overlay kind ${branch.overlay.kind}.`,
    );
  }
}

function assertPatchAppliesToCurrentBranchProfile<TItemTypeNodeId extends string>(
  patch: ProfilePatch<TItemTypeNodeId>,
  baseProfile: DomainProfile<TItemTypeNodeId>,
  branch: ProfileBranch<TItemTypeNodeId>,
): void {
  const currentProfile = composeRuntimeDomainProfileFromBranches({
    baseProfile,
    branches: [branch],
  });
  const currentNodeIds = new Set(currentProfile.ontology.nodes.map((node) => node.id));
  const addedNodeIds = new Set<string>();

  for (const node of patch.addOntologyNodes ?? []) {
    assertUniquePatchId(addedNodeIds, node.id, 'addOntologyNodes');
    if (currentNodeIds.has(node.id)) {
      throwPatchConflict(`Cannot add ontology node ${node.id}; it already exists in the target branch profile.`);
    }
  }

  const overrideNodeIds = new Set<string>();
  for (const node of patch.overrideOntologyNodes ?? []) {
    assertUniquePatchId(overrideNodeIds, node.id, 'overrideOntologyNodes');
    if (!currentNodeIds.has(node.id)) {
      throwPatchConflict(`Cannot override ontology node ${node.id}; it does not exist in the target branch profile.`);
    }
  }

  const overrideOntologyNodes = patch.overrideOntology?.nodes ?? [];
  for (const node of overrideOntologyNodes) {
    assertUniquePatchId(addedNodeIds, node.id, 'overrideOntology.nodes');
    if (currentNodeIds.has(node.id)) {
      throwPatchConflict(`Cannot add overrideOntology node ${node.id}; it already exists in the target branch profile.`);
    }
  }

  const currentItemTypeIds = new Set(currentProfile.ontology.itemTypeNodeIds);
  const itemTypeIds = [
    ...(patch.addItemTypeNodeIds ?? []),
    ...(patch.overrideOntology?.itemTypeNodeIds ?? []),
  ];
  const seenItemTypeIds = new Set<string>();
  for (const id of itemTypeIds) {
    assertUniquePatchId(seenItemTypeIds, id, 'itemTypeNodeIds');
    if (currentItemTypeIds.has(id as TItemTypeNodeId)) {
      throwPatchConflict(`Cannot add item type ${id}; it already exists in the target branch profile.`);
    }
    if (!currentNodeIds.has(id) && !addedNodeIds.has(id)) {
      throwPatchConflict(`Cannot add item type ${id}; no matching ontology node exists or is added by this patch.`);
    }
  }

  const currentRelationshipTypeIds = new Set(currentProfile.ontology.relationshipTypeNodeIds);
  const relationshipTypeIds = [
    ...(patch.addRelationshipTypeNodeIds ?? []),
    ...(patch.overrideOntology?.relationshipTypeNodeIds ?? []),
  ];
  const seenRelationshipTypeIds = new Set<string>();
  for (const id of relationshipTypeIds) {
    assertUniquePatchId(seenRelationshipTypeIds, id, 'relationshipTypeNodeIds');
    if (currentRelationshipTypeIds.has(id)) {
      throwPatchConflict(`Cannot add relationship type ${id}; it already exists in the target branch profile.`);
    }
    // Relationship type ids are currently opaque profile relationship ids.
    // The base coding profile uses ids like "prerequisite" and "related"
    // without corresponding ontology nodes, so this helper intentionally
    // validates duplicate/conflict behavior but not node existence.
  }
}

function throwPatchConflict(message: string): never {
  throw new BranchLocalProposalApplyError('patch_conflict', message);
}

function assertUniquePatchId(seen: Set<string>, id: string, field: string): void {
  if (seen.has(id)) {
    throwPatchConflict(`Duplicate id ${id} in patch field ${field}.`);
  }
  seen.add(id);
}

function mergePatchFieldsIntoOverlay<TItemTypeNodeId extends string>(
  overlay: ProfileBranch<TItemTypeNodeId>['overlay'],
  patch: ProfilePatch<TItemTypeNodeId>,
): Omit<ProfileBranch<TItemTypeNodeId>['overlay'], 'id' | 'kind'> {
  return {
    ...optionalArray('addOntologyNodes', mergeOntologyNodes(
      overlay.addOntologyNodes,
      patch.addOntologyNodes,
    )),
    ...optionalArray('overrideOntologyNodes', mergeOntologyNodes(
      overlay.overrideOntologyNodes,
      patch.overrideOntologyNodes,
    )),
    ...optionalArray('addItemTypeNodeIds', mergeStrings(
      overlay.addItemTypeNodeIds,
      patch.addItemTypeNodeIds,
    ) as TItemTypeNodeId[]),
    ...optionalArray('addRelationshipTypeNodeIds', mergeStrings(
      overlay.addRelationshipTypeNodeIds,
      patch.addRelationshipTypeNodeIds,
    )),
    ...optionalObject('overrideLabels', mergeLabelOverrides(
      overlay.overrideLabels,
      patch.overrideLabels,
    )),
    ...optionalArray('overrideMetadataFields', mergeMetadataFields(
      overlay.overrideMetadataFields,
      patch.overrideMetadataFields,
    )),
    ...optionalObject('overrideGraph', mergeGraphOverrides(
      overlay.overrideGraph,
      patch.overrideGraph,
    )),
    ...optionalObject('overrideOntology', mergeOntologyOverrides(
      overlay.overrideOntology,
      patch.overrideOntology,
    )),
  };
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

function mergeOntologyNodes(
  base: readonly OntologyNode[] | undefined,
  patch: readonly OntologyNode[] | undefined,
): OntologyNode[] {
  const byId = new Map<string, OntologyNode>();
  for (const node of base ?? []) byId.set(node.id, cloneOntologyNode(node));
  for (const node of patch ?? []) byId.set(node.id, cloneOntologyNode(node));
  return [...byId.values()];
}

function mergeStrings(
  base: readonly string[] | undefined,
  patch: readonly string[] | undefined,
): string[] {
  return [...new Set([...(base ?? []), ...(patch ?? [])])];
}

function mergeMetadataFields(
  base: readonly MetadataFieldDefinition[] | undefined,
  patch: readonly MetadataFieldDefinition[] | undefined,
): MetadataFieldDefinition[] {
  const byId = new Map<string, MetadataFieldDefinition>();
  for (const field of base ?? []) byId.set(field.id, cloneMetadataField(field));
  for (const field of patch ?? []) byId.set(field.id, cloneMetadataField(field));
  return [...byId.values()];
}

function mergeLabelOverrides(
  base: DomainLabelOverrides | undefined,
  patch: DomainLabelOverrides | undefined,
): DomainLabelOverrides | undefined {
  if (!base && !patch) return undefined;
  const flashback = base?.flashback || patch?.flashback
    ? {
        ...(base?.flashback ?? {}),
        ...(patch?.flashback ?? {}),
      }
    : undefined;
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
    ...(flashback ? { flashback } : {}),
  };
}

function cloneLabelOverrides(
  labels: DomainLabelOverrides | undefined,
): DomainLabelOverrides | undefined {
  return mergeLabelOverrides(undefined, labels);
}

function mergeGraphOverrides<TItemTypeNodeId extends string>(
  base: GraphProfileOverrides<TItemTypeNodeId> | undefined,
  patch: GraphProfileOverrides<TItemTypeNodeId> | undefined,
): GraphProfileOverrides<TItemTypeNodeId> | undefined {
  if (!base && !patch) return undefined;
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
    ...optionalObject('nodeColors', mergeRecord(base?.nodeColors, patch?.nodeColors)),
    ...optionalObject('relationshipLabels', mergeRecord(base?.relationshipLabels, patch?.relationshipLabels)),
    ...optionalObject('relationshipSectionLabels', mergeRecord(base?.relationshipSectionLabels, patch?.relationshipSectionLabels)),
    ...optionalObject('modeLabels', mergeRecord(base?.modeLabels, patch?.modeLabels)),
    ...optionalObject('statusLabels', mergeRecord(base?.statusLabels, patch?.statusLabels)),
    ...optionalObject('tooltipLabels', mergeRecord(base?.tooltipLabels, patch?.tooltipLabels)),
    ...optionalObject('legendHelperLabels', mergeRecord(base?.legendHelperLabels, patch?.legendHelperLabels)),
  } as GraphProfileOverrides<TItemTypeNodeId>;
}

function cloneGraphOverrides<TItemTypeNodeId extends string>(
  graph: GraphProfileOverrides<TItemTypeNodeId> | undefined,
): GraphProfileOverrides<TItemTypeNodeId> | undefined {
  return mergeGraphOverrides(undefined, graph);
}

function mergeOntologyOverrides<TItemTypeNodeId extends string>(
  base: Partial<OntologyProfile<TItemTypeNodeId>> | undefined,
  patch: Partial<OntologyProfile<TItemTypeNodeId>> | undefined,
): Partial<OntologyProfile<TItemTypeNodeId>> | undefined {
  if (!base && !patch) return undefined;
  return {
    ...optionalArray('nodes', mergeOntologyNodes(base?.nodes, patch?.nodes)),
    ...optionalArray('itemTypeNodeIds', mergeStrings(
      base?.itemTypeNodeIds,
      patch?.itemTypeNodeIds,
    ) as TItemTypeNodeId[]),
    ...optionalArray('relationshipTypeNodeIds', mergeStrings(
      base?.relationshipTypeNodeIds,
      patch?.relationshipTypeNodeIds,
    )),
  };
}

function cloneOntologyOverride<TItemTypeNodeId extends string>(
  override: Partial<OntologyProfile<TItemTypeNodeId>> | undefined,
): Partial<OntologyProfile<TItemTypeNodeId>> | undefined {
  return mergeOntologyOverrides(undefined, override);
}

function mergeRecord<T extends object>(
  base: T | undefined,
  patch: T | undefined,
): T | undefined {
  if (!base && !patch) return undefined;
  return {
    ...(base ?? {}),
    ...(patch ?? {}),
  } as T;
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
