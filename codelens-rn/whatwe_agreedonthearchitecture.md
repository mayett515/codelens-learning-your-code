# What We Agreed On - Architecture Contract for LLMs

## Purpose
This file is the strict execution contract for AI coding agents working in this repo.
It captures the architecture choices we already agreed on and prevents regressions.

Authoritative references:
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [current_state.md](current_state.md)
- [PERSISTENCE.md](PERSISTENCE.md)
- [ONTOLOGY_PROFILE_REFACTOR/README.md](ONTOLOGY_PROFILE_REFACTOR/README.md) for the planned profile/ontology refactor.

## Scope
Applies to all edits under `codelens-rn/`.
If an instruction conflicts with this file, stop and explicitly call out the conflict.

## Rule Format
Use positive constraints. Do exactly what is listed.

<hard_constraints>
1. Keep route screens in `app/` thin.
   Allowed in routes: composition wiring, query hook usage, rendering, local UI state.
   Not allowed in routes: multi-step business orchestration, data-layer mutation flows, algorithmic domain logic.

2. Keep feature-owned code co-located under `src/features/<feature>/`.
   Learning code stays in `src/features/learning/`.
   Backup code stays in `src/features/backup/`.
   Shared infrastructure stays in `src/` core.

3. Enforce barrel discipline.
   Outside `src/features/learning/`, import learning APIs only from `@/src/features/learning`.
   Do not import internal learning paths from outside the feature.

4. Use query key factories only.
   Core keys come from `src/hooks/query-keys.ts`.
   Learning keys come from `src/features/learning/data/query-keys.ts`.
   Do not add hardcoded `queryKey: [...]` literals.

5. Preserve DB boundary hardening.
   Parse JSON columns via codecs (Zod) at boundaries.
   Do not introduce `as any` in data layer files.

6. Preserve transaction discipline.
   Multi-table writes that must be atomic run inside a transaction.
   Data helpers must support transaction executor threading (`DbOrTx`).

7. Keep TypeScript strictness intact.
   Preserve branded IDs.
   Preserve `strict` + `exactOptionalPropertyTypes` compliance.
   Prefer `unknown` + narrowing over `any`.

8. Do not hide failures.
   No silent fallbacks for critical paths (especially embeddings, persistence, restore).
   Throw explicit errors with context instead of returning fake success values.

9. Embedding architecture decision:
   Embeddings are local-first and intended to be local-only for production behavior.
   Do not silently reroute embedding generation to remote providers without explicit product decision.
   If code differs from this, treat it as architectural drift and flag it.

10. Keep pure logic testable.
   Move orchestration into pure functions/hooks with dependency injection where practical.
   Add/update focused Vitest tests for behavior changes and failure paths.

11. Preserve the profile/ontology refactor direction.
   Coding remains the first-class default profile, but domain-specific taxonomy, labels, prompts, metadata fields, and graph visual encoding should move into profile-owned definitions instead of becoming new scattered hardcoded assumptions.
   Follow [ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md](ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md) for any taxonomy/profile work.

12. Avoid permanent architecture-doc sprawl.
   Planning folders and handoff docs are allowed while a refactor is active.
   When the profile/ontology refactor stabilizes, promote durable rules into the canonical root docs and archive or delete temporary planning docs.
   The end state should have a small set of canonical architecture docs, not many competing sources of truth.
</hard_constraints>

## TypeScript Do and Do Not

<typescript_rules>
DO:
- Type all public function inputs/outputs explicitly.
- Narrow `catch` values safely (`instanceof Error`).
- Keep boundary parsing explicit (Zod codecs, domain factories).
- Use deterministic helper functions for IDs, signatures, query keys.

DO NOT:
- Add `as any` to bypass boundary typing.
- Encode domain assumptions in UI-only code.
- Swallow errors in catch blocks.
- Mutate shared state from multiple layers without clear ownership.
</typescript_rules>

## React Native Pattern Guardrails

<react_native_rules>
- Prefer feature hooks/use-cases over heavy screen components.
- Keep expensive logic off render paths.
- Keep FlatList keys stable and identity-safe.
- Avoid new global stores unless state must be cross-screen.
- Keep offline-first behavior deterministic.
</react_native_rules>

## Execution State Machine For LLMs

<execution_machine>
IF change touches domain or persistence behavior:
THEN update or verify tests in same PR.

IF change touches feature boundaries/imports:
THEN verify barrel discipline and query-key factory usage.

IF change touches embeddings:
THEN verify no silent success fallback and no unintended provider reroute.

IF behavior and architecture conflict:
THEN stop and ask for explicit decision before implementing.

IF a change touches concept types, capture/concept metadata, extraction prompts, promotion categorization, retrieval memory text, or graph visual encoding:
THEN read the ontology/profile refactor docs and avoid adding new domain-specific hardcoding outside the active profile.

IF a planning doc becomes durable architecture:
THEN promote it into `ARCHITECTURE.md`, `whatwe_agreedonthearchitecture.md`, `whatwe_agreedonthearchitecture_humans.md`, `PERSISTENCE.md`, or `MAIN.md`, and mark the old planning doc as archived/superseded.
</execution_machine>

## Required Verification Before Final Response
- `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
- Targeted tests for changed modules (Vitest)
- Quick grep/inspection for:
  - hardcoded query keys
  - barrel leaks
  - newly added `as any`
  - silent catch blocks on critical paths

## PR Review Checklist (Agent Self-Check)
- Architecture boundaries preserved
- Imports follow barrel policy
- Query keys factory-based
- Profile/ontology assumptions live in profile-owned definitions where practical
- No hidden fallback behavior
- Error handling explicit
- Tests cover regression path

## Notes
This contract is intentionally strict to avoid drift from the agreed feature-first clean architecture:
- Feature-based organization (BlueSky-style co-location and public API surface)
- Clean architecture boundaries (domain/application/data/ui)
- TypeScript safety-first at all boundaries
