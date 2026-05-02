# Slice N2 - Slime/Glass Interaction Layer

## Goal

Build the mobile-first planning controls on top of the SRJ planner.

This slice adds the tap-first bubble controls, bottom sheet standard intents, explicit sweep scope, haptics, and pending-state UI.

## Must Read

- `rewrite-spec/neuanordnung-slices/README.md`
- `rewrite-spec/11-NEUANORDNUNG-MAIN.md`
- `rewrite-spec/12-NEUANORDNUNG-ARCHITECTURE.md`
- `rewrite-spec/13-NEUANORDNUNG-ANTI-REGRESSION.md`
- `rewrite-spec/14-NEUANORDNUNG-PHASES.md`
- `rewrite-spec/02-STACK.md`
- `codelens-rn/whatwe_agreedonthearchitecture.md`

## Depends On

N0 and N1 must be complete:

- structural nodes render,
- planner actions update SRJ drafts,
- SRJ preview exists.

## Allowed Write Scope

```txt
codelens-rn/src/features/neuanordnung/domain/standard-intents.ts
codelens-rn/src/features/neuanordnung/domain/planner-rules.ts
codelens-rn/src/features/neuanordnung/application/useRefactorPlanner.ts
codelens-rn/src/features/neuanordnung/ui/NodeBubble.tsx
codelens-rn/src/features/neuanordnung/ui/NodeBubbleList.tsx
codelens-rn/src/features/neuanordnung/ui/RefactorActionSheet.tsx
codelens-rn/src/features/neuanordnung/ui/SweepPromptSheet.tsx
codelens-rn/src/features/neuanordnung/ui/SrjPreview.tsx
codelens-rn/src/features/neuanordnung/index.ts
```

Small style/theme edits are allowed only if they are needed for the Neuanordnung controls.
Test files for the same modules are allowed.

## Required Build

<required_build>
1. Add up/down nudge controls.
2. Add bottom sheet for standard intents.
3. Add context-aware intent availability.
4. Add explicit sweep scope selector: file, folder, project.
5. Add pending badges/states for move, standard intent, directive, and sweep.
6. Add haptics for successful nudge, intent selection, and sweep approval.
7. Add Reanimated layout transitions for list movement.
</required_build>

## Approved Standard Intents

<approved_standard_intents>
- `EXTRACT_CUSTOM_HOOK`
- `SPLIT_CONTAINER_PRESENTATIONAL`
- `CONVERT_TO_COMPOUND_COMPONENT`
- `EXTRACT_FACTORY`
- `REPLACE_CONDITIONAL_WITH_STRATEGY`
- base intents from `11-NEUANORDNUNG-MAIN.md`: merge, extract helpers, move to file, modernize, rename.
</approved_standard_intents>

Do not add `IMPLEMENT_COMMAND_PATTERN` as a default intent.

## Hard Constraints

<hard_constraints>
1. Nudge buttons remain primary even if drag-and-drop is added.
2. Bottom sheet actions dispatch planner actions only.
3. Project scope is never the default sweep scope.
4. Pattern intent labels never replace typed `intentType`.
5. Slime/dependency visuals are optional and must not block smooth scrolling.
6. Do not add a new global store unless state must cross screens.
</hard_constraints>

## Stop Conditions

<stop_conditions>
Stop and report if:
- `@gorhom/bottom-sheet`, Reanimated, or Gesture Handler are not configured,
- planner actions from N1 cannot represent the UI action,
- adding drag-and-drop would delay tap-first controls,
- intent availability cannot be made context-aware yet.
</stop_conditions>

## Verification

Run or inspect:

- TypeScript compile.
- Tests for standard intent availability rules.
- Tests or manual check that sweep scope defaults to file/local, not project.
- Manual check that each UI action updates SRJ preview.
- Grep for raw pattern labels sent without `intentType`.

## Done When

Using only touch controls, the user can create a plan containing one move, one standard intent, and one file-scoped sweep.
SRJ preview shows all three.
