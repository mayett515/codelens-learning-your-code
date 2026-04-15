# Architecture

The architecture is **hexagonal (ports + adapters)**. The domain core knows nothing about React, SQLite, or the network. Adapters wire the core to those concrete things.

This pattern is the *resume story* — preserve it.

## Folder Structure

```
codelens-rn/
├── app/                         # Expo Router routes (one file per screen)
│   ├── _layout.tsx
│   ├── index.tsx                # home screen
│   ├── project/[id].tsx         # project viewer
│   ├── chat/[id].tsx            # section/line chat
│   ├── general-chat/[id].tsx
│   ├── learning/index.tsx
│   ├── learning/chat/[id].tsx
│   ├── recent-chats.tsx
│   └── settings.tsx
├── src/
│   ├── domain/                  # pure TS, no React, no IO
│   │   ├── types.ts             # all domain types (Project, Concept, Chat, ...)
│   │   ├── marker.ts            # mark/highlight depth logic
│   │   ├── concept.ts           # concept normalization
│   │   └── prompts.ts           # extraction/review prompt templates
│   ├── ports/                   # interfaces — the contracts adapters implement
│   │   ├── vector-store.ts      # upsert / topMatches / delete
│   │   ├── ai-client.ts         # complete / embed
│   │   ├── secure-store.ts      # getApiKey / setApiKey
│   │   └── kv-store.ts          # get / set / delete sync KV
│   ├── adapters/                # concrete implementations of ports
│   │   ├── sqlite-vector-store.ts
│   │   ├── openrouter-client.ts
│   │   ├── siliconflow-client.ts
│   │   ├── secure-store-expo.ts
│   │   └── kv-mmkv.ts
│   ├── db/
│   │   ├── client.ts            # op-sqlite + drizzle init
│   │   ├── schema.ts            # drizzle schema
│   │   ├── migrations/
│   │   └── queries/             # typed query helpers per table
│   ├── ai/
│   │   ├── queue.ts             # serialized queue + retries
│   │   ├── scopes.ts            # section / general / learning config
│   │   └── embed.ts             # embedding call wrapper
│   ├── learning/
│   │   ├── extract.ts           # extract concepts from a chat
│   │   ├── retrieve.ts          # hybrid retrieval (vector + recency + scope)
│   │   ├── graph.ts             # build graph data from concepts + links
│   │   └── sync.ts              # ensure embedding stored
│   ├── graph/
│   │   ├── WebViewGraph.tsx     # the WebView component
│   │   └── messages.ts          # typed postMessage protocol
│   ├── ui/
│   │   ├── components/          # shared UI primitives
│   │   ├── screens/             # screen-level components (imported by app/)
│   │   └── theme.ts
│   ├── stores/                  # zustand stores (UI state only)
│   │   ├── selection.ts
│   │   └── interaction-mode.ts
│   └── lib/                     # utility helpers
├── assets/
│   ├── vendor/cytoscape/        # cytoscape.min.js, cytoscape-cxtmenu.js
│   ├── graph.html               # WebView entry, loads vendored libs
│   └── icons/
├── drizzle.config.ts
├── app.config.ts
├── package.json
└── tsconfig.json
```

## Layer Rules

- **`domain/`** imports nothing from `react`, `react-native`, `expo`, `op-sqlite`, or `fetch`. Pure functions and types.
- **`ports/`** are interfaces only. No implementations.
- **`adapters/`** are the only place adapter-specific imports live (`op-sqlite`, `react-native-mmkv`, etc.).
- **`db/`, `ai/`, `learning/`** can import from `domain/` and `ports/`. They expose use-case-level functions consumed by UI.
- **`ui/`, `app/`, `stores/`** can import everything *except* adapters directly. UI gets adapters via a small composition root in `src/composition.ts` (or via React context).

## Composition Root

Single file `src/composition.ts`:

```ts
export const vectorStore: VectorStorePort = makeSqliteVectorStore(db);
export const aiClient: AiClientPort = makeRoutedClient({
  openrouter: makeOpenRouterClient(),
  siliconflow: makeSiliconflowClient(),
});
export const secureStore: SecureStorePort = makeExpoSecureStore();
export const kv: KvPort = makeMmkvStore();
```

UI imports the singleton instances. Tests import the factory and pass fakes.

## Data Flow Example: "Save chat as learning"

1. User taps "Save as Learning" in `app/chat/[id].tsx`.
2. UI calls `learning/extract.ts → extractConceptsFromChat(chatId)`.
3. `extract` reads chat messages via `db/queries/chats.ts`, builds prompt via `domain/prompts.ts`, sends to `ai/queue.ts → enqueue('learning', prompt)`.
4. AI response parsed with zod, normalized via `domain/concept.ts`.
5. Concepts written via `db/queries/concepts.ts` (transactional insert).
6. For each new concept, `learning/sync.ts → ensureEmbedded(conceptId)` enqueues an embedding call, on success calls `vectorStore.upsert(...)`.
7. UI invalidates TanStack Query keys for `['concepts']` and `['graph']`. Graph re-renders.

Notice: the UI never touches SQLite or fetch directly. The domain functions never know they're in React Native.
