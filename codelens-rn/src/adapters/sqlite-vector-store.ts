import type { DB } from '@op-engineering/op-sqlite';
import type { VectorStorePort } from '../ports/vector-store';
import type { ConceptId, TopMatch, TopMatchesQuery } from '../domain/types';

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
          `DELETE FROM embeddings_vec WHERE concept_id = ?`,
          [input.id],
        );

        await tx.execute(
          `INSERT INTO embeddings_vec (concept_id, embedding)
           VALUES (?, ?)`,
          [input.id, vecBlob],
        );

        if (String(input.id).startsWith('lc_')) {
          await tx.execute(
            `UPDATE learning_captures
             SET embedding_tier = 'hot', updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
             WHERE id = ?`,
            [input.id],
          );
        } else if (String(input.id).startsWith('c_')) {
          await tx.execute(
            `UPDATE concepts
             SET embedding_tier = 'hot', updated_at = datetime('now')
             WHERE id = ?`,
            [input.id],
          );
        }
      });
    },

    async topMatches(query: TopMatchesQuery): Promise<TopMatch[]> {
      const vecBlob = float32ToBlob(query.vector);
      const vecK = query.candidateIds ? 100 : Math.min(query.limit * 3, 100);

      const vecResult = await rawDb.execute(
        `SELECT concept_id, distance
         FROM embeddings_vec
         WHERE embedding MATCH ? AND k = ?
         ORDER BY distance`,
        [vecBlob, vecK],
      );

      if (vecResult.rows.length === 0) return [];

      const vecHits = vecResult.rows.map((row) => ({
        id: row['concept_id'] as ConceptId,
        distance: row['distance'] as number,
      }));

      const ids = vecHits.map((h) => h.id);
      const placeholders = ids.map(() => '?').join(',');
      const conceptResult = await rawDb.execute(
        `SELECT id, strength, updated_at FROM concepts WHERE id IN (${placeholders})`,
        ids,
      );

      const conceptMap = new Map<string, { strength: number; updatedAt: string }>();
      for (const row of conceptResult.rows) {
        conceptMap.set(row['id'] as string, {
          strength: row['strength'] as number,
          updatedAt: row['updated_at'] as string,
        });
      }

      const now = Date.now();
      const candidateSet = query.candidateIds
        ? new Set<string>(query.candidateIds)
        : null;

      const results: TopMatch[] = [];

      for (const hit of vecHits) {
        if (candidateSet && !candidateSet.has(hit.id)) continue;

        const cosine = 1 - (hit.distance * hit.distance) / 2;
        const concept = conceptMap.get(hit.id);
        const strength = concept?.strength ?? 0.5;
        const daysSince = concept?.updatedAt
          ? (now - new Date(concept.updatedAt).getTime()) / 86_400_000
          : 30;
        const recency = 1 / (1 + daysSince / 30);

        results.push({
          id: hit.id,
          cosine,
          score: cosine * 0.7 + recency * 0.2 + strength * 0.1,
        });
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, query.limit);
    },

    async delete(id) {
      await rawDb.transaction(async (tx) => {
        await tx.execute(
          'DELETE FROM embeddings_meta WHERE concept_id = ?',
          [id],
        );
        await tx.execute(
          'DELETE FROM embeddings_vec WHERE concept_id = ?',
          [id],
        );
        if (String(id).startsWith('lc_')) {
          await tx.execute(`UPDATE learning_captures SET embedding_tier = 'cold' WHERE id = ?`, [id]);
        } else if (String(id).startsWith('c_')) {
          await tx.execute(`UPDATE concepts SET embedding_tier = 'cold' WHERE id = ?`, [id]);
        }
      });
    },

    async deleteAll() {
      await rawDb.transaction(async (tx) => {
        await tx.execute('DELETE FROM embeddings_meta');
        await tx.execute('DELETE FROM embeddings_vec');
        await tx.execute(`UPDATE learning_captures SET embedding_tier = 'cold'`);
        await tx.execute(`UPDATE concepts SET embedding_tier = 'cold'`);
      });
    },
  };
}

function float32ToBlob(vec: Float32Array): ArrayBuffer {
  const copy = new ArrayBuffer(vec.byteLength);
  new Uint8Array(copy).set(new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength));
  return copy;
}
