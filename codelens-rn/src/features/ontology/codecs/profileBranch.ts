import { z } from 'zod';
import type {
  MetadataFieldDefinition,
  OntologyNode,
  ProfileBranch,
} from '../types';
import type { profileBranches } from '../data/schema';

// ---------------------------------------------------------------------------
// Zod schemas for overlay and branch validation
// ---------------------------------------------------------------------------

const ProfileOverlayKindEnum = z.enum(['project', 'learning', 'personal']);

export const BoundaryRuleSchema = z
  .object({
    id: z.string().min(1),
    text: z.string(),
    preferNodeId: z.string().min(1).optional(),
    source: z.enum(['profile_seed', 'user_correction', 'checker_suggestion']),
    evidenceIds: z.array(z.string()),
  })
  .strict();

export const OntologyNodeSchema: z.ZodType<OntologyNode> = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    kind: z.enum(['category', 'subcategory', 'tag', 'field', 'relationshipType']),
    parentId: z.string().nullable(),
    meaning: z.string(),
    useWhen: z.array(z.string()),
    doNotUseWhen: z.array(BoundaryRuleSchema),
    examples: z.array(z.string()),
    relatedNodeIds: z.array(z.string()),
    contrastNodeIds: z.array(z.string()),
    status: z.enum(['active', 'suggested', 'deprecated']),
    createdBy: z.enum(['system', 'user', 'model']),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .strict();

export const MetadataFieldSchema: z.ZodType<MetadataFieldDefinition> = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    placeholder: z.string().optional(),
    appliesTo: z.array(z.enum(['capture', 'item'])),
    kind: z.enum(['string', 'stringList', 'number', 'boolean', 'enum', 'date', 'json']),
    required: z.boolean(),
    description: z.string(),
    examples: z.array(z.unknown()),
    enumOptions: z.array(z.object({
      id: z.string().min(1),
      label: z.string(),
      description: z.string().optional(),
    }).strict()).optional(),
  })
  .strict();

const DomainLabelOverridesSchema = z
  .object({
    hubTitle: z.string().optional(),
    captureSingular: z.string().optional(),
    capturePlural: z.string().optional(),
    itemSingular: z.string().optional(),
    itemPlural: z.string().optional(),
    saveAction: z.string().optional(),
    reviewModeTitle: z.string().optional(),
    strengthLabel: z.string().optional(),
    bodyFieldLabel: z.string().optional(),
    contextFieldLabel: z.string().optional(),
    sourceFieldLabel: z.string().optional(),
    originSectionTitle: z.string().optional(),
    relationshipSectionTitle: z.string().optional(),
    reviewEntryText: z.string().optional(),
    conceptListTitle: z.string().optional(),
    conceptListSortLabel: z.string().optional(),
    conceptListEmptyLabel: z.string().optional(),
    flashback: z.object({
      bannerPrefix: z.string().optional(),
      fallbackTitle: z.string().optional(),
      noMetadataLabel: z.string().optional(),
      savedSectionTitle: z.string().optional(),
      emptyLabel: z.string().optional(),
      unknownDateLabel: z.string().optional(),
      conceptCountTemplate: z.string().optional(),
      conceptCountSingularLabel: z.string().optional(),
      conceptCountPluralLabel: z.string().optional(),
      captureCountTemplate: z.string().optional(),
      captureCountSingularLabel: z.string().optional(),
      captureCountPluralLabel: z.string().optional(),
    }).strict().optional(),
  })
  .strict();

const StringRecordSchema = z.record(z.string(), z.string());

const GraphProfileOverridesSchema = z
  .object({
    nodeColors: StringRecordSchema.optional(),
    relationshipLabels: StringRecordSchema.optional(),
    relationshipSectionLabels: StringRecordSchema.optional(),
    screenTitle: z.string().optional(),
    focusedScreenTitle: z.string().optional(),
    focusedViewLabel: z.string().optional(),
    fullViewLabel: z.string().optional(),
    emptyLabel: z.string().optional(),
    modeLabels: StringRecordSchema.optional(),
    statusLabels: z.object({
      loading: z.string().optional(),
      unavailable: z.string().optional(),
      retryAction: z.string().optional(),
      emptyBody: z.string().optional(),
      capBannerTemplate: z.string().optional(),
    }).strict().optional(),
    tooltipLabels: z.object({
      neverAccessed: z.string().optional(),
      lastAccessedTemplate: z.string().optional(),
      scoreTemplate: z.string().optional(),
      strengthTemplate: z.string().optional(),
      viewDetailAction: z.string().optional(),
      dayAgoTemplate: z.string().optional(),
      daySingularLabel: z.string().optional(),
      dayPluralLabel: z.string().optional(),
    }).strict().optional(),
    legendHelperLabels: z.object({
      title: z.string().optional(),
      recencyRecent: z.string().optional(),
      recencyModerate: z.string().optional(),
      recencyOld: z.string().optional(),
      recencyStale: z.string().optional(),
      strengthGradient: z.string().optional(),
      strengthSize: z.string().optional(),
    }).strict().optional(),
  })
  .strict();

const OntologyProfileOverrideSchema = z
  .object({
    nodes: z.array(OntologyNodeSchema).optional(),
    itemTypeNodeIds: z.array(z.string().min(1)).optional(),
    relationshipTypeNodeIds: z.array(z.string().min(1)).optional(),
  })
  .strict();

const ProfileOverlaySchema = z
  .object({
    kind: ProfileOverlayKindEnum,
    id: z.string().min(1),
    addOntologyNodes: z.array(OntologyNodeSchema).optional(),
    overrideOntologyNodes: z.array(OntologyNodeSchema).optional(),
    addItemTypeNodeIds: z.array(z.string().min(1)).optional(),
    addRelationshipTypeNodeIds: z.array(z.string().min(1)).optional(),
    overrideLabels: DomainLabelOverridesSchema.optional(),
    overrideMetadataFields: z.array(MetadataFieldSchema).optional(),
    overrideGraph: GraphProfileOverridesSchema.optional(),
    overrideOntology: OntologyProfileOverrideSchema.optional(),
  })
  .strict();

const ProfileBranchSchema = z
  .object({
    id: z.string().min(1),
    parentProfileId: z.string().min(1),
    branchKind: ProfileOverlayKindEnum,
    name: z.string().min(1),
    overlay: ProfileOverlaySchema,
    createdAt: z.number().int().nonnegative(),
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOverlayJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (cause) {
      throw new Error('Invalid JSON in overlay_json', { cause });
    }
  }
  return raw;
}

function validateKindMatch(branch: ProfileBranch): void {
  if (branch.branchKind !== branch.overlay.kind) {
    throw new Error(
      `Branch kind mismatch: branchKind=${branch.branchKind}, overlay.kind=${branch.overlay.kind}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate and coerce a raw object into a domain ProfileBranch.
 *
 * - Parses overlay_json if it is a string.
 * - Validates top-level overlay fields (strict: rejects unknown keys).
 * - Ensures branchKind === overlay.kind.
 */
export function validateProfileBranch(raw: unknown): ProfileBranch {
  if (raw !== null && typeof raw === 'object' && 'overlay' in raw) {
    const overlay = (raw as Record<string, unknown>)['overlay'];
    if (typeof overlay === 'string') {
      const cloned = { ...(raw as Record<string, unknown>), overlay: parseOverlayJson(overlay) };
      const parsed = ProfileBranchSchema.parse(cloned) as unknown as ProfileBranch;
      validateKindMatch(parsed);
      return parsed;
    }
  }
  const parsed = ProfileBranchSchema.parse(raw) as unknown as ProfileBranch;
  validateKindMatch(parsed);
  return parsed;
}

/**
 * Convert a DB row (from Drizzle or backup mapper) into a domain ProfileBranch.
 *
 * The row may have overlay_json as a string or already-parsed object.
 */
export function rowToProfileBranch(
  row: typeof profileBranches.$inferSelect,
): ProfileBranch {
  const overlay = parseOverlayJson(row.overlayJson);
  const branch = ProfileBranchSchema.parse({
    id: row.id,
    parentProfileId: row.parentProfileId,
    branchKind: row.branchKind,
    name: row.name,
    overlay,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }) as unknown as ProfileBranch;
  validateKindMatch(branch);
  return branch;
}

/**
 * Convert a domain ProfileBranch into a Drizzle insert/update row.
 */
export function profileBranchToRow(
  branch: ProfileBranch,
): typeof profileBranches.$inferInsert {
  const parsed = ProfileBranchSchema.parse(branch) as unknown as ProfileBranch;
  validateKindMatch(parsed);
  return {
    id: parsed.id,
    parentProfileId: parsed.parentProfileId,
    branchKind: parsed.branchKind,
    name: parsed.name,
    overlayJson: parsed.overlay,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
  };
}
