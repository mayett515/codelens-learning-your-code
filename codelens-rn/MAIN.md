# CodeLens RN — Main Markdown Index

Master map of docs for the React Native rewrite. If another agent (Claude / Codex / Gemini) asks "which docs should I read?", start here and include only what's relevant to the task.

## Canonical Docs

1. [rewrite-spec/00-START-HERE.md](../rewrite-spec/00-START-HERE.md)
   - Purpose: Entry point for the full rewrite spec (intent, stack, architecture, state model, screens, RAG pipeline, preserved behaviors, non-goals, build phases).
   - Include when: starting any new phase, making architectural decisions, or onboarding a new agent.

2. [PERSISTENCE.md](PERSISTENCE.md)
   - Purpose: op-sqlite + Drizzle + sqlite-vec. The three load-bearing decisions (static vec extension, vec0 upsert pattern, Drizzle Proxy wrapper).
   - Include when: touching `src/db/`, vector storage, or anything that stores/reads data on device.

3. [README.md](README.md)
   - Purpose: Expo default — run commands, nothing project-specific yet.
   - Include when: rarely; use `rewrite-spec/09-BUILD-PHASES.md` for real build/run workflow.

## Architecture Contracts (Read Early)

1. [whatwe_agreedonthearchitecture.md](whatwe_agreedonthearchitecture.md)
   - Purpose: Strict LLM execution contract (hard constraints, do/don't rules, verification checklist).
   - Include when: any AI agent edits code in this repo.

2. [whatwe_agreedonthearchitecture_humans.md](whatwe_agreedonthearchitecture_humans.md)
   - Purpose: Human-readable version of the same architecture agreement and tradeoffs.
   - Include when: onboarding collaborators or sanity-checking architecture decisions.

3. [ONTOLOGY_PROFILE_REFACTOR/README.md](ONTOLOGY_PROFILE_REFACTOR/README.md)
   - Purpose: Entry point for the implemented profile/ontology refactor decision spine.
   - Include when: touching learning taxonomy, concept/capture schema, extractor prompts, cards, promotion, retrieval formatting, graph visual encoding, or forkability/product-profile planning.

4. [ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md](ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md)
   - Purpose: Hard anti-regression rules for the profile/ontology refactor.
   - Include when: implementing any part of the ontology/profile refactor.

5. [ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md](ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md)
   - Purpose: Canonical active handoff for current ontology/profile work. It summarizes the locked docs, implemented slices, and next gates.
   - Include when: resuming ontology/profile work, especially after a context reset.

## Session Notes (Not Canonical)

Dated handoff notes from specific work sessions. Useful for context, not for architecture.
Older one-off prompt/review handoffs were removed from the active doc set. Use git history if that archival context is needed.

- [current_state.md](current_state.md) — Phase tracker. What's done, what's next. Update after every phase checkpoint.
- [ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md](ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md) - historical implementation log. Use only when auditing old slice history.
- [ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md](ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md) - historical status log. Use `NEXT_LLM_CONTEXT.md` for active work.

## Prompt Bundles (Copy/Paste)

Minimal doc bundles per task type, to keep prompts small:

1. **New phase kickoff**
   - `MAIN.md`
   - `whatwe_agreedonthearchitecture.md`
   - `rewrite-spec/00-START-HERE.md`
   - `rewrite-spec/09-BUILD-PHASES.md`
   - `current_state.md`

2. **Persistence / data layer work**
   - `MAIN.md`
   - `PERSISTENCE.md`
   - `rewrite-spec/03-ARCHITECTURE.md`
   - `rewrite-spec/04-STATE-MODEL.md`

3. **RAG / learning / embeddings work**
   - `MAIN.md`
   - `PERSISTENCE.md`
   - `rewrite-spec/06-RAG-PIPELINE.md`
   - `rewrite-spec/04-STATE-MODEL.md`

4. **Ontology/profile refactor work**
   - `MAIN.md`
   - `whatwe_agreedonthearchitecture.md`
   - `whatwe_agreedonthearchitecture_humans.md`
   - `ARCHITECTURE.md`
   - `PERSISTENCE.md`
   - `ONTOLOGY_PROFILE_REFACTOR/README.md`
   - `ONTOLOGY_PROFILE_REFACTOR/00_DOC_SYNC.md`
   - `ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md`
   - `ONTOLOGY_PROFILE_REFACTOR/humanreadable.md`
   - `ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md`
   - `ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md`

5. **UI / screens work**
   - `MAIN.md`
   - `rewrite-spec/05-SCREENS.md`
   - `rewrite-spec/07-PRESERVE-THESE-BEHAVIORS.md`

## Maintenance Rules

- When an architectural decision changes, update the relevant canonical doc (`PERSISTENCE.md`, or the spec file). Don't let session notes become the source of truth — promote first, then reference.
- When profile/ontology architecture changes, update the relevant file under `ONTOLOGY_PROFILE_REFACTOR/` and add a short pointer in the root canonical doc if the change affects repo-wide rules.
- After each phase checkpoint, update [current_state.md](current_state.md).
- Session notes accumulate. That's fine — list them here with dates so agents know they're frozen in time.

## Current Status

**Phases 0-6 complete, and the ontology/profile refactor is now a live implemented spine.** The current repo has profile compatibility fields, branches, selections, profile definitions, correction evidence, proposal storage/events, trust-setting storage, Conceptualize ContextPack/prompt validation, user-fit projection/history, proposal edit/freshness/refresh/apply, the first manual checker gate through UI trigger/readout and adapter, root-doc consolidation, Gate 3 selection UI, Doc 39's first branch-to-base target-switch path, Doc 43's initial photography second-base forkability proof, and profile-scoped learning concept-list/retrieval filters for overlapping base-profile type ids. Choose the next bounded work deliberately against the numbered docs first. See `current_state.md` and `ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md`.
