# Neuanordnung Build Phases

Neuanordnung should be built after the base app has project files, persistence, AI queue, and source viewing working.
In the existing `09-BUILD-PHASES.md`, that means after Phase 3 at the earliest, and preferably after Phase 4 if learning/context reuse matters.

I recommend 4 Neuanordnung-specific phases.
Fewer phases would mix parser, planner, UI, and execution risk into one large feature.
More phases would create too many non-demo checkpoints.

Each phase must end with a runnable Android demo.

For cheap-model implementation slices, use:

- `rewrite-spec/neuanordnung-slices/README.md`
- `rewrite-spec/neuanordnung-slices/N0-parser-structural-read-view.md`
- `rewrite-spec/neuanordnung-slices/N1-srj-draft-planner.md`
- `rewrite-spec/neuanordnung-slices/N2-mobile-interaction-layer.md`
- `rewrite-spec/neuanordnung-slices/N3-execution-handoff-preview.md`

## Phase N0 - Parser Contract + Structural Read View

Goal: open one source file and render stable structural nodes without planning edits yet.

Build:

- `src/ports/code-parser.ts`.
- `src/adapters/shallow-code-parser.ts`.
- parser strategy selection behind the parser port.
- `src/features/neuanordnung/domain/parse-snapshot.ts`.
- `src/features/neuanordnung/domain/node-id.ts`.
- `src/features/neuanordnung/domain/standard-intents.ts`.
- `src/features/neuanordnung/domain/validation.ts` skeleton.
- `src/features/neuanordnung/ui/NodeBubbleList.tsx`.
- `app/neuanordnung/[fileId].tsx`.

Rules:

<phase_n0_rules>
1. Parser must return `ParseSnapshot`.
2. Node ids must be stable and covered by tests.
3. Parser failure must not break the normal code viewer.
4. UI must support large files through FlatList.
5. Standard intent hints may be detected, but no SRJ execution exists in this phase.
</phase_n0_rules>

Demo:

Open a project file, tap "Structure", see functions/classes/components as bubbles with line ranges and plausible intent hints.

## Phase N1 - SRJ Draft Planner

Goal: user actions create deterministic SRJ drafts.

Build:

- `src/features/neuanordnung/domain/srj.ts`.
- `src/features/neuanordnung/domain/planner-action.ts`.
- `src/features/neuanordnung/domain/planner-rules.ts`.
- `src/features/neuanordnung/application/applyPlannerAction.ts`.
- `src/features/neuanordnung/application/useRefactorPlanner.ts`.
- `src/features/neuanordnung/data/codecs.ts`.
- `src/features/neuanordnung/data/draft-repository.ts`.
- `src/features/neuanordnung/data/query-keys.ts`.
- `src/features/neuanordnung/ui/SrjPreview.tsx`.

Rules:

<phase_n1_rules>
1. Nudge actions create `MOVE_NODE` planner actions.
2. Planner actions update SRJ draft through pure functions.
3. Draft persistence validates JSON through codecs.
4. Undo is available.
5. Preview shows SRJ summary but does not execute.
6. Visual order derives from the parse snapshot plus planner actions.
</phase_n1_rules>

Demo:

Move a function above another function, leave the screen, reopen the draft, and see the pending move plus SRJ preview.

## Phase N2 - Slime/Glass Interaction Layer

Goal: ship the mobile-first planning experience.

Build:

- `src/features/neuanordnung/ui/NodeBubble.tsx`.
- optional compound component structure for `NodeBubble` if it reduces props.
- `src/features/neuanordnung/ui/RefactorActionSheet.tsx`.
- `src/features/neuanordnung/ui/SweepPromptSheet.tsx`.
- standard intent actions from the approved catalog.
- explicit sweep scope selector: file, folder, project.
- haptics and Reanimated layout transitions.

Rules:

<phase_n2_rules>
1. Up/down nudge buttons remain the primary movement control.
2. Bottom sheet actions dispatch planner actions only.
3. Sweep prompt never defaults to project scope.
4. UI shows pending mutation badges/states.
5. Drag-and-drop, if added, must produce the same planner actions as nudge.
6. Pattern intents are context-aware and typed.
</phase_n2_rules>

Demo:

Use only touch controls to create a plan containing one move, one standard intent, and one file-scoped sweep; preview shows all three.

## Phase N3 - Execution Handoff + Patch Preview

Goal: validated SRJ can be handed to an executor and returned as a previewable result.

Build:

- `src/ports/refactor-executor.ts`.
- `src/adapters/refactor-executor-client.ts`.
- `src/features/neuanordnung/application/prepareExecution.ts`.
- `src/features/neuanordnung/application/validateDraft.ts`.
- `src/features/neuanordnung/data/execution-repository.ts`.
- `src/features/neuanordnung/ui/ExecutionPreview.tsx`.
- execution preview UI with changed files, warnings, skipped mutations, and apply confirmation.

Rules:

<phase_n3_rules>
1. Execute only after SRJ validation passes.
2. Run dry-run before apply.
3. Stale source fingerprint blocks dry-run and execution.
4. Partial success must be represented explicitly.
5. Applying results updates authoritative source records only after confirmation.
6. Execution records are persisted for audit/debugging.
7. Do not fake successful execution for unsupported standard pattern intents.
</phase_n3_rules>

Demo:

Create a valid SRJ, run dry-run, inspect changed-file preview, confirm apply, and see updated source content.

## Deferred Until After N3

<deferred>
- Full project-wide AST analysis on mobile.
- Multi-file drag canvas.
- Custom visual dependency graph for moved nodes.
- Automatic import repair on the phone.
- Cloud executor productization.
- Collaborative refactor sessions.
- "Implement Command Pattern" as a default user-facing refactor intent.
</deferred>

## Phase Placement In The Main Rewrite

Recommended placement:

- Base Phase 0-3 first: app, persistence, project viewer, AI queue.
- Neuanordnung N0-N2 next if structural planning is a core demo goal.
- Base Phase 4-6 next if learning/backup stability is more important.
- Neuanordnung N3 only when there is a real executor path.

Do not start N3 with a fake executor that returns success for every job.
That would hide the main risk of the feature.
