import { z } from 'zod';
import { MetadataFieldSchema } from '../codecs/profileBranch';

const DomainLabelsSchema = z
  .object({
    hubTitle: z.string(),
    captureSingular: z.string(),
    capturePlural: z.string(),
    itemSingular: z.string(),
    itemPlural: z.string(),
    saveAction: z.string(),
    reviewModeTitle: z.string(),
    strengthLabel: z.string(),
    bodyFieldLabel: z.string(),
    contextFieldLabel: z.string(),
    sourceFieldLabel: z.string(),
    originSectionTitle: z.string(),
    relationshipSectionTitle: z.string(),
    reviewEntryText: z.string(),
    conceptListTitle: z.string(),
    conceptListSortLabel: z.string(),
    conceptListEmptyLabel: z.string(),
    flashback: z.object({
      bannerPrefix: z.string(),
      fallbackTitle: z.string(),
      noMetadataLabel: z.string(),
      savedSectionTitle: z.string(),
      emptyLabel: z.string(),
      unknownDateLabel: z.string(),
      conceptCountTemplate: z.string(),
      conceptCountSingularLabel: z.string(),
      conceptCountPluralLabel: z.string(),
      captureCountTemplate: z.string(),
      captureCountSingularLabel: z.string(),
      captureCountPluralLabel: z.string(),
    }).strict(),
  })
  .strict();

const ExtractionProfileSchema = z
  .object({
    assistantRole: z.string(),
    captureInstructions: z.string(),
    classificationInstructions: z.string(),
  })
  .strict();

const EmbeddingProfileSchema = z
  .object({
    captureTextFields: z.array(z.string()),
    itemTextFields: z.array(z.string()),
  })
  .strict();

const RetrievalProfileSchema = z
  .object({
    defaultHeader: z.string(),
    captureLabel: z.string(),
    itemLabel: z.string(),
    summaryLabel: z.string(),
    languageOrRuntimeLabel: z.string(),
    sourceLabel: z.string(),
  })
  .strict();

const PromotionProfileSchema = z
  .object({
    defaultTypeNodeId: z.string().min(1),
    contextOnlyKeywords: z.array(z.string()),
  })
  .strict();

const ReviewProfileSchema = z
  .object({
    enabledLabel: z.string(),
    weakItemLabel: z.string(),
    thresholdSubtitle: z.string(),
    thresholdCloseLabel: z.string(),
    thresholdEmptyLabel: z.string(),
    reflectPromptTemplate: z.string(),
    reflectSubmitLabel: z.string(),
    reflectErrorLabel: z.string(),
    reflectPlaceholder: z.string(),
    resultSavedLabel: z.string(),
    resultDoneLabel: z.string(),
    resultContinueInChatLabel: z.string(),
    resultOpenItemLabel: z.string(),
    ratePromptTitle: z.string(),
    rateStrongLabel: z.string(),
    ratePartialLabel: z.string(),
    rateWeakLabel: z.string(),
    rateSkipLabel: z.string(),
    revealHideLabel: z.string(),
    revealShowLabel: z.string(),
  })
  .strict();

const GraphProfileSchema = z
  .object({
    nodeColors: z.record(z.string(), z.string()),
    relationshipLabels: z.record(z.string(), z.string()),
    relationshipSectionLabels: z.record(z.string(), z.string()),
    screenTitle: z.string(),
    focusedScreenTitle: z.string(),
    focusedViewLabel: z.string(),
    fullViewLabel: z.string(),
    emptyLabel: z.string(),
    modeLabels: z.record(z.string(), z.string()),
    statusLabels: z.object({
      loading: z.string(),
      unavailable: z.string(),
      retryAction: z.string(),
      emptyBody: z.string(),
      capBannerTemplate: z.string(),
    }).strict(),
    tooltipLabels: z.object({
      neverAccessed: z.string(),
      lastAccessedTemplate: z.string(),
      scoreTemplate: z.string(),
      strengthTemplate: z.string(),
      viewDetailAction: z.string(),
      dayAgoTemplate: z.string(),
      daySingularLabel: z.string(),
      dayPluralLabel: z.string(),
    }).strict(),
    legendHelperLabels: z.object({
      title: z.string(),
      recencyRecent: z.string(),
      recencyModerate: z.string(),
      recencyOld: z.string(),
      recencyStale: z.string(),
      strengthGradient: z.string(),
      strengthSize: z.string(),
    }).strict(),
  })
  .strict();

export const LearningProfileExtensionSchema = z.object({
    labels: DomainLabelsSchema,
    metadataFields: z.array(MetadataFieldSchema),
    extraction: ExtractionProfileSchema,
    embedding: EmbeddingProfileSchema,
    retrieval: RetrievalProfileSchema,
    promotion: PromotionProfileSchema,
    review: ReviewProfileSchema,
    graph: GraphProfileSchema,
}).strict();
