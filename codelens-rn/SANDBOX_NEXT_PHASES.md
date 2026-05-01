# Sandbox Chat Engine Next Phases

Use this file when handing the sandbox chat engine work to another model.
Do not give the model every markdown file in the repo. Give it the phase-specific files listed below.

## Current Priority

<priority>
No regressions first.
Categorization can get smarter only if Contract v1 validation, exact spans, model status, and UI inspection stay stable.
</priority>

## Phase 0: Orientation Only

Goal: make the model understand what exists before touching code.

Give the model:

- `SANDBOXTEXTTESTING_INTENT.md`
- `WHERE_WE_STANDING_AND_WANT_TO_GO.md`
- `SANDBOX_ENGINE_CONTRACT_SPEC.md`
- `IMPLEMENTATION_LOG.md`
- `REVIEW_FINDINGS.md`
- `KEYWORD_CATEGORIZATION.md`
- `SANDBOX_CATEGORIZATION_ARCHITECTURE.md`
- `SANDBOX_NEXT_PHASES.md`

Ask for:

- a short understanding summary
- no code edits
- a list of likely regression risks

<phase_0_constraints>
- Do not edit files.
- Do not stage, commit, push, reset, or checkout.
- Do not propose broad refactors.
</phase_0_constraints>

## Phase 1: Browser And Model Status Smoke Test

Goal: verify the current app behavior before improving categorization.

Tasks:

- Run Expo web.
- Send one local-mode prompt.
- Send one real-model prompt if a valid key/model is configured.
- Confirm model status is visible and not stuck on checking/sending.
- Confirm provider errors are visible enough to debug a bad key/model.
- Confirm keyword bricks and inspector still render.
- Confirm inline highlights come from spans only.

Expected output:

- exact commands used
- screenshots or written observations
- bugs found, if any

<phase_1_constraints>
- Do not change categorization logic yet.
- Fix only obvious model-status or send-state bugs found during the smoke test.
</phase_1_constraints>

## Phase 2: Prompt Taxonomy Integration

Goal: put the richer taxonomy into the actual model system prompt.

Source of truth:

- `SANDBOX_CATEGORIZATION_ARCHITECTURE.md`

Tasks:

- Update `modelAdapter.ts` prompt text with the taxonomy blocks.
- Include the bounded `classification_second_check`.
- Keep output shape compatible with Contract v1.
- Do not add a second model call.
- Do not add hidden inspector actions.

Expected tests:

- TypeScript check.
- Existing engine tests.
- One test or fixture proving prompt examples still parse when model output includes `subcategory` and `depth`.

<phase_2_constraints>
- No heuristic span generation.
- No fake shallow/deep routing.
- No category override policy.
</phase_2_constraints>

## Phase 3: Local Categorizer Tightening

Goal: improve fallback categorization without making it a giant brittle keyword table.

Tasks:

- Review `categorizationEngine.ts`.
- Add a small number of high-signal semantic phrases only where tests justify them.
- Prefer context-sensitive rules over huge word lists.
- Keep category inference conservative.
- Fill missing `subcategory` and `depth`; do not override valid model category.

Expected tests:

- missing `subcategory` is inferred
- missing `depth` is inferred
- valid model category is preserved
- invalid metadata is dropped
- ambiguous labels do not get overconfident bad metadata

<phase_3_constraints>
- Do not make local code the main intelligence.
- Do not classify only by isolated keyword.
- Do not allow invalid strings through casts.
</phase_3_constraints>

## Phase 4: Optional Model-Assisted Classification Repair

Goal: add a real second-pass classifier only if needed.

Use only when:

- category is missing
- subcategory/depth is missing
- validator produced categorization diagnostics
- local inference confidence is low
- terms conflict with findings

Allowed output:

```json
[
  {
    "termId": "cache-key",
    "category": "risk",
    "subcategory": "stale",
    "depth": "deep",
    "confidence": 0.9,
    "classificationReason": "Weak cache key can return stale tool schema."
  }
]
```

<phase_4_constraints>
- The repair pass must not rewrite prose.
- The repair pass must not rewrite spans.
- The repair pass must not rewrite code artifacts, findings, or calculations.
- Any category override needs an explicit diagnostic and high-confidence policy.
- This phase is optional. Do not build it unless Phase 2 and Phase 3 are stable.
</phase_4_constraints>

## Phase 5: Commit And Push

Goal: publish only after behavior is verified.

Required before commit:

- `node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json`
- `npm.cmd test -- --run`
- browser smoke test notes
- `git status --short` reviewed

Suggested commit scope:

- categorization architecture docs
- prompt taxonomy changes
- conservative categorizer changes
- tests

<phase_5_constraints>
- Do not commit generated junk or stale handoff drafts.
- Do not commit unrelated repo-wide docs.
- Do not push until the user explicitly approves.
</phase_5_constraints>

## One-Prompt Handoff For Another Model

Use this if starting a new model:

```md
You are working in the CodeLens sandbox chat engine.
Read these files first:
- SANDBOXTEXTTESTING_INTENT.md
- WHERE_WE_STANDING_AND_WANT_TO_GO.md
- SANDBOX_ENGINE_CONTRACT_SPEC.md
- IMPLEMENTATION_LOG.md
- REVIEW_FINDINGS.md
- KEYWORD_CATEGORIZATION.md
- SANDBOX_CATEGORIZATION_ARCHITECTURE.md
- SANDBOX_NEXT_PHASES.md

Your first task is Phase 0 only:
- summarize the current architecture
- identify regression risks
- propose the next smallest safe change
- do not edit files
- do not stage, commit, push, reset, or checkout

Non-negotiables:
- Contract v1 remains source of truth.
- Inline highlighting uses exact spans only.
- No fake hidden model routing.
- No broad refactor.
- No git operations without explicit approval.
```
