# Slice N1 - SRJ Draft Planner

## Goal

Turn user planner actions into deterministic SRJ drafts.

This slice proves that node movement and directives are represented as typed data, not as local UI-only state or vague prompts.

## Must Read

- `rewrite-spec/neuanordnung-slices/README.md`
- `rewrite-spec/11-NEUANORDNUNG-MAIN.md`
- `rewrite-spec/12-NEUANORDNUNG-ARCHITECTURE.md`
- `rewrite-spec/13-NEUANORDNUNG-ANTI-REGRESSION.md`
- `rewrite-spec/14-NEUANORDNUNG-PHASES.md`
- `rewrite-spec/04-STATE-MODEL.md`
- `codelens-rn/whatwe_agreedonthearchitecture.md`

## Depends On

N0 must be complete:

- `ParseSnapshot` exists.
- stable node ids exist.
- Neuanordnung route can render structural nodes.

## Allowed Write Scope

```txt
codelens-rn/src/features/neuanordnung/domain/srj.ts
codelens-rn/src/features/neuanordnung/domain/planner-action.ts
codelens-rn/src/features/neuanordnung/domain/planner-rules.ts
codelens-rn/src/features/neuanordnung/domain/validation.ts
codelens-rn/src/features/neuanordnung/application/applyPlannerAction.ts
codelens-rn/src/features/neuanordnung/application/createDraftFromFile.ts
codelens-rn/src/features/neuanordnung/application/useRefactorPlanner.ts
codelens-rn/src/features/neuanordnung/data/codecs.ts
codelens-rn/src/features/neuanordnung/data/draft-repository.ts
codelens-rn/src/features/neuanordnung/data/query-keys.ts
codelens-rn/src/features/neuanordnung/ui/SrjPreview.tsx
codelens-rn/src/features/neuanordnung/index.ts
```

Small edits to existing Neuanordnung UI from N0 are allowed only to dispatch planner actions and show pending state.
Test files for the same modules are allowed.

## Required Build

<required_build>
1. Define `SemanticRefactorJob` and related SRJ domain types.
2. Define `PlannerAction`.
3. Implement pure action-to-draft transformation.
4. Implement undo for planner actions.
5. Persist drafts with Zod codecs.
6. Add query key factory for Neuanordnung draft queries.
7. Add SRJ preview UI.
8. Visual order derives from parse snapshot plus planner actions.
</required_build>

## Hard Constraints

<hard_constraints>
1. No executor or patch application in this slice.
2. No direct SRJ mutation from UI components.
3. No inline `queryKey: [...]` arrays.
4. Persisted drafts must parse through codecs.
5. Drafts include source fingerprint data.
6. Node movements reference stable node ids.
7. Free-form directives must attach to a node or file.
</hard_constraints>

## Stop Conditions

<stop_conditions>
Stop and report if:
- N0 node ids are not stable enough to reference from SRJ,
- persistence/query infrastructure is not available,
- draft storage would require inventing a second source-file store,
- validation cannot detect stale source fingerprints.
</stop_conditions>

## Verification

Run or inspect:

- TypeScript compile.
- Unit tests for planner action sequence determinism.
- Unit tests for undo.
- Codec parse/reject tests for SRJ.
- Grep for inline `queryKey: [` in Neuanordnung files.
- Grep for `as any` in changed files.

## Done When

The user can move a node, reopen the draft, and see the same pending mutation in SRJ preview.
No dry-run or executor exists yet.
