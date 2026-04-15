# RAG Pipeline

This is the headline feature. It must be clean, fast, and demonstrably correct.

## The Port

```ts
// src/ports/vector-store.ts
export interface VectorStorePort {
  upsert(input: {
    id: ConceptId;
    vector: Float32Array;
    model: string;
    api: Provider;
    signature: string;
    updatedAt: string;
  }): Promise<void>;

  topMatches(query: TopMatchesQuery): Promise<TopMatch[]>;

  delete(id: ConceptId): Promise<void>;

  deleteAll(): Promise<void>;
}
```

This contract is identical (in spirit) to the legacy `ObjectBoxBridge` contract. **Preserve it.** The whole point of the hexagonal pattern is that this shape never changes — only the adapter swaps.

## The Adapter

`src/adapters/sqlite-vector-store.ts` implements the port using **op-sqlite + sqlite-vec**.

### Schema

```sql
-- standard table for metadata
CREATE TABLE embeddings_meta (
  concept_id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  api TEXT NOT NULL,
  signature TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- vec0 virtual table for the actual vector
CREATE VIRTUAL TABLE embeddings_vec USING vec0(
  concept_id TEXT PRIMARY KEY,
  embedding FLOAT[384]            -- adjust dim to chosen embedding model
);
```

Two tables, one logical store. Wrap inserts/deletes in a transaction so they never drift.

### upsert

```sql
BEGIN;
INSERT OR REPLACE INTO embeddings_meta (concept_id, model, api, signature, updated_at)
  VALUES (?, ?, ?, ?, ?);
INSERT OR REPLACE INTO embeddings_vec (concept_id, embedding)
  VALUES (?, ?);
COMMIT;
```

### topMatches (vector-only)

```sql
SELECT concept_id, distance
FROM embeddings_vec
WHERE embedding MATCH ? AND k = ?
ORDER BY distance;
```

`distance` is L2 in sqlite-vec; convert to cosine via `1 - (distance^2 / 2)` for unit vectors. Always L2-normalize vectors before insert and query so cosine becomes a cheap function of L2 distance.

### topMatches (hybrid — the interesting one)

This is the showcase query. Hybrid retrieval = vector + recency + scope filter, all in one SQL statement:

```sql
WITH vec_hits AS (
  SELECT concept_id, distance
  FROM embeddings_vec
  WHERE embedding MATCH :queryVec AND k = 100
),
joined AS (
  SELECT
    c.id AS concept_id,
    1 - (v.distance * v.distance / 2.0)            AS cosine,
    julianday('now') - julianday(c.updated_at)     AS age_days,
    c.strength                                     AS strength
  FROM vec_hits v
  JOIN concepts c ON c.id = v.concept_id
  WHERE (:scopeId IS NULL OR EXISTS (
    SELECT 1 FROM learning_sessions s
    WHERE s.id = :scopeId
      AND json_extract(s.concept_ids, '$') LIKE '%' || c.id || '%'
  ))
)
SELECT
  concept_id,
  cosine,
  cosine * 0.7
    + (1.0 / (1.0 + age_days / 14.0)) * 0.2
    + strength * 0.1                                AS score
FROM joined
ORDER BY score DESC
LIMIT :limit;
```

Adjust weights as needed; the point is that all of this happens in C, not JS.

### delete / deleteAll

Wrap in a transaction; delete from both tables.

## Embedding Lifecycle

`src/learning/sync.ts`:

```ts
export async function ensureEmbedded(conceptId: ConceptId): Promise<void> {
  const concept = await db.queries.concepts.byId(conceptId);
  const expectedSignature = hashConceptForEmbedding(concept);

  const meta = await db.queries.embeddingsMeta.byConceptId(conceptId);
  if (meta && meta.signature === expectedSignature) return;

  const vector = await aiClient.embed({
    text: buildEmbeddingInput(concept),
    model: chosenEmbeddingModel,
    api: chosenEmbeddingProvider,
  });
  const normalized = l2Normalize(vector);

  await vectorStore.upsert({
    id: conceptId,
    vector: normalized,
    model: chosenEmbeddingModel,
    api: chosenEmbeddingProvider,
    signature: expectedSignature,
    updatedAt: new Date().toISOString(),
  });
}
```

Run on:
- New concept inserted (called from `learning/extract.ts`)
- Concept summary edited
- Backup restored (signatures will differ → re-embed)

## Retrieval At Use Sites

`src/learning/retrieve.ts`:

```ts
export async function retrieveRelatedConcepts(opts: {
  text: string;
  scopeSessionId?: SessionId;
  limit?: number;
}): Promise<TopMatch[]> {
  const query = await aiClient.embed({ text: opts.text, ... });
  return vectorStore.topMatches({
    vector: l2Normalize(query),
    limit: opts.limit ?? 6,
    // hybrid filter applied inside SQL
  });
}
```

Called by:
- Learning review chat (inject related concepts as system context)
- Save-as-learning preview (show "this concept is similar to X — merge?")

## Reset Coherence

There is **one delete path**: `vectorStore.deleteAll()` drops both `embeddings_meta` and `embeddings_vec`. The legacy bug where JS metadata + JS vector cache + native store drifted (see `07-PRESERVE-THESE-BEHAVIORS.md` § Import Sync Reset) cannot happen here because there is one store.

## Picking the Embedding Model

- Default: **`text-embedding-3-small`** via OpenRouter (1536 dims, fast, cheap). Adjust `vec0` dimension accordingly.
- Alt: `BAAI/bge-small-en-v1.5` via SiliconFlow (384 dims, free).
- Make this configurable in settings. Storing the chosen model+api in `embeddings_meta` lets us detect cross-model embeddings and force re-embed if the user switches.
