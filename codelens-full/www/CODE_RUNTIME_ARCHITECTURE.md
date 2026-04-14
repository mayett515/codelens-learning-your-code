# CodeLens Runtime Architecture

This document describes how the app behaves at runtime and where responsibilities live.

## 1) Boot And Script Order

`index.html` loads scripts in this order:

1. `01-state.js`
2. `02-init.js`
3. `03-navigation.js`
4. `04-projects.js`
5. `05-sections-chats.js`
6. `06-chat-ui.js`
7. `07-general-chat.js`
8. `08-gems.js`
9. `09-folders-snippets.js`
10. `10-bookmarks.js`
11. `11-avatars.js`
12. `12-ai-api.js`
13. `13-settings.js`
14. `14-backup.js`
15. `16-learning.js`
16. `17-learning-embeddings.js`
17. `15-init-2.js` (`init();`)

Boot runs in `02-init.js` and performs:
- API key load
- persisted state load and normalization
- initial screen/list rendering
- delegated/global event listener wiring

## 2) State And Persistence

- Primary runtime state: global `state` in `01-state.js`
- Main persisted state key: `codelens_state_v2`
- API keys:
  - preferred on Android: `window.NativeSecureStore`
  - fallback: localStorage key `codelens_api_keys_v1`
- Learning embeddings:
  - preferred on Android: `window.ObjectBoxBridge`
  - JS metadata map: `state.learningHub.embeddings` (no raw vectors)
  - JS vector cache key: `codelens_learning_vectors_v1`

## 3) Action Routing Model

- UI controls use `data-action` attributes.
- `02-init.js` routes actions through delegated handlers.
- This is the central command bus used by static and dynamic UI nodes.

Important interaction patterns:
- Project card long-press opens project action menu.
- Code-line interactions respect interaction mode:
  - `View`: safe browse + open chats + line explain (double-click)
  - `Mark`: apply/remove highlights and ranges

## 4) Project And Code Viewer Runtime

Main owner: `04-projects.js`

- GitHub import and file ingestion
- file picker tree + search
- search modes:
  - `Path + Content`
  - `Filename Only`
- per-project recent files ordering
- code rendering and line-state class updates
- marker behavior with safety checks (including erase confirmation flows)
- highlight depth handling for nested same-color marks

## 5) Chat Runtime

Section/line chat:
- `05-sections-chats.js` and `06-chat-ui.js`

General chat:
- `07-general-chat.js`

Learning review chat:
- `16-learning.js` (`learning-chat-screen`)

Recent chat system:
- home preview uses latest 5 chats
- dedicated recent chats screen supports:
  - search
  - incremental loading while scrolling
  - timestamp display

## 6) Learning Runtime

Main owners:
- `16-learning.js` (session/concept/graph/review flows)
- `17-learning-embeddings.js` (embedding lifecycle + vector store + native bridge IO)

- `Save as Learning` can capture:
  - full active chat
  - single bubble
- capture flow now includes preview-before-save modal
- concepts are normalized into taxonomy fields
- review and extraction calls use `learning` chat scope by default
- settings UI currently exposes section/general model controls; learning scope defaults are configured in state helpers
- knowledge graph data derived from sessions/concepts/links
- graph supports pan and pinch zoom on mobile
- session reference mode is read-only and can restore prior navigation context

## 7) AI Queue And Provider Runtime

Main owner: `12-ai-api.js`

- single serialized queue processing
- cooldown/min-delay by provider
- bounded retry/backoff on retriable failures
- model fallback handling for unavailable endpoints
- queue status propagated back to UI

## 8) Navigation Runtime

Main owner: `03-navigation.js` + wiring in init/runtime handlers

- screen and modal transitions are centralized
- history stack supports in-app back navigation behavior
- Android hardware back behavior prefers:
  1. close open modal
  2. navigate to previous screen/state

## 9) Native Bridge Runtime

Native bridge registration happens in:
- `android/app/src/main/java/com/codelens/app/MainActivity.java`

Bridges:
- `NativeSecureStoreBridge.java`
  - API key persistence
- `ObjectBoxBridge.java`
  - embedding upsert/match/delete contract

Reference contract doc:
- `codelens-full/LEARNING_NATIVE_BRIDGE.md`

## 10) Practical Edit Rules

- Keep new UI actions on `data-action` and route centrally.
- Keep provider/network logic in `12-ai-api.js`.
- Keep learning concept extraction/session logic in `16-learning.js`.
- Keep vector persistence/native semantic retrieval in `17-learning-embeddings.js`.
- Keep `www/` docs and `android/.../assets/public/` docs mirrored.
