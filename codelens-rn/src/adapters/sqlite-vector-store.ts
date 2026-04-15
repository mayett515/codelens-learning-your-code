import type { DB } from '@op-engineering/op-sqlite';
import type { VectorStorePort } from '../ports/vector-store';
import type { ConceptId, Provider, TopMatch, TopMatchesQuery } from '../domain/types';

export function makeSqliteVectorStore(rawDb: DB): VectorStorePort {
  return {
    async upsert(input) {
      const vecBlob = float32ToBlob(input.vector);

      await rawDb.transaction(async (tx) => {
        await tx.execute(
          `INSERT OR REPLACE INTO embeddings_meta (concept_id, model, api, signature, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
          [input.id, input.model, input.api, input.signature, input.updatedAt],
        );

        await tx.execute(
          `INSERT OR REPLACE INTO embeddings_vec (concept_id, embedding)
           VALUES (?, ?)`,
          [input.id, vecBlob],
        );
      });
    },

    async topMatches(query: TopMatchesQuery): Promise<TopMatch[]> {
      const vecBlob = float32ToBlob(query.vector);
      const k = query.limit;

      const result = await rawDb.execute(
        `SELECT concept_id, distance
         FROM embeddings_vec
         WHERE embedding MATCH ? AND k = ?
         ORDER BY distance`,
        [vecBlob, k],
      );

      return result.rows.map((row) => {
        const distance = row['distance'] as number;
        const cosine = 1 - (distance * distance) / 2;
        return {
          id: row['concept_id'] as ConceptId,
          cosine,
          score: cosine,
        };
      });
    },

    async delete(id: ConceptId) {
      await rawDb.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM embeddings_meta WHERE concept_id = ?',
          [id],
        );
        await tx.execute(
          'DELETE FROM embeddings_vec WHERE concept_id = ?',
          [id],
        );
      });
    },

    async deleteAll() {
      await rawDb.transaction(async (tx) => {
        await tx.execute('DELETE FROM embeddings_meta');
        await tx.execute('DELETE FROM embeddings_vec');
      });
    },
  };
}

function float32ToBlob(vec: Float32Array): ArrayBuffer {
  const copy = new ArrayBuffer(vec.byteLength);
  new Uint8Array(copy).set(new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength));
  return copy;
}
