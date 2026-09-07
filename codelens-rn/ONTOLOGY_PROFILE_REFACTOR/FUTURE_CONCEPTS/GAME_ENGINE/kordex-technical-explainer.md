# Kordex: A Versioned Semantic Runtime

## What Kordex Is

Kordex is a local-first semantic runtime that combines ideas from knowledge graphs, type systems,
Git-style branching, evidence logs, policy engines, and constrained LLM orchestration.

Most AI systems repeatedly send raw text to a model and hope it reconstructs the right meaning.
Kordex turns that meaning into durable, inspectable state:

~~~text
concepts and relationships
what something is
what it explicitly is not
where that meaning is valid
what evidence supports it
how the user corrected it
which profile, branch, or version introduced it
~~~

The core idea is:

> Meaning should be structured, versioned, evidence-backed program state instead of living only in
> prompts, documentation, naming conventions, and model memory.

## Profiles And Branches

Domains use independent base profiles while sharing the same Kordex mechanics:

~~~text
Kordex Core
|- Coding profile
|  |- React project branch
|  +- Personal workflow branch
|- Photography profile
|  |- Night photography branch
|  +- Personal camera workflow branch
+- Game-world profile
   |- Campaign rules branch
   |- Character ability branch
   +- Balance experiment branch
~~~

Branches are overlays over meaning, similar to Git branches for semantic rules. Kordex stores bases
and overlays separately and derives the active runtime profile when needed. It does not persist the
composed result as canonical truth because that would erase provenance.

Different profiles may reuse identifiers without sharing meaning. Composition can be a coding
concept and a photography concept, so references remain profile-scoped rather than globally unique.

## Evidence And Safe Adaptation

When a model misunderstands something, Kordex stores the correction as evidence instead of silently
rewriting its ontology:

~~~text
model classified X
user corrected it to Y
profile P and branches A + B were active
correction happened at time T
~~~

User-fit signals are derived from this history rather than stored as unexplained learned scores.
Branch-local preferences therefore remain local.

A checker can analyze repeated corrections, but it can only create proposals:

~~~text
bounded facts
-> deterministic ContextPack
-> LLM or checker
-> strict structured output
-> schema and reference validation
-> pending proposal
-> user review
-> freshness and version validation
-> atomic apply
-> audit event
~~~

The LLM is an untrusted semantic coprocessor. Kordex owns identifiers, scope, targets, risk,
versioning, persistence, and mutation. Invalid or stale output fails closed.

That is the technical beauty: the system remains dynamic without making probabilistic model output
the source of truth.

## What Already Exists

The CodeLens implementation already has the main ontology/profile spine:

- coding and photography base profiles;
- branch overlays and project-scoped selections;
- derived runtime profile composition;
- correction evidence and bounded user-fit projections;
- pending change proposals and append-only audit events;
- guarded branch-local and versioned base/core apply paths;
- proposal review, editing, freshness, replacement, superseding, and target switching;
- a manual checker with bounded context, strict validation, and proposal-only writes.

The following applications build on that spine. The game runtime, source adapters, agent
orchestration, self-building app runtime, and DSL are future directions rather than shipped features.

## Application 1: A Dynamic Game Engine

The game-engine idea separates semantic rules from deterministic simulation.

~~~text
Deterministic engine
  physics, collisions, resources
  damage and effects
  state transitions
  replayable event log

Kordex game profile
  material and energy states
  ability operations
  targeting rules
  requirements and costs
  positive meaning
  negative boundaries
~~~

A player might say:

> My character converts heat gradients into invisible pressure blades, but rain destabilizes the
> technique.

Kordex translates that into a reviewed semantic contract:

~~~text
Ability: Pressure Blade

is:
  compressed-air construct
  thermal-energy conversion
  physical cutting attack

is not:
  fire generation
  telekinesis
  soul damage
  spatial cutting

requires:
  usable atmospheric pressure
  sufficient thermal gradient

failure conditions:
  vacuum
  heavy rain
  pressure-sealed area

costs:
  body temperature
  energy proportional to pressure delta
~~~

The model does not improvise every combat result:

~~~text
player action
-> load approved ability contract
-> load target physical and semantic state
-> check requirements and negative boundaries
-> resolve defenses and conflicts
-> execute deterministic physics
-> emit replayable combat event
~~~

If Pressure Blade hits armor in heavy rain, the contract says rain weakens it, the attack remains
physical, and armor applies because this is not spatial cutting. Deterministic code calculates the
remaining force against armor resistance.

Character creation becomes ontology negotiation:

~~~text
player describes character
-> model proposes structured ability
-> system asks boundary questions
-> player approves the meaning
-> proposal enters a character branch
-> deterministic simulation uses it
~~~

World rules live in the base profile, campaign mechanics in campaign branches, character abilities
in character branches, and experimental balance changes in temporary branches. Ambiguous
interactions become evidence. The checker may propose a missing rule, but a designer approves it.

Specialized bounded workers could include an ability designer, physics translator, balance critic,
edge-case attacker, and lore-consistency checker. None may directly mutate combat or world state.

The idea is not that AI invents random powers. Player imagination is compiled into reviewed,
branchable, versioned semantic contracts that deterministic simulation executes consistently.

## Application 2: A Semantic Control Plane Over Codebases

Most coding agents see a repository as files. Kordex could model its architecture and intent:

~~~text
source files
database tables
API routes
UI components
tests
requirements
architectural decisions
known regressions
~~~

For example:

~~~text
Feature: Account sharing

depends on:
  ownership schema
  authorization middleware
  sharing API
  account-switching UI
  integration tests

must not:
  expose private records
  bypass tenant boundaries
  couple UI directly to persistence
~~~

Kordex could answer:

- What breaks if this schema changes?
- Which files implement this requirement?
- Which decisions constrain this module?
- Does this patch reintroduce an old regression?
- Which tests should change with this feature?

Read adapters could inspect Git, schemas, documentation, issues, and tools. Write-back stays explicit:

~~~text
source observation
-> ontology or evidence
-> proposed operation
-> impact analysis and diff
-> approval
-> adapter writes to the source system
~~~

This gives a codebase durable architectural memory instead of making every agent rediscover intent.

## Application 3: An Operating System For AI-Agent Teams

Kordex could define agent identity, context, permissions, and approval gates:

~~~text
Agent: Database architect

is:
  schema designer
  migration reviewer

may:
  inspect schema
  propose migrations
  identify integrity risks

must not:
  edit production UI
  deploy automatically
  approve its own migration
  access unrelated secrets

requires approval for:
  destructive migrations
  external writes
  production execution
~~~

Each worker receives a bounded task payload instead of the entire repository:

~~~text
project state
-> deterministic context selector
-> specialist agent
-> strict structured output
-> validator
-> evidence or proposed operation
-> review and apply
~~~

Spark, Qwen, Gemini, Claude, a local model, or another worker can be exchanged behind the same
contract. Product, database, API, UI, and test agents hand off typed artifacts while Kordex preserves
their shared interpretation of the feature.

Context compression is allowed, but it must be a deterministic, testable selector decision rather
than arbitrary prompt trimming.

## Application 4: Self-Building, Correctable Applications

A user might request:

> Build a meal-planning app where families share plans, but private health notes remain visible
> only to their owner.

Kordex turns that into a project ontology:

~~~text
entities:
  user, household, meal plan, recipe, health note

relationships:
  household shares meal plans
  user owns private health notes

invariants:
  health notes never inherit household visibility
  only authorized members edit shared plans
  deletion preserves required audit history
~~~

Specialized agents implement the app against that shared contract:

~~~text
user intent
-> project ontology
-> database, API, UI, and test agents
-> proposed source changes
-> validation against invariants
-> review and application
-> running application
-> corrections become new evidence
~~~

Unlike one-shot code generation, the application retains a machine-readable account of what it is
supposed to be. A later requirement change can identify affected schema, API, UI, and test nodes
before proposing code changes.

A future Kordex DSL might express intent like this:

~~~text
add entity Guest
relate Guest views MealPlan
deny Guest edits MealPlan
require authorization test for Guest
~~~

The DSL would compile into validated operations. Ecosystem adapters would handle TypeScript, SQL,
React Native, APIs, or other environments. It would not authorize hidden source rewrites.

## Photography And Multimodal Domains

Photography already proves the core is not secretly limited to coding. A future media worker could
inspect images without owning semantic truth:

~~~text
pixels + EXIF + edit history + caption
-> media observation adapter
-> strict observation schema
-> validator
-> Kordex-owned evidence/context mapper
-> normal classification or proposal path
~~~

It may report lighting, composition, subject, exposure, or workflow observations. It may not mint
ontology nodes or mutate profiles directly.

## The Shared Pattern

Every application uses the same loop:

~~~text
human intent or external source
-> structured ontology
-> positive and negative boundaries
-> branchable, versioned meaning
-> bounded model or worker reasoning
-> validated proposal
-> human or policy approval
-> deterministic execution
-> evidence from the result
~~~

Kordex can therefore become:

- a personal knowledge and learning system;
- a semantic control plane over software and external tools;
- an operating system for constrained AI-agent teams;
- a framework for self-building, correctable applications;
- a semantic rules layer for dynamic game engines;
- a reusable core for photography and other domains.

Models help interpret intent and propose meaning. Kordex owns scope, identity, evidence, versioning,
validation, approval, and durable change.
