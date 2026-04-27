# Claude Review Prompt - Stage 8 Foundation After Opus Fixes

Please review the current working tree in:

`C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`

Context:
- CodeLens is capture-first. Captures are primary truth; concepts organize captures later.
- Stages 1-7 are implemented and verified.
- This patch is a Stage 8 foundation slice only, not the full Stage 8 UI implementation.
- Opus already reviewed the first slice. The current tree includes follow-up fixes from that review.

What this patch currently includes:
- Migration 009 adds `personas`, `chats.persona_id`, and `chats.model_override_id`.
- `src/db/schema.ts` mirrors those additions and documents legacy `modelOverride` vs Stage 8 `modelOverrideId`.
- Built-in personas are seeded on DB init using `ON CONFLICT(name) DO NOTHING`.
- Persona codecs allow empty `systemPromptLayer` and enforce only the locked 3000-char cap.
- Persona repo blocks editing/deleting built-ins and supports per-chat persona selection.
- Static chat model catalog now uses the locked shape: `displayName`, `isVisible`, `pricingTier`, `providerLabel`.
- Chat model repo adds `setChatModelOverride(chatId, modelId | null)`.
- Prompt composition now accepts `memories: RetrievedMemory[]` and calls Stage 6 `formatMemoriesForInjection`.
- `ChatCodeContext` includes `precedingLines` and `followingLines`.
- `buildCodeContextLayer` uses the locked LLM-facing header strings and file/line metadata shape.
- Mini chat prompt composition remains isolated from persona and Dot Connector memory behavior.

Primary files to review:
- `src/db/schema.ts`
- `src/db/client.ts`
- `src/db/migrations/009-stage8-personas-chat-foundation.ts`
- `src/features/personas/**`
- `src/features/chat/**`
- `src/features/personas/__tests__/stage8-personas.test.ts`
- `src/features/chat/__tests__/stage8-prompt-composition.test.ts`

Important review questions:
1. Is migration 009 safe for existing v8 device databases?
2. Is `ON CONFLICT(name) DO NOTHING` the right reseed behavior for built-ins, or should app-release prompt updates overwrite built-in rows?
3. Are the stable built-in persona IDs acceptable, given they intentionally satisfy the `p_` + 21-char branded ID shape?
4. Does the model catalog now match the locked Stage 8 `ChatModelOption` shape closely enough for the picker UI?
5. Does `buildChatSystemPrompt` correctly own memory formatting via `formatMemoriesForInjection`?
6. The prompt builder imports the Stage 6 formatter directly from `src/features/learning/retrieval/services/formatMemoriesForInjection` instead of the learning barrel because importing the barrel drags native SQLite into pure prompt tests. Is this acceptable, or should we create a lightweight public retrieval API to preserve barrel discipline?
7. Stage 6 memory formatting uses the same `\n\n---\n\n` separator as prompt layer composition internally. Does this create an ambiguity we should solve now, or is ordering by section content sufficient?
8. Does any Stage 8 code leak into `src/features/learning/extractor/**` or risk changing Stage 2 extractor semantics?
9. Any missing exactOptionalPropertyTypes, query-key, codec, or transaction concerns before UI integration starts?

Known non-goals in this patch:
- No persona picker UI yet.
- No model picker UI replacement yet.
- No send-flow rewire yet.
- No selected-code preview UI yet.
- No line-level mini chat UI yet.
- No reader bookmark or chat message marker schema yet.

Please return findings first, ordered by severity, with file/line references. Prioritize product-semantics regressions and migration/device risks over style.
