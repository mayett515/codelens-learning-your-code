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

export interface DomainLabels {
  hubTitle: string;
  captureSingular: string;
  capturePlural: string;
  itemSingular: string;
  itemPlural: string;
  saveAction: string;
  reviewModeTitle: string;
  strengthLabel: string;
  bodyFieldLabel: string;
  contextFieldLabel: string;
  sourceFieldLabel: string;
  originSectionTitle: string;
  relationshipSectionTitle: string;
  reviewEntryText: string;
  conceptListTitle: string;
  conceptListSortLabel: string;
  conceptListEmptyLabel: string;
  flashback: {
    bannerPrefix: string;
    fallbackTitle: string;
    noMetadataLabel: string;
    savedSectionTitle: string;
    emptyLabel: string;
    unknownDateLabel: string;
    conceptCountTemplate: string;
    conceptCountSingularLabel: string;
    conceptCountPluralLabel: string;
    captureCountTemplate: string;
    captureCountSingularLabel: string;
    captureCountPluralLabel: string;
  };
}

export interface MetadataFieldDefinition {
  id: string;
  label: string;
  placeholder?: string | undefined;
  appliesTo: ReadonlyArray<'capture' | 'item'>;
  kind: 'string' | 'stringList' | 'number' | 'boolean' | 'enum' | 'date' | 'json';
  required: boolean;
  description: string;
  examples: readonly unknown[];
  enumOptions?: ReadonlyArray<{ id: string; label: string; description?: string | undefined }> | undefined;
}

export interface ExtractionProfile {
  assistantRole: string;
  captureInstructions: string;
  classificationInstructions: string;
}

export interface EmbeddingProfile {
  captureTextFields: readonly string[];
  itemTextFields: readonly string[];
}

export interface RetrievalProfile {
  defaultHeader: string;
  captureLabel: string;
  itemLabel: string;
  summaryLabel: string;
  languageOrRuntimeLabel: string;
  sourceLabel: string;
}

export interface PromotionProfile<TItemTypeNodeId extends string = string> {
  defaultTypeNodeId: TItemTypeNodeId;
  contextOnlyKeywords: readonly string[];
}

export interface ReviewProfile {
  enabledLabel: string;
  weakItemLabel: string;
  thresholdSubtitle: string;
  thresholdCloseLabel: string;
  thresholdEmptyLabel: string;
  reflectPromptTemplate: string;
  reflectSubmitLabel: string;
  reflectErrorLabel: string;
  reflectPlaceholder: string;
  resultSavedLabel: string;
  resultDoneLabel: string;
  resultContinueInChatLabel: string;
  resultOpenItemLabel: string;
  ratePromptTitle: string;
  rateStrongLabel: string;
  ratePartialLabel: string;
  rateWeakLabel: string;
  rateSkipLabel: string;
  revealHideLabel: string;
  revealShowLabel: string;
}

export interface GraphProfile<TItemTypeNodeId extends string = string> {
  nodeColors: Readonly<Record<TItemTypeNodeId, string>>;
  relationshipLabels: Readonly<Record<string, string>>;
  relationshipSectionLabels: Readonly<Record<string, string>>;
  screenTitle: string;
  focusedScreenTitle: string;
  focusedViewLabel: string;
  fullViewLabel: string;
  emptyLabel: string;
  modeLabels: Readonly<Record<string, string>>;
  statusLabels: {
    loading: string;
    unavailable: string;
    retryAction: string;
    emptyBody: string;
    capBannerTemplate: string;
  };
  tooltipLabels: {
    neverAccessed: string;
    lastAccessedTemplate: string;
    scoreTemplate: string;
    strengthTemplate: string;
    viewDetailAction: string;
    dayAgoTemplate: string;
    daySingularLabel: string;
    dayPluralLabel: string;
  };
  legendHelperLabels: {
    title: string;
    recencyRecent: string;
    recencyModerate: string;
    recencyOld: string;
    recencyStale: string;
    strengthGradient: string;
    strengthSize: string;
  };
}

export type OntologyCorrectionSubjectKind = 'capture' | 'item';
export type OntologyCorrectionField = 'typeNodeId';
export type OntologyCorrectionSource = 'user';

export interface OntologyCorrectionEvidence {
  id: string;
  profileId: string;
  subjectKind: OntologyCorrectionSubjectKind;
  subjectId: string;
  field: OntologyCorrectionField;
  previousTypeNodeId: string | null;
  correctedTypeNodeId: string;
  reason?: string | null | undefined;
  source: OntologyCorrectionSource;
  createdAt: number;
}

export interface OntologyProfile<TItemTypeNodeId extends string = string> {
  nodes: readonly OntologyNode[];
  itemTypeNodeIds: readonly TItemTypeNodeId[];
  relationshipTypeNodeIds: readonly string[];
}

export interface DomainProfile<TItemTypeNodeId extends string = string> {
  id: string;
  version: number;
  label: string;
  description: string;
  labels: DomainLabels;
  ontology: OntologyProfile<TItemTypeNodeId>;
  metadataFields: readonly MetadataFieldDefinition[];
  extraction: ExtractionProfile;
  embedding: EmbeddingProfile;
  retrieval: RetrievalProfile;
  promotion: PromotionProfile<TItemTypeNodeId>;
  review: ReviewProfile;
  graph: GraphProfile<TItemTypeNodeId>;
}

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

export type DomainLabelOverrides = Partial<Omit<DomainLabels, 'flashback'>> & {
  flashback?: Partial<DomainLabels['flashback']> | undefined;
};

export type GraphProfileOverrides<TItemTypeNodeId extends string = string> = Partial<
  Omit<
    GraphProfile<TItemTypeNodeId>,
    | 'nodeColors'
    | 'relationshipLabels'
    | 'relationshipSectionLabels'
    | 'modeLabels'
    | 'statusLabels'
    | 'tooltipLabels'
    | 'legendHelperLabels'
  >
> & {
  nodeColors?: Partial<Record<TItemTypeNodeId, string>> | undefined;
  relationshipLabels?: Record<string, string> | undefined;
  relationshipSectionLabels?: Record<string, string> | undefined;
  modeLabels?: Record<string, string> | undefined;
  statusLabels?: Partial<GraphProfile<TItemTypeNodeId>['statusLabels']> | undefined;
  tooltipLabels?: Partial<GraphProfile<TItemTypeNodeId>['tooltipLabels']> | undefined;
  legendHelperLabels?: Partial<GraphProfile<TItemTypeNodeId>['legendHelperLabels']> | undefined;
};

// ---------------------------------------------------------------------------
// Active profile source: an explicit, caller-owned bundle of base + overlays.
// ---------------------------------------------------------------------------

/**
 * A structured source for resolving an active domain profile.
 * Callers pass this to `resolveActiveDomainProfile` to obtain a composed
 * `DomainProfile` without any persistence, UI, global state, or mutation.
 */
export interface ActiveDomainProfileSource<TItemTypeNodeId extends string = string> {
  baseProfile: DomainProfile<TItemTypeNodeId>;
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

export interface ProfileSource<TItemTypeNodeId extends string = string> {
  id: string;
  getProfile(id: string): DomainProfile<TItemTypeNodeId> | null;
  listProfiles(): readonly DomainProfileSummary[];
}

export interface ProfileRegistry<TItemTypeNodeId extends string = string> {
  getProfile(id: string): DomainProfile<TItemTypeNodeId>;
  listProfiles(): readonly DomainProfileSummary[];
}

export type ProfileDefinitionSourceKind = 'built_in' | 'user' | 'imported' | 'adapter';

export interface ProfileDefinition<TItemTypeNodeId extends string = string> {
  id: string;
  label: string;
  description: string;
  version: number;
  sourceKind: ProfileDefinitionSourceKind;
  profile: DomainProfile<TItemTypeNodeId>;
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
export interface ActiveDomainProfileActivationInput<TItemTypeNodeId extends string = string> {
  baseProfile: DomainProfile<TItemTypeNodeId>;
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
