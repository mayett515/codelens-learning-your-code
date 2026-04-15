# Screens

Each screen is one Expo Router file. Every entry below specifies: route, what it reads, what it dispatches, and the *intent* (what the user is trying to do here).

## `app/index.tsx` — Home

**Route:** `/`
**Intent:** Quick re-entry into recent work. Land here on app launch.
**Reads:**
- All projects (cards, ordered by `updatedAt`)
- 5 most recent chats (any scope)
- Knowledge graph preview (read-only mini-render)
**Dispatches:**
- Open project → push `/project/[id]`
- Open chat → push `/chat/[id]` or `/general-chat/[id]` depending on scope
- New project → modal: GitHub import or paste code
- Open learning hub → push `/learning`
- Open settings → push `/settings`

## `app/project/[id].tsx` — Project Viewer

**Route:** `/project/[id]`
**Intent:** Read code, mark lines, open chats anchored to code.
**Reads:**
- Project metadata
- Current file content + marks + ranges
- File picker tree (lazily expanded)
- Recent files row (max 8)
**Dispatches:**
- Switch file → load via `db/queries/files.ts`
- Toggle mode (View / Mark)
- Apply mark / range mark / erase mark (with confirmation when erasing)
- Open file picker modal (with search: `path+content` or `filename only`)
- Long-press project header → project action sheet
- Double-tap line in `view` mode → line explain chat
- Tap section header → section chat
**Modes:**
- `view` — safe browse, no accidental marks
- `mark` — gestures apply marks
**Marker depth rule:** see `07-PRESERVE-THESE-BEHAVIORS.md` § Marker Depth.

## `app/chat/[id].tsx` — Section / Line Chat

**Route:** `/chat/[id]`
**Intent:** Discuss specific code with AI; save valuable insights as learnings.
**Reads:**
- Chat metadata + messages
- Anchor: file + line range (shown in header)
- Active scope config (`section` from `chatConfig`)
**Dispatches:**
- Send message → `ai/queue.ts`
- Long-press bubble → bubble options modal (copy, save bubble as learning, delete)
- Header "Save as Learning" → preview modal → on confirm, `learning/extract.ts`
- Back → previous screen via router

## `app/general-chat/[id].tsx` — General Chat

**Route:** `/general-chat/[id]`
**Intent:** Free-form chat with optional folder + avatar context.
**Reads:**
- Chat + messages
- Current folder (if any)
- Current avatar (if any)
- `general` scope config
**Dispatches:**
- Same as section chat plus folder picker and avatar picker.
- Save as Learning identical flow.

## `app/learning/index.tsx` — Learning Hub

**Route:** `/learning`
**Intent:** Browse what's been learned. Explore the graph. Drill into concepts.
**Reads:**
- Today's sessions
- Concept explorer (search + filter)
- Knowledge graph (full Cytoscape WebView)
- Session snippets list
**Dispatches:**
- Tap concept → push `/learning/chat/[id]` to start review chat
- Tap session → reference view (read-only old chat)
- Graph node taphold → cxtmenu commands (Open / Ask / Center)
- Toggle "Bigger / Smaller" → expand graph panel (`state.graphExpanded` in zustand)

## `app/learning/chat/[id].tsx` — Learning Review Chat

**Route:** `/learning/chat/[id]`
**Intent:** AI-led review of a specific concept, using semantic retrieval to pull related context.
**Reads:**
- Concept being reviewed
- Related concepts via `learning/retrieve.ts`
- `learning` scope config
- Existing review chat messages
**Dispatches:**
- Send message → AI queue with retrieved context injected
- Save bubble as learning → same flow

## `app/recent-chats.tsx` — Recent Chats

**Route:** `/recent-chats`
**Intent:** Find a past chat by content.
**Reads:**
- All chats, paginated, search-filterable
**Dispatches:**
- Search debounced 200ms
- Incremental load on scroll-end (page size 20)
- Tap chat → push correct route by scope

## `app/settings.tsx` — Settings

**Route:** `/settings`
**Intent:** Configure providers, models, color labels, backup.
**Reads:**
- API keys (masked)
- `chatConfig` for all three scopes
- `colorLabels`
**Dispatches:**
- Set API key → `secureStore.setApiKey`
- Change provider/model per scope → MMKV write + zustand update
- Rename color label → MMKV write
- Backup → JSON export (full SQLite dump + MMKV blob, zip and share)
- Restore → JSON import (see `07-PRESERVE-THESE-BEHAVIORS.md` § Import Sync Reset)
- Clear all data → confirm modal, then drop tables + clear MMKV + clear secure store

## Modals (not separate routes — rendered via React Navigation modal stack or a portal)

- New project (GitHub URL or paste code)
- File picker (with search)
- Bubble options
- Learning capture preview
- Sections list
- Project action sheet
- Avatar picker
- Folder/gem creation
- Confirm-erase mark
- Confirm clear all

## Hardware Back Behavior

Centralized in `src/lib/back-handler.ts`. Order:
1. If a modal is open → close modal.
2. Else if `router.canGoBack()` → `router.back()`.
3. Else → exit app (Android default).

Wired once in `app/_layout.tsx` via `BackHandler.addEventListener('hardwareBackPress', handler)`.
