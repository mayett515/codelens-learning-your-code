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

type ConceptRow = Omit<typeof concepts.$inferSelect, 'embeddingTier' | 'lastAccessedAt'> &
  Partial<Pick<typeof concepts.$inferSelect, 'embeddingTier' | 'lastAccessedAt'>>;

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
  return {
    id: unsafeConceptId(row.id),
    name: row.name,
    normalizedKey: row.normalizedKey,
    canonicalSummary: row.canonicalSummary,
    conceptType: ConceptTypeEnum.parse(row.conceptType),
    coreConcept: row.coreConcept,
    architecturalPattern: row.architecturalPattern,
    programmingParadigm: row.programmingParadigm,
    languageOrRuntime: LanguageOrRuntimeCodec.parse(parseJson(row.languageOrRuntime, 'language_or_runtime_json')),
    surfaceFeatures: SurfaceFeaturesCodec.parse(parseJson(row.surfaceFeatures, 'surface_features_json')),
    prerequisites: parseConceptIds(row.prerequisites, 'prerequisites_json'),
    relatedConcepts: parseConceptIds(row.relatedConcepts, 'related_concepts_json'),
    contrastConcepts: parseConceptIds(row.contrastConcepts, 'contrast_concepts_json'),
    representativeCaptureIds: parseCaptureIds(row.representativeCaptureIds),
    familiarityScore: z.number().min(0).max(1).parse(row.familiarityScore),
    importanceScore: z.number().min(0).max(1).parse(row.importanceScore),
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
