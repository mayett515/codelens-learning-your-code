# Codex Task - Stage 8 Slice 2
# Cancel-in-flight + Selected-code preview + Adjust mode + Reader polish

You are working in `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`.

## Required reading order (do not skip)

1. `MAIN.md`
2. `whatwe_agreedonthearchitecture.md`
3. `whatwe_agreedonthearchitecture_humans.md`
4. `..\comparision java vs react native\CODELENS_PROJECT_STATUS.md`
5. `..\comparision java vs react native\CODELENS_REGRESSION_GUARD.md`
6. `..\comparision java vs react native\CODELENS_COMPLETENESS_GUARD.md`
7. `..\comparision java vs react native\STAGE_8_PERSONAS_AND_CHAT_UX.md` (Steps 3, 4, 4A)

Slice 1 is merged. Persona picker, model picker, send-flow rewire, hooks, and `useChatPromptContext` all live and pass tsc + vitest (30 files / 147 tests).

## Scope of this slice

**In scope (do all of this):**
- Cancel-in-flight: `useCancelGeneration` hook, `StopGeneratingButton`, `ChatMessageStatus`, partial-response handling per locked rules.
- Selected-code preview component above the composer.
- Adjust-selection inline mode (top/bottom handle, +/- 2 context lines).
- Long-press selection-start indicator in the code reader (ephemeral UI state only).
- Syntax highlighting in the code reader (VS Code Dark+ palette; presentation only).
- Resolve the slice 1 follow-ups noted below.
- Tests for cancel + partial-response branches + preview rendering + adjust math + selection-start indicator + syntax-highlighter no-mutation guard.

**Out of scope (do NOT touch):**
- Mini chat (slice 3).
- Bookmarks, palettes, chat message markers (slice 4).
- Anything under `src/features/learning/extractor/**`.
- Persona prompt versioning / migration-driven built-in updates.
- The legacy `src/ui/components/ChatModelPickerModal.tsx`.
- Stage 9.

## Slice 1 follow-ups to fold in

1. `src/features/chat/hooks/useChatModelOverride.ts:10` - replace the `chatId ? chatKeys.modelOverride(chatId) : chatKeys.recent` conditional with a stable shape that does not collide with `chatKeys.recent`. Suggested:
   ```ts
   queryKey: chatKeys.modelOverride(chatId ?? ('none' as ChatId)),
   enabled: Boolean(chatId),
   ```
2. Persona hint behavior: today the inline hint above `ChatInput` clears only on a 3-second timer. Stage 8 spec line 1189 says "auto-dismisses after 3s **or on the next user interaction**." Clear the `personaHint` state when the user starts typing in `ChatInput` or sends a message. Prefer a small callback prop on `ChatInput` (`onUserTyping`) over wiring the chat screen's text state into `ChatInput`.
3. `src/features/personas/ui/PersonaRowItem.tsx:28` - icon fallback should be `title.slice(0, 1).toUpperCase()`.

## Hard constraints (LOCKED)

- Cancel MUST abort the in-flight LLM stream via `AbortController`. The signal MUST flow from the chat hook to the AI queue.
- Cancel MUST NOT delete the user message that was already inserted into the chat.
- Cancel MUST NOT roll back any saves from prior turns.
- Cancel MUST NOT trigger an automatic retry.
- Stop button MUST NOT appear during Dot Connector retrieval - only during LLM streaming.
- Stop and Send MUST NEVER be visible at the same time.
- Stop button minimum touch target 44x44.
- Partial response rules:
  - `receivedChars === 0`: do NOT create an assistant message row at all. The user message stays; the next send is unblocked.
  - `0 < receivedChars < 100`: discard the partial; assistant message content becomes `'[Generation stopped]'`; status `'stopped'`.
  - `receivedChars >= 100`: keep the partial; append `'\n\n[Generation stopped]'`; status `'stopped'`.
  - `[Generation stopped]` is a non-interactive styled label, NOT a button. Italic / subdued styling.
- Selected-code preview:
  - Appears above the composer when `codeContext` is non-null.
  - Cap preview text at 400 chars (presentation cap). The injected layer cap stays at 800 chars.
  - Show language chip if `codeContext.language` is set; show `path:start-end` if both file and lines are set.
  - "x" remove action clears `codeContext` and does NOT cancel the chat session or the in-flight stream.
  - Adjust action opens inline adjust mode.
  - NO "Save" button inside the preview - "Ask in chat" and "Save" stay separate entry points.
- Adjust mode:
  - Shows current selection plus up to 2 lines above and below when available.
  - Confirm updates both `codeContext` and the file-viewer selection (if the chat was opened from a file viewer; otherwise updates only `codeContext`).
  - Cancel exits adjust mode and keeps the original selection.
  - MUST NOT mutate any saved capture row.
  - MUST NOT edit any already-sent chat message.
  - If adjusted text exceeds 800 chars, cap silently and show a subtle "(truncated)" note in the preview.
- Long-press selection-start indicator:
  - Appears the moment a long-press begins a range selection.
  - May be a pin / pulse / halo / highlighted gutter state - whichever fits the existing CodeViewer.
  - Disappears when the range completes or is cancelled.
  - MUST NEVER be persisted to the database.
- Syntax highlighting:
  - Stable VS Code Dark+ inspired palette.
  - Highlighting is presentation only; MUST NOT alter raw source text, line numbers, copied selection text, or `codeContext.text`.
  - Unsupported file types fall back to plain text without breaking selection or layout.
- No persona / familiarity / importance / extractor changes anywhere.

## Files to create

```
src/features/chat/hooks/useCancelGeneration.ts
src/features/chat/types/messageStatus.ts                    // ChatMessageStatus union
src/features/chat/ui/StopGeneratingButton.tsx
src/features/chat/ui/SelectedCodePreview.tsx
src/features/chat/ui/SelectedCodeAdjuster.tsx               // inline adjust mode
src/features/chat/services/sliceCodeContext.ts              // pure helpers: build text from line range, expand by N, cap at 800
src/features/chat/__tests__/stage8-cancel-and-preview.test.ts

src/features/codeReader/highlighting/vscodeDarkPlusPalette.ts
src/features/codeReader/highlighting/highlightLine.ts        // pure tokenizer + per-token color resolver
src/features/codeReader/ui/SelectionStartIndicator.tsx
src/features/codeReader/__tests__/stage8-reader-polish.test.ts
```

> If a `src/features/codeReader/` feature folder does not yet exist, create it and add a barrel `src/features/codeReader/index.ts`. Do NOT move existing reader files in this slice; add the new module alongside `src/ui/components/CodeViewer.tsx` and integrate via props.

## Files to modify

```
src/ai/queue.ts                                              // accept AbortSignal end-to-end (if not already)
src/hooks/use-send-message.ts                                // expose stopGenerating + lastMessageStatus, plumb signal
src/hooks/send-flow.ts                                       // accept AbortSignal, partial-response handling
src/hooks/__tests__/send-flow.test.ts                        // cover the new partial-response branches
src/ui/components/ChatInput.tsx                              // render StopGeneratingButton when streaming, plus onUserTyping
src/ui/components/ChatBubble.tsx                             // render '[Generation stopped]' styling for stopped messages
src/ui/components/CodeViewer.tsx                             // wire syntax-highlight tokens + selection-start indicator
src/features/chat/index.ts                                   // export new hooks/components/types
src/features/chat/hooks/useChatModelOverride.ts              // slice 1 follow-up #1
src/features/personas/ui/PersonaRowItem.tsx                  // slice 1 follow-up #3
app/chat/[id].tsx                                            // wire SelectedCodePreview + Adjust + cancel + persona-hint clear-on-typing
app/general-chat/[id].tsx                                    // wire SelectedCodePreview (null for general) + cancel + persona-hint clear
app/learning/chat/[id].tsx                                   // wire cancel + persona-hint clear (no codeContext for learning chats)
app/project/[id].tsx                                         // when opening section chat, persist codeContext data so the chat screen can render SelectedCodePreview
```

## ChatMessageStatus

```ts
// src/features/chat/types/messageStatus.ts
export type ChatMessageStatus =
  | 'sending'    // user message dispatched; awaiting LLM stream start
  | 'streaming'  // LLM stream in progress
  | 'done'       // stream completed normally
  | 'failed'     // LLM error (not user-initiated)
  | 'stopped';   // user-initiated abort
```

`ChatMessage` already exists in `src/domain/types.ts`. Add an OPTIONAL `status?: ChatMessageStatus | undefined` field on the in-memory message representation only - do NOT add a column to `chat_messages` in this slice; persistence of `'stopped'` can be deferred. The chat screen tracks current-stream status in component state and overlays it onto the rendered list.

## useCancelGeneration

```ts
// src/features/chat/hooks/useCancelGeneration.ts
export interface UseCancelGenerationApi {
  startGeneration: () => AbortSignal;
  stopGenerating: () => void;
  clearGeneration: () => void;
  isStreaming: boolean;
}
export function useCancelGeneration(): UseCancelGenerationApi;
```

`startGeneration()` creates a fresh `AbortController`, stores it in a ref, sets `isStreaming = true`, returns the signal. `stopGenerating()` calls `abortControllerRef.current?.abort()`, sets `isStreaming = false`, nulls the ref. `clearGeneration()` (called on normal completion) sets `isStreaming = false`, nulls the ref. `useSendMessage` hosts this hook and exposes `stopGenerating` plus `lastMessageStatus` to the chat screen.

## Send flow integration

`executeSendFlow` in `src/hooks/send-flow.ts` takes a new optional `signal?: AbortSignal` and a new optional `streamHooks?: { onChunk?: (text: string) => void; onAbort?: (received: string) => void }` (or wrap into a single `onStream` callback - whichever fits the existing `enqueue` API). After insert-user-message:

- Pass `signal` to `enqueue`.
- If `enqueue` rejects with `AbortError` (or signal indicates aborted), apply partial-response rules using the accumulated text the stream produced. If the AI queue does not currently expose streaming chunks, expose them in this slice; if the queue is non-streaming, accept the trade-off that `receivedChars` is 0 on cancel and follow the "0 chars" branch (insert no assistant message). Clearly note this in the report.
- The user message MUST already be inserted before the LLM call begins, so cancel before stream start leaves the user message in place.

`use-send-message.ts` exposes:

```ts
interface UseSendMessageResult {
  send: (text: string) => Promise<void>;
  stopGenerating: () => void;
  status: ChatMessageStatus | 'idle';
  sending: boolean;
  error: string;
  clearError: () => void;
}
```

The chat screen reads `status` to decide whether to render `StopGeneratingButton`. `ChatInput` receives `status` (or a derived `isStreaming` bool) and toggles between Send and Stop.

## ChatCodeContext source of truth

`ChatCodeContext` already exists in `src/features/chat/promptComposition/types.ts`. The chat screen needs a place to hold its current `codeContext` per chat, with these transitions:

- Initial value derived from chat row when the screen mounts (section chat: build `selected_code` from `chat.startLine`/`chat.endLine` + file content; general chat: null; learning chat: null).
- Remove (`x` on preview): set local state to null. DO NOT mutate the chat row.
- Adjust confirm: update local state + (section only) update `chat.startLine` / `chat.endLine` via `updateChatRange` (add this small repo helper if missing) so reopening the chat preserves the new range.
- Adjust cancel: no-op.

`SelectedCodePreview` is purely controlled - the chat screen owns the state. The preview renders nothing if `codeContext` is null.

## SelectedCodePreview rules

- Header chips: language (if known), `path:start-end` (if known), `(truncated)` if the source text exceeded 800 chars.
- Body: up to 5 lines, max 400 chars total in the preview. If more than 5 lines, append `... N more lines`.
- Horizontal scroll for long lines; do NOT word-wrap code just to fit.
- Right side: collapse toggle, `Adjust` button, `x` remove button.
- Make it visually clear this is "context for this message" (e.g., subtitle "Will be sent with your next message").
- NEVER include a "Save" action - the file-viewer side handles saving via Stage 2 unchanged.

## SelectedCodeAdjuster rules

- Opens inline above the input when the user taps `Adjust`.
- Shows the current selection plus up to 2 lines above and below when the source file content is available.
- Top handle adjusts `startLine`; bottom handle adjusts `endLine`. Use simple +/- buttons instead of drag handles for slice 2 (a real drag handle is fine if you can do it cleanly, but +/- is acceptable; document the choice).
- `Confirm` writes the new range back into the chat's `codeContext` (and through `updateChatRange` for section chats).
- `Cancel` exits without changes.
- Truncation note appears if the new range produces > 800 chars in `text`.

## Code reader polish

`SelectionStartIndicator` is rendered inside `CodeViewer` when a long-press begins a range. Keep it in component-level state, never persisted.

`highlightLine(text: string, lang: string)` returns `Array<{ text: string; color: string }>`. Implement a minimal tokenizer that handles: keywords (per-language list), strings, comments, numbers, identifiers, operators. Acceptable to ship per-language keyword arrays for `ts`/`tsx`/`js`/`jsx`/`py`/`go`/`rs`/`java`/`kt`/`swift`/`md` and fall back to plain for everything else. Do NOT add a heavyweight runtime dependency (no Prism, no highlight.js, no Shiki). The reader test must verify the tokens concatenate back to the original source line - lossless.

`vscodeDarkPlusPalette.ts` exports a stable color map keyed by token type.

## Tests

`stage8-cancel-and-preview.test.ts`:
- `useCancelGeneration` returns a fresh signal per `startGeneration`, aborts on `stopGenerating`, clears ref.
- `executeSendFlow` invokes `enqueue` with the provided signal.
- Partial-response branches: 0 chars -> no assistant message inserted; 1-99 chars -> assistant content is `'[Generation stopped]'`; 100+ chars -> partial preserved + suffix.
- `SelectedCodePreview` does NOT render a Save button (greppable static guard).
- `SelectedCodePreview` shows `(truncated)` only when source text length > 800.
- Adjust math helper: expanding by `[before, after]` clamps to file bounds and recomputes `text` slice.

`stage8-reader-polish.test.ts`:
- `highlightLine` is lossless: `tokens.map(t => t.text).join('')` equals the input.
- Plain fallback for unknown language returns one neutral token.
- Selection-start indicator is unmounted when range completes (presence/absence assertion).

Update existing tests that need to keep passing:
- `src/hooks/__tests__/send-flow.test.ts` - add coverage for the signal path and partial-response branches.
- All existing chat / dot connector tests should still pass without modification.

Static guards (greppable, not unit tests):
- `<codelens_memory_context>` MUST still not appear in any new file.
- No file under `src/features/learning/extractor/**` imports anything from `src/features/personas/**`, `src/features/chat/**`, or `src/features/codeReader/**`.
- No new `as any`, no new `// @ts-expect-error`.

## Verification gates

```
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm.cmd test -- --run
```

Both must pass. Report:
1. Test count before vs after.
2. Files added vs modified.
3. Any deviation from this brief and why.
4. Decisions you had to make about the AI queue's streaming surface (does the existing queue stream chunks, or is it request/response only? document it).
5. Any TODOs deferred to slice 3 / 4 with reasons.

Return findings first, ordered by severity, before listing implementation details. Prioritize: cancel correctness (no orphan messages, no stuck states) > capture / extractor isolation > spec literal-string adherence > implementation style.
