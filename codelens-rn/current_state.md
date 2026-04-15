# CodeLens RN — Current State

## Phase 0: Scaffolding — COMPLETE

### What's Done

- **Expo project created** — SDK 54, React Native 0.81.5, TypeScript 5.9.2 strict + `exactOptionalPropertyTypes`
- **New architecture enabled** — Fabric / TurboModules via `newArchEnabled: true`
- **Expo Router** — file-based routing with all screens stubbed
- **Hermes** — default JS engine (Expo default)
- **All dependencies installed:**
  - Runtime: `@op-engineering/op-sqlite`, `drizzle-orm`, `react-native-mmkv`, `react-native-webview`, `@tanstack/react-query`, `zustand`, `expo-secure-store`, `expo-haptics`, `react-native-gesture-handler`, `react-native-reanimated`, `zod`, `date-fns`
  - Dev: `drizzle-kit`
- **Full `src/` folder structure** per `03-ARCHITECTURE.md`:
  - `src/domain/` — `types.ts` (all branded IDs, domain types from 04-STATE-MODEL.md), `marker.ts`, `concept.ts`, `prompts.ts` (stubs)
  - `src/ports/` — `vector-store.ts`, `ai-client.ts`, `secure-store.ts`, `kv-store.ts` (full interfaces)
  - `src/adapters/` — `kv-mmkv.ts` and `secure-store-expo.ts` (fully implemented), `sqlite-vector-store.ts`, `openrouter-client.ts`, `siliconflow-client.ts` (stubs for later phases)
  - `src/db/` — `client.ts`, `schema.ts` (stubs), `migrations/`, `queries/`
  - `src/ai/` — `queue.ts`, `scopes.ts`, `embed.ts` (stubs)
  - `src/learning/` — `extract.ts`, `retrieve.ts`, `graph.ts`, `sync.ts` (stubs)
  - `src/graph/` — `WebViewGraph.tsx`, `messages.ts` (stubs)
  - `src/stores/` — `selection.ts`, `interaction-mode.ts` (fully implemented zustand stores)
  - `src/ui/` — `theme.ts` (fully implemented), `components/`, `screens/`
  - `src/lib/` — `back-handler.ts` (fully implemented)
  - `src/composition.ts` — wires `secureStore` and `kv` adapters; `vectorStore` + `aiClient` deferred to Phase 1
- **App routes** — all screens from `05-SCREENS.md` stubbed with placeholder UI:
  - `app/index.tsx` — Home (placeholder)
  - `app/project/[id].tsx` — Project Viewer
  - `app/chat/[id].tsx` — Section/Line Chat
  - `app/general-chat/[id].tsx` — General Chat
  - `app/learning/index.tsx` — Learning Hub
  - `app/learning/chat/[id].tsx` — Learning Review Chat
  - `app/recent-chats.tsx` — Recent Chats
  - `app/settings.tsx` — Settings
- **Root layout** (`app/_layout.tsx`):
  - `GestureHandlerRootView` wrapper
  - `QueryClientProvider` (TanStack Query)
  - Centralized `BackHandler` listener (single registration, spec requirement)
  - Stack navigator with all routes declared
- **TypeScript strict passes** — zero errors with `tsc --noEmit`
- **`drizzle.config.ts`** — points to schema and migrations dirs

### What's NOT Done Yet (Remaining Phases)

#### Phase 1 — Domain + Persistence Foundation
- [ ] `src/db/schema.ts` — Drizzle schema for all tables (projects, files, chats, chat_messages, learning_sessions, concepts, concept_links, embeddings_meta, embeddings_vec)
- [ ] `src/db/client.ts` — op-sqlite init, sqlite-vec extension load, migrations on boot
- [ ] `src/db/queries/` — typed CRUD query helpers per table
- [ ] `src/adapters/sqlite-vector-store.ts` — VectorStorePort with vec0
- [ ] `src/composition.ts` — wire `vectorStore` and `aiClient`
- [ ] Dev smoke-test screen (insert project, embed concept, run topMatches)

#### Phase 2 — Project Viewer + Mark System
- [ ] Home screen with project cards
- [ ] New project modal (GitHub import + paste code)
- [ ] `src/lib/github.ts` — GitHub raw content fetcher
- [ ] Project viewer: file picker, code viewer, mode toggle (view/mark)
- [ ] `domain/marker.ts` — mark/range mark/erase with depth logic
- [ ] File picker modal with both search modes (path+content / filename only)

#### Phase 3 — Section + General Chats
- [ ] `src/ai/queue.ts` — serialized queue, cooldowns (OR: 1100ms, SF: 1500ms), retry/backoff, model fallback
- [ ] `src/adapters/openrouter-client.ts` — AiClientPort for OpenRouter
- [ ] `src/adapters/siliconflow-client.ts` — AiClientPort for SiliconFlow
- [ ] Section chat screen with code context
- [ ] General chat screen
- [ ] Bubble long-press menu (copy, save as learning, delete)
- [ ] Settings: provider/model selectors per scope, API key input
- [ ] Recent chats on home (top 5)

#### Phase 4 — Learning Hub Core
- [ ] `learning/extract.ts` — concept extraction via AI + zod
- [ ] `learning/sync.ts` — embed on concept create
- [ ] `learning/retrieve.ts` — hybrid retrieval (vector + recency + scope)
- [ ] Learning hub: sessions list, concept list, search
- [ ] Learning review chat with retrieved context
- [ ] Save-as-learning preview modal with merge suggestion
- [ ] Settings: learning scope + embedding model

#### Phase 5 — Knowledge Graph
- [ ] Vendor Cytoscape.js + cxtmenu into `assets/vendor/cytoscape/`
- [ ] `assets/graph.html` — WebView entry
- [ ] `src/graph/messages.ts` — typed postMessage protocol
- [ ] `src/graph/WebViewGraph.tsx` — component with lifecycle (destroy on unmount)
- [ ] Cytoscape touch-tuned config from 07-PRESERVE-THESE-BEHAVIORS.md
- [ ] Bigger/Smaller toggle
- [ ] Home graph preview

#### Phase 6 — Backup, Polish, Hardening
- [ ] Backup export (SQLite dump + MMKV + secure-store key list → zip)
- [ ] Restore with re-embed on signature mismatch
- [ ] Clear all data with double-confirm
- [ ] Empty states for every screen
- [ ] App icon, splash screen

#### Phase 7 — Resume Polish
- [ ] README.md with architecture diagram, stack, RAG explanation, screenshots
- [ ] Tag v1.0 release

### Non-Goals (from 08-NON-GOALS.md — do NOT build)
- Gems / prompt template management
- Folders for general chats
- Avatars
- Bookmarks screen
- Snippets folders
- Color label customization (hardcoded to: Important, Understood, Review, Question, Complex)
- Backup encryption
- Multiple embedding models with auto-detection UI
- Pinch-zoom on code viewer
- Range erase across multiple lines
- Reference view restore-prior-context
- Cloud sync, multi-user, real-time collab, code editor, plugin system, telemetry
