import { z } from 'zod';
import type {
  DomainProfile,
  ProfileDefinition,
  ProfileDefinitionSourceKind,
} from '../types';
import type { profileDefinitions } from '../data/schema';
import { BoundaryRuleSchema, OntologyNodeSchema, MetadataFieldSchema } from './profileBranch';

// ---------------------------------------------------------------------------
// Zod schemas for DomainProfile sub-shapes
// ---------------------------------------------------------------------------

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

const OntologyProfileSchema = z
  .object({
    nodes: z.array(OntologyNodeSchema),
    itemTypeNodeIds: z.array(z.string().min(1)),
    relationshipTypeNodeIds: z.array(z.string().min(1)),
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

const DomainProfileSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().nonnegative(),
    label: z.string(),
    description: z.string(),
    labels: DomainLabelsSchema,
    ontology: OntologyProfileSchema,
    metadataFields: z.array(MetadataFieldSchema),
    extraction: ExtractionProfileSchema,
    embedding: EmbeddingProfileSchema,
    retrieval: RetrievalProfileSchema,
    promotion: PromotionProfileSchema,
    review: ReviewProfileSchema,
    graph: GraphProfileSchema,
  })
  .strict();

const ProfileDefinitionSourceKindEnum = z.enum(['built_in', 'user', 'imported', 'adapter']);

const ProfileDefinitionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    description: z.string(),
    version: z.number().int().nonnegative(),
    sourceKind: ProfileDefinitionSourceKindEnum,
    profile: DomainProfileSchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseProfileJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (cause) {
      throw new Error('Invalid JSON in profile_json', { cause });
    }
  }
  return raw;
}

function validateDefinitionProfileMatch(def: ProfileDefinition): void {
  const p = def.profile;
  if (def.id !== p.id) {
    throw new Error(
      `Profile definition id mismatch: definition.id=${def.id}, profile.id=${p.id}`,
    );
  }
  if (def.label !== p.label) {
    throw new Error(
      `Profile definition label mismatch: definition.label=${def.label}, profile.label=${p.label}`,
    );
  }
  if (def.description !== p.description) {
    throw new Error(
      `Profile definition description mismatch: definition.description=${def.description}, profile.description=${p.description}`,
    );
  }
  if (def.version !== p.version) {
    throw new Error(
      `Profile definition version mismatch: definition.version=${def.version}, profile.version=${p.version}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate and coerce a raw object into a domain ProfileDefinition.
 *
 * - Parses profile_json if it is a string.
 * - Validates the complete DomainProfile shape (strict: rejects unknown keys).
 * - Ensures top-level definition fields match the nested profile fields.
 */
export function validateProfileDefinition(raw: unknown): ProfileDefinition {
  if (raw !== null && typeof raw === 'object' && 'profile' in raw) {
    const profile = (raw as Record<string, unknown>)['profile'];
    if (typeof profile === 'string') {
      const cloned = { ...(raw as Record<string, unknown>), profile: parseProfileJson(profile) };
      const parsed = ProfileDefinitionSchema.parse(cloned) as unknown as ProfileDefinition;
      validateDefinitionProfileMatch(parsed);
      return parsed;
    }
  }
  const parsed = ProfileDefinitionSchema.parse(raw) as unknown as ProfileDefinition;
  validateDefinitionProfileMatch(parsed);
  return parsed;
}

/**
 * Convert a DB row (from Drizzle or backup mapper) into a domain ProfileDefinition.
 *
 * The row may have profile_json as a string or already-parsed object.
 */
export function rowToProfileDefinition(
  row: typeof profileDefinitions.$inferSelect,
): ProfileDefinition {
  const profile = parseProfileJson(row.profileJson);
  const def = ProfileDefinitionSchema.parse({
    id: row.id,
    label: row.label,
    description: row.description,
    version: row.version,
    sourceKind: row.sourceKind,
    profile,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }) as unknown as ProfileDefinition;
  validateDefinitionProfileMatch(def);
  return def;
}

/**
 * Convert a domain ProfileDefinition into a Drizzle insert/update row.
 */
export function profileDefinitionToRow(
  def: ProfileDefinition,
): typeof profileDefinitions.$inferInsert {
  const parsed = ProfileDefinitionSchema.parse(def) as unknown as ProfileDefinition;
  validateDefinitionProfileMatch(parsed);
  return {
    id: parsed.id,
    label: parsed.label,
    description: parsed.description,
    version: parsed.version,
    sourceKind: parsed.sourceKind as ProfileDefinitionSourceKind,
    profileJson: parsed.profile,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}
