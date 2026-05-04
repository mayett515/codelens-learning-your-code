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
