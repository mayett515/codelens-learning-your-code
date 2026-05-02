# Neuanordnung Main Contract

This file is the governing contract for the Neuanordnung engine.
It keeps the useful React/TypeScript pattern ideas while preventing the feature from becoming a vague prompt menu or an unsafe mobile code executor.

## Product Intent

Neuanordnung is the mobile-first structural refactoring planner for CodeLens RN.
It is not a text editor replacement and it is not a mobile AST rewrite engine.

The user expresses refactor intent through tactile mobile controls.
The app serializes that intent into deterministic Semantic Refactor JSON (SRJ).
The executor applies the change only after validation, dry-run, preview, and explicit user confirmation.

The phone plans. The executor patches.

## Read Order

1. `10-NEUANORDNUNG-ENGINE.md` - raw product/UX idea.
2. `11-NEUANORDNUNG-MAIN.md` - this strict contract.
3. `12-NEUANORDNUNG-ARCHITECTURE.md` - module boundaries and data flow.
4. `13-NEUANORDNUNG-ANTI-REGRESSION.md` - behavior that must not regress.
5. `14-NEUANORDNUNG-PHASES.md` - implementation order.

## Scope

Neuanordnung may:

- read source-file content from the existing project/file model,
- create shallow parse snapshots,
- render structural nodes as mobile bubbles,
- collect typed planner actions,
- build and validate SRJ drafts,
- dry-run execution through an executor port,
- show patch previews and execution warnings.

Neuanordnung must not become:

- a generic mobile IDE,
- a raw text diff editor,
- a project-wide AST engine running on the phone,
- a second source-code persistence system,
- a prompt-only interface with no deterministic schema,
- an automatic patch applier.

## Core User Flow

1. User opens a source file.
2. App performs shallow parsing and shows structural nodes as bubbles.
3. User nudges nodes, opens quick actions, writes a directive, or marks a sweep.
4. App records each interaction as a typed planner action.
5. Planner actions produce an SRJ draft.
6. User opens preview.
7. App validates SRJ, source fingerprints, node references, and conflicts.
8. App sends valid SRJ to executor dry-run.
9. User reviews changed-file list, warnings, skipped mutations, and patch summary.
10. User explicitly confirms before source records are modified.

## Hard Constraints

<hard_constraints>
1. Store user refactor intent as SRJ, not free-form prompt text.

2. Keep Neuanordnung as a feature module.
   Use `src/features/neuanordnung/` for domain, application, data, and UI owned by this feature.
   Do not scatter planner logic through generic screens or shared stores.

3. Keep route files thin.
   `app/neuanordnung/...` routes compose hooks and render screens.
   They do not contain parsing, SRJ mutation, validation, or execution orchestration.

4. The mobile parser is shallow.
   It extracts node identity, line ranges, names, imports, exports, and lightweight dependency hints.
   It does not perform whole-project dependency analysis on the JS thread.

5. The SRJ draft is deterministic.
   The same ordered planner actions against the same parse snapshot produce the same SRJ.

6. Every planned mutation references stable node ids.
   Do not rely only on array indexes, display order, or symbol name alone.

7. Never execute an unvalidated SRJ.
   Validate schema, target existence, conflicting moves, duplicate target positions, stale parse snapshots, and sweep scope before dry-run.

8. Global sweeps are directives, not mobile AST execution.
   The phone records the reference node and user-approved sweep instruction.
   The executor performs project-wide search and patch generation.

9. Keep project source truth in existing persistence.
   Neuanordnung may persist drafts and execution records, but it must not create a separate source-file cache that can drift from `SourceFile`.

10. Do not silently apply patches.
    All execution results require preview, changed-file list, warning review, and explicit user confirmation before modifying stored source content.
</hard_constraints>

## SRJ Contract

<srj_contract>
The SRJ object is the only supported handoff format.
It must be serializable JSON.
It must be parseable by Zod.
It must include schema version, project id, source snapshot fingerprint, file plan entries, node mutations, global sweeps, and user directives.
It must never include secrets, API keys, provider credentials, or hidden app state.
</srj_contract>

```ts
export interface SemanticRefactorJob {
  schemaVersion: 1;
  projectId: ProjectId;
  createdAt: string;
  sourceSnapshot: {
    fileIds: FileId[];
    fingerprint: string;
  };
  files: RefactorFilePlan[];
  globalSweeps: GlobalSweep[];
  executionPreference: 'desktop-handoff' | 'mobile-local-future' | 'cloud-future';
}

export interface RefactorFilePlan {
  fileId: FileId;
  filePath: string;
  parseFingerprint: string;
  nodeMutations: NodeMutation[];
  fileDirectives: FileDirective[];
}

export interface NodeMutation {
  mutationId: string;
  nodeId: string;
  action: 'move' | 'standard_intent' | 'custom_directive';
  target?: {
    position: 'above' | 'below' | 'inside';
    nodeId: string;
  };
  intentType?: StandardRefactorIntent;
  humanDirective?: string;
}

export type StandardRefactorIntent =
  | 'MERGE_INTO_CALLER'
  | 'EXTRACT_HELPERS'
  | 'MOVE_TO_FILE'
  | 'MODERNIZE'
  | 'RENAME_SYMBOL'
  | 'EXTRACT_CUSTOM_HOOK'
  | 'SPLIT_CONTAINER_PRESENTATIONAL'
  | 'CONVERT_TO_COMPOUND_COMPONENT'
  | 'EXTRACT_FACTORY'
  | 'REPLACE_CONDITIONAL_WITH_STRATEGY';

export interface FileDirective {
  directiveId: string;
  instruction: string;
}

export interface GlobalSweep {
  sweepId: string;
  triggerNodeId: string;
  detectedPattern: string;
  sweepInstruction: string;
  scope: 'file' | 'folder' | 'project';
}
```

## Standard Intent Catalog

The Glass bottom sheet may expose standard pattern refactors only when they are context-aware.
These are typed SRJ intents, not magic buttons that bypass validation.

<standard_intent_rules>
1. Show React intents only for React-like nodes or files.
2. Show TypeScript structural intents only when the parse snapshot suggests the shape exists.
3. Each standard intent must serialize to `intentType`.
4. Each standard intent must be validated before dry-run.
5. If the executor cannot confidently apply an intent, it returns a warning or skipped mutation.
</standard_intent_rules>

Initial useful intents:

- `EXTRACT_CUSTOM_HOOK` for reusable React state/effect logic.
- `SPLIT_CONTAINER_PRESENTATIONAL` for components mixing data orchestration and rendering.
- `CONVERT_TO_COMPOUND_COMPONENT` for component APIs with many boolean/config props.
- `EXTRACT_FACTORY` for repeated object construction or provider selection.
- `REPLACE_CONDITIONAL_WITH_STRATEGY` for large conditional branches with clear variant behavior.

Do not include `IMPLEMENT_COMMAND_PATTERN` as a first-pass user-facing refactor intent.
Command-style actions are valuable inside the planner, but forcing Command Pattern into user code is often overengineering.

## LLM Execution Rules

<llm_execution_rules>
IF the user asks for a refactor:
THEN produce or update SRJ first.

IF SRJ validation fails:
THEN show the concrete validation error and do not dry-run.

IF source fingerprints are stale:
THEN require re-parse before dry-run or execute.

IF dry-run returns warnings:
THEN show warnings and require explicit confirmation before execute.

IF the executor cannot confidently apply a mutation:
THEN return a skipped mutation or warning instead of inventing unrelated edits.

IF a global sweep would touch files outside the chosen scope:
THEN reject it or require explicit scope expansion.
</llm_execution_rules>

## Success Definition

Neuanordnung is successful when a user can plan structural refactors on a phone without typing long prompts, without editing raw code text, and without losing control over what changes are applied.

The engine is not successful if it only opens a bottom sheet and sends vague prose to an LLM.
