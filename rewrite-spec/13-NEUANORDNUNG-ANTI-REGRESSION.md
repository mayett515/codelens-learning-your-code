# Neuanordnung Anti-Regression Contract

This file lists the behavior that must survive implementation and refactors.
Treat it like a bug-prevention contract for AI agents.

## Hard Regression Guards

<hard_regression_guards>
1. A node movement must create a typed SRJ mutation.
   It must not only reorder local UI state.

2. A visual reorder must survive screen leave/reopen after the draft is saved.
   Persist the draft or explicitly mark it unsaved.

3. Re-parsing a file must detect stale drafts.
   If the file fingerprint changed, execution is blocked until the user revalidates.

4. Node ids must not be array indexes.
   Inserting a new function above a node must not redirect an old mutation to the wrong node.

5. Up/down nudge controls must remain available even if drag-and-drop is implemented.
   Mobile refactoring must work without precision dragging.

6. Global sweep must require explicit scope.
   Never default a local node action into a project-wide sweep.

7. Free-form user directives must be attached to a node, file, or sweep.
   No orphan prompt text should be sent to the executor.

8. Execution must start with dry-run/preview.
   No direct patch application from the planner screen.

9. Executor failures must be visible.
   Do not turn failed mutations into successful empty patches.

10. Neuanordnung must not bypass existing architecture rules:
    route thinness, feature barrel imports, query key factories, strict TypeScript, and explicit error handling still apply.

11. Standard pattern intents must remain typed and validated.
    Do not send raw labels like "make this a strategy pattern" as the only executor input.

12. Command-style planner actions are internal.
    Do not expose "Implement Command Pattern" as a default user-facing refactor intent unless a real use case proves it.
</hard_regression_guards>

## UX Behaviors To Preserve

<ux_behaviors>
1. Tap-first planning:
   The user can reorder adjacent nodes with one tap per move.

2. Pending state visibility:
   A mutated node visually shows that it has a pending move, intent, directive, or sweep.

3. Undo:
   The user can undo planner actions before execution.

4. Haptic feedback:
   Successful nudge, standard intent selection, and sweep approval produce light feedback.

5. No accidental destructive action:
   Clearing a whole draft or executing a patch requires confirmation.

6. Preview clarity:
   Preview names affected files, affected nodes, global sweeps, warnings, skipped mutations, and partial successes.

7. Scope clarity:
   Global sweep UI shows whether the sweep affects file, folder, or project.

8. Context-aware pattern menu:
   React/TypeScript pattern intents appear only when the node/file context makes them plausible.
</ux_behaviors>

## Data Integrity Guards

<data_integrity_guards>
1. Persisted SRJ drafts are parsed through Zod codecs.
2. Unknown schema versions are rejected with migration-required errors.
3. Drafts include source snapshot fingerprints.
4. Execution records include executor version and timestamp.
5. Patch summaries are stored separately from source content.
6. Applying execution results updates authoritative source records only after confirmation.
7. Backup/restore includes refactor drafts and execution records or explicitly drops them as non-restorable with a user-visible note.
</data_integrity_guards>

## Performance Guards

<performance_guards>
1. Do not perform deep AST parsing on the UI thread.
2. Do not run TypeScript language service, Babel full-project parsing, or project-wide dependency analysis on the phone.
3. Use shallow compiled parsing when available; otherwise fail gracefully into raw code view.
4. Layout swaps use Reanimated layout transitions.
5. Drag/gesture calculations stay on the UI thread where practical.
6. The JS thread receives final planner actions, not every animation frame.
7. Slime/dependency visuals are optional and must never block scrolling or nudging.
</performance_guards>

## Failure State Machine

<failure_state_machine>
IF parser fails:
THEN show parser error and keep raw code viewer usable.

IF parser returns zero nodes:
THEN show empty structural state and allow a custom file-level directive only.

IF draft source fingerprint is stale:
THEN block dry-run and execution, then offer re-parse.

IF validation finds conflicting moves:
THEN highlight the conflicting nodes and block dry-run.

IF a standard intent is not valid for the selected node:
THEN hide it or disable it with a clear reason.

IF dry-run returns warnings:
THEN show warnings and require explicit confirmation before execute.

IF execute partially succeeds:
THEN show changed files, skipped mutations, and failed mutations separately.

IF patch application fails:
THEN preserve the execution result and leave source files unchanged.
</failure_state_machine>

## Test Expectations

<test_expectations>
Domain tests:
- node id stability from parse snapshots,
- move mutation generation,
- standard intent mutation generation,
- standard intent availability rules,
- sweep creation with explicit scope,
- stale fingerprint detection,
- conflicting move validation,
- schema version rejection.

Application tests:
- planner action sequence produces deterministic SRJ,
- undo restores previous draft state,
- execution blocked on invalid SRJ,
- dry-run warnings are surfaced,
- stale drafts cannot execute.

UI tests where practical:
- nudge buttons dispatch planner actions,
- bottom sheet standard intent dispatches planner action,
- preview blocks execute when stale,
- project-wide sweep is not the default.
</test_expectations>

## Grep Checks Before Final Response

<grep_checks>
Run or manually inspect for:
- inline `queryKey: [` under Neuanordnung files,
- imports from `src/features/neuanordnung/` internals outside the feature,
- new `as any`,
- direct SRJ mutation from UI components,
- source file writes without preview confirmation,
- project-wide sweep defaults,
- raw pattern labels sent without typed `intentType`.
</grep_checks>

## Explicit Non-Regression Examples

Bad:

```ts
setNodes(arrayMove(nodes, fromIndex, toIndex));
```

Why bad: visual order changed but no SRJ mutation exists.

Good:

```ts
dispatchPlannerAction({
  type: 'MOVE_NODE',
  nodeId,
  direction: 'up',
});
```

Bad:

```ts
const nodeId = String(index);
```

Why bad: index ids corrupt old drafts after parse order changes.

Good:

```ts
const nodeId = createCodeNodeId({
  fileId,
  kind,
  name,
  startLine,
  endLine,
  signature,
});
```

Bad:

```ts
await executor.execute(job);
applyPatchImmediately(result);
```

Why bad: the user never saw the changed-file list or warnings.

Good:

```ts
const dryRun = await executor.dryRun(job);
showPreview(dryRun);
```
