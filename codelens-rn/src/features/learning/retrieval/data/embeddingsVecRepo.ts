import { getRawDb } from '../../../../db/client';
import type { EmbeddingTier, RetrievedMemoryKind } from '../types/retrieval';

export interface VecHit {
  id: string;
  distance: number;
  score: number;
}

export function float32ToBlob(vec: Float32Array): ArrayBuffer {
  const copy = new ArrayBuffer(vec.byteLength);
  new Uint8Array(copy).set(new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength));
  return copy;
}

export async function countHotVectors(): Promise<number> {
  const result = await getRawDb().execute('SELECT COUNT(*) AS n FROM embeddings_vec');
  return Number(result.rows[0]?.n ?? 0);
}

export async function hasVector(ownerId: string): Promise<boolean> {
  const result = await getRawDb().execute(
    'SELECT 1 AS found FROM embeddings_vec WHERE concept_id = ? LIMIT 1',
    [ownerId],
  );
  return result.rows.length > 0;
}

export async function knnSearch(vector: Float32Array, k: number): Promise<VecHit[]> {
  const boundedK = Math.max(1, Math.min(k, 200));
  const result = await getRawDb().execute(
    `SELECT concept_id AS id, distance
     FROM embeddings_vec
     WHERE embedding MATCH ? AND k = ?
     ORDER BY distance
     LIMIT ?`,
    [float32ToBlob(vector), boundedK, boundedK],
  );
  return result.rows
    .map((row) => ({
      id: String(row.id),
      distance: Number(row.distance),
      score: Number.isFinite(Number(row.distance)) ? 1 / (1 + Number(row.distance)) : Number.NaN,
    }))
    .filter((hit) => Number.isFinite(hit.score));
}

export async function upsertEmbeddingVector(input: {
  id: string;
  kind: RetrievedMemoryKind;
  vector: Float32Array;
  model: string;
  api: string;
  signature: string;
  updatedAt: string;
}): Promise<void> {
  const raw = getRawDb();
  await raw.transaction(async (tx) => {
    await tx.execute(
      `INSERT OR REPLACE INTO embeddings_meta (concept_id, model, api, signature, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [input.id, input.model, input.api, input.signature, input.updatedAt],
    );
    await tx.execute('DELETE FROM embeddings_vec WHERE concept_id = ?', [input.id]);
    await tx.execute(
      'INSERT INTO embeddings_vec (concept_id, embedding) VALUES (?, ?)',
      [input.id, float32ToBlob(input.vector)],
    );
    await tx.execute(
      input.kind === 'capture'
        ? `UPDATE learning_captures SET embedding_tier = 'hot' WHERE id = ?`
        : `UPDATE concepts SET embedding_tier = 'hot' WHERE id = ?`,
      [input.id],
    );
  });
}

export async function deleteEmbeddingByOwner(input: {
  id: string;
  kind: RetrievedMemoryKind;
  tier?: EmbeddingTier;
}): Promise<void> {
  const nextTier = input.tier ?? 'cold';
  const raw = getRawDb();
  await raw.transaction(async (tx) => {
    await tx.execute('DELETE FROM embeddings_vec WHERE concept_id = ?', [input.id]);
    await tx.execute('DELETE FROM embeddings_meta WHERE concept_id = ?', [input.id]);
    await tx.execute(
      input.kind === 'capture'
        ? 'UPDATE learning_captures SET embedding_tier = ? WHERE id = ?'
        : 'UPDATE concepts SET embedding_tier = ? WHERE id = ?',
      [nextTier, input.id],
    );
  });
}
