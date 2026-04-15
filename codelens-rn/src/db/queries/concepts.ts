import { eq } from 'drizzle-orm';
import { db } from '../client';
import { concepts } from '../schema';
import type {
  Concept,
  ConceptId,
  ConceptTaxonomy,
  SessionId,
} from '../../domain/types';

function rowToConcept(row: typeof concepts.$inferSelect): Concept {
  return {
    id: row.id as ConceptId,
    name: row.name,
    summary: row.summary,
    taxonomy: (row.taxonomy ?? { tags: [] }) as ConceptTaxonomy,
    sessionIds: (row.sessionIds ?? []) as SessionId[],
    strength: row.strength,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getAllConcepts(): Promise<Concept[]> {
  const rows = await db.select().from(concepts);
  return rows.map(rowToConcept);
}

export async function getConceptById(
  id: ConceptId,
): Promise<Concept | undefined> {
  const rows = await db.select().from(concepts).where(eq(concepts.id, id));
  return rows[0] ? rowToConcept(rows[0]) : undefined;
}

export async function insertConcept(concept: Concept): Promise<void> {
  await db.insert(concepts).values({
    id: concept.id,
    name: concept.name,
    summary: concept.summary,
    taxonomy: concept.taxonomy as any,
    sessionIds: concept.sessionIds as any,
    strength: concept.strength,
    createdAt: concept.createdAt,
    updatedAt: concept.updatedAt,
  });
}

export async function updateConcept(
  id: ConceptId,
  data: Partial<Pick<Concept, 'name' | 'summary' | 'taxonomy' | 'strength' | 'sessionIds' | 'updatedAt'>>,
): Promise<void> {
  const values: Record<string, unknown> = {};
  if (data.name !== undefined) values.name = data.name;
  if (data.summary !== undefined) values.summary = data.summary;
  if (data.taxonomy !== undefined) values.taxonomy = data.taxonomy;
  if (data.strength !== undefined) values.strength = data.strength;
  if (data.sessionIds !== undefined) values.sessionIds = data.sessionIds;
  if (data.updatedAt !== undefined) values.updatedAt = data.updatedAt;
  await db.update(concepts).set(values).where(eq(concepts.id, id));
}

export async function deleteConcept(id: ConceptId): Promise<void> {
  await db.delete(concepts).where(eq(concepts.id, id));
}
