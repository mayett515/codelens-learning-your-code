# CodeLens HTML/UI Architecture

This document focuses on the UI shell and visual structure in `public/`.

## UI Layout

- `index.html`
  - Screen and modal markup only.
  - Uses `data-action` attributes (no inline handlers).
  - Loads `styles/app.css` and script chunks in numeric order.
- `styles/app.css`
  - Theme tokens, layout, component styles, code/chat styling.
- `assets/icons.svg`
  - Shared icon sprite used by static markup and dynamic renderers.

## Screen Map

- `home-screen`
  - Project list, quick actions, folder preview.
- `project-screen`
  - Code viewer, file picker launch, color/selection toolbar.
- `chat-screen`
  - Section chat.
- `general-chat-screen`
  - Folder-scoped general chat.
- `gems-screen`
  - Prompt templates.
- `bookmarks-screen`
  - Saved bookmarks + color filter chips.
- `folders-screen`
  - Folder list for snippet/chat organization.
- `settings-screen`
  - Provider selection, API key inputs, model and backup controls.

## UI Interaction Model

- Static and dynamic clickable elements use `data-action`.
- A centralized delegated click dispatcher in `scripts/02-init.js` routes all UI actions.
- Visual icon replacements run during `init()` via `applyKitIcons()`.

## Script Load Order (UI-Relevant)

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
15. `scripts/15-init-2.js`
