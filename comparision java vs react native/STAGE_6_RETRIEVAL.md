# Stage 6 — Retrieval

> Builds on Stage 1 schemas, Stage 2 save flow, Stage 3 cards, Stage 4 Hub, Stage 5 promotion.
> Defines the hybrid retrieval engine: FTS5 + sqlite-vec, hot/cold tier with JIT rehydration, ranking, and injection contracts.
> Codex-implementable. This is engine + data contract only. UI for memory injection is Stage 7.

---

## Required Reading

Before implementing this stage, read:

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. `CODELENS_MASTER_PLAN.md`
4. `STAGE_1_DATA_FOUNDATION.md`
5. `STAGE_2_EXTRACTOR_AND_SAVE_FLOW.md`
6. `STAGE_3_CARD_COMPONENTS.md`
7. `STAGE_4_LEARNING_HUB_SURFACES.md`
8. `STAGE_5_PROMOTION_SYSTEM.md`
9. This file

If there is a conflict:
- Regression Guard wins for product safety.
- Stage 1 wins for schema/source-of-truth fields.
- Stage 2 wins for save-flow data contract.
- Stage 5 wins for promotion-time concept fields.
- This file wins for retrieval engine and injection contracts.

---

## Scope

### In scope

- Hybrid retrieval engine over `learning_captures` and `concepts`
- FTS5 virtual tables and trigger sync
- sqlite-vec integration with explicit hot/cold tier model
- Vector GC policy (eviction by strength + recency at the 5,000-vector threshold)
- JIT rehydration of cold items on access
- Reciprocal Rank Fusion across vec and FTS5 results
- Secondary ranking factors (recency, computed strength)
- Filters: state, session, language, concept_type, time window, derived chain membership
- Token-budgeted injection contract for chat memory
- Heterogeneous result type (`RetrievedMemory` = capture OR concept)
- TanStack query keys, hooks, and cache rules for retrieval
- Tests, acceptance criteria, error handling

### Out of scope

- Memory injection UI / "N memories loaded" indicator (Stage 7)
- Review Mode UX (Stage 7)
- Persona / Gem prompt composition (Stage 8)
- Native graph rewrite (Stage 9)
- Re-ranking via LLM (deferred; the 0.65/0.70 confidence guard from Stage 2 is already enough)
- Cross-device sync of retrieval state (single-device for now)

---

## Core Purpose

<stage_6_purpose>
Stage 6 turns the user's local knowledge — captures and concepts — into searchable, injectable memory.

It must preserve the product truth:

Capture = moment of understanding. Evidence.
Concept = pattern across captures. Organization.

Retrieval surfaces both. Captures give grounding; concepts give summary.

Retrieval is non-destructive: it never modifies capture content, never changes familiarity, never auto-promotes, never auto-merges. It reads, ranks, and returns. The only state it mutates is embedding tier metadata (hot/cold) and `last_accessed_at`.
</stage_6_purpose>

---

## Hard Constraints

<negative_constraints>
- DO NOT mutate `rawSnippet`, `whatClicked`, `whyItMattered`, `concept_hint_json`, or any concept content field as part of retrieval.
- DO NOT change `familiarity_score` or `importance_score` on retrieval.
- DO NOT auto-promote unresolved captures based on retrieval frequency.
- DO NOT auto-link captures to concepts based on retrieval matches.
- DO NOT block save, promotion, or any user action on retrieval state.
- DO NOT block retrieval on JIT rehydration; rehydration is asynchronous.
- DO NOT include captures with `embedding_status = 'failed'` in vec search results unless they are also a strong FTS5 match.
- DO NOT inject into a chat without an explicit token budget.
- DO NOT inject more than the configured max items (default 8) regardless of budget.
- DO NOT silently truncate a capture mid-snippet during injection; drop it instead and proceed to the next ranked item.
- DO NOT emit retrieval results as Anki / quiz / due-list framings; retrieval is context, not testing.
- DO NOT ship retrieval that requires loading every vector into memory at once on a low-end Android device.
</negative_constraints>

<required_behavior>
- Retrieval MUST combine vec (semantic) and FTS5 (lexical) results via Reciprocal Rank Fusion (RRF).
- Retrieval MUST honor caller-supplied filters (state, session, language, concept_type, time window).
- Retrieval MUST be safe to call concurrently from multiple call sites.
- Hot/cold tier transitions MUST be explicit and idempotent.
- Vector GC MUST run only on app boot (or explicit trigger), never inside a save or promotion transaction.
- JIT rehydration MUST be opportunistic and non-blocking; the retrieval call returns whatever it has.
- Injection MUST respect both `maxItems` and `tokenBudget`; whichever is reached first stops inclusion.
- Retrieval results MUST round-trip through Zod codecs at the engine boundary.
</required_behavior>

<forbidden_patterns>
- No "memory queue" pressure UI; retrieval surfaces context, not tasks.
- No silent fake-success on retrieval errors; loud failure into diagnostics, empty result to caller.
- No retrieval-driven concept creation, merging, or relabeling.
- No bypass of the embedding pipeline; retrieval reads what's there.
- No locking the DB for the duration of a retrieval call.
- No reading raw `embeddings_vec` rows into JS arrays for in-memory cosine across the entire table.
</forbidden_patterns>

---

## End-to-End Flow

```
caller invokes retrieveRelevantMemories({ query, filters, limit, tokenBudget })
  → embed(query) → queryEmbedding (uses existing local embedder)
  → run in parallel:
      vecSearchCaptures(queryEmbedding, k = limit * 4) — hot tier only
      vecSearchConcepts(queryEmbedding, k = limit * 4) — hot tier only
      ftsSearchCaptures(query, k = limit * 4)         — hot + cold
      ftsSearchConcepts(query, k = limit * 4)         — hot + cold
  → apply filters to each result list (state, session, language, concept_type, time window)
  → build candidate set (deduped by entity id)
  → compute RRF score per candidate using rank-in-each-list
  → apply secondary factors (recency decay, computed strength multiplier)
  → sort by final score DESC; tie-breakers locked
  → take top `limit`
  → enqueue cold items in top result for JIT rehydration (background, non-blocking)
  → mark `last_accessed_at = now` for items in top result (single batched UPDATE)
  → assemble RetrieveDiagnostics (status, vecAvailable, ftsAvailable, hit counts, rehydrationEnqueued, durationMs)
  → return { memories, diagnostics }

caller invokes formatMemoriesForInjection(memories, { tokenBudget, maxItems })
  → iterate memories in rank order
  → for each, compute approximate token cost
  → include if total tokens + this item ≤ tokenBudget AND included.length < maxItems
  → build a single, well-structured memory block
  → return { text, includedIds, includedCount, droppedCount, totalTokens }
```

---

## Step 1 — Retrievable Entities

<entity_scope>
- `LearningCapture` is retrievable if `embedding_status` is `ready` (vec) OR if FTS5 row exists (FTS path is independent of embedding).
- `Concept` is retrievable if it has a row in `concepts` (vec presence depends on tier; FTS path is always available).
- Captures with `embedding_status = 'pending'` or `'failed'` MAY surface via FTS5 only.
- Soft-deleted captures (if soft-delete is added later) MUST be excluded from both paths.
- Captures linked to a concept are NOT excluded; both linked and unresolved captures are retrievable.
</entity_scope>

```ts
export type RetrievedMemoryKind = 'capture' | 'concept';

export interface RetrievedMemory {
  kind: RetrievedMemoryKind;
  id: LearningCaptureId | ConceptId;
  score: number;        // final fused score after secondary factors
  rrfScore: number;     // raw RRF score before secondary factors
  vecScore: number | null;
  ftsScore: number | null;
  recencyFactor: number;
  strengthFactor: number;
  tier: 'hot' | 'cold';
  payload: RetrievedCapturePayload | RetrievedConceptPayload;
}
```

---

## Step 2 — FTS5 Indexes

### Schema additions

```sql
CREATE VIRTUAL TABLE captures_fts USING fts5(
  title,
  what_clicked,
  why_it_mattered,
  raw_snippet,
  keywords,
  capture_id UNINDEXED,
  tokenize = 'porter unicode61'
);

CREATE VIRTUAL TABLE concepts_fts USING fts5(
  name,
  canonical_summary,
  core_concept,
  surface_features,
  language_or_runtime,
  concept_id UNINDEXED,
  tokenize = 'porter unicode61'
);
```

<fts_schema_rules>
- FTS5 uses `porter unicode61` tokenizer for English-leaning code-and-prose corpus.
- `keywords`, `surface_features`, `language_or_runtime` are stored as space-joined strings derived from the JSON arrays at write time.
- FTS5 rows MUST be kept in sync via SQL triggers on the source tables.
- FTS5 MUST NOT be the source of truth for any field; it mirrors data already in `learning_captures` / `concepts`.
- Rebuild MUST be supported by an explicit migration (or `INSERT INTO concepts_fts(concepts_fts) VALUES('rebuild')` after schema changes).
</fts_schema_rules>

### Sync triggers

```sql
CREATE TRIGGER captures_fts_after_insert AFTER INSERT ON learning_captures BEGIN
  INSERT INTO captures_fts(rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
  VALUES (
    new.rowid, new.title, new.what_clicked, COALESCE(new.why_it_mattered, ''),
    new.raw_snippet, COALESCE(json_extract(new.keywords_json, '$') , '[]'),
    new.id
  );
END;

CREATE TRIGGER captures_fts_after_update AFTER UPDATE ON learning_captures BEGIN
  UPDATE captures_fts SET
    title = new.title,
    what_clicked = new.what_clicked,
    why_it_mattered = COALESCE(new.why_it_mattered, ''),
    raw_snippet = new.raw_snippet,
    keywords = COALESCE(json_extract(new.keywords_json, '$') , '[]')
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER captures_fts_after_delete AFTER DELETE ON learning_captures BEGIN
  DELETE FROM captures_fts WHERE rowid = old.rowid;
END;
```

<trigger_rules>
- Equivalent triggers exist for `concepts`.
- Triggers MUST stringify JSON arrays (`keywords_json`, `surface_features_json`, `language_or_runtime_json`) to space-joined text inside the FTS5 row. Implementation MAY use a small SQL function or precomputed text columns; do NOT FTS-index raw JSON text.
- Trigger failures MUST surface loudly. Silent FTS desync is forbidden.
- A diagnostics command MUST exist to rebuild FTS5 indexes from source tables (used after migrations or corruption).
</trigger_rules>

---

## Step 3 — sqlite-vec & Hot/Cold Tier

### Tier model

<tier_model>
- "Hot" = vector blob present in `embeddings_vec` for the item.
- "Cold" = item exists in source table; vector blob is either not yet written (new row) OR was removed by GC; FTS5 row preserved.
- A denormalized `embedding_tier` column on `learning_captures` and `concepts` mirrors the canonical truth (presence in `embeddings_vec`) for fast filtering and diagnostics.
- Source of truth is `embeddings_vec` row presence; the column MUST be kept in sync by every code path that inserts, deletes, or rehydrates a vector.
- Tier transitions are idempotent: rehydrating a hot item is a no-op; evicting a cold item is a no-op.
- New rows default to `'cold'` because embedding is async (Stage 1). They flip to `'hot'` ONLY after a real `embeddings_vec` row exists. The column never claims hot before the vector actually lands.
</tier_model>

### Schema additions

```sql
-- Default 'cold' is correct: a row exists in source tables BEFORE its vector is written
-- (embedding is async per Stage 1). The column flips to 'hot' only after a real
-- embeddings_vec row is inserted by the embedding pipeline.
ALTER TABLE concepts            ADD COLUMN embedding_tier   TEXT NOT NULL DEFAULT 'cold'
  CHECK (embedding_tier IN ('hot', 'cold'));
ALTER TABLE concepts            ADD COLUMN last_accessed_at INTEGER;

ALTER TABLE learning_captures   ADD COLUMN embedding_tier   TEXT NOT NULL DEFAULT 'cold'
  CHECK (embedding_tier IN ('hot', 'cold'));
ALTER TABLE learning_captures   ADD COLUMN last_accessed_at INTEGER;

CREATE INDEX idx_concepts_tier              ON concepts(embedding_tier);
CREATE INDEX idx_concepts_last_accessed     ON concepts(last_accessed_at);
CREATE INDEX idx_captures_tier              ON learning_captures(embedding_tier);
CREATE INDEX idx_captures_last_accessed     ON learning_captures(last_accessed_at);
```

### Tier lifecycle

<tier_lifecycle_rules>
- A new row in `learning_captures` or `concepts` starts at `embedding_tier = 'cold'`. Its vector does not exist yet (per Stage 1 async-embedding contract: `embedding_status = 'pending'` first).
- When the embedding pipeline successfully writes a row into `embeddings_vec`, the same write path MUST flip `embedding_tier = 'hot'` on the source row in the same transaction as the vec insert.
- When GC evicts a vector, the eviction transaction MUST flip `embedding_tier = 'cold'` on the source row in the same transaction as the vec delete (Step 8).
- When JIT rehydration succeeds, the rehydration transaction MUST flip `embedding_tier = 'hot'` on the source row in the same transaction as the vec upsert (Step 9).
- A capture with `embedding_status = 'failed'` MUST remain `embedding_tier = 'cold'` until a successful retry inserts its vector.
- `embedding_tier` MUST NEVER be `'hot'` while no row exists in `embeddings_vec` for that owner. The denormalized column is a fast filter — the source of truth is `embeddings_vec` row presence.
- A boot-time integrity sweep MAY reconcile drift: any source row with `embedding_tier = 'hot'` and no matching `embeddings_vec` row is corrected to `'cold'` and surfaced in diagnostics.
</tier_lifecycle_rules>

### Vec query rules

<vec_query_rules>
- Vec searches MUST use sqlite-vec's KNN syntax with a bounded `k` (default `k = limit * 4`, hard ceiling 200).
- Vec searches MUST NOT pull all vectors into JS for in-memory cosine. Distance is computed inside SQLite by sqlite-vec.
- Vec searches return only hot items by definition (cold items have no vector row).
- Distance metric is L2 or cosine, matching the embedder's normalization. Whichever is configured app-wide is used here.
- Distance is converted to a similarity score in `[0, 1]` by `score = 1 / (1 + distance)` (or 1 − distance for cosine, depending on the metric configured).
</vec_query_rules>

---

## Step 4 — Hybrid Retrieval Algorithm

### Inputs

```ts
export interface RetrieveOptions {
  query: string;
  limit: number;                       // default 8
  filters?: RetrieveFilters;
  tokenBudget?: number;                // optional; only used if caller will inject
  vecK?: number;                       // override; default limit * 4
  ftsK?: number;                       // override; default limit * 4
  enableJitRehydration?: boolean;      // default true
  bumpLastAccessed?: boolean;          // default true
}

export interface RetrieveFilters {
  states?: CaptureState[];                     // restrict captures by state
  conceptTypes?: ConceptType[];                // restrict concepts by type
  sessionIds?: string[];
  languages?: string[];                        // matches snippet_lang or language_or_runtime
  minCreatedAt?: number;                       // ms epoch
  maxCreatedAt?: number;                       // ms epoch
  excludeIds?: Array<LearningCaptureId | ConceptId>;
  derivedChainRoot?: LearningCaptureId | null; // include only chain members
  kinds?: RetrievedMemoryKind[];               // default ['capture', 'concept']
}
```

### Algorithm

```ts
export type RetrievalSource = 'vecCaptures' | 'vecConcepts' | 'ftsCaptures' | 'ftsConcepts';

export interface RetrieveDiagnostics {
  status: 'ok' | 'partial' | 'unavailable';
  vecAvailable: boolean;
  ftsAvailable: boolean;
  failedSources: RetrievalSource[];
  timedOutSources: RetrievalSource[];
  partialReason: string | null;
  vecCaptureHits: number;
  vecConceptHits: number;
  ftsCaptureHits: number;
  ftsConceptHits: number;
  totalCandidates: number;
  rehydrationEnqueued: number;
  durationMs: number;
}

export interface RetrieveResult {
  memories: RetrievedMemory[];
  diagnostics: RetrieveDiagnostics;
}

export const retrieveRelevantMemories = async (
  opts: RetrieveOptions
): Promise<RetrieveResult> => {
  const startedAt = Date.now();
  const limit = opts.limit ?? 8;
  const vecK = opts.vecK ?? Math.min(limit * 4, 200);
  const ftsK = opts.ftsK ?? Math.min(limit * 4, 200);

  const failedSources: RetrievalSource[] = [];
  const timedOutSources: RetrievalSource[] = [];

  const queryEmbedding = await tryEmbedQuery(opts.query, failedSources);

  const [vecCaps, vecCons, ftsCaps, ftsCons] = await Promise.all([
    queryEmbedding
      ? guardedSearch('vecCaptures', () => vecSearchCaptures(queryEmbedding, vecK, opts.filters), failedSources, timedOutSources)
      : Promise.resolve([]),
    queryEmbedding
      ? guardedSearch('vecConcepts', () => vecSearchConcepts(queryEmbedding, vecK, opts.filters), failedSources, timedOutSources)
      : Promise.resolve([]),
    guardedSearch('ftsCaptures', () => ftsSearchCaptures(opts.query, ftsK, opts.filters), failedSources, timedOutSources),
    guardedSearch('ftsConcepts', () => ftsSearchConcepts(opts.query, ftsK, opts.filters), failedSources, timedOutSources),
  ]);

  const vecAvailable = queryEmbedding !== null
    && !failedSources.includes('vecCaptures')
    && !failedSources.includes('vecConcepts');
  const ftsAvailable = !failedSources.includes('ftsCaptures')
    && !failedSources.includes('ftsConcepts');

  if (!vecAvailable && !ftsAvailable) {
    throw new RetrievalUnavailableError('All retrieval backends unavailable', { failedSources });
  }

  const candidates = mergeAndDedup(vecCaps, vecCons, ftsCaps, ftsCons);

  const ranked = candidates.map((c) => {
    const rrf = computeRrfScore(c, { vecCaps, vecCons, ftsCaps, ftsCons });
    const recencyFactor = computeRecencyFactor(c);
    const strengthFactor = computeStrengthFactor(c);
    const finalScore = rrf * recencyFactor * strengthFactor;
    return { ...c, rrfScore: rrf, recencyFactor, strengthFactor, score: finalScore };
  });

  ranked.sort(rankComparator);
  const top = ranked.slice(0, limit);

  if (opts.bumpLastAccessed !== false && top.length > 0) {
    await bumpLastAccessed(top.map((m) => ({ kind: m.kind, id: m.id })));
  }

  let rehydrationEnqueued = 0;
  if (opts.enableJitRehydration !== false) {
    const cold = top.filter((m) => m.tier === 'cold').map((m) => ({ kind: m.kind, id: m.id }));
    rehydrationQueue.enqueueMany(cold);
    rehydrationEnqueued = cold.length;
  }

  const status: RetrieveDiagnostics['status'] =
    failedSources.length === 0 && timedOutSources.length === 0 ? 'ok' : 'partial';

  const partialReason = status === 'partial'
    ? buildPartialReason({ failedSources, timedOutSources, vecAvailable, ftsAvailable })
    : null;

  const diagnostics: RetrieveDiagnostics = {
    status,
    vecAvailable,
    ftsAvailable,
    failedSources,
    timedOutSources,
    partialReason,
    vecCaptureHits: vecCaps.length,
    vecConceptHits: vecCons.length,
    ftsCaptureHits: ftsCaps.length,
    ftsConceptHits: ftsCons.length,
    totalCandidates: candidates.length,
    rehydrationEnqueued,
    durationMs: Date.now() - startedAt,
  };

  return { memories: top, diagnostics };
};
```

<retrieval_rules>
- The four search calls (vec/FTS × capture/concept) MUST run in parallel.
- Filter application happens at the SQL level where possible; in-memory filtering is the fallback for complex predicates only.
- Deduplication is by `(kind, id)`. A capture and the concept it links to are independent items and both may surface.
- Empty queries (`opts.query.trim().length === 0`) MUST short-circuit and return `{ memories: [], diagnostics: { status: 'ok', ... } }` without touching vec or FTS5.
- `opts.filters.kinds` MAY restrict the engine to one kind; the unused search calls are skipped (their `failedSources` entries are NOT recorded as failures, and `vecAvailable`/`ftsAvailable` reflect skipped-as-available).
- The engine MUST NOT throw on partial backend failure. If vec is unavailable, use FTS5 only and emit `diagnostics.status = 'partial'` with `vecAvailable = false` and the failing source(s) recorded. If FTS5 is unavailable, use vec only with the symmetric diagnostics. If both backends are unavailable, the engine throws `RetrievalUnavailableError`.
- `diagnostics.partialReason` MUST be a human-readable, log-safe string when `status = 'partial'`. It MUST NOT contain user data, query text, or PII.
- Callers MUST treat `diagnostics.status !== 'ok'` as actionable signal. The retrieval engine never silently masks degradation as success.
</retrieval_rules>

---

## Step 5 — Ranking & Rank Fusion (RRF)

### Reciprocal Rank Fusion

<rrf_rules>
- For each candidate, compute RRF over up to four ranked lists: `vecCaps`, `vecCons`, `ftsCaps`, `ftsCons`.
- Only the lists that contain the candidate's kind are considered for that candidate.
- A candidate absent from a list contributes 0 from that list (NOT a large rank).
- Constant `k = 60`.
- `rrf(c) = sum over each list containing c of 1 / (k + rank(c, list))`, with `rank` 1-indexed.
- Ties on RRF score are broken by secondary factors (Step 6), then deterministic tie-breakers (Step 6).
</rrf_rules>

```ts
const RRF_K = 60;

const computeRrfScore = (
  c: { kind: RetrievedMemoryKind; id: string },
  lists: { vecCaps: RankedHit[]; vecCons: RankedHit[]; ftsCaps: RankedHit[]; ftsCons: RankedHit[] }
): number => {
  const vec = c.kind === 'capture' ? lists.vecCaps : lists.vecCons;
  const fts = c.kind === 'capture' ? lists.ftsCaps : lists.ftsCons;
  const inVec = vec.findIndex((h) => h.id === c.id);
  const inFts = fts.findIndex((h) => h.id === c.id);
  const vecPart = inVec === -1 ? 0 : 1 / (RRF_K + (inVec + 1));
  const ftsPart = inFts === -1 ? 0 : 1 / (RRF_K + (inFts + 1));
  return vecPart + ftsPart;
};
```

---

## Step 6 — Secondary Ranking Factors

<secondary_ranking_rules>
- Final score = `rrfScore * recencyFactor * strengthFactor`.
- Recency factor uses an exponential half-life decay on `last_accessed_at` (fallback: `created_at`).
  - Half-life = 30 days. Bounded `[0.5, 1.5]`.
  - `recencyFactor = clamp(1 + 0.5 * exp(-ageDays / 30), 0.5, 1.5)`.
- Strength factor multiplies by `1 + 0.25 * computedStrength` for concepts; captures use `1` (captures don't carry strength).
  - Computed strength uses `computeStrength(familiarity, importance)` from Stage 1.
  - Strength factor is bounded `[1.0, 1.25]`.
- Coefficients are placeholders. Lock after Stage 7+ produces real chat-injection signal.
</secondary_ranking_rules>

### Tie-breakers

<tie_breakers>
- Tie-breaker 1: `rrfScore DESC` (raw rank fusion before factors).
- Tie-breaker 2: prefer concept over capture (concepts give summary; captures give evidence — concepts win on a tie because they carry organization).
- Tie-breaker 3: `last_accessed_at DESC NULLS LAST` (fallback to `created_at`).
- Tie-breaker 4: `id ASC` (deterministic).
</tie_breakers>

```ts
const rankComparator = (a: RetrievedMemory, b: RetrievedMemory): number => {
  if (b.score !== a.score) return b.score - a.score;
  if (b.rrfScore !== a.rrfScore) return b.rrfScore - a.rrfScore;
  if (a.kind !== b.kind) return a.kind === 'concept' ? -1 : 1;
  const aAccessed = a.payload.lastAccessedAt ?? a.payload.createdAt;
  const bAccessed = b.payload.lastAccessedAt ?? b.payload.createdAt;
  if (bAccessed !== aAccessed) return bAccessed - aAccessed;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};
```

---

## Step 7 — Filters & Scopes

<filter_rules>
- `states` filter applies to captures only; concepts are unaffected.
- `conceptTypes` filter applies to concepts only; captures are unaffected.
- `sessionIds` filter applies to captures only.
- `languages` filter:
  - matches `learning_captures.snippet_lang` (case-insensitive)
  - matches `concepts.language_or_runtime_json` (any element, case-insensitive)
- `minCreatedAt` / `maxCreatedAt` apply to both kinds via their respective `created_at`.
- `derivedChainRoot` selects only captures whose chain (via `derived_from_capture_id`) traces to that root, inclusive.
- `excludeIds` applies to both kinds.
- `kinds` restricts the engine: `['capture']` skips concept searches; `['concept']` skips capture searches.
- Filters MUST be applied at the SQL level for `states`, `conceptTypes`, `sessionIds`, `languages`, `minCreatedAt`, `maxCreatedAt`, `excludeIds`. `derivedChainRoot` MAY be applied in two passes (SQL prefilter by candidate IDs, then in-JS chain walk) to keep SQL simple.
</filter_rules>

---

## Step 8 — Hot/Cold GC Policy

<gc_policy_rules>
- GC trigger: app boot. Compare `COUNT(*) FROM embeddings_vec` against a threshold.
- Default threshold: 5,000 active vector rows (concepts + captures combined).
- GC MUST NOT run inside any other transaction.
- GC MUST NOT run while a save, promotion, or active retrieval is in flight; queue and retry.
- Eviction selection (concepts):
  - `embedding_tier = 'hot'`
  - AND `computeStrength(familiarity_score, importance_score) < 0.3`
  - AND `COALESCE(last_accessed_at, updated_at) < now − 90 days`
  - Order by strength ASC, then last_accessed_at ASC, then created_at ASC.
- Eviction selection (captures):
  - `embedding_tier = 'hot'`
  - AND `state = 'linked'` (linked captures are organized; their concept handles retrieval)
  - AND `COALESCE(last_accessed_at, updated_at) < now − 90 days`
  - Order by last_accessed_at ASC, then created_at ASC.
  - Unresolved and proposed_new captures are NEVER evicted (they are the user's pending pile).
- Stop evicting once the active count is at or below `threshold * 0.9` (10% headroom to avoid thrash).
- For each eviction:
  - Atomically delete the row from `embeddings_vec`.
  - Update `embedding_tier = 'cold'` on the source row in the same transaction.
- GC MUST emit a diagnostics summary (`evictedConcepts`, `evictedCaptures`, `durationMs`).
- GC MUST be cancellable; if the app suspends, the next boot resumes from current state with no data loss.
</gc_policy_rules>

```ts
export const runHotColdGc = async (opts?: GcOptions): Promise<GcSummary> => {
  const threshold = opts?.threshold ?? 5_000;
  const headroom = Math.floor(threshold * 0.9);
  const summary: GcSummary = { evictedConcepts: 0, evictedCaptures: 0, durationMs: 0 };

  const start = Date.now();
  let active = await embeddingsVecRepo.countAll();
  if (active <= threshold) return { ...summary, durationMs: Date.now() - start };

  const conceptVictims = await conceptRepo.findGcVictims({ limit: active - headroom });
  for (const v of conceptVictims) {
    await db.transaction(async (tx) => {
      await embeddingsVecRepo.deleteByOwner(tx, { kind: 'concept', id: v.id });
      await conceptRepo.setEmbeddingTier(tx, v.id, 'cold');
    });
    summary.evictedConcepts += 1;
    if (--active <= headroom) break;
  }

  if (active > headroom) {
    const captureVictims = await captureRepo.findGcVictims({ limit: active - headroom });
    for (const v of captureVictims) {
      await db.transaction(async (tx) => {
        await embeddingsVecRepo.deleteByOwner(tx, { kind: 'capture', id: v.id });
        await captureRepo.setEmbeddingTier(tx, v.id, 'cold');
      });
      summary.evictedCaptures += 1;
      if (--active <= headroom) break;
    }
  }

  summary.durationMs = Date.now() - start;
  return summary;
};
```

---

## Step 9 — JIT Rehydration

<jit_rules>
- When a cold item appears in the top result of a retrieval call, enqueue it for rehydration.
- Rehydration is a background job; it MUST NOT block the retrieval response.
- Rehydration MUST be debounced per `(kind, id)`; the same item enqueued multiple times collapses to one job.
- Rehydration MUST be idempotent and safe to run on already-hot items (no-op).
- Rehydration steps:
  1. Load source row.
  2. Build embedding text using the same source-text builder used at save/promotion (Stage 1 / Stage 5).
  3. Run the local embedder.
  4. Upsert into `embeddings_vec`.
  5. Set `embedding_tier = 'hot'` and bump `last_accessed_at = now()`.
  6. Mark `embedding_status = 'ready'` if previously `failed`.
- Rehydration failures MUST set `embedding_status = 'failed'` (captures) or surface in concept embedding diagnostics. They MUST NOT delete the source row, MUST NOT change `embedding_tier` to anything other than `cold` or `hot`.
- A successfully rehydrated cold item is treated as hot from the next retrieval call onward (no second-class status).
</jit_rules>

```ts
export const ensureEmbedded = async (
  ref: { kind: 'capture' | 'concept'; id: LearningCaptureId | ConceptId }
): Promise<void> => {
  const tier = await readEmbeddingTier(ref);
  if (tier === 'hot') return;

  const text = await buildEmbeddingTextFor(ref);
  const vec  = await embedText(text);

  await db.transaction(async (tx) => {
    await embeddingsVecRepo.upsert(tx, ref, vec);
    await setEmbeddingTier(tx, ref, 'hot');
    await bumpLastAccessedTx(tx, ref, Date.now());
  });
};
```

---

## Step 10 — Injection Contracts

This stage owns the data contract; UI and chat-injection orchestration are Stage 7.

### Memory payload shapes

```ts
export interface RetrievedCapturePayload {
  id: LearningCaptureId;
  title: string;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang: string | null;
  snippetSourcePath: string | null;
  snippetStartLine: number | null;
  snippetEndLine: number | null;
  state: CaptureState;
  linkedConceptId: ConceptId | null;
  linkedConceptName: string | null;
  sessionId: string | null;
  createdAt: number;
  lastAccessedAt: number | null;
  embeddingStatus: EmbeddingStatus;
}

export interface RetrievedConceptPayload {
  id: ConceptId;
  name: string;
  conceptType: ConceptType;
  canonicalSummary: string | null;
  coreConcept: string | null;
  languageOrRuntime: string[];
  surfaceFeatures: string[];
  familiarityScore: number;
  importanceScore: number;
  strength: number;
  representativeCaptureIds: LearningCaptureId[];
  createdAt: number;
  lastAccessedAt: number | null;
}
```

### Injection text format

```ts
export interface InjectionResult {
  text: string;             // formatted block ready to paste into a prompt
  includedIds: Array<{ kind: RetrievedMemoryKind; id: string }>;
  includedCount: number;
  droppedCount: number;
  totalTokensApprox: number;
}

export const formatMemoriesForInjection = (
  memories: RetrievedMemory[],
  opts?: { tokenBudget?: number; maxItems?: number; header?: string }
): InjectionResult;
```

<injection_format_rules>
- Default header: `"Relevant context from your saved learning"`.
- Each item is rendered as a single block with a clear delimiter (`---`).
- Concept block format:
  ```
  Concept: <name> (<concept_type>)
  Summary: <canonical_summary or core_concept fallback>
  Languages: <comma-separated language_or_runtime>
  ```
- Capture block format:
  ```
  Capture: <title>
  What clicked: <whatClicked>
  Snippet (<snippet_lang>):
    <rawSnippet, fenced code block>
  Source: <snippetSourcePath:lines or "chat">
  ```
- The block MUST include a stable footer pointer noting the included memory IDs in a parseable form, e.g. `[memoryIds: c_abc, lc_def]` — Stage 7 may use this to show "N memories loaded" and to render references.
- The format MUST be deterministic: same memories in same order → same text.
- The format MUST NOT include `familiarity_score`, `importance_score`, or `extraction_confidence` numerics.
- The format MUST NOT include language-suffixed concept names (per Regression Guard).
</injection_format_rules>

---

## Step 11 — Token Budget Enforcement

<token_budget_rules>
- Default `tokenBudget` = 1500.
- Default `maxItems` = 8.
- Approximate token cost = `Math.ceil(text.length / 4)`. This is intentionally rough; Stage 6 ships a deterministic estimator, not a real tokenizer.
- Iterate memories in rank order. For each:
  - Compute item text and item token cost.
  - If `running + itemCost <= tokenBudget` AND `included.length < maxItems` → include.
  - Else → drop (do NOT truncate the item mid-content).
- Never truncate a capture mid-snippet. Drop and proceed.
- Stop when either budget or item-count cap is reached.
- `totalTokensApprox` reflects the running estimator total at completion.
- If even the highest-ranked item exceeds `tokenBudget`, drop it and try the next; if all are too large, return an empty `InjectionResult` with `droppedCount = memories.length`.
</token_budget_rules>

---

## Step 12 — Caching & Performance

<perf_rules>
- Retrieval is NOT memoized at the engine level. Caller may cache via TanStack with the query key factory.
- `bumpLastAccessed` is a single batched UPDATE per retrieval call, not per-item round trips.
- The four search calls run in parallel via `Promise.all`. Keep per-call timeout ≤ 1500ms.
- If any one search exceeds its per-call timeout, the engine returns the partial result (others may still resolve) and tags the response with the failed source.
- Vec searches MUST use `LIMIT k` and `ORDER BY distance` at SQL level — no result-set scans in JS.
- FTS5 searches use `MATCH` syntax. Sanitize the query to escape FTS5 operators when the input is plain user text.
- The engine MUST NOT hold a connection or transaction across search calls; each search runs on its own connection / handle.
- Memory profile target: < 30 MB sustained for retrieval of `k = 200` over 5,000 hot vectors on a low-end Android device.
</perf_rules>

### Query keys

```ts
export const retrievalKeys = {
  all: () => ['learning', 'retrieval'] as const,
  search: (queryHash: string, filterHash: string) =>
    [...retrievalKeys.all(), queryHash, filterHash] as const,
};
```

### Hooks

- `useRetrieve(opts: RetrieveOptions)` — TanStack query, stale-while-revalidate, `staleTime` 30s. Returns `RetrieveResult`; the consumer (Stage 7) MUST surface `diagnostics.status !== 'ok'` to the user when partial degradation occurs.
- `useEnsureEmbedded()` — mutation; idempotent.
- `useRunHotColdGc()` — mutation; reserved for diagnostics surface.

<query_invalidation_rules>
- After a successful save, invalidate `retrievalKeys.all()`.
- After a successful promotion, invalidate `retrievalKeys.all()`.
- After a manual concept edit, invalidate `retrievalKeys.all()`.
- After GC, invalidate `retrievalKeys.all()` (cold transitions affect ranking via tier).
</query_invalidation_rules>

---

## Step 13 — Recompute & Sync Triggers

<sync_triggers>
- On `learning_captures` insert/update/delete → FTS5 trigger fires; vec write happens via the existing async embedding pipeline (Stage 1).
- On `concepts` insert/update/delete → FTS5 trigger fires; vec write happens via concept-embedding pipeline.
- On `embedding_status` flip from `failed` to `ready` → no extra retrieval action needed; FTS5 already has the row.
- On migration that changes embedding source-text composition → schedule a one-time concept-and-capture re-embedding pass at app boot, gated by a schema-version check, with a progress diagnostics surface.
- On app boot after the schema-version check → run `runHotColdGc` if active vectors > threshold.
</sync_triggers>

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Empty query string | Short-circuit; return `{ memories: [], diagnostics: { status: 'ok', ... } }`. No vec/FTS calls. |
| Embedder unavailable | Run FTS5-only path; `diagnostics.status = 'partial'`, `vecAvailable = false`, `failedSources` includes both vec sources, `partialReason` set. |
| FTS5 unavailable (corruption) | Run vec-only path; `diagnostics.status = 'partial'`, `ftsAvailable = false`, `failedSources` includes both fts sources, `partialReason` set. Diagnostics surfaced. |
| Both unavailable | Throw `RetrievalUnavailableError`; error carries `failedSources`. Caller decides UX. |
| Per-call timeout (one of the 4 searches) | Use partial result; `timedOutSources` includes the offending source; `diagnostics.status = 'partial'`. |
| Vec returns NaN distance | Skip that hit; log diagnostics. |
| FTS5 query has unsanitized operators | Engine sanitizes by escaping `"`, `*`, `^`, `~`, `:` and quoting tokens. Caller never sees a syntax error. |
| Cold item rehydration fails | Item stays cold; FTS5 still surfaces it; `embedding_status = 'failed'` recorded. |
| GC runs while a save is in flight | GC waits or is requeued by the GC scheduler; never overlaps. |
| GC encounters a row missing in `embeddings_vec` | Skip; mark source row tier as `cold`; continue. |
| Token estimator overflow (string length absurd) | Drop item; record `droppedCount`. |
| `bumpLastAccessed` write fails | Retrieval result still returned; failure logged to diagnostics. |

---

## Anti-Regression Rules

<anti_regression_rules>
- Retrieval MUST NOT modify capture content fields ever.
- Retrieval MUST NOT change `familiarity_score` or `importance_score`.
- Retrieval MUST NOT auto-link captures to concepts based on co-retrieval.
- Retrieval MUST NOT auto-merge concepts.
- Retrieval MUST NOT mutate `concept_hint_json`.
- Retrieval MUST NOT bypass token budgets.
- Retrieval MUST NOT inject into chat without an explicit caller-supplied budget (defaulting to `1500` is acceptable; silently injecting unbounded text is not).
- Hot/cold GC MUST NOT delete source rows in `learning_captures` or `concepts`.
- The system MUST tolerate cold items without producing zero-vector pollution; FTS5 is the safety net.
- Injection format MUST NOT include numeric scores or classification questions.
- The retrieval engine MUST NOT depend on UI components; it ships as pure data.
</anti_regression_rules>

---

## Architecture Contract Checks

| Constraint | How Stage 6 satisfies it |
|---|---|
| Feature co-location | All Stage 6 code under `src/features/learning/retrieval/`. Barrel exports per architecture contract. |
| Drizzle transactions | GC and rehydration use `db.transaction(async (tx) => { ... })`. Retrieval reads only — no transactions needed for reads. |
| Embedding outside transaction | Rehydration computes the embedding before the transaction, then upserts inside. The embedder call itself is not in a transaction. |
| Strict TS + branded IDs | `LearningCaptureId`, `ConceptId` throughout. `RetrievedMemory` is a discriminated union. |
| Zod at JSON boundaries | `RetrievedCapturePayloadCodec`, `RetrievedConceptPayloadCodec` validate on engine egress. Filter input validated by `RetrieveOptionsCodec`. |
| Loud failures | Both backends unavailable → throw. Single backend unavailable → tagged partial result. No silent zero-result. |
| TanStack query keys | `retrievalKeys` factory only; no hardcoded arrays. |
| No silent reroute | Provider fallback for embeddings already exists upstream; retrieval inherits. |
| Thin route screens | Engine is pure data; hooks/services own orchestration. UI is Stage 7. |
| Capture immutability | Retrieval reads only. Tier and `last_accessed_at` are metadata, not content. |
| Async embedding contract | Captures with `embedding_status` of `pending`/`failed` surface via FTS5; tier flip on rehydration matches Stage 1's async-never-blocking-save contract. |

---

## Deliverables

1. `src/features/learning/retrieval/data/schema.ts`
   - FTS5 virtual tables for `captures_fts`, `concepts_fts`
   - `embedding_tier`, `last_accessed_at` columns + indexes on `learning_captures`, `concepts`
2. `src/features/learning/retrieval/data/migrations/NNNN_retrieval_engine.sql`
   - virtual tables, triggers, ALTER TABLE adds, supporting indexes
3. `src/features/learning/retrieval/data/triggers.sql`
   - INSERT/UPDATE/DELETE triggers for both FTS5 tables
4. `src/features/learning/retrieval/data/embeddingsVecRepo.ts`
   - count, KNN search, upsert, deleteByOwner
5. `src/features/learning/retrieval/data/ftsRepo.ts`
   - sanitized MATCH search for captures + concepts, ordered by FTS5 rank
6. `src/features/learning/retrieval/codecs/retrievedMemory.ts`
   - `RetrievedCapturePayloadCodec`, `RetrievedConceptPayloadCodec`, mappers
7. `src/features/learning/retrieval/services/embedQuery.ts`
   - thin wrapper around the existing local embedder
8. `src/features/learning/retrieval/services/vecSearch.ts`
   - capture and concept variants
9. `src/features/learning/retrieval/services/ftsSearch.ts`
   - capture and concept variants, query sanitizer
10. `src/features/learning/retrieval/services/rrf.ts`
    - `computeRrfScore`, `rankComparator`
11. `src/features/learning/retrieval/services/secondaryFactors.ts`
    - `computeRecencyFactor`, `computeStrengthFactor`
12. `src/features/learning/retrieval/services/retrieveRelevantMemories.ts`
13. `src/features/learning/retrieval/services/formatMemoriesForInjection.ts`
14. `src/features/learning/retrieval/services/ensureEmbedded.ts`
15. `src/features/learning/retrieval/services/runHotColdGc.ts`
16. `src/features/learning/retrieval/services/rehydrationQueue.ts`
17. `src/features/learning/retrieval/data/queryKeys.ts` (`retrievalKeys`)
18. `src/features/learning/retrieval/hooks/useRetrieve.ts`
19. `src/features/learning/retrieval/hooks/useEnsureEmbedded.ts`
20. `src/features/learning/retrieval/hooks/useRunHotColdGc.ts`
21. `src/features/learning/retrieval/types/retrieval.ts`
    - `RetrievedMemory`, `RetrieveOptions`, `RetrieveFilters`, `RetrieveResult`, `RetrieveDiagnostics`, `RetrievalSource`, `InjectionResult`, errors (incl. `RetrievalUnavailableError`)
22. Tests:
    - FTS5 triggers stay in sync on insert/update/delete for captures and concepts
    - FTS5 sanitizer escapes operators in user query
    - vec search returns at most `k` hot items, ordered by similarity
    - vec search excludes cold items
    - RRF score is correct against a known fixture
    - rank comparator: score → rrf → kind (concept-wins) → last_accessed → id
    - filters: states, conceptTypes, sessionIds, languages, time window, excludeIds, kinds
    - empty query short-circuits with no vec/FTS call
    - one backend down → partial result tagged
    - both backends down → `RetrievalUnavailableError`
    - `bumpLastAccessed` fires once per retrieval as a single batched UPDATE
    - JIT rehydration enqueued for cold items in top result, NOT for cold items below top
    - `ensureEmbedded` is idempotent on hot items
    - rehydration failure does not change tier from cold to hot
    - GC runs only when count > threshold; stops at headroom (90%)
    - GC never evicts unresolved or proposed_new captures
    - GC never deletes source rows in `learning_captures` or `concepts`
    - GC never overlaps with save or promotion transactions
    - injection format is deterministic for the same memory list
    - injection respects `tokenBudget` and `maxItems`; never truncates mid-snippet
    - injection drops oversize items rather than truncating
    - injection never includes numeric familiarity/importance/confidence
    - retrieval never modifies capture content fields
    - retrieval never modifies `familiarity_score` or `importance_score`
    - new captures and new concepts default `embedding_tier = 'cold'` until a vector row exists
    - successful embedding pipeline insert flips tier to `'hot'` in the same transaction as the vec insert
    - GC eviction flips tier to `'cold'` in the same transaction as the vec delete
    - JIT rehydration flips tier to `'hot'` in the same transaction as the vec upsert
    - boot-time integrity sweep corrects any source row claiming `'hot'` without a matching `embeddings_vec` row
    - vec-only path returns `diagnostics.status = 'partial'` with `vecAvailable = false`
    - fts-only path returns `diagnostics.status = 'partial'` with `ftsAvailable = false`
    - both-unavailable throws `RetrievalUnavailableError` carrying `failedSources`
    - diagnostics include hit counts per source and total candidates
    - diagnostics include `rehydrationEnqueued` count and `durationMs`
    - diagnostics never contain user query text or PII

---

## Acceptance Criteria

<acceptance_criteria>
- Retrieval combines vec and FTS5 results via RRF with `k = 60`.
- Hot/cold tier is reflected by `embedding_tier` on captures and concepts; canonical truth is `embeddings_vec` row presence.
- Cold items are surfaced via FTS5 and JIT-rehydrated only when they appear in the top result.
- Rehydration is asynchronous, idempotent, and never blocks the retrieval response.
- Vector GC runs only on app boot (or explicit trigger), never inside save/promotion.
- GC never evicts unresolved or proposed_new captures.
- GC never deletes source rows.
- Filters cover states, conceptTypes, sessionIds, languages, time window, excludeIds, derivedChainRoot, kinds.
- Ranking final score = `rrfScore * recencyFactor * strengthFactor`, with locked tie-breakers.
- Tie-breaker on equal score and equal RRF prefers concept over capture.
- Injection contract is data-only; UI is Stage 7.
- Injection respects both `tokenBudget` and `maxItems`; never truncates a capture mid-snippet.
- Injection format is deterministic and never exposes numeric scores or classification questions.
- Retrieval never mutates capture content, `familiarity_score`, `importance_score`, or `concept_hint_json`.
- The engine ships under `src/features/learning/retrieval/` with feature-owned types, codecs, repos, hooks, and services — no UI dependencies.
- All TanStack queries use `retrievalKeys` factories.
- All result payloads round-trip through Zod codecs at engine boundaries.
- The system tolerates cold items, partial backend availability, and embedding failures without producing fake-success.
- New rows in `learning_captures` and `concepts` default to `embedding_tier = 'cold'`. The column flips to `'hot'` ONLY after a vector row lands in `embeddings_vec`, and the flip happens in the same transaction as the vec insert (or vec upsert during rehydration). GC eviction flips the column back to `'cold'` in the same transaction as the vec delete.
- Every retrieval call returns `{ memories, diagnostics }`. `diagnostics.status` is one of `'ok'`, `'partial'`, `'unavailable'`. Partial results explicitly record `failedSources`, `timedOutSources`, `vecAvailable`, `ftsAvailable`, and `partialReason`. Callers can detect degradation without inspecting result length.
</acceptance_criteria>

---

## Open Questions

🟢 Hybrid retrieval = vec ∥ FTS5 with RRF (`k = 60`) — LOCKED.
🟢 Tier model = hot if vector row in `embeddings_vec`, cold otherwise; denormalized `embedding_tier` column kept in sync — LOCKED.
🟢 GC threshold = 5,000 active vectors; eviction = low strength + cold access — LOCKED.
🟢 JIT rehydration = top-result-only, async, idempotent — LOCKED.
🟢 Token estimator = `chars / 4`; default budget 1,500; default max items 8 — LOCKED.
🟢 Drop-rather-than-truncate on budget overflow — LOCKED.
🟡 RRF coefficients and recency/strength multipliers — placeholders; relock after Stage 7 produces real chat-injection signal.
🟡 Embedder fallback chain (provider order on rehydration) — inherits from existing fallback engine; documented when needed.
🟡 Multi-language tokenizer (porter unicode61 vs alternatives) — acceptable for current corpus; revisit if non-English content grows.
🟡 Cross-device sync of `last_accessed_at` and tier — single-device only for now; deferred until sync is in scope.
