# Neuanordnung Architecture Contract

This file defines the architecture for the Neuanordnung engine inside the React Native rewrite.
It extends the feature-first clean architecture agreed in `whatwe_agreedonthearchitecture.md`.

## Architecture In One Sentence

Neuanordnung is a feature module whose domain owns SRJ types and validation, whose application layer owns planner orchestration, whose data layer persists drafts and execution history, and whose UI layer renders mobile-first structural controls.

## Folder Layout

```txt
src/features/neuanordnung/
  domain/
    srj.ts
    node-id.ts
    parse-snapshot.ts
    planner-action.ts
    planner-rules.ts
    standard-intents.ts
    validation.ts
  application/
    useRefactorPlanner.ts
    createDraftFromFile.ts
    applyPlannerAction.ts
    validateDraft.ts
    prepareExecution.ts
  data/
    query-keys.ts
    draft-repository.ts
    execution-repository.ts
    codecs.ts
  ui/
    NeuanordnungScreen.tsx
    NodeBubbleList.tsx
    NodeBubble.tsx
    RefactorActionSheet.tsx
    SweepPromptSheet.tsx
    SrjPreview.tsx
    ExecutionPreview.tsx
  index.ts

src/adapters/
  shallow-code-parser.ts
  refactor-executor-client.ts

src/ports/
  code-parser.ts
  refactor-executor.ts
```

Routes live outside the feature:

```txt
app/neuanordnung/[fileId].tsx
app/neuanordnung/draft/[draftId].tsx
```

Route files import screen components and hooks from the feature barrel only.

## Layer Rules

<layer_rules>
1. `domain/` contains pure TypeScript only.
   No React, React Native, Expo, SQLite, fetch, Zustand, Reanimated, or Gesture Handler imports.

2. `application/` orchestrates domain functions, repositories, parser ports, and executor ports.
   It may expose hooks, but business rules remain in pure functions where practical.

3. `data/` owns persistence codecs and query keys.
   It validates persisted JSON with Zod before returning domain objects.

4. `ui/` owns React Native components, gestures, animation, haptics, and bottom sheets.
   It does not mutate SRJ directly; it dispatches planner actions.

5. `ports/` define parser and executor interfaces.
   `adapters/` provide concrete implementations.

6. Outside this feature, import Neuanordnung APIs only from `@/src/features/neuanordnung`.
</layer_rules>

## Ports

```ts
export interface CodeParserPort {
  parseFile(input: ParseFileInput): Promise<ParseSnapshot>;
}

export interface RefactorExecutorPort {
  validate(job: SemanticRefactorJob): Promise<ExecutorValidationResult>;
  dryRun(job: SemanticRefactorJob): Promise<RefactorDryRunResult>;
  execute(job: SemanticRefactorJob): Promise<RefactorExecutionResult>;
}
```

## Parse Snapshot

The parse snapshot is the bridge between source text and visual bubbles.
It must be small enough to render on mobile and stable enough to validate later.

```ts
export interface ParseSnapshot {
  fileId: FileId;
  filePath: string;
  contentFingerprint: string;
  parserVersion: string;
  nodes: CodeNode[];
  imports: ImportHint[];
  exports: ExportHint[];
}

export interface CodeNode {
  id: string;
  kind: 'function' | 'class' | 'method' | 'component' | 'interface' | 'type' | 'const' | 'unknown';
  name: string;
  startLine: number;
  endLine: number;
  signature?: string;
  parentId?: string;
  dependencyHints: string[];
  intentHints: StandardRefactorIntent[];
}
```

## Parser Strategy

Parser strategies are useful, but keep them behind the parser port.
The UI must not know which strategy produced a node.

<parser_strategy_rules>
1. Use a generic shallow scanner as the fallback.
2. Use TypeScript-specific scanning for interfaces, classes, types, exports, and decorators.
3. Use React-specific scanning for components, hooks, JSX returns, and component API smells.
4. Strategy selection happens in the parser adapter or application service.
5. All strategies return the same `ParseSnapshot` shape.
</parser_strategy_rules>

## Planner Action Model

Use command-style planner actions internally.
Call them planner actions in code unless a real command abstraction earns its keep.

<planner_action_rules>
1. Tap up/down creates a `MOVE_NODE` action.
2. Bottom-sheet standard action creates an `ADD_STANDARD_INTENT` action.
3. User free text creates an `ADD_CUSTOM_DIRECTIVE` action.
4. Sweep approval creates an `ADD_GLOBAL_SWEEP` action.
5. Undo removes or reverses the last planner action.
6. Direct mutation of persisted SRJ from UI is forbidden.
</planner_action_rules>

```ts
export type PlannerAction =
  | { type: 'MOVE_NODE'; nodeId: string; direction: 'up' | 'down' }
  | { type: 'ADD_STANDARD_INTENT'; nodeId: string; intentType: StandardRefactorIntent }
  | { type: 'ADD_CUSTOM_DIRECTIVE'; nodeId: string; directive: string }
  | { type: 'ADD_GLOBAL_SWEEP'; sweep: GlobalSweepDraft }
  | { type: 'UNDO_LAST_ACTION' }
  | { type: 'CLEAR_NODE_MUTATION'; mutationId: string };
```

## React Component Pattern

Compound components may be used for `RefactorBubble` if they reduce prop sprawl.
They are not a blanket rule for every component.

Acceptable:

```tsx
<NodeBubble node={node}>
  <NodeBubble.Header />
  <NodeBubble.NudgeControls />
  <NodeBubble.PendingBadges />
  <NodeBubble.ActionTrigger />
</NodeBubble>
```

Rules:

<react_component_rules>
1. Keep `NodeBubbleList` responsible for list virtualization and stable keys.
2. Keep `NodeBubble` responsible for one node row.
3. Keep bottom-sheet content in `RefactorActionSheet`, not inside the bubble.
4. Avoid 50-prop cards, but do not create compound subcomponents before they remove real complexity.
</react_component_rules>

## State Ownership

<state_ownership>
- SQLite/TanStack Query owns persisted drafts, execution records, and source files.
- Zustand owns only ephemeral UI state: selected node, open sheet, active preview tab, gesture state.
- Domain functions own deterministic SRJ transformation.
- Executor owns patch generation and project-wide analysis.
</state_ownership>

## UI Contract

<ui_contract>
1. Use tap-first controls before drag-and-drop.
   Up/down nudge buttons are required.
   Drag-and-drop is progressive enhancement only.

2. Node bubbles display name, kind, line range, pending mutation state, and relevant standard intent hints.

3. Standard intents live in a bottom sheet.
   Supported first-pass intents are listed in `11-NEUANORDNUNG-MAIN.md`.

4. Sweep prompt is explicit.
   The user must choose local-only, file, folder, or project scope.

5. Preview is required before execution.
   Show SRJ summary, affected files, warnings, skipped mutations, and stale-source status.
</ui_contract>

## Performance Contract

<performance_contract>
1. Do not run heavy parsing on the JS render path.
2. Debounce parse refresh after source changes.
3. Parse one opened file first; multi-file parsing is opt-in.
4. Use Reanimated layout transitions for bubble movement.
5. Keep FlatList keys stable by node id.
6. Do not store full file contents inside Zustand planner state.
7. Keep any Slime/dependency visuals optional until the core planner is stable.
</performance_contract>

## Persistence Mapping

Suggested tables:

| Domain object | Storage | Notes |
|---|---|---|
| RefactorDraft | SQLite `refactor_drafts` | SRJ draft JSON validated by codec |
| ParseSnapshot | SQLite `refactor_parse_snapshots` or transient cache | Store only if needed for stale checks |
| ExecutionRecord | SQLite `refactor_executions` | dry-run and execution metadata |
| Executor warnings | SQLite JSON column | renderable audit trail |

Do not add another source-code store. `SourceFile` remains authoritative.

## Query Keys

<query_key_rules>
Use `src/features/neuanordnung/data/query-keys.ts`.
Do not add inline `queryKey: [...]` arrays.
Keys must include project id, file id, draft id, or execution id where applicable.
</query_key_rules>

## Public Barrel

`src/features/neuanordnung/index.ts` exports only stable public APIs:

- screen components used by routes,
- application hooks,
- domain types needed by other features,
- query key factory if needed.

It does not export internal repositories, codecs, or UI leaf components unless another feature has a real dependency.
