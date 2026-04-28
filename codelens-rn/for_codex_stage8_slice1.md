# Codex Task - Stage 8 Slice 1 (keystone)
# Persona Picker + Model Picker + runSendInjection rewire

You are working in `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`.

## Required reading order (do not skip)

1. `MAIN.md`
2. `whatwe_agreedonthearchitecture.md`
3. `whatwe_agreedonthearchitecture_humans.md`
4. `..\comparision java vs react native\CODELENS_PROJECT_STATUS.md`
5. `..\comparision java vs react native\CODELENS_REGRESSION_GUARD.md`
6. `..\comparision java vs react native\CODELENS_COMPLETENESS_GUARD.md`
7. `..\comparision java vs react native\STAGE_8_PERSONAS_AND_CHAT_UX.md`

The Stage 8 foundation is already merged. Personas table, persona codecs, persona repo, built-in seed (`ON CONFLICT(name) DO NOTHING`), `chats.persona_id`, `chats.model_override_id`, static chat model catalog, `buildChatSystemPrompt` (4-layer), `buildMiniChatSystemPrompt`, `buildCodeContextLayer`, `setChatModelOverride` repo, and `formatMemoriesForInjection` (now under `src/features/learning/retrieval/formatting/`) all exist and pass tsc + vitest (28 files / 138 tests).

## Scope of this slice

**In scope (do all of this):**
- Persona picker sheet for the chat header (`ChatPersonaPickerSheet`).
- Catalog-backed model picker sheet (`ChatModelPickerSheet`) - separate from the legacy free-form `ChatModelPickerModal`. The legacy modal stays untouched in this slice.
- TanStack Query hooks for personas and per-chat persona/model selection.
- Rewire of Stage 7's `runSendInjection` and the chat-screen system-prompt construction so memories live in **LAYER 3 of `buildChatSystemPrompt`**, not inline in `outboundText`.
- Wire all three chat screens to the new flow: `app/chat/[id].tsx`, `app/general-chat/[id].tsx`, `app/learning/chat/[id].tsx`.
- Tests for the rewire and the new hooks.

**Out of scope (do NOT touch):**
- Cancel-in-flight (`StopGeneratingButton`) - slice 2.
- Selected-code preview / adjust mode UI - slice 2.
- Mini chat UI - slice 3.
- Bookmarks, palettes, chat message markers - slice 4.
- Anything under `src/features/learning/extractor/**`.
- The legacy `src/ui/components/ChatModelPickerModal.tsx` - leave it as is. Add the new sheet alongside it.
- Stage 9.

## Hard constraints (LOCKED)

- Persona layers MUST NEVER be passed into the extractor. No imports between `src/features/learning/extractor/**` and `src/features/personas/**` or `src/features/chat/promptComposition/**`.
- `BASE_CHAT_SYSTEM_PROMPT` and `BASE_APP_SYSTEM_PROMPT` MUST remain in separate modules; do not merge.
- Built-in personas remain non-deletable / non-editable. Do not weaken `personaRepo.updateUserPersona` or `personaRepo.deleteUserPersona` guards.
- Memories are now LAYER 3 of `buildChatSystemPrompt`. **Stop wrapping memories into the user message** with `<codelens_memory_context>` tags. The user message goes to the LLM verbatim. Memory tokens move into the system prompt only.
- `chats.model_override_id = NULL` means "use existing default model behavior." Switching models affects the next send only.
- Persona selection MUST NOT trigger retrieval, embedding, or concept creation.
- Persona change MUST NOT re-run retrieval or re-send any message; it takes effect on the next send.
- Familiarity / importance scores MUST NOT be touched anywhere in this patch.

## Files to create

```
src/features/personas/hooks/usePersonas.ts
src/features/personas/hooks/useChatPersona.ts
src/features/personas/hooks/useSetChatPersona.ts
src/features/personas/ui/ChatPersonaPickerSheet.tsx
src/features/personas/ui/PersonaRowItem.tsx
src/features/personas/__tests__/stage8-persona-hooks.test.ts

src/features/chat/hooks/useChatModelOverride.ts
src/features/chat/hooks/useSetChatModelOverride.ts
src/features/chat/hooks/useChatPromptContext.ts        // optional convenience hook composing persona + memories + codeContext
src/features/chat/ui/ChatModelPickerSheet.tsx
src/features/chat/__tests__/stage8-send-flow-rewire.test.ts
```

## Files to modify

```
src/features/personas/index.ts                                        // export new hooks + sheet
src/features/chat/index.ts                                            // export new hooks + sheet
src/features/personas/data/queryKeys.ts                                // factory keys for persona hooks
src/features/learning/dot-connector/services/runSendInjection.ts       // see "runSendInjection contract change" below
src/features/learning/dot-connector/types/dotConnector.ts              // SendInjectionResult shape change
src/features/learning/dot-connector/hooks/useSendWithInjection.ts      // expose memories instead of outboundText
src/ui/components/ChatInput.tsx                                        // pass memories upward; stop relying on outboundText wrapping
src/hooks/use-send-message.ts                                          // accept persona + memories + codeContext, build full system prompt via buildChatSystemPrompt
src/hooks/send-flow.ts                                                 // user message goes verbatim; no inline memory wrap
src/features/learning/dot-connector/__tests__/stage7-dot-connector.test.ts  // update assertions for new contract
app/chat/[id].tsx                                                      // wire persona/model pickers + new buildPrompt
app/general-chat/[id].tsx                                              // same
app/learning/chat/[id].tsx                                             // same
```

## runSendInjection contract change

Stage 7's `runSendInjection` currently returns `outboundText = "<codelens_memory_context>...</codelens_memory_context>\n\n${userText}"`. That inlines memory into the user message.

Stage 8 says memories live in LAYER 3 of `buildChatSystemPrompt`. So the new contract:

```ts
export interface SendInjectionResult {
  // REMOVED: outboundText (memories no longer wrap user text)
  memories: RetrievedMemory[];                  // included memories ready for system prompt
  injection: InjectionResult | null;            // formatted block, kept for diagnostics/preview parity
  diagnostics: RetrieveDiagnostics | null;
  reusedTypingResult: boolean;
}
```

`runSendInjection` still:
- respects the Dot Connector enable / per-turn / removal logic,
- runs the typing-snapshot freshness check + last-accessed bump,
- returns the same diagnostics shape.

It just stops constructing `outboundText`. Callers receive `memories` and pass them into `buildChatSystemPrompt({ persona, memories, codeContext })`.

`MEMORY_BLOCK_START` / `MEMORY_BLOCK_END` constants become unused - delete them. Update the Stage 7 test that asserts on `<codelens_memory_context>` to assert on `memories` length and on the diagnostics shape instead.

## Chat screen rewire pattern

Each of the three chat screens currently does:

```ts
const buildPrompt = useCallback(() => buildSectionSystemPrompt(...), [...]);
const { send } = useSendMessage(chatId, scope, buildPrompt, messages, chat?.modelOverride);
<ChatInput onSend={send} ... />
```

Change to:

```ts
const personaQuery = useChatPersona(chatId);          // null if no persona
const memoriesRef = useRef<RetrievedMemory[]>([]);    // populated by ChatInput on each send

const buildSystemPrompt = useCallback(() => buildChatSystemPrompt({
  persona: personaQuery.data ?? null,
  memories: memoriesRef.current,
  codeContext: deriveCodeContextFromChat(chat, file), // section: selected_code; general/learning: null
}), [personaQuery.data, chat, file]);

const { send } = useSendMessage(chatId, scope, buildSystemPrompt, messages, chat?.modelOverride);

<ChatInput
  onSend={(text, ctx) => { memoriesRef.current = ctx?.memories ?? []; return send(text); }}
  ...
/>
```

`ChatInput` receives the prepared `memories` from `prepareSend` and passes them up via the `onSend` callback's second arg. `useSendMessage`'s `prepareUserContent` callback is now unused - drop it from `send-flow.ts`. The user message goes verbatim.

The chat header gains two pressables:
- `Persona` chip (shows persona name + emoji, or "Default") -> opens `ChatPersonaPickerSheet`
- `Model` chip (shows catalog displayName, or "Default") -> opens `ChatModelPickerSheet`

Both chips are siblings of the existing legacy `Model` button. Keep the legacy button visible only when `chat?.modelOverride` (the JSON one) is set, so users with legacy overrides can still clear them. New chats always use the new catalog-backed sheet.

## Hooks

### `usePersonas()`
Wraps `getPersonas()`. Query key from `personaKeys.list()`. Stale time 5 min.

### `useChatPersona(chatId)`
Returns `Persona | null`. Pulls `chat.personaId`, then resolves via `getPersonaById`. If `personaId` is null -> returns null. Query key `personaKeys.chat(chatId)`.

### `useSetChatPersona(chatId)`
Mutation calling `setChatPersona`. On success invalidate `personaKeys.chat(chatId)` and `chatKeys.detail(chatId)`.

### `useChatModelOverride(chatId)`
Returns `ChatModelOption | null` from `chat.modelOverrideId` via `getChatModelById`.

### `useSetChatModelOverride(chatId)`
Mutation calling `setChatModelOverride`. On success invalidate `chatKeys.detail(chatId)`.

### `useChatPromptContext(...)`
Optional convenience hook that returns the memoized `buildSystemPrompt` callback if it cleans up the chat-screen wiring. Optional; do not invent indirection if it does not simplify the screen.

## ChatPersonaPickerSheet rules

- Header: "Choose a focus".
- First row: "Default (no extra focus)" - sets `personaId = null`.
- Then built-ins (sortOrder ASC), then user-defined (createdAt ASC), per the locked rules.
- Active row visibly highlighted.
- Tapping a row calls `setChatPersona`, closes the sheet, shows a 3-second non-blocking inline hint above the input: `Responses will now follow ${persona.name}.` (or `Responses will use the default assistant style.` for null). The hint is NOT a chat message row.
- Persona change does NOT trigger retrieval or re-send.
- No "edit" / "delete" / "clone" actions in this sheet - those belong in `PersonaListScreen`, which is a future slice.
- No hardcoded query-key arrays. Use `personaKeys`.

## ChatModelPickerSheet rules

- Header: "Choose a model".
- First row: "Use default" - sets `modelOverrideId = null`.
- Subsequent rows from `getAvailableChatModels()` in `pickerOrder`. Show: `displayName`, `pricingTier` badge (`FREE` / `PAID`), `providerLabel`, expandable `description`.
- Active row visibly highlighted.
- Selecting a row calls `setChatModelOverride`, closes the sheet. Change applies to next send only - do not rewrite history, do not clear messages, do not clear persona.
- If `chat.modelOverrideId` is set but `getChatModelById` returns null (catalog rotated), render an "(unavailable)" subtitle on the chip and let the user switch away. Do NOT silently null the column.

## Tests

- `stage8-persona-hooks.test.ts`: hooks return expected shapes; `useChatPersona` returns null when `chat.personaId` is null.
- `stage8-send-flow-rewire.test.ts`:
  - `runSendInjection` returns `memories` array, no `outboundText` wrapping.
  - With persona + memories + codeContext, `buildChatSystemPrompt` produces 4 layers in locked order joined by `CHAT_PROMPT_LAYER_SEPARATOR`.
  - `<codelens_memory_context>` tokens MUST NOT appear in the resulting system prompt or in the outbound user content.
  - Chat send still works when persona = null and memories = [] (base chat behavior unchanged).
- Update `stage7-dot-connector.test.ts` assertions: `outboundText` is gone; assert on `memories.length`, `diagnostics.status`, `reusedTypingResult`.
- Static guard: greppable assertion that no file under `src/features/learning/extractor/**` imports anything from `src/features/personas/**` or `src/features/chat/promptComposition/**`.
- Static guard: no hardcoded persona/chat query-key arrays anywhere; all routed through factories.

## Verification gates (must pass before declaring done)

```
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm.cmd test -- --run
```

- Both must pass.
- Add the new test file count to the report.
- No new `as any`, no new `// @ts-expect-error`, no new hardcoded query-key arrays.

## Device verification (manual smoke after merge - not required to land the patch)

- Open a section chat; tap persona chip -> picker opens with 4 built-ins + Default.
- Select "Deep Diver"; send a message; verify the assistant reply reflects the focus (qualitative).
- Tap model chip -> catalog rows visible; switch to alternate; send; verify the request used the new model (look at request logs or fallback diagnostics).
- Verify the chat thread shows the user message verbatim with NO `<codelens_memory_context>` text.
- Verify Settings / Dot Connector behavior unchanged.

## Reporting

After implementing, report:
1. Findings/decisions you had to make that the spec did not cover.
2. Any place you deviated from this brief and why.
3. tsc + test counts before vs after.
4. Files added vs modified.
5. Any TODOs deferred to slice 2/3/4 with reasons.

Return findings first, ordered by severity, before listing implementation details. Prioritize: extractor isolation regressions > capture-first regressions > migration safety > implementation style.
