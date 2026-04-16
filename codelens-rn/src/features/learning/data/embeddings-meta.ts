import { eq } from 'drizzle-orm';
import { db } from '../client';
import { embeddingsMeta } from '../schema';
import type { ConceptId, Provider } from '../../domain/types';

export interface EmbeddingMetaRow {
  conceptId: ConceptId;
  model: string;
  api: Provider;
  signature: string;
  updatedAt: string;
}

function rowToMeta(row: typeof embeddingsMeta.$inferSelect): EmbeddingMetaRow {
  return {
    conceptId: row.conceptId as ConceptId,
    model: row.model,
    api: row.api as Provider,
    signature: row.signature,
    updatedAt: row.updatedAt,
  };
}

export async function getMetaByConceptId(
  conceptId: ConceptId,
): Promise<EmbeddingMetaRow | undefined> {
  const rows = await db
    .select()
    .from(embeddingsMeta)
    .where(eq(embeddingsMeta.conceptId, conceptId));
  return rows[0] ? rowToMeta(rows[0]) : undefined;
}

export async function upsertMeta(meta: EmbeddingMetaRow): Promise<void> {
  await db
    .insert(embeddingsMeta)
    .values({
      conceptId: meta.conceptId,
      model: meta.model,
      api: meta.api,
      signature: meta.signature,
      updatedAt: meta.updatedAt,
    })
    .onConflictDoUpdate({
      target: embeddingsMeta.conceptId,
      set: {
        model: meta.model,
        api: meta.api,
        signature: meta.signature,
        updatedAt: meta.updatedAt,
      },
    });
}

export async function deleteMeta(conceptId: ConceptId): Promise<void> {
  await db
    .delete(embeddingsMeta)
    .where(eq(embeddingsMeta.conceptId, conceptId));
}

export async function deleteAllMeta(): Promise<void> {
  await db.delete(embeddingsMeta);
}
