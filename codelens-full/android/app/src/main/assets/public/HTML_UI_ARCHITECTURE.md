# CodeLens HTML/UI Architecture

This document maps the UI shell in `public/` and the key interaction surfaces.

## 1) Primary UI Files

- `index.html`
  - Screen + modal structure
  - `data-action` wiring targets
  - script include order
- `styles/app.css`
  - layout, theme tokens, code/chat styles, graph styles, mode styles
- `assets/icons.svg`
  - shared icon sprite

## 2) Screen Map

- `home-screen`
  - project cards, quick actions, recent chat preview
- `project-screen`
  - code header, file switcher, recent files row, color/mode toolbar, code viewer
- `chat-screen`
  - section/line chat with header-level `Save as Learning`
- `general-chat-screen`
  - general chat with folder/avatar controls + `Save as Learning`
- `learning-screen`
  - today sessions, concept explorer, knowledge graph, session snippets
- `learning-chat-screen`
  - concept-focused review chat
- `recent-chats-screen`
  - searchable recent chats list with incremental loading
- `gems-screen`
  - prompt template management
- `bookmarks-screen`
  - bookmark list with color filters
- `folders-screen`
  - saved snippet folders
- `settings-screen`
  - provider/model selection, API keys, color labels, backup

## 3) High-Impact Modals

- import GitHub / paste code
- file picker modal (includes search + search-mode toggle)
- bubble options modal
- learning capture preview modal (confirm/cancel)
- sections modal
- project action modal
- avatar picker and folder/gem creation modals

## 4) Interaction Model

- All UI actions are delegated through `data-action`.
- `02-init.js` handles action dispatch.
- `project-screen` interaction modes:
  - `View`: open existing marks and line explain flows without accidental marking
  - `Mark`: line/range marking tools enabled
- marker visuals include nested same-color depth distinctions.
- line-level point markers can open line chats separately from section chats.

## 5) Knowledge Graph UI

- Graph is rendered in learning UI surfaces.
- Pan + pinch zoom are mobile-first interactions.
- Zoom is gesture-driven (not plus/minus buttons).

## 6) Script Load Order

1. `scripts/01-state.js`
2. `scripts/02-init.js`
3. `scripts/03-navigation.js`
4. `scripts/04-projects.js`
5. `scripts/05-sections-chats.js`
6. `scripts/06-chat-ui.js`
7. `scripts/07-general-chat.js`
8. `scripts/08-gems.js`
9. `scripts/09-folders-snippets.js`
10. `scripts/10-bookmarks.js`
11. `scripts/11-avatars.js`
12. `scripts/12-ai-api.js`
13. `scripts/13-settings.js`
14. `scripts/14-backup.js`
15. `scripts/16-learning.js`
16. `scripts/17-learning-embeddings.js`
17. `scripts/15-init-2.js` (boot call)

## 7) UI Editing Guardrails

- Keep `www/index.html` and `android/.../assets/public/index.html` aligned.
- Add new clicks via `data-action`, not inline handlers.
- If new stateful UI is added, ensure it is normalized in state shape routines.
