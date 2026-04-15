# Phase 3 Implementation — Section + General Chats

This document describes everything built in Phase 3, file by file, with key code decisions explained. Phase 2 (Project Viewer + Mark System) was already complete before this work began.

## Files Created / Modified

### 1. `src/ports/ai-client.ts` — AI Client Port Interface (NEW)

Defines the hexagonal port for AI providers.

**Key types:**

- `AiCompleteInput` — `messages`, `model`, `provider`, optional `signal` for abort
- `AiEmbedInput` — `text`, `model`, `api`
- `AiClientPort` — interface with `complete()` and `embed()` methods

**Design decisions:**
- `signal` is `AbortSignal | undefined` (not optional-missing) because of `exactOptionalPropertyTypes`
- `provider` is on the input so the queue can route to the right adapter
- `embed()` returns `Float32Array` directly — ready for sqlite-vec insertion

---

### 2. `src/ai/queue.ts` — Serialized AI Request Queue (NEW)

Single-flight request queue with cooldowns, retry/backoff, and model fallback. All AI requests go through `enqueue()`.

**Key functions:**

- `enqueue(scope, messages, signal)` → Adds to queue, returns `Promise<string>`. Only one request processes at a time.
- `setCompleteImpl(fn)` → Dependency injection point. `composition.ts` injects the routed complete function.
- `executeWithRetry(item)` → Core retry loop with:
  - Provider-specific cooldowns: openrouter 1100ms, siliconflow 1500ms
  - MAX_RETRIES = 3 with exponential backoff (1s → 2s → 4s, capped at 8s)
  - Model fallback on 404: openrouter → `google/gemini-2.0-flash-exp:free`, siliconflow → `Qwen/Qwen2.5-7B-Instruct`
  - Abort signal checked before each attempt
- `getQueueLength()`, `clearQueue()` — utility functions

**Design decisions:**
- `setCompleteImpl()` pattern avoids circular dependency (queue imports scopes, composition imports queue)
- Cooldowns are per-provider, tracked by `lastCallTime` record
- Retriable errors: 429, 500, 502, 503, 504, timeout, network keywords
- Model-not-found triggers fallback before retrying
- Queue items store their own `resolve`/`reject` — standard Promise-wrapping pattern

---

### 3. `src/ai/scopes.ts` — Per-Scope Chat Configuration (NEW)

Manages which provider and model each chat scope uses. Persisted via MMKV.

**Key functions:**

- `getChatConfig()` → Returns full `ChatConfig` from MMKV, falls back to defaults
- `getScopeConfig(scope)` → Returns a single scope's config
- `getActiveModel(scope)` → Returns `{ provider, model }` — the queue calls this
- `updateScopeProvider(scope, provider)` → Changes active provider for a scope
- `updateScopeModel(scope, provider, model)` → Changes model for a specific provider within a scope

**Default models:**
- OpenRouter: `google/gemini-2.0-flash-exp:free`
- SiliconFlow: `Qwen/Qwen2.5-7B-Instruct`

**Design decisions:**
- Each scope stores models for BOTH providers — switching provider doesn't lose the model selection for the other
- Three scopes: `section`, `general`, `learning` (learning used in Phase 4)
- Stored under MMKV key `chat_config`

---

### 4. `src/adapters/openrouter-client.ts` — OpenRouter API Client (NEW)

Implements `AiClientPort` for OpenRouter.

**Key details:**
- Base URL: `https://openrouter.ai/api/v1`
- Extra headers: `HTTP-Referer: https://codelens.app`, `X-Title: CodeLens` (required by OpenRouter TOS)
- `complete()` → POST to `/chat/completions`, extracts `choices[0].message.content`
- `embed()` → POST to `/embeddings`, extracts `data[0].embedding` as `Float32Array`
- API key fetched lazily via `getApiKey` closure — key isn't read until a request is made
- `signal ?? null` conversion for `exactOptionalPropertyTypes` compat with `RequestInit`

---

### 5. `src/adapters/siliconflow-client.ts` — SiliconFlow API Client (NEW)

Implements `AiClientPort` for SiliconFlow. Same structure as OpenRouter but:

- Base URL: `https://api.siliconflow.cn/v1`
- No extra headers beyond Authorization + Content-Type
- Same `signal ?? null` fix

---

### 6. `src/composition.ts` — Dependency Wiring (MODIFIED)

Updated to wire up AI clients.

**What was added:**
- Creates `openRouterClient` and `siliconFlowClient` with `getApiKey` closures from `secureStore`
- `clients` record maps provider name → client instance
- `routedComplete(input)` → selects client by `input.provider`, calls `client.complete(input)`
- Calls `setCompleteImpl(routedComplete)` to inject into the queue

**Design decisions:**
- Lazy key resolution: the getApiKey closure isn't called until the first AI request
- Provider routing is a simple record lookup — no factory or DI container needed

---

### 7. `src/domain/prompts.ts` — System Prompt Builders (NEW)

Pure functions that build system prompts for AI chats.

**Key functions:**

- `buildSectionSystemPrompt(filePath, codeSnippet, startLine, endLine, marks, ranges)` → Builds a code-tutor prompt with:
  - File path and line range
  - Code annotated with line numbers
  - `[FOCUS]` prefix on lines that have BOTH a direct mark AND are inside a range (marks that "pop out" — the user's chat-anchor concept)
  - "Be concise — they're on a small screen" instruction
- `buildGeneralSystemPrompt()` → Simple coding assistant prompt

**Design decisions:**
- `[FOCUS]` markers only appear on `isDirectMark && isOverlap` lines — this ties directly into the Phase 2 mark visualization where direct marks within ranges visually pop out
- The AI is told about FOCUS lines: "Lines marked [FOCUS] are ones the user specifically highlighted for discussion"
- Code is reconstructed with real line numbers so the AI can reference specific lines

---

### 8. `src/ui/components/ChatBubble.tsx` — Message Bubble (NEW)

Memoized chat message bubble component.

**Key details:**
- User messages: right-aligned, primary background color, bottom-right corner squared
- Assistant messages: left-aligned, surface background, bottom-left corner squared, subtle border
- System messages: filtered out (return null)
- `selectable` text for copy-paste
- Long-press triggers bubble menu via `onLongPress` prop

---

### 9. `src/ui/components/BubbleMenu.tsx` — Bubble Context Menu (NEW)

Modal overlay with message actions.

**Actions:**
- **Copy** — uses `expo-clipboard` (`Clipboard.setStringAsync`)
- **Save as Learning** — conditional: only shows if `onSaveAsLearning` prop is provided (will be used in Phase 4)
- **Delete** — calls `onDelete` and closes

**Design decisions:**
- `onSaveAsLearning` is optional — section and general chat don't pass it yet. Learning chat will.
- Full-screen semi-transparent overlay, tap outside to dismiss
- Uses `Modal` with `animationType="fade"`

---

### 10. `src/ui/components/ChatInput.tsx` — Chat Text Input (NEW)

Multiline text input with send button.

**Key details:**
- Rounded pill-style input (borderRadius 20)
- Multiline, maxLength 4000
- Send button disables and dims when `disabled` prop is true (during AI response)
- Clears input on send
- Platform-aware padding (iOS gets +2 vertical padding)

---

### 11. `app/chat/[id].tsx` — Section Chat Screen (NEW)

Chat screen for code-section discussions.

**Data flow:**
1. Loads chat by ID → TanStack Query
2. If chat has `fileId`, loads the file → gets code content for system prompt
3. Builds system prompt using `buildSectionSystemPrompt()` with the file's code, line range, and marks
4. On send: inserts user message → calls `enqueue('section', ...)` → inserts assistant response
5. Invalidates both `['chat', chatId]` and `['recentChats']` queries

**UI structure:**
- Header with back button, chat title, and code context subtitle (e.g. `utils.ts:12-28`)
- FlatList of ChatBubble components
- "Thinking..." indicator with ActivityIndicator during AI response
- Error bar with dismiss button
- ChatInput at bottom
- BubbleMenu on long-press

**Design decisions:**
- Full message history sent to AI on each request (no truncation yet — will be needed for long conversations)
- `fallback` system prompt if file data isn't loaded: simple "Be concise" prompt
- Scroll to end on new messages via `onContentSizeChange`

---

### 12. `app/general-chat/[id].tsx` — General Chat Screen (NEW)

Same UI as section chat but without code context.

**Differences from section chat:**
- Uses `buildGeneralSystemPrompt()` instead of `buildSectionSystemPrompt()`
- No file loading, no code context subtitle in header
- No `codeContext` display

---

### 13. `app/settings.tsx` — Settings Screen (NEW)

Full settings screen for API keys and model configuration.

**API Keys section:**
- OpenRouter and SiliconFlow key inputs with secure entry
- Shows "Key set" + Clear button when a key is saved
- Shows TextInput + Save button when no key is set
- Keys stored via `secureStore` (expo-secure-store)

**Model Config section:**
- Three scope cards: SECTION, GENERAL, LEARNING
- Each card has a provider toggle (OpenRouter / SiliconFlow) with visual active state
- Model text input below (monospace font, shows model ID)
- Changing provider immediately switches the displayed model to that provider's saved model

**UX:**
- Toast notification for saves (auto-dismisses after 2s)
- Back button navigation
- `keyboardShouldPersistTaps="handled"` on ScrollView for better keyboard UX

---

### 14. `app/project/[id].tsx` — Project Viewer (MODIFIED)

**What was added:**
- `openSectionChat(line)` callback: when in View mode, tapping a marked line creates a new section chat and navigates to it
- Gets mark info via `getLineMarkInfo()` — if a direct mark, chat covers just that line; if inside a range, chat covers the full range
- Chat title auto-generated as `filename:startLine-endLine`
- Imports `insertChat` from chats queries and `uid` from lib

---

### 15. `app/index.tsx` — Home Screen (MODIFIED)

**What was added:**
- Recent Chats section (top 5) — horizontal scroll of chat chips
- Each chip shows scope badge (SEC/GEN/LRN) and title
- Tapping a recent chat navigates to the right screen based on scope
- "Chat" button in header → creates a new general chat and navigates to it
- Uses `getRecentChats(5)` query

---

## New Dependencies

- `expo-clipboard` — needed for BubbleMenu copy functionality. Native module, requires rebuild.

## TypeScript Status

`tsc --noEmit` passes clean. Two issues were fixed:
- `signal: input.signal` in both API clients → `signal: input.signal ?? null` (exactOptionalPropertyTypes requires `null` not `undefined` for `RequestInit.signal`)

## Testing Notes

- expo-clipboard is a native module → requires `npx expo prebuild --clean && npx expo run:android` before testing
- To test chat: need API key (OpenRouter or SiliconFlow) set in Settings
- Free model: `google/gemini-2.0-flash-exp:free` on OpenRouter requires no billing
- The "Save as Learning" button in BubbleMenu is intentionally hidden until Phase 4 connects it

## Architecture Notes

- All AI requests go through the serialized queue — no direct fetch calls from screens
- Domain prompts are pure functions, no React/IO dependencies
- Screen → `enqueue()` → queue → `routedComplete()` → adapter → fetch → response → screen
- Provider selection is per-scope, stored in MMKV, changeable at runtime from Settings
- Chat data (messages, scope, file reference) is all in SQLite via the Phase 1 schema
