import type { DomainProfile, ProfileDefinition } from '../types';

// Optional CodeLens learning/presentation contract. No field here is required by
// the semantic profile. Existing bundled profiles retain this complete extension.
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

export interface LearningProfileExtension<TItemTypeNodeId extends string = string> {
  labels: DomainLabels;
  metadataFields: readonly MetadataFieldDefinition[];
  extraction: ExtractionProfile;
  embedding: EmbeddingProfile;
  retrieval: RetrievalProfile;
  promotion: PromotionProfile<TItemTypeNodeId>;
  review: ReviewProfile;
  graph: GraphProfile<TItemTypeNodeId>;
}

export type LearningDomainProfile<TItemTypeNodeId extends string = string> =
  DomainProfile<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
export type LearningProfileDefinition<TItemTypeNodeId extends string = string> =
  ProfileDefinition<TItemTypeNodeId, LearningProfileExtension<TItemTypeNodeId>>;
