import { eq } from 'drizzle-orm';
import { db, type DbOrTx } from '../../../db/client';
import { concepts } from './schema';
import { conceptRowToDomain, normalizeConceptKey, validateConceptForWrite } from '../codecs/concept';
import { sortConceptsForHub } from './hubOrdering';
import type { LearningConcept } from '../types/learning';
import { isConceptId, type ConceptId } from '../types/ids';

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

export async function insertLearningConcept(
  concept: LearningConcept,
  executor: DbOrTx = db,
): Promise<void> {
  const validConcept = validateConceptForWrite(concept);
  await executor.insert(concepts).values({
    id: validConcept.id,
    name: validConcept.name,
    summary: validConcept.canonicalSummary ?? '',
    normalizedKey: validConcept.normalizedKey,
    canonicalSummary: validConcept.canonicalSummary,
    conceptType: validConcept.conceptType,
    coreConcept: validConcept.coreConcept,
    architecturalPattern: validConcept.architecturalPattern,
    programmingParadigm: validConcept.programmingParadigm,
    languageOrRuntime: validConcept.languageOrRuntime,
    surfaceFeatures: validConcept.surfaceFeatures,
    prerequisites: validConcept.prerequisites,
    relatedConcepts: validConcept.relatedConcepts,
    contrastConcepts: validConcept.contrastConcepts,
    representativeCaptureIds: validConcept.representativeCaptureIds,
    familiarityScore: validConcept.familiarityScore,
    importanceScore: validConcept.importanceScore,
    createdAt: toIso(validConcept.createdAt),
    updatedAt: toIso(validConcept.updatedAt),
  });
}

export async function getLearningConceptById(
  id: ConceptId,
  executor: DbOrTx = db,
): Promise<LearningConcept | undefined> {
  const rows = await executor.select().from(concepts).where(eq(concepts.id, id));
  return rows[0] ? conceptRowToDomain(rows[0]) : undefined;
}

export async function getLearningConceptByNormalizedKey(
  normalizedKey: string,
  executor: DbOrTx = db,
): Promise<LearningConcept | undefined> {
  const rows = await executor
    .select()
    .from(concepts)
    .where(eq(concepts.normalizedKey, normalizeConceptKey(normalizedKey)));
  const stageOneRow = rows.find((row) => isConceptId(row.id));
  return stageOneRow ? conceptRowToDomain(stageOneRow) : undefined;
}

export async function getLearningConceptList(
  executor: DbOrTx = db,
): Promise<LearningConcept[]> {
  const rows = await executor.select().from(concepts);
  const stageOneRows = rows.filter((row) => isConceptId(row.id));
  return sortConceptsForHub(stageOneRows.map(conceptRowToDomain));
}

export async function getKnowledgeHealthConcepts(
  executor: DbOrTx = db,
): Promise<LearningConcept[]> {
  return getLearningConceptList(executor);
}

export async function appendConceptLanguage(
  id: ConceptId,
  language: string,
  executor: DbOrTx = db,
): Promise<void> {
  const concept = await getLearningConceptById(id, executor);
  if (!concept) throw new Error(`Cannot append language for missing concept: ${id}`);

  const normalizedLanguage = language.trim();
  if (!normalizedLanguage) return;

  const existing = new Set(concept.languageOrRuntime.map((value) => value.toLowerCase()));
  if (existing.has(normalizedLanguage.toLowerCase())) return;

  await executor
    .update(concepts)
    .set({
      languageOrRuntime: [...concept.languageOrRuntime, normalizedLanguage],
      updatedAt: toIso(Date.now()),
    })
    .where(eq(concepts.id, id));
}

export async function appendConceptSurfaceFeatures(
  id: ConceptId,
  surfaceFeatures: string[],
  executor: DbOrTx = db,
): Promise<void> {
  const concept = await getLearningConceptById(id, executor);
  if (!concept) throw new Error(`Cannot append surface features for missing concept: ${id}`);

  const existing = new Set(concept.surfaceFeatures.map((value) => value.toLowerCase()));
  const next = [...concept.surfaceFeatures];
  for (const feature of surfaceFeatures) {
    const normalized = feature.trim();
    if (!normalized || existing.has(normalized.toLowerCase())) continue;
    existing.add(normalized.toLowerCase());
    next.push(normalized);
  }
  if (next.length === concept.surfaceFeatures.length) return;

  await executor
    .update(concepts)
    .set({
      surfaceFeatures: next,
      updatedAt: toIso(Date.now()),
    })
    .where(eq(concepts.id, id));
}

export async function updateConceptFamiliarity(
  id: ConceptId,
  familiarityScore: number,
  updatedAt: number,
  executor: DbOrTx = db,
): Promise<void> {
  await executor
    .update(concepts)
    .set({
      familiarityScore,
      updatedAt: toIso(updatedAt),
    })
    .where(eq(concepts.id, id));
}
