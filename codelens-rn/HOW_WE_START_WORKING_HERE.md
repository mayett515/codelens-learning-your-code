# How We Start Working Here

This file is the entry point for continuing the sandbox chat engine work with another model.

## First Rule

<first_rule>
Do not start by editing code.
Do not read every markdown file in the repo.
Do not stage, commit, push, reset, or checkout unless the user explicitly asks.
</first_rule>

## What To Read First

Read these files only for the first pass:

- `SANDBOXTEXTTESTING_INTENT.md`
- `WHERE_WE_STANDING_AND_WANT_TO_GO.md`
- `SANDBOX_ENGINE_CONTRACT_SPEC.md`
- `IMPLEMENTATION_LOG.md`
- `REVIEW_FINDINGS.md`
- `KEYWORD_CATEGORIZATION.md`
- `SANDBOX_CATEGORIZATION_ARCHITECTURE.md`
- `SANDBOX_NEXT_PHASES.md`
- `HOW_WE_START_WORKING_HERE.md`

Treat older unrelated markdown files as background noise unless the user specifically asks for them.

## Current Priority

<current_priority>
No regressions first.
Make categorization smarter only after the current Contract v1 behavior, exact spans, model status, tests, and UI inspection are stable.
</current_priority>

## Exact First Prompt For Another Model

Paste this to a new model:

```md
You are working in the CodeLens sandbox chat engine.

First read:
- HOW_WE_START_WORKING_HERE.md
- SANDBOX_NEXT_PHASES.md
- SANDBOX_CATEGORIZATION_ARCHITECTURE.md
- SANDBOX_ENGINE_CONTRACT_SPEC.md
- IMPLEMENTATION_LOG.md
- REVIEW_FINDINGS.md
- KEYWORD_CATEGORIZATION.md
- SANDBOXTEXTTESTING_INTENT.md
- WHERE_WE_STANDING_AND_WANT_TO_GO.md

Do Phase 0 only:
- summarize the current architecture
- identify regression risks
- propose the next smallest safe change
- do not edit files
- do not stage, commit, push, reset, checkout, or do any git history operation

Non-negotiables:
- Contract v1 remains source of truth.
- Inline keyword highlighting uses exact spans only.
- No heuristic span generation.
- No fake hidden model routing.
- No broad refactor.
- Invalid category/subcategory/depth metadata must not pass silently.
```

## Working Order

Follow this order from `SANDBOX_NEXT_PHASES.md`:

1. Phase 0: orientation only, no edits.
2. Phase 1: browser and model-status smoke test.
3. Phase 2: integrate taxonomy into the real model prompt.
4. Phase 3: tighten local categorizer.
5. Phase 4: optional model-assisted classification repair.
6. Phase 5: commit and push only after explicit user approval.

## What Not To Do

<do_not_do>
- Do not feed all repo markdown files to a model at once.
- Do not let a model do a large refactor just because it knows design patterns.
- Do not implement second-pass model routing before the normal prompt and local categorizer are stable.
- Do not invent spans.
- Do not search prose labels in the UI to create highlights.
- Do not claim a feature exists in docs unless the code actually implements it.
</do_not_do>

## Sanity Commands

Before trusting a change, run:

```powershell
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
npm.cmd test -- --run
git status --short
```

Then manually test Expo web if the change affects UI, model status, sending, highlighting, or inspector behavior.

## Current Good Direction

The good direction is:

- model prompt gives richer semantic categorization instructions
- validator keeps Contract v1 strict
- local categorizer fills missing `subcategory` and `depth` conservatively
- UI displays metadata without hidden model calls
- future repair classifier is optional and patch-only

The bad direction is:

- giant brittle keyword list as the main system
- fake Deep Dive buttons
- hidden model calls without explicit architecture
- heuristic highlighting
- broad refactor before browser testing
