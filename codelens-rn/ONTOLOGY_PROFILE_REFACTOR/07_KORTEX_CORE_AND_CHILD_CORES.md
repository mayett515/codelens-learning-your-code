# Kortex Core And Child Cores

This document records the updated product framing behind the ontology/profile refactor.

## Core Framing

<core_framing>
Kortex Core is the actual product boundary.
CodeLens is the first serious child implementation around that core.
</core_framing>

The current repo started as a coding learning app, so the practical migration still uses names like
`learning`, `concept`, `codingProfile`, and `DomainProfile`. Those names are compatibility and
implementation seams. Conceptually, the center of the software is the reusable ontology/graph core.

```text
Kortex Core
  ontology nodes
  hierarchy
  relationships
  is / is not boundaries
  correction evidence
  maturity ladder
  branch / overlay / merge semantics
  version history
  agent/subagent execution policy
  self-building app framework semantics
  headless APIs

Child core / wrapper
  coding starting ontology
  coding labels
  coding capture/review/retrieval/promotion flows
  coding graph views
  CodeLens app UI
```

The coding product must stay strong. It is not a throwaway demo. It is the first real child of the
core and the proof that the core works in a serious domain.

## One Truth, Multiple Projections

<projection_rule>
The ontology/knowledge state is the source of truth.
Graph UI, mobile UI, CLI, MCP, API, and orchestrator integrations are projections over the same core.
</projection_rule>

The graph should not feel like a separate analytics layer. It should be an intuitive visual
expression of the ontology and knowledge state.

```text
core state
  -> graph projection
  -> app projection
  -> CLI projection
  -> MCP projection
  -> orchestrator/subagent projection
```

The graph can be the main interaction surface for some users and only an optional view for others.
That is a preference and workflow choice, not a cost-benefit feature gate.

## Overlay Existing Systems

Kortex Core can also act as an ontology/graph overlay on top of existing systems. Read
`09_KORTEX_OVER_EXISTING_SYSTEMS.md` for the adapter and sync direction.

Short version:

```text
existing system
  -> read adapter
  -> Kortex overlay graph
  -> corrections / relationships / ontology
  -> optional write adapter
```

Kortex should understand first and modify only when explicitly allowed. This is especially important
for codebases, databases, note systems, and agent/LLM workflows.

## Core Versus Child Ownership

Kortex Core should own:

- ontology node structure
- hierarchy through parent/child links
- relationship storage and evidence
- `is` and `is not` boundary semantics
- correction evidence
- tag/node maturity rules
- profile/core branching and overlays
- merge, fork, compare, and version history semantics
- headless APIs that can be used without the CodeLens app

Child cores or wrappers should own:

- starting ontology for a domain
- domain labels and wording
- domain-specific extraction and retrieval guidance
- domain-specific UI surfaces
- domain-specific graph view defaults
- domain-specific approval and automation defaults
- optional integrations such as app, CLI, or MCP tools

No core ontology, relationship, correction, branch, merge, or graph-state rule should depend on the
CodeLens coding UI. The dependency direction should be:

```text
CodeLens / coding child -> Kortex Core
```

not:

```text
Kortex Core -> CodeLens / coding child
```

## Child Cores And Subcores

<child_core_model>
A Kortex core can connect to parent cores, child cores, or peer cores through explicit endpoints.
A child core can represent a domain, project, experiment, fork, agent, or subagent.
</child_core_model>

Examples:

```text
Main Kortex Core
  -> Coding Child Core
      -> CodeLens app
  -> Research Child Core
  -> Music Child Core

Orchestrator Core
  -> Codebase Analysis Subcore
  -> Test Repair Subcore
  -> Documentation Subcore
  -> UX Review Subcore
```

Each child/subcore may have its own ontology, constraints, relationship rules, graph history, and
approval settings. Parent cores can orchestrate or inspect child cores, but child cores should not
silently mutate parent ontology state. Promotion or merge back to a parent remains explicit,
inspectable, and versioned.

This is larger than a profile overlay. A profile overlay is one implementation mechanism. A child
core can eventually be a full headless knowledge/ontology system with its own endpoint.

## Agent Execution Ontology

<agent_execution_ontology>
Kortex can describe agents and subagents with ontology, not only prompts.
Tags, subtags, `is`, `is not`, and `extends` can define an agent's identity, behavior,
Ausfuehrung/execution constraints, permissions, and approval boundaries.
</agent_execution_ontology>

This is the stronger agent/subagent idea:

- a subagent can be a child core or subcore
- its tags/subtags can define what it is allowed to do
- `is not` can define hard boundaries
- `extends` can inherit behavior from a parent policy or parent core
- allowed/forbidden tool and file scopes can be represented as ontology-backed constraints
- approval requirements can be represented as relationship or policy nodes
- corrections from the agent's work can flow back as evidence, not automatic parent mutation

Example:

```text
project core
  -> agent policy core
      -> db subagent core
      -> ui subagent core
      -> test repair subagent core
```

Example policy shape:

```text
db-subagent
  is schema-worker
  extends project-agent-policy
  works with database-core
  allowed propose-migration
  allowed inspect-schema
  is not destructive-executor
  forbidden apply-migration-without-approval
  requires approval for data-delete

ui-subagent
  is frontend-worker
  extends project-agent-policy
  works with ui-core
  allowed edit-components
  allowed inspect-design-system
  is not database-mutator
  forbidden migration-edit
  requires approval for dependency-install
```

The important distinction: an agent should not only receive a text prompt. It should receive a
structured operating space from Kortex:

```text
agent identity
  -> ontology scope
  -> allowed source/context
  -> allowed operations
  -> forbidden operations
  -> approval gates
  -> evidence and correction feedback
```

This makes Kortex a possible coherence and safety layer for orchestrators. The orchestrator can
spawn subagents whose behavior is constrained by child-core ontology instead of relying only on
natural-language instructions.

Do not implement this in the current branch. Preserve it as a future architecture direction for
agent orchestration, MCP tools, codebase overlays, and any later self-building-app workflow.

## Self-Building App Framework Direction

<self_building_app_framework>
Kortex can become the ontology and coherence framework behind self-building apps.
The product idea is not only "generate code"; it is "build and evolve an app from a structured,
inspectable, correctable project ontology."
</self_building_app_framework>

In this direction, a user describes the app they want. Kortex creates or proposes a project core
that captures the app's domain, screens, data model, workflows, constraints, and architecture
boundaries. Agents/subagents then work inside that ontology.

Example flow:

```text
user intent
  -> project app core
      -> domain ontology
      -> entities and relationships
      -> workflows / use cases
      -> screens and interaction concepts
      -> data model concepts
      -> architecture boundaries
      -> agent/subagent execution policy
  -> db subagent core
  -> api subagent core
  -> ui subagent core
  -> test subagent core
  -> generated / modified app
  -> user correction
  -> ontology update / patch suggestion
  -> affected subagents receive updated constraints
```

The key product difference from a normal AI app builder:

```text
normal app builder
  prompt -> generated code

Kortex-backed app builder
  intent -> app ontology -> constrained agents -> generated code -> corrections feed ontology
```

The app's ontology becomes the shared truth that keeps generation coherent across subagents:

- the DB subagent works from the same domain entities as the UI subagent
- the API subagent sees the same workflows and relationship rules
- the test subagent knows the intended boundaries and invariants
- user corrections update the project ontology instead of becoming one-off prompt patches
- future changes are checked against what the app is and what it is not

Example correction:

```text
"Meal plans should not be tied to one user. They are shareable."

Kortex effect:
  MealPlan is shareable-resource
  MealPlan is not user-owned-private-record
  db subagent receives schema constraint update
  api subagent receives authorization/workflow update
  ui subagent receives sharing-flow update
```

This is a possible product wedge, but it should not hijack the current branch. For now, preserve the
architecture path:

- child cores can represent app projects
- subagents can be child/subcores with execution constraints
- relationship semantics should support app-domain `is` and `is not` boundaries
- future operations should be serializable and diffable
- generated app changes should be inspectable and reversible

Do not implement an app builder, code generator, orchestrator, or runtime permission system in this
branch unless explicitly requested.

## Language Layer

The long-term system may also have a Kortex language layer or DSL. That is separate from the
current TypeScript implementation work.

Read `08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md` for the Racket/DSL/adapters direction.

Short version:

```text
TypeScript now
  practical current app and core seams

Protocol-first core operations
  stable, validated, event-like data shapes

Future language layer
  possibly Racket
  compiles Kortex statements into core operations
```

Do not rewrite the current app in Racket now. Do design core operations so a Racket DSL, CLI, MCP
server, or other adapter can call them later.

## Relationship Semantics Direction

The current implementation still has profile-owned relationship type ids such as:

```text
prerequisite
related
contrast
```

The newer product direction is more general:

```text
is
is not
dynamic relationship labels
profile-owned relationship semantics
user-created relationship labels
LLM-suggested relationship labels with evidence
```

`is` and `is not` are boundary anchors. They define what a node is and what it should not be
confused with.

Other relationship labels should not become globally hardcoded. A coding child may use
`prerequisite`; another domain may use `foundation`, `unlocks`, `extends`, `differs from`,
`inspired by`, or another label. These labels should be profile/core-owned and can emerge from
conversation, visual graph editing, correction evidence, or explicit user intent.

`contrast` may become unnecessary when `is not` boundaries and sibling context are strong enough.
Keep the current compatibility shape until a deliberate relationship-semantics slice replaces it.

## Hierarchy, Siblings, And Maturity

Hierarchy is explicit:

```text
child.parentId = parent.id
```

Siblings are normally inferred:

```text
A and B are siblings when A.parentId == B.parentId
```

Do not store sibling edges by default. A sibling can later gain explicit relationships when there is
evidence or user intent.

Ontology nodes mature over time:

```text
raw signal -> subtag -> tag -> core tag -> ontology node
```

As a node matures:

- more evidence supports it
- fewer corrections are needed
- `is` and `is not` boundaries become clearer
- relationships to nearby nodes become better understood
- sibling relationships may become explicit only when useful

## Relationship Creation Paths

Relationships can be created through multiple surfaces, but they should feed one core structure.

```text
AI/correction path
  a model mistake, correction, or suggestion creates evidence for a relationship

conversation path
  the user describes a difference, extension, prerequisite, or boundary in chat

visual path
  the user selects nodes in the graph and draws or applies a relationship
```

All paths should attach a `why` or evidence trail when possible.

Background relationship discovery should be event-driven, not a constant scanner.

Good triggers:

- conceptualizing a chat
- importing external notes
- merging notes
- forking notes
- promoting a tag/node
- applying a correction
- changing a core/overlay relationship rule

## Versioning And Safety

<versioning_rule>
Risky ontology and graph changes should be inspectable, diffable, and reversible.
</versioning_rule>

Long-term Kortex needs version control semantics for ontology and graph state:

- history
- compare
- rollback
- branch/worktree-like experiments
- merge review
- selected promotion from child core to parent core

This matters for both human work and agent/subagent work. A user should be able to try a new graph
shape, run analysis against it, inspect the result, and roll back or merge selected changes.

## Approval And Trust

Approval behavior is a setting, not one hardcoded rule.

Possible axes:

- ontology changes
- relationship changes
- node maturity promotions
- child-to-parent merge suggestions
- correction-derived boundary rules

Each can support modes such as:

```text
always ask
suggest only
auto-apply above confidence threshold
```

Even when automation is enabled, low-confidence or high-impact changes should still be surfaced for
review.

## Implementation Implications

For the current branch:

- Keep the coding app working.
- Keep using `DomainProfile`, `codingProfile`, and current compatibility names where needed.
- Treat those names as migration seams, not the final conceptual boundary.
- Do not rush persistence, UI, or MCP work.
- Before relationship-semantics implementation, reconcile current `prerequisite`/`related`/`contrast`
  compatibility with the newer `is`/`is not` plus dynamic-label direction.
- The next bounded code slice can still be internal-only profile/core composition helpers, but it
  should be designed as a step toward child cores, not only theme-like profiles.
