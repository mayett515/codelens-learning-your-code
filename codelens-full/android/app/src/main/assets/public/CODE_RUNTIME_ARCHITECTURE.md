# CodeLens Runtime/Code Architecture

This document describes runtime behavior and module responsibilities.

## Runtime Boot Flow

1. `scripts/15-init-2.js` calls `init()`.
2. `scripts/02-init.js` boot sequence:
   - load API keys (`loadApiKeysFromStorage`)
   - apply icon substitutions (`applyKitIcons`)
   - load persisted state (`loadState`)
   - render projects/gems/folders
   - load settings UI
   - register delegated + global event listeners
   - refresh selection + AI queue UI

## State And Persistence

- Primary app state object lives in `scripts/01-state.js` as `state`.
- Persisted app state key: `codelens_state_v2`.
- Legacy state key migration: `codelens_state`.
- API keys are intentionally outside `state`:
  - Runtime container: `apiKeys` in `01-state.js`
  - Native storage bridge (Android): `window.NativeSecureStore`
  - Web fallback: `localStorage` key `codelens_api_keys_v1`
- Backups (`14-backup.js`) export/import only sanitized app state (not API keys).

## Android Native Key Bridge

- `android/app/src/main/java/com/codelens/app/MainActivity.java`
  - Registers JS bridge object `NativeSecureStore`.
- `android/app/src/main/java/com/codelens/app/NativeSecureStoreBridge.java`
  - Stores API key JSON in app-private `SharedPreferences`.
  - Exposes:
    - `getApiKeys()`
    - `setApiKeys(json)`
    - `clearApiKeys()`

## Event System

- Inline DOM handlers were removed from `index.html`.
- Central dispatcher in `02-init.js`:
  - `handleDelegatedActionClick(event)`
  - `runDelegatedAction(actionEl)`
- Clickable elements in static and dynamic HTML carry `data-action` + data payload attrs.
- Long-press project behavior:
  - `renderProjects()` attaches pointer listeners via `bindProjectItemGestures()`.
  - `startProjectLongPress` + `cancelProjectLongPress` control delete menu trigger.

## Module Boundaries

- `01-state.js`
  - Global state, syntax utilities, icon helpers, key storage helpers.
- `02-init.js`
  - Boot lifecycle, state save/load, delegated action router.
- `03-navigation.js`
  - `showScreen`, modal controls, toast.
- `04-projects.js`
  - Project import, project list, file picker tree, code highlight selection.
- `05-sections-chats.js`
  - Section derivation/cache and section chat open flow.
- `06-chat-ui.js`
  - Chat rendering + markdown/code formatting + bubble options.
- `07-general-chat.js`
  - General chat message flow.
- `08-gems.js`
  - Gem CRUD + active gem selection.
- `09-folders-snippets.js`
  - Folder CRUD + snippet saving + folder->general-chat entry.
- `10-bookmarks.js`
  - Bookmark rendering and filtering.
- `11-avatars.js`
  - Avatar picker + avatar selection + chat/folder entry helpers.
- `12-ai-api.js`
  - Provider calls, sequential queue worker, retry/backoff/cooldown logic.
- `13-settings.js`
  - Active provider + API key/model settings UI persistence.
- `14-backup.js`
  - Backup export/import and app reset.

## AI Queue Guarantees

- Single worker (`processAIQueue`) handles one request at a time.
- Per-provider minimum delay enforced before next request.
- Retry with bounded exponential backoff on retriable failures.
- Queue UI updates are event-driven (plus cooldown-local ticking), no global polling loop.

## Extension Rules

- Add new shared cross-module helpers to `01-state.js` or early-numbered files.
- Keep `data-action` names explicit and map them in one switch (`runDelegatedAction`).
- Keep provider-specific API logic in `12-ai-api.js` only.
- Do not put API keys back into `state` or backup payloads.
