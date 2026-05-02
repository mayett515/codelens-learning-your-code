# Neuanordnung Slice Index

Use these files when handing Neuanordnung work to a cheaper coding model.
Each slice is intentionally narrow, points to the relevant contract docs, and includes stop conditions so the model does not drift.

## How Many Phases?

Neuanordnung has 4 implementation phases:

1. `N0` - Parser Contract + Structural Read View
2. `N1` - SRJ Draft Planner
3. `N2` - Slime/Glass Interaction Layer
4. `N3` - Execution Handoff + Patch Preview

Do not run these in parallel unless their write scopes are made disjoint.
The normal order is N0, then N1, then N2, then N3.

## Required Reading For Every Slice

Every model working on a slice must read:

- `rewrite-spec/00-START-HERE.md`
- `rewrite-spec/03-ARCHITECTURE.md`
- `rewrite-spec/04-STATE-MODEL.md`
- `rewrite-spec/11-NEUANORDNUNG-MAIN.md`
- `rewrite-spec/12-NEUANORDNUNG-ARCHITECTURE.md`
- `rewrite-spec/13-NEUANORDNUNG-ANTI-REGRESSION.md`
- `rewrite-spec/14-NEUANORDNUNG-PHASES.md`
- `codelens-rn/whatwe_agreedonthearchitecture.md`
- `codelens-rn/whatwe_agreedonthearchitecture_humans.md`

## Slice Files

- `N0-parser-structural-read-view.md`
- `N1-srj-draft-planner.md`
- `N2-mobile-interaction-layer.md`
- `N3-execution-handoff-preview.md`

## Global Rules

<global_slice_rules>
1. Keep route files thin.
2. Keep Neuanordnung code under `src/features/neuanordnung/` except ports/adapters/routes.
3. Import Neuanordnung from the feature barrel outside the feature.
4. Do not add inline `queryKey: [...]` arrays.
5. Do not add `as any`.
6. Do not execute or apply refactors without SRJ validation and preview.
7. Do not create a second source-code persistence system.
8. Preserve strict TypeScript and `exactOptionalPropertyTypes`.
9. Add focused tests for pure domain/application logic in the slice.
10. Stop and report if an existing architecture contract conflicts with the slice.
</global_slice_rules>

## Cheap Model Prompt Template

```txt
You are implementing Neuanordnung slice <SLICE_ID>.
Read the required files from rewrite-spec/neuanordnung-slices/README.md and then read rewrite-spec/neuanordnung-slices/<SLICE_FILE>.
Implement only the scope listed in that slice.
Do not start later slices.
Do not widen architecture, skip validation, add any, or bypass feature boundaries.
Before final response, run the verification commands/checks from the slice and summarize changed files.
```
