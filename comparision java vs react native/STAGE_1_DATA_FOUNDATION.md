# Stage 1 — Data Foundation

> Schema design for the capture-first learning model.
> Implementation-ready: another agent (Codex) can write the Drizzle migration directly from this spec.
> Aligned with `whatwe_agreedonthearchitecture.md` (branded IDs, Zod codecs, strict TS, transactions, loud failures).

---

## Scope

This stage delivers the schema, branded IDs, and Zod codecs. No UI, no extractor, no save flow yet.

### In scope
- `learning_captures` table (new)
- `concepts` table upgrade (new fields, deprecated fields removed)
- Branded `LearningCaptureId`, `ConceptId`
- Zod codecs at every JSON boundary
- Indexes
- Migration plan (new install + existing-data path)
- Embedding hooks (capture and concept both embedded)

### Out of scope (later stages)
- Extractor prompts (Stage 2)
- Save modal UI (Stage 2)
- Card components (Stage 3)
- Hub surfaces (Stage 4)
- Promotion suggestion logic (Stage 5)
- Dot Connector / personas / memory injection (Stage 6)

---

## Schema Rules

<schema_rules>
- familiarity_score and importance_score live on CONCEPTS ONLY — never on captures
- Captures have extraction_confidence (extractor metadata only, not strength)
- Captures have embedding_status (async state — never a blocking save condition)
- Captures have derived_from_capture_id (chain ref for Continue-from-capture, null for originals)
- representative_capture_ids_json on concepts REFERENCES captures — no snippet text duplication
- language_or_runtime_json is an ARRAY on concepts — one concept can have many languages
- surface_features_json is SEPARATE from language_or_runtime_json — never collapse the two
- On concept FK delete: capture.linked_concept_id → NULL, capture.state → unresolved. Capture survives.
</schema_rules>

---

## Familiarity & Importance Lifecycle Rules

<familiarity_rules>
- familiarity_score MUST NOT change on save.
- familiarity_score MUST ONLY change during explicit review / revisit flows.
- familiarity_score MUST NOT be inferred from capture count, save count, or recurrence.
- familiarity_score updates MUST be explicit and intentional, tied to a review outcome or user action.
- A linked capture MAY later affect importance_score, but it MUST NOT imply mastery.
- Phase 1 leaves importance_score stable unless a later stage explicitly defines a safe update rule.
</familiarity_rules>


---

## Tables

### `learning_captures`

Primary truth object. Saves the learning moment. Stays valid even with no concept linked.

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | TEXT PRIMARY KEY | NO | Branded `LearningCaptureId`. Format: `lc_` + uid. |
| `title` | TEXT | NO | Short label, user-editable within the 24h edit window. |
| `what_clicked` | TEXT | NO | The user's mental-model phrasing of what they understood. |
| `why_it_mattered` | TEXT | YES | Optional. User's reason this stuck. |
| `raw_snippet` | TEXT | NO | Source-grounded evidence text. Boundaries adjustable, content NOT freely editable. |
| `snippet_lang` | TEXT | YES | Detected/declared language (e.g. "typescript"). |
| `snippet_source_path` | TEXT | YES | Repo-relative file path. |
| `snippet_start_line` | INTEGER | YES | 1-indexed inclusive. |
| `snippet_end_line` | INTEGER | YES | 1-indexed inclusive. |
| `chat_message_id` | TEXT | YES | If capture was generated from a chat exchange. |
| `session_id` | TEXT | YES | Project/session ref for retrieval & "flashback" navigation. |
| `state` | TEXT | NO | One of `unresolved` \| `linked` \| `proposed_new`. CHECK constraint. |
| `linked_concept_id` | TEXT | YES | FK to `concepts.id`. Null when state = `unresolved` or `proposed_new`. |
| `editable_until` | INTEGER | NO | ms epoch. Default = `created_at + 24h`. After this, capture is immutable except via Continue-from-capture chat. |
| `extraction_confidence` | REAL | YES | Extractor's self-reported confidence on this capture (0..1). Metadata only — not the same as concept strength. Domain field: `extractionConfidence`. |
| `derived_from_capture_id` | TEXT | YES | FK to `learning_captures.id`. Populated when this capture was created via a Continue-from-capture chat. Null for all original captures. |
| `embedding_status` | TEXT | NO | `pending` \| `ready` \| `failed`. Default `pending`. Embedding is async — save never fails due to embedding. |
| `embedding_retry_count` | INTEGER | NO | Default 0. Increments on each retry attempt. Surface in diagnostics when stuck at `failed`. |
| `concept_hint_json` | TEXT | YES | Zod-validated JSON. Extractor's candidate concept identity. |
| `keywords_json` | TEXT | NO | Zod-validated JSON. Default `[]`. Extracted keywords for FTS5 + Dot Connector matching. |
| `created_at` | INTEGER | NO | ms epoch. |
| `updated_at` | INTEGER | NO | ms epoch. |

**Indexes:**
- `idx_captures_state` on (`state`)
- `idx_captures_linked_concept` on (`linked_concept_id`)
- `idx_captures_session` on (`session_id`)
- `idx_captures_created_at` on (`created_at` DESC) — Recent Captures feed

**FK:**
- `linked_concept_id` REFERENCES `concepts(id)` ON DELETE SET NULL
  - On concept delete, capture survives (capture is primary truth) and reverts to `unresolved`.

---

### `concepts` (upgraded)

Secondary knowledge object. Patterns across captures.

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `id` | TEXT PRIMARY KEY | NO | Branded `ConceptId`. Format: `c_` + uid. |
| `name` | TEXT | NO | Canonical, language-agnostic. **Never include language suffix.** "Closure", not "Closure (JS)". |
| `normalized_key` | TEXT | NO | Lowercased, whitespace-collapsed name. UNIQUE. Used for cross-language dedup. |
| `canonical_summary` | TEXT | YES | One-paragraph language-agnostic summary. |
| `concept_type` | TEXT | NO | Enum (see below). CHECK constraint. |
| `core_concept` | TEXT | YES | Abstract CS mechanism (e.g. "lexical scope"). |
| `architectural_pattern` | TEXT | YES | E.g. "Observer", null if N/A. |
| `programming_paradigm` | TEXT | YES | E.g. "functional", "OOP". |
| `language_or_runtime_json` | TEXT | NO | Zod-validated JSON `string[]`. Default `[]`. Grows as same concept is encountered in new languages. |
| `surface_features_json` | TEXT | NO | Zod-validated JSON `string[]`. Default `[]`. Concrete syntax features (e.g. ["async/await"]). |
| `prerequisites_json` | TEXT | NO | Zod-validated JSON `ConceptId[]`. Default `[]`. |
| `related_concepts_json` | TEXT | NO | Zod-validated JSON `ConceptId[]`. Default `[]`. |
| `contrast_concepts_json` | TEXT | NO | Zod-validated JSON `ConceptId[]`. Default `[]`. |
| `representative_capture_ids_json` | TEXT | NO | Zod-validated JSON `LearningCaptureId[]`. Default `[]`. References to captures that best represent this concept. Captures are the evidence source — no snippet duplication on concept. |
| `familiarity_score` | REAL | NO | Default 0. Range 0..1. |
| `importance_score` | REAL | NO | Default 0. Range 0..1. |
| `created_at` | INTEGER | NO | ms epoch. |
| `updated_at` | INTEGER | NO | ms epoch. |

**Indexes:**
- `unique_concepts_normalized_key` UNIQUE on (`normalized_key`)
- `idx_concepts_concept_type` on (`concept_type`)

**Deprecated columns (drop in this migration):**
- `language_syntax` — replaced by `language_or_runtime_json` + `surface_features_json` split.
- (Any other legacy taxonomy fields not in the table above — keep as-is if still useful, drop if dead.)

---

### `concept_type` enum 🔒 LOCKED

12 values. No fallback "other" — extractor must pick a real type. Organized around **kinds of understanding**, not kinds of CS topics.

```ts
type ConceptType =
  | 'mechanism'              // how something works internally
  | 'mental_model'           // frame for thinking about code
  | 'pattern'                // reusable implementation shape
  | 'architecture_principle' // structural/system design rule
  | 'language_feature'       // language-provided construct
  | 'api_idiom'              // correct/idiomatic use of a library/framework API
  | 'data_structure'         // way data is organized
  | 'algorithmic_idea'       // problem-solving technique
  | 'performance_principle'  // why/how something is made efficient
  | 'debugging_heuristic'    // method for investigating unknown problems
  | 'failure_mode'           // characteristic way code/systems break
  | 'testing_principle';     // method for verifying behavior
```

**Explicitly NOT included as concept_type:**
- `paradigm` — stays as metadata (`programming_paradigm` column on Concept). "Functional programming" is context, not a type.
- `protocol` — HTTP/OAuth/gRPC route to `mechanism`, `api_idiom`, or `architecture_principle` depending on what clicked.
- `tooling` — type checker → `mechanism` or `language_feature`. Linting rules → `debugging_heuristic` or `testing_principle`.
- `practice` — TDD → `testing_principle`. Code review is not a core concept type.

---

## Branded IDs 🔒 LOCKED

Use `nanoid` directly. Drop any custom `uid()` helper — IDs are boring infrastructure, no reason to maintain a custom one.

```ts
import { nanoid } from 'nanoid';

// Branded types — NEVER cross with raw string in domain layer.
export type LearningCaptureId = string & { readonly __brand: 'LearningCaptureId' };
export type ConceptId         = string & { readonly __brand: 'ConceptId' };

// Generic prefixed-ID factory.
const makeId = <T extends string>(prefix: string): T =>
  `${prefix}_${nanoid(21)}` as T;

// Constructors — ID generation lives in one place.
export const newLearningCaptureId = (): LearningCaptureId => makeId<LearningCaptureId>('lc');
export const newConceptId         = (): ConceptId         => makeId<ConceptId>('c');

// Type guards for codec boundary.
export const isLearningCaptureId = (v: unknown): v is LearningCaptureId =>
  typeof v === 'string' && v.startsWith('lc_');
export const isConceptId = (v: unknown): v is ConceptId =>
  typeof v === 'string' && v.startsWith('c_');
```

**Crypto note:**
- Default `nanoid` uses `crypto.getRandomValues` — works in Expo SDK 54.
- If RN environment can't resolve crypto for any reason, fall back to `expo-crypto`-backed implementation (NOT `nanoid/non-secure`, which uses `Math.random()`).
- `nanoid(21)` ≈ 126 bits of entropy — meets the CTO scaling-risk requirement.

---

## Zod Codecs

Every JSON column gets a codec. Loud failure on parse — never silently fall back to `[]` or `null` if the row is malformed (per architecture contract: no fake-success).

```ts
// Capture
export const KeywordsCodec       = z.array(z.string()).default([]);
export const ConceptHintCodec    = z.object({
  proposedName: z.string(),
  proposedNormalizedKey: z.string(),
  proposedConceptType: ConceptTypeEnum,
  confidence: z.number().min(0).max(1),
}).nullable();

// Concept
export const LanguageOrRuntimeCodec = z.array(z.string()).default([]);
export const SurfaceFeaturesCodec   = z.array(z.string()).default([]);
export const ConceptIdArrayCodec    = z.array(z.string().refine(isConceptId)).default([]);
export const RepresentativeCaptureIdsCodec = z.array(z.string().refine(isLearningCaptureId)).default([]);
```

**Row-to-domain mapping** (one mapper per table — no raw spreads):

```ts
export const captureRowToDomain = (row: LearningCaptureRow): LearningCapture => ({
  id: row.id as LearningCaptureId,
  title: row.title,
  whatClicked: row.what_clicked,
  whyItMattered: row.why_it_mattered ?? null,
  rawSnippet: row.raw_snippet,
  snippetLang: row.snippet_lang ?? null,
  snippetSource: row.snippet_source_path
    ? { path: row.snippet_source_path, startLine: row.snippet_start_line!, endLine: row.snippet_end_line! }
    : null,
  state: row.state as CaptureState,
  linkedConceptId: row.linked_concept_id as ConceptId | null,
  editableUntil: row.editable_until,
  extractionConfidence: row.extraction_confidence ?? null,
  derivedFromCaptureId: row.derived_from_capture_id as LearningCaptureId | null,
  embeddingStatus: row.embedding_status as EmbeddingStatus,
  conceptHint: ConceptHintCodec.parse(row.concept_hint_json ? JSON.parse(row.concept_hint_json) : null),
  keywords: KeywordsCodec.parse(JSON.parse(row.keywords_json)),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
```

---

## Computed Strength

```ts
// Single composite for current UI use, while the underlying split lives in the DB.
// Intentionally simple — refine after real data exists.
export const computeStrength = (familiarity: number, importance: number): number => {
  // Cap at 1. Equal weight initially. Importance has slight floor effect so a
  // very-important-but-rarely-seen concept doesn't render as "weak".
  const importanceFloor = 0.1 * importance;
  return Math.min(1, importanceFloor + 0.7 * familiarity + 0.3 * importance);
};
```

🟡 Coefficients are placeholders. Lock after Stage 4 produces real signal.

---

## Embedding Hooks

Both captures and concepts get embedded. Hot/Cold tier already exists.

**Capture embedding source text:**
```
${title}\n\n${whatClicked}\n\n${whyItMattered ?? ''}\n\n${rawSnippet.slice(0, 800)}
```

**Concept embedding source text:**
```
${name}\n\n${canonicalSummary ?? ''}\n\n${coreConcept ?? ''}
```

> Concept embedding deliberately excludes language to support cross-language retrieval (Pattern Transfer Section 6).
> Capture embedding includes the snippet to ground in evidence.

<embedding_rules>
- Embedding MUST happen OUTSIDE the save transaction — never inside
- Embedding failure MUST NOT rollback or hide the capture
- Save returns to user immediately after DB write — embedding_status starts as 'pending'
- Background job sets embedding_status to 'ready' on success, 'failed' on failure
- Failed embeddings surface in diagnostics and retry on next app foreground — DO NOT delete or hide the capture
- Concept embedding excludes language_or_runtime to support cross-language retrieval
- Capture embedding includes rawSnippet (capped at 800 chars) to ground in evidence
</embedding_rules>

---

## Save Transaction Shape (Preview — full flow in Stage 2)

This stage doesn't build the save flow. But the schema enables this transaction shape:

<transaction_rules>
- DB write MUST be atomic (capture row + optional concept update in one transaction)
- Embedding enqueue MUST happen outside the transaction
- Embedding failure MUST NOT rollback the capture
- Concept auto-creation MUST NOT happen inside this transaction
- If concept hint matches existing concept → update language_or_runtime_json + set state = 'linked'
- If no match → capture stays unresolved, concept_hint_json stored for later promotion
</transaction_rules>

```ts
// Step 1: DB write — atomic, must succeed, never blocked by embedding.
await db.transaction(async (tx) => {
  // 1a. Insert capture row (embedding_status = 'pending').
  await captureRepo.insert(tx, capture);

  // 1b. If extractor produced a concept hint matching an existing concept (cross-language match):
  //     - update existing concept's language_or_runtime_json (append new lang)
  //     - set capture.linked_concept_id, capture.state = 'linked'
  // 1c. Else if extractor produced a fresh proposal:
  //     - capture stays state = 'unresolved' (do NOT auto-create concept)
  //     - concept_hint_json carries the proposal for later promotion
});

// Step 2: Return to user. Capture is saved. UI can show it immediately.

// Step 3: Background — enqueue embedding job (outside transaction).
embeddingQueue.enqueue({
  captureId: capture.id,
  text: buildCaptureEmbeddingText(capture),
  onSuccess: () => captureRepo.setEmbeddingStatus(capture.id, 'ready'),
  onFailure: () => captureRepo.incrementEmbeddingRetry(capture.id),
});
```

---

## Migration Plan

### New install
- Run all `CREATE TABLE` statements.
- Seed nothing.

### Existing install (data already in old `concepts` table)

<migration_rules>
- NEVER silently drop data — preserve language_syntax as language_syntax_legacy until verified clean
- Backfill MUST be deterministic (token routing only — no AI, no inference)
- Drop deprecated columns ONLY AFTER verification query confirms backfill coverage
- Recompute embeddings for all concepts touched by the migration (source text changed)
- If both arrays end up empty after backfill → keep language_syntax_legacy populated, flag for manual review
</migration_rules>

1. Create `learning_captures` table.
2. Add new columns to `concepts` (default `[]` JSON or null).
3. Backfill: split old `language_syntax` into `language_or_runtime_json` + `surface_features_json` (rules below).
4. Preserve original `language_syntax` as `language_syntax_legacy` until backfill verified — do NOT drop early.
5. Recompute concept embeddings (since source text changed).

### 🔒 Backfill rules for `language_syntax`

**Token routing:**
- Token matches `LANGUAGE_OR_RUNTIME_TOKENS` (below) → `language_or_runtime_json`
- Else → `surface_features_json`
- Low-confidence row (no clear classification, both arrays empty) → keep `language_syntax_legacy` populated, flag for manual review

**Token list (deterministic, expand as needed):**

```ts
const LANGUAGE_OR_RUNTIME_TOKENS = [
  // languages
  'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift',
  'objective-c', 'c', 'c++', 'cpp', 'c#', 'csharp', 'go', 'golang',
  'rust', 'ruby', 'php', 'scala', 'elixir', 'erlang', 'clojure',
  'haskell', 'lua', 'dart', 'r', 'sql', 'bash', 'shell', 'zsh',
  'powershell',
  // web / markup
  'html', 'css', 'scss', 'sass', 'xml', 'json', 'yaml', 'yml',
  'graphql',
  // runtimes/platforms
  'node', 'node.js', 'nodejs', 'deno', 'bun', 'browser', 'web',
  'ios', 'android', 'react native', 'expo',
  // frameworks/libraries (context, not syntax)
  'react', 'next.js', 'nextjs', 'vue', 'nuxt', 'svelte', 'angular',
  'express', 'fastify', 'nestjs', 'django', 'flask', 'fastapi',
  'rails', 'spring', 'spring boot',
  // testing/runtime ecosystems
  'jest', 'vitest', 'playwright', 'cypress', 'pytest', 'junit',
];
```

**Edge handling:**
- `ES6` / `ES2015` / `ECMAScript` → `surface_features` (language-era feature surface, not runtime identity).
- Versioned tokens like `TypeScript 5`, `Node 20`, `React 19` → strip version, normalize to `TypeScript`, `Node`, `React`.
- Aliases `JS` / `TS` / `Py` / `RN` → expand to canonical `JavaScript` / `TypeScript` / `Python` / `React Native`.
- Compound tokens like `React hooks` → split: `React` → `language_or_runtime`, `hooks` → `surface_features`.
- `async/await`, `generics`, `destructuring`, `decorators`, `hooks`, `closures`, `dependency array` → `surface_features`.
- Unknown tokens → `surface_features` by default. Promote to `LANGUAGE_OR_RUNTIME_TOKENS` only if it's clearly a framework/runtime worth tracking.

**Field semantics:**
- `language_or_runtime` allows language + runtime + framework + platform tokens. Field name kept stable for clarity; semantic scope is "execution context" not "language identity only".

---

## Architecture Contract Checks

<architecture_constraints>
- All new files under src/features/learning/ — barrel discipline enforced
- No as any in data layer — branded IDs throughout
- Zod parse on EVERY JSON column read — throw on invalid, never ?? [] fallback
- Codec parse errors throw loudly — no fake-success on malformed data
- Repo helpers accept DbOrTx for transaction threading
- TanStack query key factories only — no hardcoded queryKey arrays
- Embedding is async — embedding failure does NOT roll back the capture row
</architecture_constraints>

| Constraint | How this stage satisfies it |
|------------|-----------------------------|
| Feature co-location | All new files under `src/features/learning/` (data, codecs, types). Barrel exports per repo convention. |
| Drizzle transactions | Save transaction (Stage 2) is atomic. This stage's repo helpers thread `DbOrTx`. |
| Strict TS + branded IDs | `LearningCaptureId`, `ConceptId` brands. No `as any` in data layer. |
| Zod at JSON boundaries | Every JSON column has a codec. Mappers parse on read, stringify on write. |
| Loud failures | Codec parse errors throw. No `?? []` silent fallback on malformed JSON. |
| TanStack query keys | Factories: `captureKeys.byId(id)`, `captureKeys.recent()`, `conceptKeys.byId(id)`, `conceptKeys.byNormalizedKey(key)`. No hardcoded arrays. |
| No silent reroute / fake success | DB write (capture row) is atomic and must succeed loudly. Embedding is async — `embedding_status` tracks state. Failed embeddings surface in diagnostics and retry; they do NOT roll back the capture. |

---

## Deliverables

When this stage is implemented:

1. `src/features/learning/data/schema.ts` — Drizzle table definitions
2. `src/features/learning/data/migrations/NNNN_capture_first_model.sql` (or Drizzle migration file)
3. `src/features/learning/types/ids.ts` — branded ID types + constructors
4. `src/features/learning/codecs/capture.ts` — `KeywordsCodec`, `ConceptHintCodec`, mappers
5. `src/features/learning/codecs/concept.ts` — concept codecs + mappers
6. `src/features/learning/data/captureRepo.ts` — typed repo with DbOrTx threading
7. `src/features/learning/data/conceptRepo.ts` — same pattern
8. `src/features/learning/data/queryKeys.ts` — TanStack key factories
9. `src/features/learning/strength/computeStrength.ts` — composite scorer
10. Tests:
    - codec round-trip tests (parse → stringify → parse)
    - capture insert + recent query
    - concept insert + dedup by `normalized_key`
    - migration backfill on a fixture DB
    - strength composite is monotonic in both inputs

---

## Open Questions Blocking This Stage

🟢 All Stage 1 blockers resolved (2026-04-25):
- `concept_type` enum locked — 12 values organized by kind of understanding
- `language_syntax` backfill rules locked — deterministic token routing + legacy column preserved
- ID generation locked — `nanoid(21)` with prefixed `makeId<T>()` helper, custom helpers dropped

Stage 1 is implementable. Codex can write the Drizzle migration directly from this spec.
