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

## Session Notes (Not Canonical)

Dated handoff notes from specific work sessions. Useful for context, not for architecture.

- [current_state.md](current_state.md) — Phase tracker. What's done, what's next. Update after every phase checkpoint.
- [currentproblems_sql.md](currentproblems_sql.md) — 2026-04-15 debugging brief written for Gemini re: the Drizzle/op-sqlite integration. Superseded by `PERSISTENCE.md`; keep for history.
- [forfuturesql_architecturalstuff.md](forfuturesql_architecturalstuff.md) — 2026-04-15 Gemini's fix notes. Content promoted into `PERSISTENCE.md`; keep for history.

## Prompt Bundles (Copy/Paste)

Minimal doc bundles per task type, to keep prompts small:

1. **New phase kickoff**
   - `MAIN.md`
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

4. **UI / screens work**
   - `MAIN.md`
   - `rewrite-spec/05-SCREENS.md`
   - `rewrite-spec/07-PRESERVE-THESE-BEHAVIORS.md`

## Maintenance Rules

- When an architectural decision changes, update the relevant canonical doc (`PERSISTENCE.md`, or the spec file). Don't let session notes become the source of truth — promote first, then reference.
- After each phase checkpoint, update [current_state.md](current_state.md).
- Session notes accumulate. That's fine — list them here with dates so agents know they're frozen in time.

## Current Status

**Phases 0–6 complete.** Architecture consolidation + scaling hardening (Gemini CTO review fixes) landed on 2026-04-16. Phase 6 — Backup, Polish, Hardening — landed on 2026-04-17: `.codelens` export/restore archive (NDJSON + Zip with Base64 vectors), two-step clear-all-data, empty-state audit, dark-splash config, and design token / asset specs under `design/`. See `current_state.md` for the full breakdown.
