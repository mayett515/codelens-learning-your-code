import { z } from 'zod';
import { concepts } from '../data/schema';
import { CONCEPT_TYPES } from '../types/learning';
import { isConceptId, isLearningCaptureId, unsafeConceptId } from '../types/ids';
import type { ConceptId, LearningCaptureId } from '../types/ids';
import type { LearningConcept } from '../types/learning';

export const ConceptTypeEnum = z.enum(CONCEPT_TYPES);
export const LanguageOrRuntimeCodec = z.array(z.string()).default([]);
export const SurfaceFeaturesCodec = z.array(z.string()).default([]);
export const ConceptIdArrayCodec = z.array(z.string().refine(isConceptId)).default([]);
export const RepresentativeCaptureIdsCodec = z.array(z.string().refine(isLearningCaptureId)).default([]);

type ConceptRow = Omit<typeof concepts.$inferSelect, 'embeddingTier' | 'lastAccessedAt' | 'profileId' | 'typeNodeId' | 'metadataJson'> &
  Partial<Pick<typeof concepts.$inferSelect, 'embeddingTier' | 'lastAccessedAt' | 'profileId' | 'typeNodeId' | 'metadataJson'>>;

export interface ConceptMetadata {
  coreConcept?: string | null;
  architecturalPattern?: string | null;
  programmingParadigm?: string | null;
}

// Returns string if the key exists with a string value, null if the key exists
// with a null value, or undefined if the key is absent or has an invalid type.
// Unknown keys are ignored; callers only request the keys they know about.
function extractMetadataField(
  obj: Record<string, unknown>,
  key: string,
): string | null | undefined {
  if (!(key in obj)) return undefined;
  const val = obj[key];
  if (val === null) return null;
  if (typeof val === 'string') return val;
  return undefined; // number, boolean, object: fall back to legacy column
}

export function parseMetadataJson(raw: unknown): ConceptMetadata {
  let obj: Record<string, unknown>;

  if (raw === null || raw === undefined) return {};
  if (typeof raw === 'string') {
    if (raw === '' || raw === '{}') return {};
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return {}; }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    obj = parsed as Record<string, unknown>;
  } else if (typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    return {};
  }

  const result: ConceptMetadata = {};
  const coreConcept = extractMetadataField(obj, 'coreConcept');
  if (coreConcept !== undefined) result.coreConcept = coreConcept;
  const architecturalPattern = extractMetadataField(obj, 'architecturalPattern');
  if (architecturalPattern !== undefined) result.architecturalPattern = architecturalPattern;
  const programmingParadigm = extractMetadataField(obj, 'programmingParadigm');
  if (programmingParadigm !== undefined) result.programmingParadigm = programmingParadigm;
  return result;
}

function resolveMetadataField(
  metadataValue: string | null | undefined,
  legacyValue: string | null | undefined,
): string | null {
  if (metadataValue !== undefined) return metadataValue;
  return legacyValue ?? null;
}

function parseJson(raw: unknown, columnName: string): unknown {
  if (typeof raw === 'string') return JSON.parse(raw);
  if (raw === undefined) {
    throw new Error(`Missing JSON column ${columnName}`);
  }
  return raw;
}

function parseConceptIds(raw: unknown, columnName: string): ConceptId[] {
  return ConceptIdArrayCodec.parse(parseJson(raw, columnName)) as ConceptId[];
}

function parseCaptureIds(raw: unknown): LearningCaptureId[] {
  return RepresentativeCaptureIdsCodec.parse(
    parseJson(raw, 'representative_capture_ids_json'),
  ) as LearningCaptureId[];
}

export function conceptRowToDomain(row: ConceptRow): LearningConcept {
  const metadata = parseMetadataJson(row.metadataJson);
  const typeNodeId = row.typeNodeId ?? '';

  return {
    id: unsafeConceptId(row.id),
    name: row.name,
    normalizedKey: row.normalizedKey,
    canonicalSummary: row.canonicalSummary,
    conceptType: typeNodeId !== ''
      ? ConceptTypeEnum.parse(typeNodeId)
      : ConceptTypeEnum.parse(row.conceptType),
    coreConcept: resolveMetadataField(metadata.coreConcept, row.coreConcept),
    architecturalPattern: resolveMetadataField(metadata.architecturalPattern, row.architecturalPattern),
    programmingParadigm: resolveMetadataField(metadata.programmingParadigm, row.programmingParadigm),
    languageOrRuntime: LanguageOrRuntimeCodec.parse(parseJson(row.languageOrRuntime, 'language_or_runtime_json')),
    surfaceFeatures: SurfaceFeaturesCodec.parse(parseJson(row.surfaceFeatures, 'surface_features_json')),
    prerequisites: parseConceptIds(row.prerequisites, 'prerequisites_json'),
    relatedConcepts: parseConceptIds(row.relatedConcepts, 'related_concepts_json'),
    contrastConcepts: parseConceptIds(row.contrastConcepts, 'contrast_concepts_json'),
    representativeCaptureIds: parseCaptureIds(row.representativeCaptureIds),
    familiarityScore: z.number().min(0).max(1).parse(row.familiarityScore),
    importanceScore: z.number().min(0).max(1).parse(row.importanceScore),
    lastAccessedAt: row.lastAccessedAt ?? null,
    createdAt: Date.parse(row.createdAt),
    updatedAt: Date.parse(row.updatedAt),
  };
}

export function normalizeConceptKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validateConceptForWrite(concept: LearningConcept): LearningConcept {
  if (!isConceptId(concept.id)) throw new Error(`Invalid concept id: ${concept.id}`);
  ConceptTypeEnum.parse(concept.conceptType);
  LanguageOrRuntimeCodec.parse(concept.languageOrRuntime);
  SurfaceFeaturesCodec.parse(concept.surfaceFeatures);
  ConceptIdArrayCodec.parse(concept.prerequisites);
  ConceptIdArrayCodec.parse(concept.relatedConcepts);
  ConceptIdArrayCodec.parse(concept.contrastConcepts);
  RepresentativeCaptureIdsCodec.parse(concept.representativeCaptureIds);
  z.number().min(0).max(1).parse(concept.familiarityScore);
  z.number().min(0).max(1).parse(concept.importanceScore);
  return concept;
}
