# CodeLens RN — Current State

## Phase 0: Scaffolding — COMPLETE

- Expo SDK 54 + RN 0.81.5 + TypeScript 5.9.2 strict + `exactOptionalPropertyTypes`
- New architecture enabled (Fabric / TurboModules)
- Expo Router file-based routing with all screens stubbed
- Hermes JS engine (Expo default)
- All dependencies installed (op-sqlite, drizzle, mmkv, webview, tanstack-query, zustand, etc.)
- Full `src/` folder structure per `03-ARCHITECTURE.md`
- Root layout with GestureHandlerRootView, QueryClientProvider, centralized BackHandler
- Dark theme (`src/ui/theme.ts`)

## Phase 1: Domain + Persistence Foundation — COMPLETE

### What's Done

**Domain types** (`src/domain/types.ts`):
- All branded IDs (ProjectId, FileId, ChatId, MessageId, ConceptId, SessionId, FolderId) with factory helpers
- All domain interfaces from 04-STATE-MODEL.md
- UI state types (CodeInteractionMode, SelectionState)

**Port interfaces** (`src/ports/`):
- `vector-store.ts` — upsert, topMatches, delete, deleteAll
- `ai-client.ts` — complete, embed
- `secure-store.ts` — getApiKey, setApiKey, deleteApiKey
- `kv-store.ts` — get, set, delete

**Drizzle schema** (`src/db/schema.ts`):
- Tables: projects, files, chats, chat_messages, learning_sessions, concepts, concept_links, embeddings_meta
- JSON columns for marks, ranges, taxonomy, sessionIds, conceptIds, recentFileIds
- Foreign keys with cascade deletes

**Database client** (`src/db/client.ts`):
- op-sqlite `open()` + drizzle ORM init
- `initDatabase()` — creates all tables with IF NOT EXISTS, sets WAL + foreign keys
- sqlite-vec extension load (vec0) with fallback warning
- `embeddings_vec` virtual table (384-dim FLOAT vectors)
- `getRawDb()` for direct SQL access (needed by vector store adapter)

**Typed CRUD query helpers** (`src/db/queries/`):
- `projects.ts` — getAllProjects, getProjectById, insertProject, updateProject, deleteProject
- `files.ts` — getFileById, getFilesByProject, insertFile, updateFileMarks, deleteFile, deleteFilesByProject
- `chats.ts` — getChatById, getRecentChats, getAllChats, insertChat, insertMessage, deleteChat
- `concepts.ts` — getAllConcepts, getConceptById, insertConcept, updateConcept, deleteConcept
- `learning-sessions.ts` — getAllSessions, getSessionById, insertSession, deleteSession
- `concept-links.ts` — getLinksByConceptId, getAllLinks, insertLink, deleteLink
- `embeddings-meta.ts` — getMetaByConceptId, upsertMeta, deleteMeta, deleteAllMeta

**Adapters** (`src/adapters/`):
- `sqlite-vector-store.ts` — full VectorStorePort implementation using op-sqlite raw SQL + vec0 virtual table, transactional upsert/delete, Float32Array → ArrayBuffer blob conversion
- `kv-mmkv.ts` — KvStorePort via react-native-mmkv `createMMKV()`
- `secure-store-expo.ts` — SecureStorePort via expo-secure-store

**Composition root** (`src/composition.ts`):
- Wires `secureStore`, `kv`, and `vectorStore` singletons

**Zustand stores** (`src/stores/`):
- `selection.ts` — range select mode, start/end line, last clicked line
- `interaction-mode.ts` — view/mark mode toggle

**App startup** (`app/_layout.tsx`):
- `initDatabase()` called on mount before rendering
- Dev screen route registered

**RAG smoke-test dev screen** (`app/dev.tsx`):
- "Run RAG Smoke Test" button
- Tests full stack: DB init → project insert → concept insert → vec0 upsert → topMatches query → cleanup
- Generates 384-dim L2-normalized stub vectors with different seeds
- Scrollable log output with color-coded error/pass lines
- Accessible from home screen via "Dev Smoke Test" button

**TypeScript**: `tsc --noEmit` passes with zero errors

### Demo Checkpoint

Open dev screen → tap "Run RAG Smoke Test" → should see:
1. Database initialized
2. Test project + 3 concepts inserted
3. 3 vectors upserted into vec0
4. topMatches returns 3 results ranked by cosine similarity
5. Cleanup completes
6. "RAG SMOKE TEST PASSED"

**Requires native dev client build** (`npx expo run:android`) since op-sqlite and react-native-mmkv need native modules.

---

## What's NOT Done Yet (Remaining Phases)

### Phase 2 — Project Viewer + Mark System
- [ ] Home screen with project cards (replace placeholder)
- [ ] New project modal (GitHub URL input + paste code)
- [ ] `src/lib/github.ts` — GitHub raw content fetcher
- [ ] `app/project/[id].tsx` — file picker, code viewer, mode toggle (view/mark)
- [ ] `domain/marker.ts` — mark/range mark/erase with depth logic (preserve from 07-PRESERVE)
- [ ] File picker modal with both search modes (path+content / filename only)
- [ ] Erase confirmation for marks with depth > 0

### Phase 3 — Section + General Chats
- [ ] `src/ai/queue.ts` — serialized queue, cooldowns (OR: 1100ms, SF: 1500ms), retry/backoff, model fallback
- [ ] `src/adapters/openrouter-client.ts` — AiClientPort for OpenRouter
- [ ] `src/adapters/siliconflow-client.ts` — AiClientPort for SiliconFlow
- [ ] Section chat screen with code context
- [ ] General chat screen
- [ ] Bubble long-press menu (copy, save as learning, delete)
- [ ] Settings: provider/model selectors per scope, API key input
- [ ] Recent chats on home (top 5)

### Phase 4 — Learning Hub Core
- [ ] `learning/extract.ts` — concept extraction via AI + zod
- [ ] `learning/sync.ts` — embed on concept create
- [ ] `learning/retrieve.ts` — hybrid retrieval (vector + recency + scope)
- [ ] Learning hub: sessions list, concept list, search
- [ ] Learning review chat with retrieved context
- [ ] Save-as-learning preview modal with merge suggestion
- [ ] Settings: learning scope + embedding model

### Phase 5 — Knowledge Graph
- [ ] Vendor Cytoscape.js + cxtmenu into `assets/vendor/cytoscape/`
- [ ] `assets/graph.html` — WebView entry
- [ ] `src/graph/messages.ts` — typed postMessage protocol
- [ ] `src/graph/WebViewGraph.tsx` — component with lifecycle (destroy on unmount)
- [ ] Cytoscape touch-tuned config from 07-PRESERVE
- [ ] Bigger/Smaller toggle, home graph preview

### Phase 6 — Backup, Polish, Hardening
- [ ] Backup export/restore with re-embed on signature mismatch
- [ ] Clear all data with double-confirm
- [ ] Empty states for every screen
- [ ] App icon, splash screen

### Phase 7 — Resume Polish
- [ ] README.md with architecture diagram, stack, RAG explanation
- [ ] Tag v1.0 release

## Non-Goals (from 08-NON-GOALS.md — do NOT build)

Gems, folders for general chats, avatars, bookmarks, snippets folders, color label customization, backup encryption, multiple embedding models UI, pinch-zoom on code viewer, range erase across multiple lines, reference view restore-prior-context, cloud sync, multi-user, real-time collab, code editor, plugin system, telemetry.
