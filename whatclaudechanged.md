# What Claude Changed

Session date: 2026-04-14. Author: Claude Opus 4.6 (1M context), running inside
Claude Code VSCode extension. Scope: four architectural upgrades requested by
the user after reviewing the docs indexed by `codelens-full/MAIN.md`.

This document is written so another agent (e.g. Codex) can pick up the project
and know exactly what moved where, why, and what is still open.

## 1) Provider model lists + per-task routing

### Why
The user noticed the app exposes a tiny, hand-picked set of provider models
and that no DeepSeek / Qwen-Coder / Llama-3.3 options were reachable from
either provider's dropdown, even though both OpenRouter and SiliconFlow accept
those model IDs. The root cause was simply the two hardcoded arrays in
`scripts/01-state.js`. Separately, every scope (`section`, `general`) was
routed to the same default model, which is wrong — section chat benefits from
a coder model, learning summarization benefits from a reliable JSON model,
and general chat wants a strong instruct model.

### What changed

**`codelens-full/www/scripts/01-state.js`** (mirrored to
`codelens-full/android/app/src/main/assets/public/scripts/01-state.js`):

- `OPENROUTER_MODEL_OPTIONS` expanded from 6 to 14 models. Added:
  Llama 3.3 70B (free), Qwen 2.5 Coder 32B, Qwen 2.5 72B Instruct,
  DeepSeek V3 Chat, DeepSeek R1, DeepSeek R1 Distill Llama 70B,
  Gemma 2 27B IT, Nemotron 70B. Each option now carries a `tags` array
  (`'code' | 'general' | 'cheap' | 'free' | 'learning' | 'reason'`) so future
  UI can filter/label by capability without re-editing JS.
- `SILICONFLOW_MODEL_OPTIONS` expanded from 5 to 11 models. Added:
  Qwen 2.5 Coder 7B/32B, DeepSeek V2.5, DeepSeek Coder V2 Instruct,
  DeepSeek R1 Distill Qwen 32B, Meta Llama 3.1 8B.
- New constant `SCOPE_RECOMMENDED_MODELS` — a (scope × provider) → modelId
  table. Single source of truth for "what model should scope X default to?".
- New constant `CHAT_SCOPES = ['section', 'general', 'learning']`. The
  previous list was hardcoded inline in two places.
- New helper `getDefaultModelForProviderInScope(provider, scope)` — returns
  the scope-recommended model, falling back to the legacy default.
- `state.chatConfig` seed now includes a third scope, `learning`. Default
  models: OpenRouter → `deepseek/deepseek-chat`, SiliconFlow →
  `deepseek-ai/DeepSeek-V2.5`. These are strong JSON-output models, which is
  what the learning extractor needs.
- `ensureStateShape()` now iterates `CHAT_SCOPES` (not `['section', 'general']`),
  so the `learning` scope is normalized on every boot.
- `setChatModel` no longer updates the legacy top-level `state.openrouterModel`
  / `state.siliconflowModel` for non-section scopes. Those legacy fields now
  track section-scope only, which preserves older code paths while letting
  general/learning pick independently.
- `getChatModel` / `setChatProvider` fall back to the scope-aware default
  instead of the bare provider default.

**`codelens-full/www/scripts/16-learning.js`** (mirrored):

- `sendLearningReviewMessage` (line ~1447): provider/model lookup changed
  from `getChatProvider('general')` to `getChatProvider('learning')`. Review
  chat now routes to the learning-scope model by default.
- `captureCurrentChatLearning` (line ~2299): provider/model lookup forced
  to `getChatProvider('learning')` regardless of where the capture was
  triggered. Strict-JSON extraction now always uses the learning model, not
  whatever the source chat was configured to use.
- Both `callAI` calls updated to pass `scope: 'learning'` so the in-flight
  request is tagged correctly in the queue/telemetry.

### Not done (deliberate)
The Settings UI does not yet expose a dropdown for the `learning` scope.
Adding it requires HTML changes in `index.html` (both mirrors) plus new CSS
and a new `get*Controls` case in `13-settings.js`. Left out because I can't
render the UI to verify — the existing defaults are sensible and the scope
is still reachable programmatically. Low-risk follow-up.

## 2) Split `16-learning.js` — extract embeddings layer

### Why
`16-learning.js` was 2624 lines with ~80 global functions. The embeddings /
native-bridge layer was the clearest extractable boundary (matches the
`LEARNING_NATIVE_BRIDGE.md` contract surface).

### What changed

**New file: `codelens-full/www/scripts/17-learning-embeddings.js`** (mirrored):

Contains all symbols previously at lines 487–838 of `16-learning.js`:

Constants: `LEARNING_VECTOR_MIN_LENGTH`, `LEARNING_VECTOR_MAX_DIMENSIONS`,
`LEARNING_VECTOR_PREFETCH_LIMIT`, `LEARNING_VECTOR_MAX_UPDATES_PER_QUERY`,
`LEARNING_QUERY_EMBED_CACHE_LIMIT`, `LEARNING_VECTORS_STORAGE_KEY`.

Functions: `getLearningEmbeddingsStore`, `buildLearningConceptSignature`,
`buildLearningConceptEmbeddingText`, `pruneLearningEmbeddingsToKnownConcepts`,
`getLearningCosineSimilarity`, `resolveLearningPayloadObject`,
`getNativeVectorBridge`, `callNativeVectorBridge`, `getTopMatches`,
`upsertEmbedding`, `deleteEmbedding`, `ensureNativeEmbeddingSynced`,
`getLearningSemanticScoresFromNativeBridge`,
`computeLearningSemanticScoresLocally` (signature changed — see below),
`getLearningSemanticScoreMap` (signature changed), `embedTextForLearning`,
`getLearningQueryEmbeddingCacheKey`, `getLearningQueryEmbeddingFromCache`,
`setLearningQueryEmbeddingCache`, `getLearningQueryEmbeddingPayload`,
`ensureLearningEmbeddingForConcept`, `syncLearningConceptEmbeddings`.

Plus new vector-store helpers (see Section 3): `loadLearningVectorsFromStorage`,
`saveLearningVectorsSoon`, `getLearningVector`, `setLearningVector`,
`deleteLearningVector`, `migrateInlineLearningVectors`.

**`codelens-full/www/scripts/16-learning.js`**:

- Lines 487–838 deleted. Replaced with a short comment pointing to the new
  file and listing every symbol it exports. This documents the cross-file
  dependency at the exact spot where a future editor would look.
- `getRelevantLearningConceptPulls` (around the old line 1630) — previously
  fetched `embeddingStore` and passed it to `getLearningSemanticScoreMap` as
  a third arg. Removed: the new implementation reads vectors from the
  dedicated vector store internally, so the embeddingStore parameter is gone.

**`codelens-full/www/index.html`** (mirrored):

- Added `<script src="./scripts/17-learning-embeddings.js"></script>` between
  `16-learning.js` and `15-init-2.js`. Script load order is now:
  `01..14, 16-learning, 17-learning-embeddings, 15-init-2`. Boot still runs
  from `15-init-2.js` via `init();`.

### Load-order note for future editors
17-learning-embeddings.js declares top-level `const` symbols that are
referenced at *runtime* from 16-learning.js. This is safe because:
- 17 loads synchronously *after* 16 (no defer/async).
- References in 16 happen inside function bodies that are called from
  `init()` in 15-init-2.js — which runs last.
If you ever add a top-level call in 16 that reaches into 17, you must swap
the script order or move the symbol.

### Not done (deliberate)
Two other obvious splits — the knowledge-graph renderer (`renderLearningGraph`,
`buildLearningGraphData`, pinch-zoom, mode meta) around lines 1491–1832, and
the learning review chat (`createLearningReviewChat`, `sendLearningReviewMessage`,
`renderLearningReviewChatScreen`, `buildLearningReviewSystemPrompts`) around
lines 1264–1489 — are viable but have more in-file coupling (shared helpers,
navigation state, chat rendering). Left for a follow-up. The embeddings layer
was the isolated surface with the clearest contract.

## 3) Move vectors out of the state blob

### Why
`state.learningHub.embeddings` stored each concept's full vector (up to 256
floats) *inside* the main `codelens_state_v2` localStorage blob. Every
`saveState()` re-serialized every vector; every boot re-parsed them. With
even a few hundred concepts this dominates boot latency and blob size.

### What changed

**New storage key**: `codelens_learning_vectors_v1` in localStorage. Shape:
`{ "<conceptId>": [float, float, ...] }`. Written by `saveLearningVectorsSoon`
(debounced 400ms) in `17-learning-embeddings.js`. Read lazily on first access
to the vector store.

**Metadata map** (`state.learningHub.embeddings[id]`) now holds only:
`{ model, api, updatedAt, signature, nativeSyncedAt, nativeSignature }`.
No `.vector` field. The metadata is persisted inside the main state blob
(cheap), vectors are persisted separately (heavy data, written independently).

**Migration path** (`migrateInlineLearningVectors`): called from
`ensureStateShape()` after embedding-metadata normalization. For any record
whose `.vector` is still inline (pre-v2 persisted state), the array is copied
into the separate vector store, then `delete record.vector`. Idempotent —
subsequent boots see no inline vectors, so the loop is a no-op.

**Belt-and-suspenders**: `getPersistedStateSnapshot()` in `01-state.js` now
rebuilds `learningHub.embeddings` without any `.vector` field before the
state blob is stringified. Even if a code path ever writes `.vector` back,
it won't persist into the main blob.

**Consumer updates in `17-learning-embeddings.js`**:
- `ensureNativeEmbeddingSynced` now reads the vector from
  `getLearningVector(id)` instead of `embeddingRecord.vector`.
- `computeLearningSemanticScoresLocally` likewise.
- `ensureLearningEmbeddingForConcept` writes via `setLearningVector` and
  stores only metadata on the state record.
- `syncLearningConceptEmbeddings` and `ensureLearningEmbeddingForConcept`
  check "do we already have a usable vector?" by consulting the vector
  store, not the metadata record.
- `pruneLearningEmbeddingsToKnownConcepts` additionally calls
  `deleteLearningVector(id)` for each pruned record.

### Compatibility
- **Existing users**: on first boot after this upgrade, all inline vectors
  migrate to the new store on the first `ensureStateShape()` call. No data
  loss. No sync required.
- **Native bridge**: contract unchanged — JS still calls `upsertEmbedding`
  with `{ id, vector, ... }`, so the native store gets fresh copies on
  subsequent syncs.
- **Backup/import** (`14-backup.js`): currently serializes `state`. Exports
  from this version will NOT include vectors (since they live outside state).
  This is a known tradeoff — vectors are regenerated from concept text
  anyway, so re-import will trigger re-embedding. If this becomes a UX
  problem, add vector inclusion to the backup JSON in a follow-up.

## 4) Native vector store upgrade

### Why
`ObjectBoxBridge.java` stored all embeddings in a single SharedPreferences
entry (`embeddings_json`) as one giant JSON blob. Every upsert re-serialized
the entire map. Every `getTopMatches` recomputed √norm per candidate per
query. Both scale poorly.

### What changed

**`codelens-full/android/app/src/main/java/com/codelens/app/ObjectBoxBridge.java`**
fully rewritten. Same public JS interface — `upsertEmbedding`,
`deleteEmbedding`, `getTopMatches` — same JSON payload shapes (contract in
`LEARNING_NATIVE_BRIDGE.md` is intact).

Internal changes:

1. **Per-id SharedPreferences rows**. Each embedding is now stored under key
   `vec.<id>` as its own JSON string. Upsert writes one row; delete removes
   one row. No more re-serializing the whole store per operation.
2. **Compact row schema**: `{ v, m, a, s, u }` (short keys) to keep per-row
   bytes low. The `fromJson` parser accepts both short and legacy long keys
   so migration parsing is a no-op.
3. **Legacy migration** (`migrateLegacyBlobLocked`): the first load after
   this upgrade detects the old `embeddings_json` blob, fans it out into
   per-id rows, then deletes the blob. One-shot, idempotent. If the legacy
   blob is corrupt, it is dropped rather than retried forever.
4. **Precomputed norms**: every `StoredEmbedding` caches its L2 norm at
   load time and at upsert time. `getTopMatches` now uses
   `cosineSimilarityWithCachedNorms(query, queryNorm, vec, vecNorm)` —
   one dot-product per candidate, one √ per query instead of one per
   candidate.
5. **Load path**: `ensureLoadedLocked()` iterates `prefs.getAll()` once,
   filters by key prefix `vec.`, and builds the in-memory map. Runs exactly
   once per process.

### NOT done — actual ObjectBox library
The user asked for a "real ObjectBox swap". That requires adding the
ObjectBox Gradle plugin, annotation processor, `@Entity` classes, and
touching `build.gradle`. I skipped it because I can't run the Android build
from this environment to verify the new Gradle config compiles — and a
broken Gradle config would block APK production until fixed at the user's
machine. The JSON bridge above delivers most of the performance win (per-id
rows + cached norms) without any dependency change. When the user wants to
swap to real ObjectBox, the JS contract will stay identical; only this Java
file needs to change — see the "Future ObjectBox Swap" section of
`codelens-full/LEARNING_NATIVE_BRIDGE.md`.

## 5) Mirror sync

`codelens-full/www/` and `codelens-full/android/app/src/main/assets/public/`
must stay in lock-step (per `MAIN.md` §14 maintenance rule).

Pre-session state: **mirrors had drifted** — the Android copy was ahead of
`www/` on three files (`07-general-chat.js`, `09-folders-snippets.js`,
`12-ai-api.js`). The Android copies carried:
- `touchGeneralChatActivity` wiring in general-chat / folders-snippets,
- `EMBEDDING_MODELS` constants and `stripMarkdownCodeFences` /
  `extractLikelyJSONObject` helpers in the AI layer.

First action in this session: synced `www/` ← `android/` for those three
files so both trees share the more-advanced version. All subsequent edits
made in `www/` were then copied forward to Android.

Final state: `diff -q` on both tree's `scripts/` directories reports zero
differences. Index.html differs only in line-ending style (CRLF vs LF) —
the script-tag set is identical.

### Follow-up opportunity
The maintenance rule invites drift. A tiny script at build-time that
`cp -r www/* android/.../assets/public/` (or symlinks the directory) would
remove a whole class of bug. Not added yet.

## Files touched

Created:
- `codelens-full/www/scripts/17-learning-embeddings.js`
- `codelens-full/android/app/src/main/assets/public/scripts/17-learning-embeddings.js`
- `whatclaudechanged.md` (this file)

Modified:
- `codelens-full/www/scripts/01-state.js`
- `codelens-full/www/scripts/16-learning.js`
- `codelens-full/www/index.html`
- `codelens-full/android/app/src/main/assets/public/scripts/01-state.js`
- `codelens-full/android/app/src/main/assets/public/scripts/16-learning.js`
- `codelens-full/android/app/src/main/assets/public/index.html`
- `codelens-full/android/app/src/main/java/com/codelens/app/ObjectBoxBridge.java`

Synced (www was behind, copied from android):
- `codelens-full/www/scripts/07-general-chat.js`
- `codelens-full/www/scripts/09-folders-snippets.js`
- `codelens-full/www/scripts/12-ai-api.js`

## Known caveats for Codex / next agent

1. **No Gradle build was run**. The Java rewrite (`ObjectBoxBridge.java`)
   was edited in place. Syntax was double-checked but a `./gradlew assembleDebug`
   pass on the user's machine is the real verification.
2. **No browser runtime was exercised**. JS edits are consistent with the
   existing global-function pattern and script order. A manual smoke test
   (open the app, trigger a learning capture, trigger a review chat, check
   the knowledge graph) is the right final check.
3. **Docs in `codelens-full/*.md` were not rewritten** to reflect the new
   `17-learning-embeddings.js` boundary, the new `learning` scope, or the
   vector-store-outside-state change. `APP_STRUCTURE.md`, `MAIN.md`, and
   `LEARNING_NATIVE_BRIDGE.md` all still describe the pre-refactor shape.
   A doc pass is the obvious follow-up so `MAIN.md`-driven bundling stays
   accurate.
4. **Backup export** now excludes learning vectors (they live in a separate
   localStorage key). If a user exports + re-imports, concepts will
   regenerate embeddings on next semantic pull. This is acceptable but
   worth knowing.
5. **Settings UI** has no `learning` scope dropdown yet. Power users wanting
   to change the learning model have to edit `state.chatConfig.learning.models`
   manually (or wait for the UI pass).

## Post-session fix: reset/import leak (flagged by Codex)

Codex correctly pointed out that the initial refactor left two holes:

- `clearAllData()` in `14-backup.js` removed the main state blob and the
  legacy state key but **did not touch** the new `codelens_learning_vectors_v1`
  key. Vectors survived a full reset.
- `importBackup()` merged the imported state on top of the existing one
  without first clearing the local vector store. Stale vectors from the
  previous install would then get matched against freshly-imported concepts
  that happened to share ids, producing ghost semantic hits.

### Fix

**`codelens-full/www/scripts/17-learning-embeddings.js`** — new exported
helper `clearAllLearningVectors()`:
- Iterates every known id and calls `deleteEmbedding({ id })` on the native
  bridge (best effort — the bridge may be absent on web).
- Clears the in-memory `learningVectorStore` map, the query-embedding LRU
  cache, and any in-flight embedding jobs.
- Cancels the pending debounced save timer and resets the dirty flag.
- Removes `codelens_learning_vectors_v1` from localStorage.

**`codelens-full/www/scripts/14-backup.js`**:
- `importBackup` now calls `clearAllLearningVectors()` right before applying
  the imported state (guarded with `typeof === 'function'` so the hook stays
  optional).
- `clearAllData` likewise calls it before `location.reload()`.

Both changes mirrored to `android/app/src/main/assets/public/scripts/`.
Parse-checked with `node -c`. Mirrors back in lock-step.
