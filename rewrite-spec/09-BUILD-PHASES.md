# Build Phases

Each phase ends with the app **runnable end-to-end on a real Android device or emulator**. No phase boundary leaves half-finished features. If you cannot demo a phase to a user, you have not finished the phase.

## Phase 0 — Scaffolding (½ day)

### Windows Environment Prerequisites

Before creating the project, verify these are set. Run `npm run doctor` after scaffolding to confirm.

1. **Android Studio** installed with Android SDK (default: `%LOCALAPPDATA%\Android\Sdk`).
2. **ANDROID_HOME** — set as a User environment variable:
   ```
   setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
   ```
3. **JAVA_HOME** — point to Android Studio's bundled JDK (JBR):
   ```
   setx JAVA_HOME "C:\Program Files\Android\Android Studio\jbr"
   ```
4. **PATH** — add adb and java:
   ```
   setx PATH "%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools"
   ```
5. **Restart your terminal** after setting env vars — they don't take effect in the current shell.

### Scaffold Steps

- `npx create-expo-app@latest codelens-rn --template default`
- Configure: TypeScript strict (`exactOptionalPropertyTypes: true` in tsconfig), Expo Router, Hermes, new architecture (already defaults in SDK 54+).
- Install runtime deps: `op-sqlite`, `drizzle-orm`, `react-native-mmkv`, `react-native-webview`, `@tanstack/react-query`, `zustand`, `expo-secure-store`, `expo-haptics`, `react-native-gesture-handler`, `react-native-reanimated`, `zod`, `date-fns`.
- Install dev deps: `drizzle-kit`.
- Add `"op-sqlite": { "sqliteVec": true }` to the root of `package.json`. This is the authoritative config — op-sqlite v15+ has no Expo config plugin (`app.plugin.js`); the native build files (podspec / build.gradle) read this key directly. Do **not** add `@op-engineering/op-sqlite` to the `plugins` array in `app.json` — it will error.
- Add `plugins/with-local-properties.js` — Expo config plugin that writes `android/local.properties` with `sdk.dir` on every `expo prebuild`. Reads from `ANDROID_HOME` env var or auto-detects the default Windows SDK path. This prevents `prebuild --clean` from leaving a broken build.
- Register the plugin in `app.json`: `"./plugins/with-local-properties"`.
- Add `scripts/doctor.js` — health check that verifies JAVA_HOME, ANDROID_HOME, adb on PATH, `package.json` op-sqlite key with sqliteVec, and `with-local-properties` plugin registered. Run with `npm run doctor`.
- Set up the `src/` folder structure from `03-ARCHITECTURE.md`.
- Run `npm run doctor` — all checks must pass.
- Run `npx expo prebuild --clean` then `npx expo run:android` to verify dev client builds.

**Demo:** App launches, shows a placeholder home screen. `npm run doctor` reports all green.

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
