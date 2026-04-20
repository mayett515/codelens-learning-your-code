# What We Agreed On - Architecture Guide for Humans

## Why this exists
This is the plain-English version of our architecture agreement.
It explains how we structure the app, why we do it this way, and what should not change accidentally.

If you need the strict machine contract for AI tools, read:
- [whatwe_agreedonthearchitecture.md](whatwe_agreedonthearchitecture.md)

For detailed implementation docs, read:
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [current_state.md](current_state.md)
- [PERSISTENCE.md](PERSISTENCE.md)

## The architecture in one sentence
We use a feature-based folder layout with clean architecture boundaries, so product logic is testable, screens stay thin, and data/AI/storage changes do not leak everywhere.

## The stack of decisions we agreed on

1. Feature-first organization (inspired by BlueSky style)
- Learning logic lives together in `src/features/learning/`.
- Backup logic lives together in `src/features/backup/`.
- Shared infrastructure stays in `src/` core.

2. Clean architecture boundaries
- `domain`: pure types and rules.
- `application`: use-cases and orchestration.
- `data`: DB queries and codecs.
- `ui`: components and hooks.
- `app/` routes: composition and rendering, not business workflows.

3. Public API per feature (barrel discipline)
- Outside the learning feature, imports should come from `@/src/features/learning`.
- This keeps refactors safe and prevents deep import coupling.

4. Query consistency
- TanStack query keys come from factories, not random inline arrays.
- This prevents stale invalidation bugs.

5. DB safety at boundaries
- JSON columns are parsed/validated via Zod codecs.
- We avoid unsafe casts in the data layer.

6. Transaction discipline
- Multi-step writes that must succeed together run in one transaction.
- Data helpers support passing transaction executors.

7. TypeScript safety model
- Strict mode and `exactOptionalPropertyTypes` stay enabled.
- Branded IDs stay in place (`ChatId`, `ConceptId`, etc.) to prevent accidental mixups.
- Avoid `any` except true external boundary cases.

8. Failure behavior
- We fail loudly on critical paths.
- No fake-success fallbacks that silently corrupt data quality.

## Embedding decision
Product direction is local-first and intended local-only for embeddings.
That means we do not want silent fallback to remote embedding providers unless we explicitly decide to change that behavior.

## Practical coding rules

Do:
- Put orchestration in hooks/use-cases.
- Keep screens mostly declarative.
- Add or update focused tests when changing behavior.
- Use query key factories and feature barrels.

Do not:
- Put heavy business logic directly in route files.
- Add hardcoded query key arrays.
- Add `as any` in feature data code.
- Swallow errors in critical flows.

## What this buys us
- Faster refactors with less breakage.
- Better tests because logic is not trapped in UI components.
- Fewer runtime surprises from type drift.
- More predictable behavior for offline-first features.

## If we ever change direction
If we want a different architecture (for example hybrid remote embedding fallback), that is fine, but it should be an explicit product decision and documented update, not an accidental side effect of one patch.
