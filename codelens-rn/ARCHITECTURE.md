# CodeLens RN — Architecture

## Overview

CodeLens is a mobile-first code learning app built with Expo SDK 54, React Native 0.81.5, and TypeScript 5.9.2 (strict + `exactOptionalPropertyTypes`). It runs on-device AI chat, code marking/highlighting, and a knowledge graph backed by local RAG (sqlite-vec + op-sqlite).

Planned direction: keep the coding product first-class while moving hardcoded coding-learning assumptions into a profile/ontology layer. The strategic docs live under [ONTOLOGY_PROFILE_REFACTOR/](ONTOLOGY_PROFILE_REFACTOR/README.md). Until that refactor lands, this file describes the current learning-first implementation.

## Directory Structure

```
codelens-rn/
├── app/                          # Expo Router screens (thin composition layer)
│   ├── _layout.tsx
│   ├── index.tsx                 # Home — projects + recent chats
│   ├── dev.tsx                   # Dev/debug screen
│   ├── settings.tsx              # AI provider config + re-embed
│   ├── chat/[id].tsx             # Section chat (code-scoped)
│   ├── general-chat/[id].tsx     # General chat
│   ├── learning/
│   │   ├── index.tsx             # Learning Hub — concepts + sessions
│   │   └── chat/[id].tsx         # Learning chat (concept review)
│   └── project/[id].tsx          # Code viewer + marks + section chat
│
├── src/
│   ├── domain/                   # Pure types + business rules (no I/O)
│   │   ├── types.ts              # Branded IDs, Chat, Concept, etc.
│   │   ├── prompts.ts            # Shared system prompts (section, general)
│   │   ├── marker.ts             # Mark/highlight logic
│   │   └── concept.ts            # Concept domain helpers
│   │
│   ├── db/                       # Database layer
│   │   ├── client.ts             # op-sqlite init, drizzle proxy, migrations
│   │   ├── schema.ts             # Drizzle table definitions
│   │   ├── migrations/           # Version-tracked SQL migrations
│   │   │   ├── index.ts          # Migration runner (schema_version table)
│   │   │   └── 001-initial-schema.ts
│   │   └── queries/              # Core data access (chats, files, projects)
│   │       ├── chats.ts
│   │       ├── files.ts
│   │       ├── projects.ts
│   │       └── concept-links.ts
│   │
│   ├── ai/                       # AI provider abstraction
│   │   ├── queue.ts              # Rate-limited inference queue
│   │   ├── embed.ts              # Embedding (OpenRouter / SiliconFlow)
│   │   └── scopes.ts             # Per-scope model config (MMKV)
│   │
│   ├── ports/                    # Hexagonal ports (interfaces)
│   │   └── vector-store.ts
│   ├── adapters/                 # Hexagonal adapters (implementations)
│   │   └── sqlite-vector-store.ts
│   ├── composition.ts            # Wires ports → adapters
│   │
│   ├── features/                 # Feature modules (co-located)
│   │   └── learning/             # Learning Hub feature
│   │       ├── index.ts          # Public barrel — ONLY import surface
│   │       ├── application/      # Use cases
│   │       │   ├── commit.ts     # commitLearningSession
│   │       │   ├── extract.ts    # extractConcepts (AI-powered)
│   │       │   ├── retrieve.ts   # retrieveRelatedConcepts (RAG)
│   │       │   ├── sync.ts       # ensureEmbedded, syncPending, reEmbedAll
│   │       │   ├── graph.ts      # Knowledge graph queries
│   │       │   └── prompts.ts    # buildLearningSystemPrompt
│   │       ├── data/             # Feature-owned DB queries
│   │       │   ├── concepts.ts
│   │       │   ├── learning-sessions.ts
│   │       │   ├── embeddings-meta.ts
│   │       │   ├── query-keys.ts # TanStack Query key factory
│   │       │   └── codecs.ts     # Zod codecs for JSON columns
│   │       ├── hooks/            # React hooks
│   │       │   ├── queries.ts    # useAllConcepts, useConcept, etc.
│   │       │   ├── use-learning-chat.ts
│   │       │   └── find-or-create-chat.ts  # Pure async (testable)
│   │       ├── state/
│   │       │   └── save-learning.ts  # Zustand store
│   │       ├── ui/
│   │       │   ├── SaveAsLearningModal.tsx
│   │       │   └── ConceptChip.tsx
│   │       └── lib/              # Feature-specific utilities
│   │           ├── hash.ts       # FNV-1a concept signature
│   │           ├── l2.ts         # L2 normalize for vectors
│   │           └── embedding-input.ts
│   │
│   ├── hooks/                    # Shared React hooks
│   │   ├── use-send-message.ts   # Chat send flow (all 3 chat types)
│   │   ├── send-flow.ts          # Pure async send logic (testable)
│   │   └── query-keys.ts         # Core query key factories
│   │
│   ├── stores/                   # Shared Zustand stores
│   │   ├── interaction-mode.ts   # view/mark/erase mode
│   │   ├── mark-color.ts         # Current highlight color
│   │   └── selection.ts          # Line selection state
│   │
│   ├── ui/                       # Shared UI
│   │   ├── theme.ts              # Colors, spacing, font sizes
│   │   └── components/           # Reusable components
│   │       ├── ChatBubble.tsx
│   │       ├── ChatInput.tsx
│   │       ├── BubbleMenu.tsx
│   │       ├── CodeViewer.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── EraseConfirmBar.tsx
│   │       ├── FilePickerModal.tsx
│   │       └── NewProjectModal.tsx
│   │
│   ├── lib/                      # Shared utilities
│   │   ├── uid.ts                # UUID generator (Hermes-safe)
│   │   ├── back-handler.ts       # Android back button
│   │   └── github.ts             # GitHub API helpers
│   │
│   └── graph/                    # Cytoscape graph view
│       └── ...
│
└── vitest.config.ts
```

## Key Architectural Decisions

### Feature modules vs flat src/

Learning-specific code lives in `src/features/learning/` with a barrel `index.ts`. All external consumers import from the barrel only (`@/src/features/learning`). Internal files use relative paths. This pattern (inspired by Bluesky's social-app) keeps feature code co-located while maintaining a clean public API.

**Exception**: `app/dev.tsx` uses a direct import for namespace import (`* as conceptQueries`).

Core infrastructure (db, ai, domain, ports/adapters, shared UI) stays in `src/` — it IS the core layer, not a feature.

### Planned profile/ontology layer

The next strategic refactor should introduce profile-owned definitions for domain-specific meaning:

- concept/capture labels
- concept type taxonomy and descriptions
- metadata field definitions
- extractor prompt category guidance
- retrieval memory formatting
- promotion classification rules
- graph visual encoding

The default coding profile should preserve the current coding behavior. Future profiles should be able to define different ontologies without rewriting the core capture, retrieval, review, promotion, and graph engine. See [ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md](ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md).

### Thin route screens

Route screens in `app/` are composition + JSX only. Business logic lives in:
- **Shared hooks** (`src/hooks/use-send-message.ts`) for cross-feature patterns
- **Feature hooks** (`features/learning/hooks/`) for feature-specific orchestration
- **Pure async functions** (`send-flow.ts`, `find-or-create-chat.ts`) for testable logic

### Query key factories

All TanStack Query keys use factories from `src/hooks/query-keys.ts` (core) and `src/features/learning/data/query-keys.ts` (feature). Zero hardcoded `queryKey: [...]` strings in the codebase. This ensures invalidation consistency.

### DB boundary hardening

JSON columns (taxonomy, sessionIds, conceptIds) use Zod codecs at the read boundary (`src/features/learning/data/codecs.ts`). The drizzle schema's `$type<>` annotations match domain types with `exactOptionalPropertyTypes`. Zero `as any` in learning data files.

### Migration system

SQL schema is managed through version-tracked migrations (`src/db/migrations/`). A `schema_version` table tracks the current version. `initDatabase()` runs pending migrations on startup. `initVec0()` runs separately (vec0 virtual tables have a different lifecycle).

Migrations:
- `001-initial-schema.ts` — all core tables + indexes.
- `002-concepts-fts.ts` — FTS5 virtual table `concepts_fts` mirroring `concepts.name + summary`, kept in sync via AFTER INSERT / UPDATE / DELETE triggers. Update trigger uses the FTS5 `'delete'` command to purge the old tokenised row before re-inserting.

### Hot/Cold vector tier (memory-bounded RAG)

sqlite-vec is fast but loads 384-dim float32 vectors into memory for L2 distance search. On low-end Android, thousands of concepts cause OOM risk. The hot/cold tier architecture caps active vector memory while preserving all user data:

- **Hot tier** — `embeddings_vec` (vec0 virtual table). Capped at `HOT_TIER_LIMIT` (5000 vectors ≈ 7.5 MB RAM).
- **Cold tier** — `concepts_fts` (FTS5). Disk-backed inverted index, near-zero RAM, covers ALL concepts regardless of hot-tier membership.
- **GC** (`src/features/learning/application/gc.ts`) — on app boot, `runVectorGC()` evicts the weakest + oldest concepts (`strength < 0.3 AND updated_at > 90 days`) down to `GC_BATCH_TARGET` (4500). Only vectors + `embeddings_meta` are removed; concept rows stay intact.
- **Hybrid retrieval** (`retrieve.ts`) — every `retrieveRelatedConcepts()` call runs vec top-K **and** FTS5 keyword search in parallel, merges by concept ID (vec wins on overlap), assigns synthetic sub-worst scores to FTS-only matches.
- **JIT rehydration** — when a cold concept surfaces via FTS5, `ensureEmbedded()` is fired to re-embed and promote it back to the hot tier. Self-healing.

Result: active vector search space is mathematically bounded regardless of total concept count. No data loss — cold concepts remain fully searchable and rejoin the hot tier on access.

### Hexagonal architecture

AI and vector storage use ports/adapters:
- `src/ports/vector-store.ts` defines the interface
- `src/adapters/sqlite-vector-store.ts` implements it with sqlite-vec
- `src/composition.ts` wires them together

### Branded types

All IDs use branded types (`ProjectId`, `FileId`, `ChatId`, `ConceptId`, `SessionId`, `MessageId`) for compile-time safety. Factory functions (`projectId()`, `chatId()`, etc.) create branded values from strings.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native 0.81.5 |
| Language | TypeScript 5.9.2 (strict + exactOptionalPropertyTypes) |
| Runtime | Hermes (New Architecture) |
| Navigation | Expo Router (file-based) |
| Database | op-sqlite v15.2.11 + drizzle-orm v0.45.2 |
| Vector search | sqlite-vec (384-dim, L2 distance) |
| State | TanStack Query (server) + Zustand (client) |
| AI | OpenRouter / SiliconFlow (configurable per scope) |
| Testing | Vitest |

## TypeScript

- Compiler: `node codelens-rn/node_modules/typescript/bin/tsc -p codelens-rn/tsconfig.json --noEmit` (NOT `npx tsc`)
- `uid()` in `src/lib/uid.ts` wraps `expo-crypto` `randomUUID()` — crypto-grade RFC 4122 v4 UUIDs, safe under concurrent / offline-first writes.
- Zod 4.3.6 — import from `'zod'` (not `'zod/v4'`)

## Transaction discipline

Writes that must be atomic (e.g. `commitLearningSession`) use Drizzle's `db.transaction(async (tx) => { ... })`. Data-layer helpers (`insertConcept`, `updateConcept`, `getConceptById`, `insertSession`) accept an optional `executor: DbOrTx = db` parameter so a transaction scope can be threaded through. This guarantees all writes share the same connection context.

## Backup / restore

Backup and restore live in `src/features/backup/` and power the Export / Import / Clear-all-data buttons in Settings.

**Archive format** — `.codelens` (a Zip with known entries):
- `metadata.json` — `ARCHIVE_MAGIC = 'codelens-backup'`, `FORMAT_VERSION = 3`, `SCHEMA_VERSION = 13`, `APP_VERSION = '1.0.0'`, `createdAt`, per-table row counts.
- `projects.ndjson`, `files.ndjson`, `chats.ndjson`, `chat_messages.ndjson`, `learning_sessions.ndjson`, `learning_captures.ndjson`, `concept_links.ndjson`, `profile_branches.ndjson`, `profile_selections.ndjson` — one JSON row per line.
- `concepts.ndjson` — each row is enriched with an `embedding: { vectorBase64, model, api, signature, updatedAt }` field when a vector is known for that concept. The vector is a Base64-encoded `Float32Array` (RFC 4648, hand-rolled — Hermes lacks `Buffer` and `btoa/atob` are not binary-safe; see `src/features/backup/codecs.ts`).
- `preferences.json` — MMKV dumps of `chat_config` + `embed_config`.
- `secure_keys.json` — provider **IDs only** (e.g. `['openrouter', 'siliconflow']`). Actual keys never leave the device.

**Restore strategy** — wipe-then-restore:
1. Read + validate the archive fully (reject on bad magic, or `formatVersion > FORMAT_VERSION`) before touching any on-device data — if the file is corrupt, the current DB is left intact.
2. Map raw backup rows from snake_case DB column names to Drizzle camelCase insert keys, and decode backup JSON columns before wiping data. Malformed JSON aborts import before current data is cleared.
3. `clearAllData()` runs (see below) to zero the DB + MMKV.
4. Rows are inserted inside a Drizzle transaction in FK-safe order. Batches are capped at 100 rows to stay under op-sqlite's SQL-size ceiling.
5. **Vectors are applied POST-transaction.** sqlite-vec virtual-table rollback is unreliable inside nested transactions, so each vector is upserted through `vectorStore.upsert()` after the row-data commit. Per-vector failures do not abort restore (tracked in `vecFailed` counter).
6. **FTS5 self-heal**: after restore, `SELECT COUNT(*) FROM concepts_fts` is compared against the number of inserted concepts. If they diverge (trigger misfire on bulk inserts), the FTS index is rebuilt from scratch.

**Clear-all-data** (`clearAllData`):
1. `vectorStore.deleteAll()` (clears both the vec0 table and `embeddings_meta`).
2. Drizzle transaction deleting `chat_messages`, `chats`, `learning_captures`, `concept_links`, `concepts`, `learning_sessions`, `profile_selections`, `profile_branches`, `files`, `projects` in FK-safe order.
3. `DELETE FROM concepts_fts` in a try/catch — guard against trigger misfire on bulk deletes.
4. `kv.delete('chat_config')` + `kv.delete('embed_config')`.
5. If `includeApiKeys` is true (opt-in red checkbox in the confirm modal — default OFF), `secureStore.deleteApiKey()` is called per provider. API keys survive by default because re-entering them on mobile is high-friction; the nuke option is reserved for the "sell my phone" case.

**Merge-on-restore is intentionally not supported.** 99% of restore flows are either new-phone clone or rollback; merge requires conflict-resolution UI that the product does not want to ship.

## Testing

Tests use Vitest with dependency injection for pure async functions:
- `src/hooks/__tests__/send-flow.test.ts` — send failure paths (4 tests)
- `src/features/learning/hooks/__tests__/find-or-create-chat.test.ts` — race condition + error discrimination (4 tests)

`vitest.config.ts` aliases `expo-crypto` → `src/test/expo-crypto-stub.ts` (backed by `node:crypto`) so tests don't pull in React Native's Flow-typed entry.

Run: `npm test` (or `npx vitest run`)
