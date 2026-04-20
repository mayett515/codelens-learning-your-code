# Implemented Fallback

## Scope completed
Implemented chat-model fallback architecture with per-provider hierarchy, optional cross-provider fallback, free-tier filtering, and per-chat model overrides.

This implementation follows the existing feature-based + clean architecture boundaries:
- queue/fallback logic in `src/ai/`
- typed domain contracts in `src/domain/types.ts`
- persistence at DB boundary in `src/db/`
- screen orchestration in `app/*`
- reusable UI in `src/ui/components/`

## What was implemented

### 1) Fallback engine (core)
- Added `src/ai/fallback.ts` with:
  - provider default/free fallback constants
  - list parsing/normalization helpers
  - free-tier model heuristic checks per provider
  - completion routing builder
  - ordered attempt-chain builder
  - retry/fallback error classification helpers

### 2) Queue execution across hierarchy
- Reworked `src/ai/queue.ts`:
  - queue items now support optional `routingOverride`
  - queue builds ordered attempt chain per request
  - each attempt applies provider cooldown + retry
  - falls through to next model/provider on fallback-worthy errors
  - keeps explicit abort handling and error propagation

### 3) Typed config model extension
- Updated `src/domain/types.ts`:
  - `ScopeModelConfig` now includes:
    - `fallbackModels`
    - `allowCrossProviderFallback`
    - `freeTierFallbacksOnly`
  - added `ChatModelOverride` type
  - `Chat` now includes optional `modelOverride`

### 4) Chat config persistence + normalization
- Replaced `src/ai/scopes.ts` with normalized config handling:
  - defaults for model + fallback hierarchy
  - backward-compatible normalization for older `chat_config`
  - update helpers for:
    - provider/model
    - per-provider fallback lists
    - cross-provider toggle
    - free-tier-only toggle

### 5) Per-chat model override persistence
- DB schema and migration:
  - `src/db/schema.ts`: added `chats.model_override` JSON column
  - `src/db/migrations/003-chat-model-overrides.ts`
  - `src/db/migrations/index.ts`: registered migration v3
  - `src/features/backup/format.ts`: `SCHEMA_VERSION` bumped to `3`

- Query layer updates (`src/db/queries/chats.ts`):
  - row mapping normalizes `modelOverride`
  - `insertChat` writes `modelOverride`
  - added `updateChatModelOverride(chatId, modelOverride?)`

### 6) Per-chat model selection UI (Java-app style)
- Added reusable modal:
  - `src/ui/components/ChatModelPickerModal.tsx`
  - provider toggle + model input
  - attempt-order preview from active hierarchy
  - save override / clear override actions

- Wired into chat screens:
  - `app/chat/[id].tsx`
  - `app/general-chat/[id].tsx`
  - `app/learning/chat/[id].tsx`

- Header now exposes `Model` / `Model*` button:
  - `Model*` indicates active chat override
  - overrides are persisted and used by queue on next send

### 7) Settings fallback hierarchy controls
- Updated `app/settings.tsx`:
  - per-scope toggles:
    - cross-provider fallback on/off
    - free-tier fallback filtering on/off
  - per-provider fallback hierarchy editors (ordered by line)
  - keeps existing primary provider/model controls

### 8) Send flow wiring for overrides
- Updated:
  - `src/hooks/send-flow.ts`
  - `src/hooks/use-send-message.ts`
- send flow now passes optional chat-level routing override into queue.

## Tests added
- `src/ai/__tests__/fallback.test.ts`
  - attempt order
  - override precedence
  - free-tier filtering
  - cross-provider toggle behavior
  - free-tier detection rules

## Verification run
- `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` ?
- `npm test -- src/ai/__tests__/fallback.test.ts src/hooks/__tests__/send-flow.test.ts` ? (9 tests passed)

## Notes
- Embedding pipeline was not changed in this phase; this work is chat-completion fallback and routing only.
- Existing backups remain readable (format unchanged), and new backups now report schema v3.
