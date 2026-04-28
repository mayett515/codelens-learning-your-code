# Tomorrow Resume - Stage 8

## Current State

Stage 8 Slice 1 is done and reviewed clean.

Slice 1 completed:
- Persona picker wired into the chat header.
- Catalog-backed model picker wired into the chat header.
- Persona/model selection flows through Drizzle and TanStack Query.
- `runSendInjection` no longer returns memory-wrapped outbound text.
- Memories now live in Layer 3 of `buildChatSystemPrompt`.
- User messages stay verbatim.
- Legacy JSON model override still works for older chats that already had one.
- Extractor isolation is preserved.
- No Stage 9 work has started.

Important note from review:
- Check whether the one-line `useChatModelOverride` query-key fix was applied.
- If it was not applied, do that before starting Slice 2.

## Known Review Notes / Watch-Outs

Slice 1 review status:
- Opus/Claude review was clean overall.
- The only named follow-up was the one-line `useChatModelOverride` query-key fix.
- Do not start Slice 2 until that fix is either confirmed applied or applied manually.

Potential Slice 1 review questions to keep visible:
- Confirm catalog-backed `modelOverrideId` wins over the legacy JSON `modelOverride` only when it is set.
- Confirm the legacy model modal/button remains available only for chats that already have legacy JSON overrides.
- Confirm learning chat still has the intended system-prompt behavior after moving to `buildChatSystemPrompt`.
- Confirm no `<codelens_memory_context>` tokens appear in outbound user content or final system prompts.
- Confirm no new imports from `src/features/learning/extractor/**` to personas or chat prompt composition.

Slice 2 watch-outs:
- Cancel-in-flight must abort generation only. It must not delete messages, clear retrieval state, or create captures.
- Selected-code preview must be read-only unless the user explicitly enters Adjust mode.
- Adjust mode must only change the selected code context for the next send.
- Reader selection polish must not trigger retrieval, embedding, concept creation, or scoring changes.
- Keep mini chat out of Slice 2.

Slice 3 watch-outs:
- Mini chat must use `MINI_CHAT_SYSTEM_PROMPT` plus `buildCodeContextLayer`.
- Mini chat must not call `buildChatSystemPrompt`.
- Mini chat must not inject memories by default.
- Mini chat must not apply personas.
- Mini chat must cap at 5 exchanges.
- Mini chat saves must go through the existing Stage 2 save flow only when the user taps save.
- Mini chat must not auto-save, auto-extract, or pre-fill capture candidates on its own.

Slice 4 watch-outs:
- Reader bookmarks must not auto-link to concepts.
- Reader bookmarks must not auto-create captures.
- Reader bookmarks must not change familiarity or importance scores.
- Chat message bookmarks and color tags are conversation organization only.
- Chat message markers must not create captures, concepts, review events, or Learning Hub entries.
- Reader bookmark palettes and chat message color palettes stay separate.
- Bookmarks do not belong in Learning Hub sections unless a later spec explicitly says so.

## Claude / Opus Carry-Forward Concerns

These are the things most likely to get called out in later review if Codex drifts:

Memory / prompt composition:
- Do not reintroduce `<codelens_memory_context>` in user messages.
- Do not move memories out of Layer 3.
- Do not pass persona text, memory text, or chat prompt layers into extractor code.
- Do not merge `BASE_CHAT_SYSTEM_PROMPT` with `BASE_APP_SYSTEM_PROMPT`.
- Do not make mini chat use the full chat prompt builder.

Persona and model selection:
- Persona changes must be passive state changes only.
- Persona changes must not trigger retrieval, resend, embeddings, concepts, captures, or scoring.
- Model changes apply only to the next send.
- New catalog-backed model selection uses `modelOverrideId`.
- Legacy JSON `modelOverride` remains only for existing legacy chats and cleanup.
- Built-in personas stay immutable.

Slice 2 specific:
- Stop/cancel must abort the in-flight assistant generation without corrupting the message list.
- Stop/cancel must not be treated as a failed capture or failed retrieval.
- Selected-code preview must be a preview, not an automatic mutation of saved content.
- Adjust mode must be explicit and scoped to the next prompt context.
- Reader polish must stay UI-only unless the user explicitly sends/saves something.

Slice 3 specific:
- Mini chat is isolated from personas and memories.
- Mini chat is short-form and capped.
- Mini chat can save only through the existing explicit Stage 2 save action.
- Expanding mini chat into full chat should preserve history and code context, but the expanded full chat is not the same session as the mini chat.
- Mini chat must not auto-extract, auto-save, or auto-create learning data.

Slice 4 specific:
- Bookmarks and message markers are organization tools, not learning signals.
- Bookmarks must not affect concepts, captures, review events, familiarity, or importance.
- Reader bookmark colors and chat message colors are separate palette domains.
- Bookmarks must not appear in Learning Hub sections unless a future spec explicitly adds that.
- Session flashback markers should remain navigation/context affordances, not capture/concept creation.

General review risk:
- If a change touches retrieval, extractor, scoring, concepts, captures, or Learning Hub while implementing UI polish, assume it is suspicious and re-check the Stage 8 spec before continuing.

## First Commands Tomorrow

```powershell
cd C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
git status
git log --oneline -5
```

If Slice 1 is not committed yet, verify first:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm.cmd test -- --run
```

Then commit with plain git if lazygit is annoying:

```powershell
git add .
git commit -m "feat(stage8): wire persona and model pickers into chat send flow"
git push
```

## Slice 2 Prompt

Use this file next:

```txt
for_codex_stage8_slice2.md
```

Slice 2 scope:
- Cancel-in-flight / stop generating.
- Selected-code preview before sending.
- Adjust mode for selected code context.
- Reader polish around code selection.

Slice 2 must not include:
- Stage 9.
- Bookmarks.
- Palettes.
- Chat message markers.
- Mini chat UI.
- Extractor changes.
- Familiarity or importance score changes.

## Remaining Stage 8 Slices

Slice 2:
- Cancel-in-flight / stop generating.
- Selected-code preview before sending.
- Adjust mode for selected code context.
- Reader polish around code selection.

Slice 3:
- Line-level mini chat.
- Mini chat uses `MINI_CHAT_SYSTEM_PROMPT` plus `buildCodeContextLayer`.
- Mini chat does not use personas.
- Mini chat does not inject memories by default.
- Mini chat has a 5-exchange cap.
- Mini chat can expand into a full chat with its history preserved.
- Mini chat save actions go through the existing Stage 2 save flow.

Slice 4:
- Reader bookmarks.
- Per-project reader bookmark color palettes.
- Chat message bookmarks.
- Chat message border color tags.
- Session flashback / entry markers if still in scope from the Stage 8 spec.

Still later / not Stage 8 unless the spec changes:
- Stage 9.
- Cross-device sync.
- Auto-linking bookmarks to concepts.
- Multi-turn review or quiz inside mini chat.
- Any scoring changes for familiarity or importance.

## Locked Guardrails

- Persona layers must never be passed into the extractor.
- Nothing under `src/features/learning/extractor/**` should import personas or chat prompt composition.
- Memories stay in system prompt Layer 3.
- `<codelens_memory_context>` must not appear in outbound user content.
- User message text goes to the LLM verbatim.
- Persona and model changes affect the next send only.
- Persona selection must not trigger retrieval, embedding, concept creation, or resend.
- `BASE_CHAT_SYSTEM_PROMPT` and `BASE_APP_SYSTEM_PROMPT` stay separate.
- Legacy `ChatModelPickerModal` stays only for legacy override cleanup.

## Morning Checklist

1. Confirm the working tree state with `git status`.
2. Confirm whether Slice 1 is committed and pushed.
3. Apply the `useChatModelOverride` query-key fix if missing.
4. Run `tsc` and full tests.
5. Open `for_codex_stage8_slice2.md`.
6. Let Codex execute Slice 2.
7. Give the Slice 2 result to Opus for review.
8. Patch review findings.
9. Run `tsc` and full tests again.

## Do Not Overthink This

Tomorrow starts with `git status`.

If the tree is clean, start Slice 2.

If the tree is dirty, inspect it, verify tests, then commit Slice 1 before Slice 2.
