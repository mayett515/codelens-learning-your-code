# Kortex Over Existing Systems

This document records the overlay direction for Kortex Core.

## Core Idea

<overlay_framing>
Kortex can sit over existing systems as an ontology/graph understanding layer.
It does not need to replace the underlying system.
</overlay_framing>

Kortex should be able to understand and organize an existing system without owning that system's
source of truth.

Examples:

```text
Kortex over Obsidian / Notion / Roam
Kortex over a codebase
Kortex over an LLM conversation system
Kortex over a database
Kortex over a project management tool
Kortex over a learning platform
```

The existing system remains useful as-is. Kortex adds ontology, relationships, graph views,
corrections, and structured context on top.

## Non-Destructive By Default

<non_destructive_rule>
Kortex understands first.
It does not modify the underlying system unless explicitly asked and approved by the user or policy.
</non_destructive_rule>

Default behavior:

```text
read existing system
  -> build or update Kortex overlay
  -> surface graph/context/corrections
  -> suggest changes
  -> wait for approval before writing back
```

This matters because Kortex may be pointed at high-value systems: repositories, databases, project
tools, or long-running knowledge bases. The overlay must be safe to try.

## Adapter Model

An overlay needs adapters.

Read adapters:

- file watchers
- static analysis
- API clients
- database schema readers
- note importers
- MCP resources/tools
- event streams

Write adapters:

- code edits
- note edits
- database migrations or metadata writes
- project-management updates
- generated docs
- MCP tool calls

Sync layer:

- tracks source-system identities
- maps external entities to Kortex nodes
- detects drift
- records evidence and timestamps
- handles deleted/renamed/moved source entities
- separates source truth from Kortex interpretation

The adapter boundary should make source ownership explicit:

```text
External system owns source data.
Kortex owns interpretation, ontology, relationships, corrections, and overlay history.
Write-back is optional and controlled.
```

## Overlay State

Kortex overlay state should track:

- source system id
- source entity id/path/key
- source entity version or timestamp
- Kortex node id
- extraction evidence
- confidence
- correction history
- relationship evidence
- whether a Kortex change has been written back or remains overlay-only

This should eventually support:

- overlay-only changes
- write-back proposals
- accepted write-back
- rejected write-back
- drift detection after external changes
- re-sync after merges/forks

Do not implement this persistence now. This is a future architecture direction.

## Kortex Over Codebases

<codebase_overlay>
Kortex over a codebase may be one of the highest-leverage child-core use cases.
Most coding agents see code as text. Kortex should see a codebase as structured knowledge.
</codebase_overlay>

Possible codebase mapping:

```text
repository
  -> root node / child core

folders / modules
  -> ontology or graph nodes

files
  -> nodes with source paths

functions / classes / components
  -> nodes under files/modules

imports / calls / dependencies
  -> relationships

architecture rules
  -> is / is not boundaries

patterns and conventions
  -> emergent ontology nodes

comments / docs / tests
  -> evidence for meaning and boundaries
```

Examples:

```text
UI component is not business logic
route file is not workflow owner
repository adapter depends on port
test fixture supports migration boundary
module A imports module B
component X renders primitive Y
```

The user can correct the overlay:

```text
"No, this is not a service, it is a controller."
"This file belongs to the graph feature, not learning."
"This dependency is allowed only through the public barrel."
```

Those corrections become evidence and can improve future codebase understanding.

## Agent And MCP Use Case

Kortex over a codebase becomes especially powerful when exposed to coding agents through MCP or
another protocol.

Instead of giving an LLM only raw files, Kortex can provide:

- relevant source files
- architectural role of each file
- allowed dependency directions
- known boundaries
- related concepts
- prior corrections
- project-specific ontology nodes
- graph context for why a change matters

This lets an agent work with the codebase's intent, not only its text.

Example:

```text
Claude Code / Codex / another agent
  asks Kortex MCP:
    "What owns promotion clustering?"
    "What should not import extractor prompt code?"
    "What changed in this branch overlay?"
    "Which nodes are affected if this file moves?"
```

Kortex answers from the overlay graph and source evidence.

The same overlay can also become an execution policy source for agents and subagents. In that mode,
Kortex does more than provide context. It can answer what an agent is, what it is not, what it
extends, what it may read, what it may write, what tools it may call, and what requires approval.

Example:

```text
orchestrator asks Kortex:
  "Spawn a db subagent for this project."

Kortex returns:
  identity: db-subagent
  is: schema-worker
  extends: project-agent-policy
  worksWith: database-core
  allowed: inspect schema, propose migration
  forbidden: apply migration without approval, delete data
  isNot: destructive executor, UI owner
  approvalRequired: migration apply, data delete
```

This should be represented as ontology-backed policy, not only prompt text. Tags/subtags can define
behavior, `is not` can define hard boundaries, and `extends` can inherit constraints from a parent
core or shared agent policy.

## Kortex Over Self-Building Apps

Kortex can also sit under or around a self-building app framework. In that use case, Kortex is the
project ontology and coherence layer that an app-building orchestrator and its subagents use while
they generate or modify code.

Possible mapping:

```text
app idea / user intent
  -> Kortex project app core

domain entities
  -> ontology nodes

screens / workflows
  -> nodes and relationships

database schema / API routes / UI components
  -> child cores or source-backed nodes

DB / API / UI / test workers
  -> subagent cores with execution policy

user corrections
  -> evidence and patch suggestions
```

The differentiator is coherence over time. A generated app should not be a one-shot prompt result.
It should have a visible, correctable project ontology. When the user changes the ontology, the
affected subagents and source-backed nodes can be identified before code changes are proposed.

Example:

```text
"Invoices can belong to organizations, not only individual users."

Kortex overlay:
  Invoice is organization-scoped-resource
  Invoice is not user-private-record
  affected: schema, authorization, API filters, UI account switcher, tests
```

This is future product architecture, not current implementation. Do not add an app-builder runtime,
code generation orchestration, or source write-back policy in this branch.

## Overlay Branches And Safe Experiments

Because overlays may be speculative, they should connect to the branch/version model.

Useful flow:

```text
create overlay branch
  -> analyze existing system
  -> adjust nodes / relationships / constraints
  -> run agent or analysis against the overlay
  -> inspect diff
  -> merge selected overlay changes
  -> optionally write back to the source system
```

This supports safe experiments:

- try a refactor ontology before editing code
- test how an agent behaves with a new architecture interpretation
- compare sibling overlays
- rollback bad ontology changes
- keep project-specific rules out of general core unless approved

## Production Implications

Kortex-over-existing-systems means future core APIs should avoid assuming that Kortex owns every
entity.

Design implications:

- nodes may be native or external-backed
- relationships may be native or inferred from source
- corrections may apply to Kortex only or propose source-system changes
- write-back must be explicit
- sync conflicts are normal
- source adapters should be replaceable
- source identity should be stable and inspectable

## Current Branch Implications

For the current TypeScript ontology-profile refactor:

- Do not build overlay adapters yet.
- Do not add file watchers, static analysis, MCP, or source sync now.
- Keep composition helpers pure and source-agnostic.
- Avoid naming that implies all nodes are created inside CodeLens.
- Preserve a path where future nodes can point to external source entities.
- Treat CodeLens as one consumer/child, not the only possible owner of knowledge.
