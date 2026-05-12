# Kortex Developer Explainer

This is a software-developer-facing explanation of the Kortex idea, current architecture direction,
and where the system can go.

It is written for someone who understands software systems, codebases, agents, MCP, DSLs, and
production tradeoffs. It intentionally separates what exists now from what is future architecture.

## Short Version

Kortex is an ontology and graph core for making software, knowledge, codebases, agents, and apps
understandable as structured, correctable state.

The important idea is not "AI writes notes" or "AI generates code." The important idea is:

```text
intent / source / correction
  -> ontology
  -> graph relationships
  -> branches and overlays
  -> validated operations
  -> runtime context for apps, agents, MCP, and future DSLs
```

In normal software, a lot of meaning lives in text: prompts, comments, README files, naming
conventions, architecture intuition, and a developer's head. Kortex tries to turn that meaning into
inspectable state:

- what something is
- what it is not
- what it extends
- what depends on it
- which branch/fork/layer asserted it
- what evidence supports it
- which agent/app/tool is allowed to use or change it

## The Core Mental Model

Kortex Core is the reusable ontology/graph/versioned-reasoning system.

CodeLens, the current app, is the first serious child/wrapper around that core. The current repo
still has names like `learning`, `concept`, `codingProfile`, and `DomainProfile` because it grew
from a coding-learning app. Conceptually, those are now implementation seams around a broader core.

```text
Kortex Core
  ontology nodes
  relationships
  is / is not boundaries
  correction evidence
  profile branches
  overlays
  merge proposals
  graph projections
  headless APIs
  future operation protocol

Coding child core / CodeLens wrapper
  coding ontology
  coding prompts
  coding UI
  capture / review / retrieval / promotion flows
  coding graph view
```

The coding product should remain useful and opinionated. It is not a toy demo. It is the first
domain where Kortex proves it can model real work.

## Independent Domain Cores

The Kortex schema/engine is shared, but domain cores do not all have to descend from coding.

For example:

```text
Kortex Core mechanics
  -> Coding base core
  -> Photography base core
  -> Lisp base core
  -> Work-notes base core
```

These are siblings by default. The photography core should not inherit React hooks, components, or
runtime labels just because coding was implemented first. It should use the same Kortex mechanics
to create its own tags, subtags, families, metadata fields, relationship types, examples, and
boundaries.

A branch is different:

```text
Photography base core
  -> Night photography branch
      -> personal camera workflow overlay

Coding base core
  -> React branch
      -> TypeScript project overlay
```

When creating a new base core, an attached LLM can ask broad setup questions: what the domain is,
which families/tags matter, what gets confused, which relationships matter, and what a capture
should store. When creating a branch, it asks what differs from the parent. The user can work fully
manually, accept suggestions, or mix both.

Explicit forks and cross-domain relationships remain possible later. They should be deliberate
relationships, not accidental inheritance from the first coding implementation.

## Ontology Is More Than Tags

In Kortex, a tag is not just a label. A tag or node can have meaning, boundaries, relationships,
evidence, and maturity.

Example:

```text
React Hook
  is frontend abstraction
  is not backend service
  extends JavaScript function concept
  related to component lifecycle
  has child stale closure risk
  has child dependency array behavior
```

The important part is the negative side:

```text
Stale Closure Risk
  is bug pattern
  is not state management library
  is not React Hook itself
```

The "is not" edge is not decorative. It prevents the system from overgeneralizing. Without negative
boundaries, any dynamic ontology becomes vague and unsafe.

## Branches, Forks, And Overlays

The locked branch decision is:

```text
Persist branch layers separately.
Do not persist composed runtime profiles as source of truth.
Overlays are the durable source.
Runtime composition is derived.
Merging upward requires approval.
Sibling branches do not affect each other automatically.
Parent profiles stay clean.
```

Think of it like Git, but for ontology meaning:

```text
Coding base profile
  -> React branch
      -> React Native project overlay
      -> personal correction overlay

Coding base profile
  -> Python backend branch
      -> FastAPI project overlay
```

The runtime system can compose:

```text
base coding profile
  + React branch overlay
  + project overlay
  + personal overlay
  -> composed runtime DomainProfile
```

But the composed profile is not the durable source of truth. The durable source is the separate
branch/overlay layers.

That matters because if a user learns something in a project branch, the system knows where the
knowledge came from.

Example:

```text
Personal overlay learns:
  "useEffect double fetch" is often an idempotency problem.

It stays personal/project-local first.

Later:
  promote upward?
    -> create merge proposal
    -> user accepts / edits / rejects / postpones
    -> only then React branch or coding base changes
```

## React Fork Example

A practical developer workflow could look like this:

```text
Kortex Core
  -> Coding child core
      -> React branch
          -> React Native project branch
              -> personal overlay
```

The React branch owns React-specific ontology:

```text
Component
Hook
Effect
State
Props
Context
Reducer
Memoization
Stale Closure Risk
Render Loop
Hydration Boundary
Server Component
Client Component
```

The React Native project branch owns project-specific concepts:

```text
Navigation root
Expo runtime
Offline queue
Capture review flow
Graph feature module
Profile overlay seam
```

The personal overlay owns the user's corrections:

```text
"This is not a hook problem; it is a persistence boundary problem."
"This project calls it promotion, not publishing."
"This module is graph UI, not learning."
```

When the developer captures a note or asks the AI about the codebase, Kortex classifies against the
composed runtime profile. If the classification is wrong, the correction is stored as evidence,
not as an automatic mutation of the parent ontology.

## Correction Evidence And Merge Proposals

Kortex should separate facts from decisions.

```text
User correction
  -> correction evidence
  -> no automatic ontology mutation

Many evidence records
  -> patch / merge suggestion
  -> user approval
  -> durable ontology/profile change
```

First correction evidence is intentionally narrow:

```text
OntologyCorrectionEvidence
  id: string
  profileId: string
  subjectKind: 'capture' | 'item'
  subjectId: string
  field: 'typeNodeId'
  previousTypeNodeId: string | null
  correctedTypeNodeId: string
  reason?: string | null
  source: 'user'
  createdAt: number
```

Later, when branch persistence exists, evidence can grow branch/layer references:

```text
branchId
targetLayerId
```

But those fields should not be guessed before the branch persistence model exists.

## Kortex Over A Codebase

One of the highest leverage use cases is Kortex as an overlay over an existing codebase.

Most AI coding tools see code as text. Kortex should see a codebase as structured knowledge:

```text
repo
  -> modules
  -> files
  -> functions/classes/components
  -> imports/calls/dependencies
  -> architecture boundaries
  -> conventions
  -> tests/docs/comments as evidence
```

Example codebase ontology:

```text
ReviewScreen
  is React Native screen
  is not domain service
  uses ReviewProfile labels
  depends on review feature state

prepareSaveCandidates
  is extraction service
  is not profile coordinator
  accepts composed DomainProfile
  must not receive branch activation input

runtimeProfileCoordinator
  is brain mixer
  is above services
  is not global active-profile store
  is not persistence layer
```

This is not only documentation. It becomes queryable and correctable.

Developer correction:

```text
"No, this file is not a service. It is a coordinator."
```

Kortex effect:

```text
record correction evidence
update project overlay after approval
future agents receive corrected architecture context
```

## Kortex As An MCP Server In Production

Kortex can expose this codebase understanding through MCP.

The codebase stays the source of truth for source code. Kortex owns interpretation, relationships,
corrections, and graph history.

Possible MCP resources:

```text
kortex://project/current-core
kortex://codebase/modules
kortex://codebase/file/{path}
kortex://ontology/node/{id}
kortex://relationships/affected-by/{nodeId}
kortex://architecture/boundaries
kortex://corrections/recent
```

Possible MCP tools:

```text
get_node_context(nodeId)
find_architecture_owner(query)
explain_file_role(path)
list_allowed_dependencies(path)
record_correction(subjectId, correctedTypeNodeId, reason)
propose_patch_from_evidence(evidenceIds)
preview_merge(branchId, targetProfileId)
```

During production work, a coding agent could ask:

```text
"What owns profile composition?"
"Which files are allowed to know about activation input?"
"What should never import DB schema?"
"If I change prepareSaveCandidates, which ontology boundaries are affected?"
```

Kortex answers from graph state and evidence, not only from a prompt.

The production rule should be non-destructive:

```text
read codebase
  -> build/update overlay
  -> provide MCP context
  -> record corrections
  -> propose changes
  -> write back only after explicit approval/policy
```

## Agentic Workflow: Subcores And Reliable Handoffs

The agent/subagent idea is that each agent can be represented as a child core or subcore.

```text
Project core
  -> DB subagent core
  -> API subagent core
  -> UI subagent core
  -> Test subagent core
```

Each subagent core has ontology-backed execution policy:

```text
db-subagent
  is schema-worker
  extends project-agent-policy
  works with database-core
  allowed inspect-schema
  allowed propose-migration
  is not destructive-executor
  forbidden apply-migration-without-approval
  requires approval for data-delete
```

The useful next step is not only "give each agent a prompt." The useful step is to make the
handoff between agents a typed relationship with provenance.

Example: one subagent produces one relationship as its output.

```text
DB subagent output:
  Relationship:
    MealPlan is shareable-resource

  Evidence:
    user said "meal plans should be shareable"
    schema review found userId hard dependency

  Proposed effect:
    API authorization must support shared access
```

The API subagent can depend on that relationship:

```text
API subagent input:
  dependsOnRelationship: MealPlan is shareable-resource

API subagent output:
  Relationship:
    shareMealPlan endpoint requires organization-or-invite access
```

The UI subagent can then depend on the API relationship:

```text
UI subagent input:
  dependsOnRelationship: shareMealPlan endpoint requires organization-or-invite access

UI subagent output:
  Relationship:
    MealPlan screen has sharing invite flow
```

This creates a graph of agent work:

```text
domain relationship
  -> DB responsibility
  -> API responsibility
  -> UI responsibility
  -> test responsibility
```

To make the agents reliably dependent on each other, each handoff needs:

- a relationship id
- source core id
- target core id
- evidence ids
- version
- approval state
- consumed-by list
- invalidation rule when the source relationship changes

Conceptual shape:

```text
CoreRelationshipOutput
  id: string
  sourceCoreId: string
  targetCoreId: string
  relation: string
  subjectNodeId: string
  objectNodeId: string
  evidenceIds: string[]
  version: number
  approvalState: 'draft' | 'approved' | 'rejected'
  consumedBy: string[]
```

Now the orchestrator can reason:

```text
If MealPlan is no longer shareable-resource:
  invalidate API sharing output
  invalidate UI sharing flow output
  invalidate tests based on sharing flow
  ask affected subagents for updated proposals
```

That is the core agentic advantage: Kortex makes subagent outputs graph-addressable, inspectable,
and invalidatable.

## Self-Building Apps

Kortex can become the ontology/coherence framework behind self-building apps.

Normal AI app builder:

```text
prompt
  -> generated code
```

Kortex-backed app builder:

```text
user intent
  -> project app core
  -> domain ontology
  -> screens / workflows / schema / API / tests as graph nodes
  -> constrained subagents
  -> generated or modified code
  -> user corrections become evidence
  -> patch suggestions update ontology
  -> future generations use the updated graph
```

Example:

```text
User:
  Build a recipe app with meal plans and sharing.

Kortex creates:
  Recipe is content item
  Ingredient is inventory item
  MealPlan is schedule
  MealPlan is shareable-resource
  MealPlan is not user-private-record

Subagents:
  DB subagent designs schema around shareable meal plans.
  API subagent designs invite/access endpoints.
  UI subagent designs sharing screens.
  Test subagent writes behavior tests for shared access.
```

If the user later says:

```text
"Actually meal plans are private by default, but can be shared explicitly."
```

Kortex does not treat that as a one-off prompt patch. It becomes:

```text
MealPlan is private-by-default
MealPlan can become shareable-resource via explicit invite
MealPlan is not public-resource
affected: schema, API authorization, UI sharing controls, tests
```

The app understands itself because its domain model, workflows, source modules, tests, and agent
responsibilities are connected in one graph.

## AI Inside An Existing App

The same idea works inside a normal production app.

Instead of an in-app AI assistant only having a system prompt, it can have a Kortex project core:

```text
app features
  -> ontology nodes

screens
  -> UI nodes

API endpoints
  -> capability nodes

database tables
  -> data model nodes

user permissions
  -> boundary rules

analytics events
  -> evidence

support tickets / user corrections
  -> correction evidence
```

Then in-app AI can answer:

```text
"What does this screen do?"
"Why is this action disabled?"
"Which data does this workflow touch?"
"What can I safely change?"
"Which features are affected if organizations become multi-tenant?"
```

More importantly, it can avoid wrong actions:

```text
Billing export
  is finance-sensitive
  is not casual automation target
  requires approval for bulk export
  forbidden for non-admin user
```

That gives the app a self-model without allowing hidden source-code mutation.

## Future Racket / Kortex DSL

Kortex may eventually have a language layer.

TypeScript remains the current implementation path because the current app is React Native and the
existing code lives here. Racket is interesting later because it is strong for building languages.

The future DSL should compile to validated Kortex operations.

Example DSL-like statements:

```text
node "Stale Closure Risk" is "React Bug Pattern"
node "Stale Closure Risk" is not "State Management Library"
node "React Native Project Overlay" extends "React Branch"

agent "db-subagent" is "schema-worker"
agent "db-subagent" is not "destructive-executor"
agent "db-subagent" requires approval for "apply migration"

app "Recipe Tracker" has entity "MealPlan"
entity "MealPlan" is "private-by-default"
entity "MealPlan" can become "shareable-resource" via "invite"
```

Compiled path:

```text
DSL statement
  -> parsed operation
  -> validation
  -> preview/diff
  -> approval policy
  -> event log
  -> recomposed runtime state
```

This is the good meaning of "self-updating":

```text
Kortex updates ontology, graph relationships, constraints, and runtime context
through validated, diffable, reversible operations.
```

It does not mean:

```text
LLM silently rewrites arbitrary source code with no diff, approval, or rollback.
```

## Game Engine Approach

The game-engine idea in `C:\Projects\gameengine` maps well to Kortex, but it should now be understood
through the newer Kortex Core framing.

The game engine should separate deterministic simulation from semantic ontology.

```text
Deterministic game engine
  physics
  collisions
  resources
  combat resolution
  state updates
  event log

Kortex game core / game profile
  material states
  density states
  energy types
  ability operations
  targeting rules
  status effects
  costs
  requirements
  is / is not boundaries
```

A player-created ability is not just a script. It is an ontology-backed contract.

Example:

```text
Shadow Blade
  is cursed-energy construct
  is cutting ability
  is shadow-dependent
  is not soul-cutting
  is not spatial-cutting
  requires ambient shadow
  cannot bypass armor unless piercing rule exists
```

Runtime:

```text
player action
  -> load ability ontology
  -> load target physical state
  -> check requirements
  -> check is-not boundaries
  -> resolve conflicts
  -> run deterministic physics/combat math
  -> emit event
  -> create review question if ambiguous
```

The LLM helps during character creation and rule explanation. It should not decide every combat
tick. The durable game ontology is approved and validated, then the engine resolves it
deterministically.

This gives a game engine a way to support expressive powers without becoming arbitrary:

```text
player imagination
  -> ontology negotiation
  -> approved ability sheet
  -> deterministic simulation
  -> correction / balance evidence
  -> patch suggestions
```

## Current Implementation Status

Currently implemented in this repo:

- profile labels and graph/review/learning labels moved into profile-owned structures
- `composeDomainProfile(base, overlays)`
- `ProfileOverlay`
- active profile source helpers
- grouped activation input helpers
- `prepareSaveCandidates(options.profile?: DomainProfile)` receives a composed profile
- `runtimeProfileCoordinator.ts` as the explicit above-services brain mixer
- correction evidence domain groundwork and validation
- branch/selection/base-profile/correction/proposal persistence storage seams
- decision docs for runtime source, coordinator, correction evidence, branch/overlay persistence, adaptive suggestions, and proposal storage

Not implemented yet:

- branch selection UI
- proposal review UI and apply/merge service
- checker runtime
- MCP server
- source adapters
- agent/subagent runtime
- self-building app runtime
- Racket DSL
- game engine

The next practical engineering question is where the first correction/proposal review surface belongs
before DB persistence. The current recommendation is yes: define the branch model in TypeScript
without touching migrations first.

## Why This Is Interesting To A Software Developer

Kortex is a way to make software systems carry their own structured intent.

It can be used as:

- a coding ontology layer
- a codebase-understanding MCP server
- a graph memory for agents
- a branchable knowledge core
- a coherence layer for self-building apps
- a future DSL target
- a semantic layer for dynamic systems like game engines

The key engineering constraints are what make it serious:

- no silent ontology mutation
- parent branches stay clean
- runtime state is derived from durable layers
- corrections become evidence before patches
- merges require approval
- codebase overlays are non-destructive by default
- future agents receive structured policy, not only prompt text
- future DSL statements compile to validated operations

That is the product thesis:

```text
Kortex is not another notes app or prompt wrapper.
It is a branchable ontology runtime for making knowledge, code, apps, and agents coherent over time.
```
