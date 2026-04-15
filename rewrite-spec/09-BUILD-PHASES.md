# Build Phases

Each phase ends with the app **runnable end-to-end on a real Android device or emulator**. No phase boundary leaves half-finished features. If you cannot demo a phase to a user, you have not finished the phase.

## Phase 0 — Scaffolding (½ day)

- `npx create-expo-app@latest codelens-rn --template default`
- Configure: TypeScript strict, Expo Router, Hermes, new architecture.
- Install: `op-sqlite`, `drizzle-orm`, `drizzle-kit`, `react-native-mmkv`, `react-native-webview`, `@tanstack/react-query`, `zustand`, `expo-secure-store`, `expo-haptics`, `react-native-gesture-handler`, `react-native-reanimated`, `zod`, `date-fns`.
- Set up the `src/` folder structure from `03-ARCHITECTURE.md`.
- Verify dev client builds and launches a "Hello World" screen on device.

**Demo:** App launches, shows a placeholder home screen.

## Phase 1 — Domain + Persistence Foundation (1–2 days)

- `src/domain/types.ts` — every type from `04-STATE-MODEL.md`.
- `src/db/schema.ts` — Drizzle schema for projects, files, chats, chat_messages, learning_sessions, concepts, concept_links, embeddings_meta, embeddings_vec.
- `src/db/client.ts` — op-sqlite init, sqlite-vec extension load, run migrations on boot.
- `src/db/queries/` — typed query helpers per table (CRUD).
- `src/ports/*.ts` — all port interfaces.
- `src/adapters/sqlite-vector-store.ts` — implements `VectorStorePort` with vec0.
- `src/adapters/kv-mmkv.ts`, `src/adapters/secure-store-expo.ts`.
- `src/composition.ts` — wire singletons.
- A throwaway dev screen that inserts a project and a concept, embeds a stub vector, runs `topMatches`, and prints results. Confirms the whole stack works.

**Demo:** Open dev screen, tap "Run RAG smoke test", see top match logged.

## Phase 2 — Project Viewer + Mark System (2–3 days)

- `app/index.tsx` — home with project cards (no recent chats, no graph yet).
- New project modal: GitHub URL input + paste code input. GitHub fetcher in `src/lib/github.ts` (raw.githubusercontent.com fetch, no auth needed for public repos).
- `app/project/[id].tsx` — file picker, code viewer, mode toggle, mark/range mark, depth, erase confirm.
- `domain/marker.ts` — pure functions for mark logic.
- `stores/interaction-mode.ts`, `stores/selection.ts` — zustand for ephemeral UI.
- File picker modal with both search modes.

**Demo:** Import a repo, browse files, mark lines and ranges in multiple colors, see depth visually distinguished, erase with confirm.

## Phase 3 — Section + General Chats (2 days)

- `src/ai/queue.ts` — serialized queue, cooldowns, retry/backoff, model fallback.
- `src/adapters/openrouter-client.ts`, `src/adapters/siliconflow-client.ts` — implement `AiClientPort`.
- `app/chat/[id].tsx`, `app/general-chat/[id].tsx` — messages list, input, streaming or non-streaming completion, bubble long-press menu.
- `app/settings.tsx` — provider/model selectors per scope (`section` and `general` for now), API key input.
- Recent chats list on home (top 5).

**Demo:** Open a section chat from a marked range, send a message, get response, save bubble, retrieve from home recent list.

## Phase 4 — Learning Hub Core (2–3 days)

- `learning/extract.ts` — extract concepts from a chat via prompt + zod validation.
- `learning/sync.ts` — embed and store on concept create.
- `learning/retrieve.ts` — hybrid retrieval query.
- `app/learning/index.tsx` — sessions list, concept list, search.
- `app/learning/chat/[id].tsx` — review chat with retrieved context injected.
- Settings: add `learning` scope provider/model + embedding model selection.
- Save-as-learning preview modal (`07-PRESERVE-THESE-BEHAVIORS.md` § Save-As-Learning Preview).

**Demo:** Save a chat as learning, see extracted concepts, open one in review chat, observe related concepts injected as system context.

## Phase 5 — Knowledge Graph (1–2 days)

- `assets/vendor/cytoscape/` — vendored libs.
- `assets/graph.html` — minimal HTML loading the libs.
- `src/graph/messages.ts` — typed protocol.
- `src/graph/WebViewGraph.tsx` — RN component with postMessage bridge, lifecycle (destroy on unmount).
- Cytoscape config + cxtmenu touch-tuned config (port from `07-PRESERVE-THESE-BEHAVIORS.md`).
- Bigger/Smaller toggle.
- Home preview: smaller read-only render (can use Cytoscape too with disabled gestures).

**Demo:** Open learning hub, see graph render with concepts, taphold a node, get context menu, expand to fullscreen.

## Phase 6 — Backup, Polish, Hardening (1–2 days)

- `app/settings.tsx` backup section: export full SQLite (or JSON dump) + MMKV blob + secure-store key list (not values) into a single zip via `expo-sharing`.
- Restore: read zip, drop tables, re-create, re-import data, re-embed concepts (handle the bug class from `07-PRESERVE-THESE-BEHAVIORS.md` § Import Sync Reset).
- Clear all data flow with double-confirm.
- Hardware back wired centrally in `app/_layout.tsx`.
- Empty states for every screen.
- App icon, splash screen.

**Demo:** Use app for an hour, export backup, wipe, restore, confirm everything intact.

## Phase 7 — Resume Polish (½ day)

- Top-level `README.md` with: architecture diagram, stack list, RAG explanation, screenshots, `pnpm install && pnpm android` to run.
- A short Loom/screenshot walkthrough.
- Tag a `v1.0` release.

## After v1

Do not start phase 8 until you've used v1 for at least a week. Real usage will reorder the v2 backlog more honestly than any planning session.
