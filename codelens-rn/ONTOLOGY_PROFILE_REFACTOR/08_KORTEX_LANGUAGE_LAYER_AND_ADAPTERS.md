# Kortex Language Layer And Adapters

This document records the future language/runtime direction for Kortex Core.

## Decision Summary

<decision_summary>
Do not rewrite the current TypeScript app or profile refactor into Racket now.
Keep building Kortex Core with clean TypeScript seams in this repo.
Design the core so a future Racket language layer can compile into the same core operations.
</decision_summary>

The current implementation is in TypeScript because CodeLens is a React Native app and the existing
storage, UI, tests, and profile migration live here. That remains the practical path.

The long-term product direction is broader:

```text
Kortex Core
  stable ontology / graph / versioned operation model

Language layer
  Kortex DSL
  possibly implemented in Racket
  compiles user/program statements into core operations

Adapters
  TypeScript app
  CLI
  MCP server
  Python analytics workers
  Clojure/JVM backend components if needed
  future desktop tools
```

## Why Racket Is Worth Keeping In Mind

Racket is a strong fit for a future Kortex language layer because its core strength is
language-oriented programming. Kortex eventually wants language-level expressions such as:

```text
node "stale closure" is "failure mode"
node "stale closure" is not "react hook pattern" because "the reusable hook structure is not the main insight"
node "project promotion cluster" extends "promotion flow" inside "codelens-rn"
all children of "migration risk" differ from "runtime failure" because "the failure happens across data shape evolution"
agent "db-subagent" is "schema-worker"
agent "db-subagent" extends "project-agent-policy"
agent "db-subagent" is not "destructive-executor"
agent "db-subagent" requires approval for "apply migration"
app "recipe tracker" has entity "recipe"
app "recipe tracker" has workflow "share meal plan"
app "recipe tracker" assigns "database schema" to agent "db-subagent"
```

Those statements should not directly mutate production state. They should compile into validated
core operations:

```text
DSL statement
  -> parsed operation
  -> validation
  -> preview/diff
  -> approval policy
  -> event log
  -> composed runtime core state
```

This keeps Kortex self-updating in the useful sense: ontology, relationships, constraints, and
runtime behavior can evolve through versioned graph operations. It avoids unsafe "the program
rewrites arbitrary source code while running" behavior.

## Racket Versus Clojure Versus TypeScript

Racket:

- best fit for building a Kortex language or DSL
- strong macro and language-extension model
- good for expressing ontology operations natively
- smaller ecosystem and hiring pool
- likely fine for Kortex core operations because LLM calls and user workflows dominate latency

Clojure:

- stronger production ecosystem through the JVM
- better fit if the core becomes a high-throughput backend service
- excellent immutable data and REPL-driven development
- less directly focused than Racket on making new languages

TypeScript:

- current implementation language
- best fit for the existing React Native app, UI, tests, and integration work
- strong ecosystem for app, web, API, and tooling adapters
- not the best language for making Kortex itself feel like a programmable ontology language

Recommendation:

```text
Use TypeScript now.
Keep Kortex Core protocol-first and operation-first.
Learn/prototype Racket separately as the future language layer.
Use adapters for ecosystem gaps instead of forcing one language to do everything.
```

## Protocol-First Boundary

<protocol_first_rule>
Kortex Core should expose stable operations and event shapes that can be called from any language.
The future Racket layer should be a client/compiler for those operations, not a hidden fork of the core.
</protocol_first_rule>

Core operations should eventually be representable as data:

```text
AddNode
UpdateNodeMeaning
AddBoundaryRule
AddRelationship
PromoteTag
ForkNode
MergeNodes
ComposeCore
DefineAgentCore
SetExecutionConstraint
GrantOperation
ForbidOperation
RequireApproval
DefineAppCore
DefineAppEntity
DefineAppWorkflow
AssignSubagent
PreviewDiff
ApplyPatch
RollbackPatch
ExportCore
ImportCore
```

The exact names are not final. The important point is that operations are explicit, validated,
logged, diffable, and reversible.

Possible adapter protocols later:

- JSON-RPC
- MCP tools/resources
- local HTTP
- NDJSON event logs
- direct library calls inside the TypeScript app

Do not choose the final transport yet.

## Agent Policy As Operations

The future language layer should be able to express agent/subagent behavior as data operations, not
only natural-language prompts.

Possible compiled shapes:

```text
DefineAgentCore
  id: "db-subagent"
  parentCoreId: "project-core"
  extends: "project-agent-policy"

SetExecutionConstraint
  subject: "db-subagent"
  relation: "is not"
  object: "destructive-executor"

GrantOperation
  subject: "db-subagent"
  operation: "inspect-schema"

ForbidOperation
  subject: "db-subagent"
  operation: "apply-migration-without-approval"

RequireApproval
  subject: "db-subagent"
  operation: "data-delete"
```

This preserves the idea that Kortex can be the behavior and Ausfuehrung/execution ontology around
agents. An orchestrator or MCP adapter can later consume those operations as policy, but the current
TypeScript branch should only keep the operation-shaped design path open.

The same operation layer can later support self-building app workflows:

```text
DefineAppCore
  id: "recipe-tracker"
  intent: "track recipes, ingredients, meal plans, and sharing"

DefineAppEntity
  appCoreId: "recipe-tracker"
  entity: "MealPlan"
  is: "shareable-resource"
  isNot: "user-private-record"

DefineAppWorkflow
  appCoreId: "recipe-tracker"
  workflow: "share meal plan"

AssignSubagent
  appCoreId: "recipe-tracker"
  subject: "db-subagent"
  responsibility: "schema"
```

This keeps the app-builder idea tied to Kortex operations instead of one-off prompts.

## Adapter Strategy

Racket does not need to own every integration.

If Kortex has a stable protocol, ecosystem gaps can be handled by adapters:

- TypeScript for mobile app, graph UI, web UI, and current repo integration
- Python for heavy analytics, ML experiments, and data science tooling
- Clojure/JVM if a production backend later needs JVM ecosystem or throughput
- Racket for the language layer and core DSL experiments
- MCP server in whichever language is most practical at the time

This makes Kortex polyglot without making the core messy.

Kortex can also use adapters to sit over existing systems instead of replacing them. Read
`09_KORTEX_OVER_EXISTING_SYSTEMS.md` for the non-destructive overlay model.

## Production-Grade Meaning

Production-grade does not require choosing the fastest language first.

For Kortex, production-grade means:

- no silent ontology mutation
- durable event history
- reversible graph/ontology changes
- validated operations before apply
- backup/export compatibility
- clear protocol boundaries
- deterministic composition
- approval policy for high-impact changes
- tests around raw persisted shapes and runtime composed state

Performance still matters, but most Kortex operations are human-paced or LLM-paced. If a future
backend needs high-throughput graph work, that can be moved behind an adapter or service boundary.

## Self-Updating Program Boundary

<self_update_rule>
Self-updating means Kortex can update its ontology, relationships, constraints, and runtime behavior
through validated graph operations.
It does not mean arbitrary source code rewrites itself without review.
</self_update_rule>

Good self-update path:

```text
correction / conversation / graph edit / DSL statement
  -> proposed operation
  -> evidence and reason
  -> preview
  -> approval or confidence gate
  -> event log append
  -> recomposed runtime state
```

Dangerous path to avoid:

```text
LLM decides to rewrite source code
  -> applies hidden mutation
  -> no diff
  -> no rollback
  -> no evidence
```

The first path is Kortex. The second path is not.

## Current Implementation Implications

For this branch:

- Do not introduce Racket into the app repo now.
- Do not pause TypeScript profile composition work.
- Keep new helpers pure and operation-shaped where possible.
- Avoid names that make the core sound like only a React Native app feature.
- When designing branch/overlay composition, think ahead to serializable operations and event logs.
- Relationship and correction changes should be expressible as data operations later.

Good near-term code direction:

```text
TypeScript pure helpers
  -> stable operation shapes later
  -> Racket DSL can compile to those operations later
```

Bad near-term direction:

```text
Rewrite core in Racket now
or
hardwire Kortex operations into React components
```
