# CodeLens RN — Architecture

## Overview

CodeLens is a mobile-first code learning app built with Expo SDK 54, React Native 0.81.5, and TypeScript 5.9.2 (strict + `exactOptionalPropertyTypes`). It runs on-device AI chat, code marking/highlighting, and a knowledge graph backed by local RAG (sqlite-vec + op-sqlite).

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
- `crypto.randomUUID()` unavailable in Hermes — use `uid()` from `src/lib/uid.ts`
- Zod 4.3.6 — import from `'zod'` (not `'zod/v4'`)

## Testing

Tests use Vitest with dependency injection for pure async functions:
- `src/hooks/__tests__/send-flow.test.ts` — send failure paths
- `src/features/learning/hooks/__tests__/find-or-create-chat.test.ts` — race condition + error discrimination

Run: `npm test` (or `npx vitest run`)
