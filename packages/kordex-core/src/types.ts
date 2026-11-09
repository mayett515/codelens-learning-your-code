import type { DomainLabelOverrides, MetadataFieldDefinition, GraphProfileOverrides } from './extensions/learningProfile';
export type { DomainLabels, MetadataFieldDefinition, ExtractionProfile, EmbeddingProfile, RetrievalProfile, PromotionProfile, ReviewProfile, GraphProfile, DomainLabelOverrides, GraphProfileOverrides } from './extensions/learningProfile';

export type OntologyNodeKind = 'category' | 'subcategory' | 'tag' | 'field' | 'relationshipType';
export type OntologyNodeStatus = 'active' | 'suggested' | 'deprecated';
export type OntologyNodeCreator = 'system' | 'user' | 'model';

export interface BoundaryRule {
  id: string;
  text: string;
  preferNodeId?: string | undefined;
  source: 'profile_seed' | 'user_correction' | 'checker_suggestion';
  evidenceIds: readonly string[];
}

export interface OntologyNode {
  id: string;
  label: string;
  kind: OntologyNodeKind;
  parentId: string | null;
  meaning: string;
  useWhen: readonly string[];
  doNotUseWhen: readonly BoundaryRule[];
  examples: readonly string[];
  relatedNodeIds: readonly string[];
  contrastNodeIds: readonly string[];
  status: OntologyNodeStatus;
  createdBy: OntologyNodeCreator;
  createdAt: number;
  updatedAt: number;
}

export type OntologyCorrectionSubjectKind = 'capture' | 'item';
export type OntologyCorrectionField = 'typeNodeId';
export type OntologyCorrectionSource = 'user';

export interface OntologyCorrectionActiveSelectionSnapshot {
  baseProfileId: string;
  projectBranchIds?: readonly string[] | undefined;
  learningBranchIds?: readonly string[] | undefined;
  personalBranchIds?: readonly string[] | undefined;
}

export interface OntologyCorrectionNearMissCandidate {
  scopeId: string;
  nodeId: string;
  rank: number;
  score?: number | null | undefined;
}

export interface OntologyCorrectionEvidence {
  id: string;
  profileId: string;
  activeSelectionSnapshot: OntologyCorrectionActiveSelectionSnapshot;
  subjectKind: OntologyCorrectionSubjectKind;
  subjectId: string;
  field: OntologyCorrectionField;
  previousTypeNodeId: string | null;
  correctedTypeNodeId: string;
  rawProposedTypeNodeId?: string | null | undefined;
  nearMissCandidates?: readonly OntologyCorrectionNearMissCandidate[] | null | undefined;
  reason?: string | null | undefined;
  source: OntologyCorrectionSource;
  createdAt: number;
}

export type ProfileChangeProposalKind =
  | 'classification_patch'
  | 'ontology_node_patch'
  | 'relationship_patch'
  | 'branch_merge'
  | 'manual_draft';

export type ProfileChangeProposalSourceKind = 'checker' | 'model' | 'user' | 'system';
export type ProfileChangeProposalTargetKind = 'base_profile' | 'profile_branch';
export type ProfileChangeProposalStatus = 'pending' | 'accepted' | 'rejected' | 'postponed' | 'superseded';

export interface ProfileChangeProposalTarget {
  kind: ProfileChangeProposalTargetKind;
  profileId?: string | null | undefined;
  branchId?: string | null | undefined;
}

export interface OntologyProfile<TItemTypeNodeId extends string = string> {
  nodes: readonly OntologyNode[];
  itemTypeNodeIds: readonly TItemTypeNodeId[];
  relationshipTypeNodeIds: readonly string[];
}

export type DomainProfile<TItemTypeNodeId extends string = string, TExtension extends object = object> = {
  id: string;
  version: number;
  label: string;
  description: string;
  ontology: OntologyProfile<TItemTypeNodeId>;
} & TExtension;

// ---------------------------------------------------------------------------
// Profile overlay / branch composition types
// ---------------------------------------------------------------------------

export type ProfileOverlayKind = 'project' | 'learning' | 'personal';

/** Branch kind that determines overlay grouping and runtime precedence. */
export type ProfileBranchKind = 'project' | 'learning' | 'personal';

export interface ProfileBranch<TItemTypeNodeId extends string = string> {
  id: string;
  parentProfileId: string;
  branchKind: ProfileBranchKind;
  name: string;
  overlay: ProfileOverlay<TItemTypeNodeId>;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Active profile source: an explicit, caller-owned bundle of base + overlays.
// ---------------------------------------------------------------------------

/**
 * A structured source for resolving an active domain profile.
 * Callers pass this to `resolveActiveDomainProfile` to obtain a composed
 * `DomainProfile` without any persistence, UI, global state, or mutation.
 */
export interface ActiveDomainProfileSource<TItemTypeNodeId extends string = string, TExtension extends object = object> {
  baseProfile: DomainProfile<TItemTypeNodeId, TExtension>;
  overlays?: readonly ProfileOverlay<TItemTypeNodeId>[] | null | undefined;
}

/** A partial overlay that contributes additions/overrides to a base DomainProfile. */
export interface ProfileOverlay<TItemTypeNodeId extends string = string> {
  kind: ProfileOverlayKind;
  id: string;
  /** Ontology nodes to add (ids must not exist in the base). */
  addOntologyNodes?: readonly OntologyNode[] | undefined;
  /** Existing ontology nodes to override by id (full replacement). */
  overrideOntologyNodes?: readonly OntologyNode[] | undefined;
  /** Additional item type node ids to append. */
  addItemTypeNodeIds?: readonly TItemTypeNodeId[] | undefined;
  /** Additional relationship type node ids to append. */
  addRelationshipTypeNodeIds?: readonly string[] | undefined;
  /** Partial labels to override; unspecified keys retain base values. */
  overrideLabels?: DomainLabelOverrides | undefined;
  /** Metadata fields: overrides by id replace the base definition; new ids are appended. */
  overrideMetadataFields?: readonly MetadataFieldDefinition[] | undefined;
  /** Partial graph overrides: nodeColors and relationshipLabels are merged by key. */
  overrideGraph?: GraphProfileOverrides<TItemTypeNodeId> | undefined;
  /** Partial ontology profile overrides (e.g., additional nodes beyond the typed fields). */
  overrideOntology?: Partial<OntologyProfile<TItemTypeNodeId>> | undefined;
}

/**
 * Overlay-like diff language used by suggestions and merge proposals.
 *
 * Unlike ProfileOverlay, this has no branch identity or precedence kind. The
 * proposal review/apply layer decides where the patch goes.
 */
export interface ProfilePatch<TItemTypeNodeId extends string = string> {
  /** Ontology nodes to add (ids must not exist in the target at apply time). */
  addOntologyNodes?: readonly OntologyNode[] | undefined;
  /** Existing ontology nodes to override by id (full replacement). */
  overrideOntologyNodes?: readonly OntologyNode[] | undefined;
  /** Additional item type node ids to append. */
  addItemTypeNodeIds?: readonly TItemTypeNodeId[] | undefined;
  /** Additional relationship type node ids to append. */
  addRelationshipTypeNodeIds?: readonly string[] | undefined;
  /** Partial labels to override; unspecified keys retain target values. */
  overrideLabels?: DomainLabelOverrides | undefined;
  /** Metadata fields: overrides by id replace the target definition; new ids are appended. */
  overrideMetadataFields?: readonly MetadataFieldDefinition[] | undefined;
  /** Partial graph overrides: nodeColors and relationshipLabels are merged by key. */
  overrideGraph?: GraphProfileOverrides<TItemTypeNodeId> | undefined;
  /** Partial ontology profile overrides (e.g., additional nodes beyond the typed fields). */
  overrideOntology?: Partial<OntologyProfile<TItemTypeNodeId>> | undefined;
}

export interface ProfileChangeProposal<TItemTypeNodeId extends string = string> {
  id: string;
  proposalKind: ProfileChangeProposalKind;
  sourceKind: ProfileChangeProposalSourceKind;
  baseProfileId: string;
  sourceBranchId?: string | null | undefined;
  target: ProfileChangeProposalTarget;
  targetProfileVersion?: number | null | undefined;
  targetBranchUpdatedAt?: number | null | undefined;
  evidenceIds: readonly string[];
  patch: ProfilePatch<TItemTypeNodeId>;
  title: string;
  summary: string;
  reason: string;
  riskScore: number;
  semanticConfidence?: number | null | undefined;
  userFitConfidence?: number | null | undefined;
  status: ProfileChangeProposalStatus;
  supersededByProposalId?: string | null | undefined;
  createdAt: number;
  updatedAt: number;
  reviewedAt?: number | null | undefined;
  appliedAt?: number | null | undefined;
}

export type ProfileProposalEventAction =
  | 'applied'
  | 'rejected'
  | 'postponed'
  | 'asked_why'
  | 'superseded';

export type ProfileProposalEventActorKind = 'user' | 'system' | 'model';

export interface ProfileProposalEvent {
  id: string;
  proposalId: string;
  action: ProfileProposalEventAction;
  actorKind: ProfileProposalEventActorKind;
  actorId?: string | null | undefined;
  baseProfileId: string;
  proposalKind: ProfileChangeProposalKind;
  target: ProfileChangeProposalTarget;
  statusBefore: ProfileChangeProposalStatus;
  statusAfter: ProfileChangeProposalStatus;
  proposalUpdatedAtBefore: number;
  proposalUpdatedAtAfter: number;
  branchUpdatedAtBefore?: number | null | undefined;
  branchUpdatedAtAfter?: number | null | undefined;
  reason?: string | null | undefined;
  details?: Record<string, unknown> | null | undefined;
  createdAt: number;
}

export type ProfileTrustMode =
  | 'manual_only'
  | 'suggest_first'
  | 'trusted_low_risk_auto'
  | 'adaptive';

export interface ProfileTrustSetting {
  id: string;
  baseProfileId: string;
  target: ProfileChangeProposalTarget;
  trustMode: ProfileTrustMode;
  autoApplyEnabled: boolean;
  maxAutoApplyRiskScore: number;
  autoApplyProposalKinds: readonly ProfileChangeProposalKind[];
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Profile selection: id-based per-context branch selection.
// ---------------------------------------------------------------------------

/**
 * Represents one caller-owned selection for one context.
 * Stores branch ids (not full branch objects) to keep selections serializable.
 * Order within each kind array matters: later entries win for same-kind conflicts.
 */
export interface ProfileSelection {
  id?: string | undefined;
  baseProfileId: string;
  projectBranchIds?: readonly string[] | undefined;
  learningBranchIds?: readonly string[] | undefined;
  personalBranchIds?: readonly string[] | undefined;
}

// ---------------------------------------------------------------------------
// Profile registry and profile source types
// ---------------------------------------------------------------------------

export interface DomainProfileSummary {
  id: string;
  version: number;
  label: string;
  description: string;
}

export interface ProfileSource<TItemTypeNodeId extends string = string, TExtension extends object = object> {
  id: string;
  getProfile(id: string): DomainProfile<TItemTypeNodeId, TExtension> | null;
  listProfiles(): readonly DomainProfileSummary[];
}

export interface ProfileRegistry<TItemTypeNodeId extends string = string, TExtension extends object = object> {
  getProfile(id: string): DomainProfile<TItemTypeNodeId, TExtension>;
  listProfiles(): readonly DomainProfileSummary[];
}

export type ProfileDefinitionSourceKind = 'built_in' | 'user' | 'imported' | 'adapter';

export interface ProfileDefinition<TItemTypeNodeId extends string = string, TExtension extends object = object> {
  id: string;
  label: string;
  description: string;
  version: number;
  sourceKind: ProfileDefinitionSourceKind;
  profile: DomainProfile<TItemTypeNodeId, TExtension>;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Profile branch store: durable branch layer storage boundary.
// ---------------------------------------------------------------------------

/**
 * Stores and retrieves durable branch layers.
 *
 * The store does not decide which branches are active, compose runtime
 * profiles, own merge semantics, or own UI/MCP/agent state.
 *
 * This is the first in-memory seam only. Persistence adapters can wrap
 * or replace the static implementation later.
 */
export interface ProfileBranchStore<TItemTypeNodeId extends string = string> {
  getBranch(id: string): Promise<ProfileBranch<TItemTypeNodeId> | null>;
  getBranchesByIds(ids: readonly string[]): Promise<ProfileBranch<TItemTypeNodeId>[]>;
  listBranchesForParent(parentProfileId: string): Promise<ProfileBranch<TItemTypeNodeId>[]>;
}

// ---------------------------------------------------------------------------
// Caller/runtime activation input: overlays grouped by source role.
// ---------------------------------------------------------------------------

/**
 * A caller-owned input shape that groups overlays by runtime role.
 * Use this to supply project, learning, and personal overlays separately,
 * then normalize them into an `ActiveDomainProfileSource`.
 */
export interface ActiveDomainProfileActivationInput<TItemTypeNodeId extends string = string, TExtension extends object = object> {
  baseProfile: DomainProfile<TItemTypeNodeId, TExtension>;
  projectOverlays?: readonly ProfileOverlay<TItemTypeNodeId>[] | null | undefined;
  learningOverlays?: readonly ProfileOverlay<TItemTypeNodeId>[] | null | undefined;
  personalOverlays?: readonly ProfileOverlay<TItemTypeNodeId>[] | null | undefined;
}

// ---------------------------------------------------------------------------
// Project-scoped persisted profile selection.
// ---------------------------------------------------------------------------

/**
 * A persisted, project-scoped profile selection record.
 *
 * Wraps a domain `ProfileSelection` (baseProfileId + ordered branch id arrays)
 * in a project context with DB identity and timestamps.
 *
 * V1: one active selection per project. Multiple selections per project are not
 * supported yet; this type stores the full row shape for insert/update/lookup.
 */
export interface ProjectProfileSelection {
  id: string;
  projectId: string;
  selection: ProfileSelection;
  createdAt: number;
  updatedAt: number;
}
