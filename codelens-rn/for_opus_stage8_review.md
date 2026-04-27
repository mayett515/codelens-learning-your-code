# Opus Review Prompt - Stage 8 Foundation Slice

Please review the current working tree in `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`.

Context:
- CodeLens is capture-first. Captures are primary truth; concepts organize captures later.
- Stages 1-7 are already implemented and verified.
- This patch is NOT intended to complete all of Stage 8.
- This patch is a foundation slice for Stage 8 Personas + Chat UX:
  - persona schema/migration/seed/repo
  - chat `persona_id` and `model_override_id` columns
  - static chat model catalog
  - locked chat prompt composition functions
  - mini chat prompt composition foundation
  - focused Stage 8 tests

Primary files to review:
- `src/db/schema.ts`
- `src/db/client.ts`
- `src/db/migrations/009-stage8-personas-chat-foundation.ts`
- `src/db/migrations/index.ts`
- `src/features/personas/**`
- `src/features/chat/**`
- `src/features/personas/__tests__/stage8-personas.test.ts`
- `src/features/chat/__tests__/stage8-prompt-composition.test.ts`

Review questions:
1. Does migration 009 safely extend existing device DBs without reopening old migrations?
2. Is built-in persona reseeding safe, deterministic, and aligned with the Stage 8 rule that built-ins are not user-deletable/editable?
3. Do persona codecs enforce the locked caps, especially `systemPromptLayer <= 3000`?
4. Does the prompt composition preserve the locked order: base chat -> persona -> memory -> code context?
5. Is mini chat properly isolated from full chat persona/memory behavior in this slice?
6. Does anything leak into `src/features/learning/extractor/**` or risk modifying Stage 2 extractor semantics?
7. Is the static model catalog an acceptable bridge from the existing free-form `model_override` JSON toward Stage 8's `model_override_id`, or should integration be shaped differently?
8. Any TypeScript strictness, exact optional property, query-key, or feature-boundary problems?

Known non-goals in this patch:
- No persona picker UI yet.
- No selected-code preview UI yet.
- No line-level mini chat UI yet.
- No reader bookmark/message marker schema yet.
- Existing Stage 7 Dot Connector still injects memories into outbound user text; this patch adds the Stage 8 system-prompt builder but does not fully rewire send flow yet.

Please return findings first, by severity, with file/line references. If you see a product-semantics regression against capture-first, call it out before implementation style issues.
