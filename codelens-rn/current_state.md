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

### Dev Environment (Windows)

- **JAVA_HOME** set to `C:\Program Files\Android\Android Studio\jbr` (JDK 21, bundled with Android Studio)
- **ANDROID_HOME** set to `%LOCALAPPDATA%\Android\Sdk`
- **`%JAVA_HOME%\bin`** and **`%ANDROID_HOME%\platform-tools`** on PATH
- **op-sqlite config**: `"op-sqlite": { "sqliteVec": true }` in `package.json` root (authoritative). **Not** in app.json plugins — op-sqlite v15+ has no Expo config plugin.
- **`plugins/with-local-properties.js`** — Expo config plugin that writes `android/local.properties` from `ANDROID_HOME` on every `expo prebuild`, surviving `--clean`.
- **`npm run doctor`** — health check script verifying JAVA_HOME, ANDROID_HOME, adb, op-sqlite config, and plugin registration.
- Build verified: `npx expo prebuild --clean && npx expo run:android` succeeds end-to-end.

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
- sqlite-vec virtual table (vec0) created directly (no loadExtension — statically compiled)
- `embeddings_vec` virtual table (384-dim FLOAT vectors, concept_id TEXT metadata — no PRIMARY KEY on metadata)
- `getRawDb()` for direct SQL access (needed by vector store adapter)
- Proxy wrapper mapping Drizzle's deprecated methods to op-sqlite v15 API
- Parameter sanitization (undefined→null, objects→JSON.stringify, preserves ArrayBuffer/Float32Array for vectors)

**Typed CRUD query helpers** (`src/db/queries/`):
- `projects.ts` — getAllProjects, getProjectById, insertProject, updateProject, deleteProject
- `files.ts` — getFileById, getFilesByProject, insertFile, updateFileMarks, deleteFile, deleteFilesByProject
- `chats.ts` — getChatById, getRecentChats, getAllChats, insertChat, insertMessage, deleteChat
- `concepts.ts` — getAllConcepts, getConceptById, insertConcept, updateConcept, deleteConcept
- `learning-sessions.ts` — getAllSessions, getSessionById, insertSession, deleteSession
- `concept-links.ts` — getLinksByConceptId, getAllLinks, insertLink, deleteLink
- `embeddings-meta.ts` — getMetaByConceptId, upsertMeta, deleteMeta, deleteAllMeta

**Adapters** (`src/adapters/`):
- `sqlite-vector-store.ts` — full VectorStorePort implementation using op-sqlite raw SQL + vec0, DELETE+INSERT upsert pattern (vec0 doesn't support INSERT OR REPLACE on metadata columns)
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
- Tests full stack: DB init → project insert → concept insert → vec0 upsert → topMatches query → cleanup
- **PASSED on device** — Phase 1 demo checkpoint confirmed.

**TypeScript**: `tsc --noEmit` passes with zero errors.

## Phase 2: Project Viewer + Mark System — COMPLETE

### What's Done

**Domain: Marker logic** (`src/domain/marker.ts`):
- `applyMark(marks, line, color)` — adds new mark at depth 0, or increments depth if same color already exists
- `eraseMark(marks, line, color)` — decrements depth if > 0 (returns `hadDepth: true`), removes at depth 0
- `applyRangeMark(ranges, startLine, endLine, color)` — same depth logic for range marks, normalizes line order
- `eraseRangeMark(ranges, startLine, endLine, color)` — same depth-decrement-then-remove pattern
- `getLineMarkColor(marks, ranges, line)` — checks line marks first, then range marks, returns color + depth
- `hasMarksAtLine(marks, ranges, line)` — boolean helper
- Pure functions, no React/IO imports — hexagonal boundary respected

**GitHub fetcher** (`src/lib/github.ts`):
- `parseGitHubUrl(url)` — extracts owner/repo/branch from GitHub URLs (handles .git suffix, /tree/branch)
- `fetchGitHubRepo(url, projectId)` — fetches repo tree via GitHub API, downloads all text files via raw.githubusercontent.com
- `extractRepoName(url)` — helper for project naming
- Text file detection via extension whitelist (ts, js, py, go, rs, etc.)
- Batched downloads (10 concurrent) with `Promise.allSettled` for resilience
- Auto-fallback from main→master branch on 404

**Home screen** (`app/index.tsx`):
- Project cards with source badge (GH/Paste), name, date
- FlatList sorted by createdAt descending
- FAB button opens new project modal
- Empty state when no projects exist
- TanStack Query integration for reactive project list
- Dev and Settings buttons in header

**New project modal** (`src/ui/components/NewProjectModal.tsx`):
- Tab UI: GitHub import vs Paste Code
- GitHub tab: URL input, imports all text files, creates project + files in DB
- Paste tab: project name, optional filename, code textarea
- Loading state with ActivityIndicator
- Error display
- Auto-navigates to project viewer on success

**Project viewer** (`app/project/[id].tsx`):
- Header with back button, project name, View/Mark mode toggle
- Recent files bar (horizontal scroll, max 8, most-recent-first per spec)
- File picker button showing current file path
- Code viewer with marks rendered
- Color picker bar (5 colors) shown in mark mode
- Range select mode via long-press (sets start line, tap for end line)
- Mark on tap: applies mark or triggers erase flow
- Erase confirmation bar for marks with depth > 0
- File selection updates recentFileIds in DB

**Code viewer** (`src/ui/components/CodeViewer.tsx`):
- Line numbers + monospace code rendering
- Mark background colors with depth-based alpha (darker = higher depth)
- Depth indicator bar (3px colored bar on left edge) for depth > 0
- Horizontal scroll for long lines, vertical scroll for file
- Touch handlers for line press and long press

**File picker modal** (`src/ui/components/FilePickerModal.tsx`):
- Two search modes: path+content (default) and filename-only (per spec)
- Mode toggle buttons
- File count display
- Sorted alphabetically by path
- Directory path in muted color, filename highlighted

**Color picker** (`src/ui/components/ColorPicker.tsx`):
- 5 mark colors (red, green, yellow, blue, purple) matching theme
- Active color highlighted with border

**Erase confirmation** (`src/ui/components/EraseConfirmBar.tsx`):
- Animated slide-in bar when erasing a mark with depth > 0
- "Erase mark? Tap again to confirm" with Erase/Cancel buttons
- Per spec: single accidental tap never wipes nested work

**Zustand stores**:
- `stores/mark-color.ts` — active mark color state (default: yellow)
- Existing `stores/interaction-mode.ts` and `stores/selection.ts` used by project viewer

**TypeScript**: `tsc --noEmit` passes with zero errors.

### Demo Checkpoint

1. Home screen shows project cards (or empty state)
2. FAB → New Project modal → import GitHub repo or paste code
3. Project viewer: select file via picker, view code with line numbers
4. Toggle to Mark mode → color picker appears
5. Tap line → mark applied with color background
6. Tap same-color line again → depth increments (darker shade + left bar indicator)
7. Tap marked line to erase → if depth > 0, confirmation bar appears
8. Long-press line → range select mode → tap end line → range marked
9. Recent files bar shows last 8 opened files per project
10. File picker: search by path+content or filename-only

**Device testing deferred** — code-complete, TypeScript-clean, ready for on-device verification.

---

## Phase 3: Section + General Chats — COMPLETE

- `src/ai/queue.ts` — serialized queue with per-provider cooldowns, retry/backoff, fallback.
- OpenRouter + SiliconFlow adapters implementing `AiClientPort`.
- Section chat screen (code-scoped), General chat screen.
- Bubble long-press menu (copy, save-as-learning, delete).
- Settings screen with per-scope provider/model + API key input.
- Recent chats on home.

## Phase 4: Learning Hub Core — COMPLETE

- `features/learning/application/extract.ts` — AI-powered concept extraction with zod validation.
- `features/learning/application/sync.ts` — `ensureEmbedded`, `syncPendingEmbeddings`, `reEmbedAll`.
- `features/learning/application/retrieve.ts` — hybrid retrieval (vec + FTS5) with JIT rehydration.
- `features/learning/application/commit.ts` — transactional learning session commit (Drizzle `db.transaction`).
- Learning Hub index (sessions list, concept list, search), Learning chat with retrieved context injection.
- Save-as-learning preview modal with merge suggestions.

## Phase 5: Knowledge Graph — COMPLETE

- Vendored Cytoscape.js + cxtmenu into `assets/vendor/cytoscape/`.
- `assets/graph.html` WebView entry + `src/graph/WebViewGraph.tsx` component.
- Typed postMessage protocol, cxtmenu touch-tuned for phone, lifecycle-safe (destroy on unmount).
- Home graph preview + fullscreen expansion toggle.
- Stronger Android back navigation.

## Architecture Consolidation (2026-04-16) — COMPLETE

6-PR consolidation between Phases 4 and 5 to clean up technical debt before Phase 6:

- **PR1**: Migrated learning-owned code from flat `src/` to `src/features/learning/{application,data,ui,state,lib,hooks}` with a public barrel `index.ts`. Core infra stays in `src/`.
- **PR2**: Extracted use-cases + hooks, thinned route screens to composition + JSX.
- **PR3**: Query key factories (`src/hooks/query-keys.ts`, `features/learning/data/query-keys.ts`) — zero hardcoded `queryKey: [...]` strings.
- **PR4**: Zod codec hardening at the DB JSON boundary (zero `as any` in learning data files).
- **PR5**: Version-tracked migration scaffolding (`src/db/migrations/`) with `schema_version` table.
- Vitest testing infrastructure + 8 regression tests for pure async flows (send-flow, find-or-create-chat).
- `ARCHITECTURE.md` written.

Reviewed by Gemini + Codex; all findings fixed.

## Scaling Hardening (2026-04-16) — COMPLETE

Addressed 3 scaling foresight items from the Gemini CTO review:

1. **Drizzle transaction context** — `commit.ts` now uses `db.transaction(async (tx) => {...})`. Data-layer helpers accept optional `executor: DbOrTx = db`.
2. **uid() entropy** — swapped `Math.random()` for `expo-crypto` `randomUUID()`. Crypto-grade RFC 4122 v4 UUIDs. `vitest.config.ts` aliases `expo-crypto` → Node-backed stub.
3. **sqlite-vec memory / Hot-Cold tier** — new migration 002 adds `concepts_fts` (FTS5) auto-synced via triggers. `retrieve.ts` performs hybrid vec+FTS search with JIT rehydration. `runVectorGC()` on app boot evicts weak+old vectors down to `GC_BATCH_TARGET`, concept rows stay intact. Active vector memory mathematically bounded (~7.5 MB at 5k vectors).

See `ARCHITECTURE.md` §§ "Migration system", "Hot/Cold vector tier", "Transaction discipline".

## Phase 6 — Backup, Polish, Hardening (2026-04-17) — COMPLETE

- **Backup export / restore** — `src/features/backup/{format,codecs,export,import,clear}.ts`. `.codelens` archives are NDJSON + Zip with a `metadata.json` (magic, format/schema/app versions, counts), per-table `.ndjson` streams, `preferences.json` for MMKV keys, `secure_keys.json` for provider-id hints only (keys are **never** exported — user re-enters on restore). Vectors preserved as Base64 Float32 blobs per concept row → zero re-embed cost on restore. Format v1, schema v2.
- **Restore strategy** — wipe-then-restore (no merge). Row data in a single Drizzle transaction; vectors applied post-tx because sqlite-vec virtual tables don't always participate cleanly in rollback. FTS5 re-sync verified after restore (belt-and-braces in case trigger misfires on bulk INSERTs). Schema-version hook in place for future migrators.
- **Clear all data** — double-confirm modal (typed `DELETE` + optional red "also delete API keys" checkbox, off by default). Clears vector store, Drizzle tables (FK-safe order), `concepts_fts`, app-owned MMKV keys.
- **BackupSection UI** — stacked Export/Restore/Clear buttons in `app/settings.tsx`, toast feedback, restore-result modal listing per-table counts and missing API-key providers.
- **Empty states** — polished across `app/` (home, learning hub, general chat, recent chats stub).
- **App icon + splash** — `app.json` splash background switched to dark `#0f1117` (both modes) for flashbang-free launches. Real PNGs pending; `design/ASSETS.md` + `design/THEME_SPECS.md` capture exact specs for Figma handoff.
- Round-trip codec tests in `src/features/backup/__tests__/codecs.test.ts` (Float32Array → base64 → Float32Array, byte-for-byte).

## Stage 10 Locked Learning-System Implementation

### Phase A - Architecture Prep and Baseline Checks - COMPLETE (2026-04-26)

- Required architecture docs and comparison-folder guards were read before edits.
- Baseline inventory confirmed current overlap areas:
  - Save entry: `SaveAsLearningModal` is wired from section/general/learning chat bubble menus.
  - Chat composer: `ChatInput` plus `useSendMessage` and learning chat prompt helpers.
  - Learning Hub: `app/learning/index.tsx` currently shows legacy sessions/concepts.
  - Concept detail/chat entry: `app/learning/chat/[id].tsx`.
  - File viewer line actions: `app/project/[id].tsx` and `CodeViewer`.
  - Graph entry/backend: legacy `src/graph/WebViewGraph.tsx` and Cytoscape assets exist.
  - Settings/storage: `app/settings.tsx`, backup feature, `src/db/*`, op-sqlite + Drizzle.
- `strict` and `exactOptionalPropertyTypes` are enabled in `tsconfig.json`.
- Persistence baseline still uses Drizzle + `@op-engineering/op-sqlite`; sqlite-vec and FTS5 are configured.
- Added Phase A static guard tests in `src/__tests__/stage10-architecture-guards.test.ts`:
  - learning query keys stay factory-owned
  - persona code stays out of extractor files
  - future Stage 3 cards stay free of density/variant props
  - future Stage 9 graph code stays off WebView/SVG/Cytoscape backends
- Added Stage 1 migration fixture snapshots under `src/features/learning/data/migrations/fixtures/`.
- Verification:
  - `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` passes.
  - `npm.cmd test` passes: 6 files, 27 tests.

Known drift to resolve in later phases, not Phase A:
- Existing learning model is session/concept-first; Stage 1/2 must replace it with capture-first schema and save contracts.
- Existing graph uses WebView/Cytoscape; Stage 9 must replace it with native Skia concept-only graph.
- Existing `src/domain/` is legacy architecture from the prior rewrite; do not expand it for the new locked learning work.

Next locked step after Phase B was Phase C / Stage 2 Extractor and Save Flow.

### Phase B - Stage 1 Data Foundation - COMPLETE / DEVICE MIGRATION GATED (2026-04-26)

- Read `STAGE_1_DATA_FOUNDATION.md` before schema work.
- Added capture-first data contracts:
  - branded `LearningCaptureId` / `ConceptId` with `nanoid(21)` in `src/features/learning/types/ids.ts`
  - locked concept type union and capture/concept domain shapes in `src/features/learning/types/learning.ts`
  - capture and concept Zod codecs/mappers in `src/features/learning/codecs/`
  - `learning_captures` table and upgraded concept fields in `src/db/schema.ts`
  - Stage 1 migration `src/db/migrations/004-capture-first-model.ts`
  - SQL migration artifact `src/features/learning/data/migrations/0004_capture_first_model.sql`
  - capture/concept repos with `DbOrTx` threading
  - capture/concept query key factories
  - `computeStrength`
- Added tests:
  - codec round trips and loud malformed JSON failures
  - branded ID generation/guards
  - migration SQL contract checks
  - strength monotonicity/clamping
- Verification:
  - `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` passes.
  - `npm.cmd test` passes: 10 files, 37 tests.
  - Static searches found no hardcoded learning `queryKey: [...]`, no new `as any` in Stage 1 learning data/codecs/types/strength files, and no persona imports in learning code.
- Device migration verification:
  - User built and installed the RN app from normal PowerShell with `npm.cmd run android`; Gradle reported `BUILD SUCCESSFUL in 12m 48s`.
  - App was opened on a Samsung SM_A165F via USB debugging.
  - Pulled the device DB from package `com.anonymous.codelensrn` using `adb exec-out run-as ...`.
  - Windows note: PowerShell `>` corrupted binary DB pulls by doubling bytes; use `cmd /c "adb exec-out ... > file"` for future DB pulls.
  - Verified copied device DB:
    - `schema_version: 4`
    - `learning_captures exists: True`
    - `concepts_capture_unlink_bd` trigger exists
    - Stage 1 concept columns missing: `[]`
    - deleting a linked concept produced `('unresolved', None)` for the linked capture.
- Additional note:
  - `npm.cmd run lint` currently fails on pre-existing `react/display-name` errors in `src/ui/components/ChatBubble.tsx` and `src/ui/components/CodeViewer.tsx`; not introduced by Stage 1.
- Existing legacy learning screens still use old session/concept code; Stage 2+ should wire the new capture-first contracts instead of extending the legacy save flow.

### Phase C - Stage 2 Extractor and Save Flow - CODE IMPLEMENTED (2026-04-26)

- Read `STAGE_2_EXTRACTOR_AND_SAVE_FLOW.md` before Stage 2 work.
- Added capture-first extractor and save-flow contracts:
  - extractor prompt composition in `src/features/learning/extractor/extractorPrompt.ts`
  - extractor Zod schemas in `src/features/learning/extractor/extractorSchema.ts`
  - retry-on-invalid-JSON extractor runner in `src/features/learning/extractor/runExtractor.ts`
  - capture embedding text builder in `src/features/learning/extractor/buildCaptureEmbeddingText.ts`
  - save modal candidate data types in `src/features/learning/types/saveModal.ts`
  - vector concept pre-check service in `src/features/learning/services/conceptMatchPreCheck.ts`
  - candidate preparation service in `src/features/learning/services/prepareSaveCandidates.ts`
  - capture-first `saveCapture` service in `src/features/learning/services/saveCapture.ts`
- Updated Stage 1 capture concept hint shape to Stage 2's locked hint metadata.
- Added `appendConceptLanguage` to the Stage 1 concept repo for cross-language existing-concept matches.
- Updated capture embedding retry helper to increment retry count instead of requiring the caller to provide the next count.
- Added focused Stage 2 tests covering:
  - extractor schema validation and snippet cap
  - invalid JSON retry exactly once
  - failure after second invalid extractor response
  - candidate mapping with match similarity
  - unresolved save when no match
  - low-confidence link blocked while capture still saves
  - link allowed by similarity or confidence
  - cross-language language append
  - derived capture parent write
  - DB failure does not enqueue embedding
  - saving one candidate does not mutate another
- Verification:
  - `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` passes.
  - `npm.cmd test` passes: 13 files, 52 tests.
- Integration note:
  - The legacy `SaveAsLearningModal` still renders the old concept-first review UI. Stage 2 service contracts are implemented; Stage 3 should replace the modal internals with candidate cards and then wire individual card saves through `prepareSaveCandidates` + `saveCapture`.

### Phase D - Stage 3 Card Components - CODE IMPLEMENTED (2026-04-26)

- Read `STAGE_3_CARD_COMPONENTS.md` before card/modal work.
- Added six distinct card components under `src/features/learning/ui/cards/`:
  - `CandidateCaptureCard`
  - `CaptureCardCompact`
  - `CaptureCardFull`
  - `ConceptCardCompact`
  - `ConceptCardFull`
  - `CaptureChip`
- Added shared primitives under `src/features/learning/ui/primitives/`:
  - `ConceptTypeChip`
  - `StrengthIndicator`
  - `StateChip`
  - `SourceBreadcrumb`
  - `LanguageChip`
- Reworked `SaveAsLearningModal` to use the Stage 2 capture-first services:
  - extraction uses `prepareSaveCandidates`
  - visible decision surface uses `CandidateCaptureCard`
  - individual candidate Save buttons call `saveCapture`
  - saved/failed state is tracked per candidate
  - Inspect opens a full capture preview without saving
  - no concept-first selection list, no merge UI, no Save All action
- Reworked `useSaveLearningStore` for candidate-first modal state.
- Added Stage 3 guard tests proving:
  - all six card components exist
  - card components do not use forbidden `variant`/`density`/`mode`/`isCompact`/`isFull` props or base-card names
  - compact cards do not render snippets/evidence
  - save modal imports candidate cards and Stage 2 services, not the old concept-first commit/extract flow
- Verification:
  - `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` passes.
  - `npm.cmd test` passes: 14 files, 56 tests.
- Integration note:
  - Stage 3 provides the card component layer and candidate-first save modal. Stage 4 should consume compact/full cards in Learning Hub surfaces and may add route/modal hosts for persisted full capture/concept views.

### Phase E - Stage 4 Learning Hub Surfaces - CODE IMPLEMENTED (2026-04-26)

- Read `STAGE_4_LEARNING_HUB_SURFACES.md` before Hub work.
- Replaced the legacy tabbed learning route with a feature-owned capture-first `LearningHubScreen`.
- Added required Stage 4 Hub surfaces:
  - `RecentCapturesSection`
  - `ConceptListSection`
  - `SessionCardsSection`
  - `SessionFlashbackScreen`
  - `KnowledgeHealthEntry`
  - `KnowledgeHealthScreen`
- Added required Stage 4 query hooks:
  - `useRecentCaptures({ limit })`
  - `useConceptList({ sort, filters })`
  - `useRecentSessions({ limit })`
  - `useSessionFlashback(sessionId)`
  - `useKnowledgeHealthConcepts()`
- Added deterministic Hub ordering helpers:
  - recent captures sort by `createdAt DESC`, then `id ASC`
  - concept list defaults to weakest-first via `computeStrength`, then `updatedAt DESC`, then `name ASC`
  - recent sessions remain secondary and limited to five
- Hub list surfaces use compact cards only. Full capture/concept views open through detail modals; flashback is read-only and has no live-chat input.
- Added Stage 4 tests for:
  - capture/concept Hub ordering
  - required surface and hook presence
  - thin route/no direct DB access from the route
  - compact-card-only Hub lists
  - read-only flashback and no quiz/streak/due health language
- Verification:
  - `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` passes.
  - `npm.cmd test` passes: 16 files, 62 tests.
- Integration note:
  - Stage 4 modal concept detail now loads linked captures through a per-concept query instead of reusing only the 10 recent Hub captures.
  - The Stage 4 concept list filters out pre-Stage-1 legacy concept IDs so old local rows do not crash the new branded-ID Hub.
- Post-review fixes before Stage 5:
  - `conceptMatchPreCheck` skips legacy vector hits before loading Stage 1 concepts.
  - `saveCapture` creates/updates a `learning_sessions` row for the capture's session/chat grouping key.
  - candidate retry state can clear prior errors.
  - migration 005 safely rebuilds legacy `normalized_key` values: Stage-1 `c_...` rows keep canonical normalized keys, legacy/duplicate rows get deterministic suffixed keys so the unique index cannot abort or block future promotions.
  - `getLearningConceptByNormalizedKey` ignores non-Stage-1 legacy rows.
  - added regression tests for legacy vector-match skipping, session row creation, retry-error clearing, and per-concept capture loading.
- Device migration 005 smoke test:
  - User rebuilt/opened the app on Samsung SM_A165F on 2026-04-26.
  - Pulled `device-v5-codelens.db` plus WAL/SHM with `cmd /c "adb exec-out ... > file"`.
  - Verified copied DB: `schema_version: 5`, `unique_concepts_normalized_key` index count `1`, duplicate normalized keys `0`.
  - That device DB currently has `0` concepts/captures/sessions, so this verifies migration execution/no startup wedge but did not exercise the legacy-duplicate suffix branch with live legacy rows.

Next locked step: Phase F / Stage 5 Promotion System. Read `STAGE_5_PROMOTION_SYSTEM.md` before editing promotion or concept creation flows.

## What's NOT Done Yet (Remaining Phases)

### Phase 7 — Resume Polish
- [ ] Top-level README.md with architecture diagram, stack, RAG explanation, screenshots
- [ ] Tag v1.0 release

## Non-Goals (from 08-NON-GOALS.md — do NOT build)

Gems, folders for general chats, avatars, bookmarks, snippets folders, color label customization, backup encryption, multiple embedding models UI, pinch-zoom on code viewer, range erase across multiple lines, reference view restore-prior-context, cloud sync, multi-user, real-time collab, code editor, plugin system, telemetry.
