# Learning Native Bridge (ObjectBox Contract)

This file is the implementation contract for the native semantic-memory pipeline used by the Learning Hub.

## Goal

Keep semantic retrieval native-first on Android to avoid UI stutter and make the contract stable for future ObjectBox backend swaps.

## Runtime Layers

1. JS app logic (`scripts/16-learning.js`)
2. JS embedding layer (`scripts/17-learning-embeddings.js`)
3. Native bridge (`ObjectBoxBridge.java`)
4. Native persistent vector store (currently SharedPreferences-backed map, contract-ready for ObjectBox engine)
5. JS local vector cache (`codelens_learning_vectors_v1`)

## JS Interface Contract

Exposed by and primarily used in `scripts/17-learning-embeddings.js` (invoked from learning flows in `16-learning.js`):

- `getTopMatches(payload)`
- `upsertEmbedding(payload)`
- `deleteEmbedding(payload)`

All three call `window.ObjectBoxBridge` methods with JSON-string payloads and parse JSON responses.

## Payloads

### upsertEmbedding

```json
{
  "id": "concept-id",
  "vector": [0.0123, -0.0331, 0.777],
  "model": "text-embedding-model",
  "api": "openrouter|siliconflow",
  "signature": "concept-signature-hash-string",
  "updatedAt": "2026-04-13T16:50:00.000Z"
}
```

### getTopMatches

```json
{
  "vector": [0.015, -0.041, 0.744],
  "ids": ["concept-a", "concept-b", "concept-c"],
  "limit": 50
}
```

Response:

```json
{
  "ok": true,
  "matches": [
    { "id": "concept-b", "score": 0.91, "cosine": 0.82 }
  ]
}
```

### deleteEmbedding

```json
{
  "id": "concept-id"
}
```

## Data Ownership

- JS keeps `state.learningHub.embeddings` as metadata only:
  - `{ api, model, updatedAt, signature, nativeSyncedAt, nativeSignature }`
- JS keeps raw vectors in localStorage key `codelens_learning_vectors_v1`:
  - `{ "<conceptId>": [float, float, ...] }`
- Native store is source of truth for native semantic matching.

## Native Storage Layout (current implementation)

- SharedPreferences file: `codelens_learning_vectors`
- Per-id rows: `vec.<conceptId>` -> compact JSON payload
- Legacy migration: if `embeddings_json` exists, it is migrated once into per-id rows and then removed.

## Sync Rules

1. When a concept embedding is generated or refreshed, JS calls `upsertEmbedding`.
2. If a concept is unchanged but not yet synced (`nativeSyncedAt` missing or signature changed), JS re-upserts.
3. When concepts are pruned, JS calls `deleteEmbedding`.
4. Retrieval path:
   - native `getTopMatches` first
   - JS cosine fallback if native unavailable

## Reset / Import Rules

Because vectors live in a dedicated store outside the main state blob, two
helpers in `17-learning-embeddings.js` keep the three layers (metadata,
JS vector store, native bridge) coherent across wipes and restores:

- `clearAllLearningVectors()` — called from `clearAllData()` and
  `importBackup()`. Drops the `codelens_learning_vectors_v1` key, clears
  the in-memory map + query cache + in-flight jobs, and issues
  `deleteEmbedding` to the native bridge for every known id.
- `resetLearningEmbeddingSyncFlags(map)` — called from `importBackup()`
  immediately after the imported state is merged. Clears
  `nativeSyncedAt` / `nativeSignature` on every concept metadata record.
  Without this, imported concepts look already-synced and
  `ensureNativeEmbeddingSynced()` skips the upsert — leaving the native
  store empty while JS believes it is populated.

## Android Wiring

- `MainActivity.java` registers:
  - `NativeSecureStore` (API keys)
  - `ObjectBoxBridge` (learning vectors)
- `ObjectBoxBridge.java` lives at:
  - `android/app/src/main/java/com/codelens/app/ObjectBoxBridge.java`

## Future ObjectBox Swap

To switch to full ObjectBox engine:

1. Keep the bridge method names + payload contract unchanged.
2. Replace storage internals in `ObjectBoxBridge.java` from SharedPreferences map to ObjectBox entities/queries.
3. Keep JS untouched except optional tuning of `limit` and thresholds.
