# Checker, Proposal Review, Context Assembly, And Apply Decision

Status: locked docs-only decision on 2026-05-12.

This document records the architecture decision for how Conceptualize corrections, checker output, proposal review, graph-chat analysis, context assembly, apply semantics, and undo/reversal fit together.

No source code, tests, UI, DB schema, checker runtime, apply service, event store, graph selection chat, or agent/app-builder runtime is implemented by this document.

## Why This Exists

The previous locked decisions created the storage and policy pieces:

- Correction evidence is factual and does not mutate profiles by itself.
- Profile change proposals are stored separately and do not apply themselves.
- Conceptualize is the first correction surface before final save.
- Adaptive behavior is allowed, but risk and scope decide how much user review is needed.

The missing architecture was the end-to-end loop:

```text
Conceptualize / checker / graph chat / user question
-> explanation and evidence
-> proposal when a durable change is useful
-> review
-> typed operation apply
-> audit events
-> future context and undo/reversal
```

This document locks that loop.

## Core Decision

Kortex should use one coherent checker/proposal/review/apply architecture across all correction surfaces.

Conceptualize, checker runs, graph-selection chat, repeated-mistake review, old-card backfill, and future agent/app-builder flows should not create separate mutation paths. They should all produce explanations, evidence, or proposals. Durable state changes happen only through typed, validated operations after review/trust policy and revalidation.

## Checker Output Kinds

Checker output has three different meanings. They must stay separate.

```text
Explanation
  Read-only understanding.

Evidence
  Durable record of facts, corrections, mistakes, patterns, and user reasoning.

Proposal
  Reviewable change that may later become a typed operation.
```

Examples:

- Conceptualize why/why-not text is explanation.
- A user correction is evidence.
- A repeated mistake pattern is evidence and may create a proposal.
- A graph cleanup request can produce an explanation plus proposals.
- Old-card backfill should be proposals, not automatic rewrites.
- Accepted cleanup flows through apply; the proposal does not mutate state by itself.

Rules:

- Explanations never mutate state.
- Evidence records what happened and why it matters.
- Proposals recommend a change and preserve the basis for that recommendation.
- Applying a proposal is a later explicit operation.

## Checker Run Modes

The checker can run in several modes, but all modes feed the same explanation/evidence/proposal architecture.

Inline during Conceptualize:

- Runs before final save.
- Explains the proposed classification.
- Accepts user correction.
- Stores mistake-understanding evidence.
- May create a branch-local ontology proposal when the user creates or corrects a tag/subtag/relationship.

Event-based:

- Runs after important events such as correction recorded, tag/subtag creation, proposal accepted/rejected/edited, relationship changes, branch overlay changes, or enough similar evidence accumulating.
- Can create or refresh proposals.
- Must not silently apply profile changes.

Scheduled or idle:

- Periodically reviews recent correction evidence, repeated mistake patterns, stale proposals, old cards that may match newly created tags/subtags, and wrong or incomplete relationship clusters.
- Should be allowed to create proposal queue items.
- Applying those proposals still follows review/trust/risk policy.

On-demand:

- Runs when the user asks from Conceptualize, graph selection chat, review queue, or a normal chat surface.
- Example questions: "why did you store this here?", "why do you keep doing this wrong?", "analyze this graph area", "suggest cleanup".

## Graph Selection Chat

Graph selection chat is a surface over the same checker/proposal engine.

A selected graph subarea can become checker input:

- selected nodes
- selected edges
- local graph neighborhood
- current branch/profile context
- relevant correction/proposal history

It can:

- explain the selected graph
- answer why/why-not questions
- identify likely wrong relationships or missing relationship types
- propose structured changes
- route proposals to normal review/apply

It cannot:

- silently mutate graph/profile state
- bypass proposal review
- invent a separate graph-only proposal path

## Proposal Review And Lifecycle

All proposal kinds should use one shared review flow.

Product language may still say:

- patch suggestion
- merge proposal
- relationship cleanup
- backfill suggestion
- ontology change proposal

But review semantics should be shared.

Review actions:

- accept
- edit
- reject
- postpone

Edited proposals should preserve history by superseding the original proposal. They should not rewrite the original silently.

Proposal state has two dimensions:

```text
Review status
  What the user did.

Freshness / validity
  Whether the proposal still applies to the current graph/profile/card state.
```

Review status values:

- pending
- accepted
- rejected
- postponed
- superseded

Freshness or validity states:

- valid
- stale / needs refresh
- conflicted
- obsolete / invalidated
- partially applied
- superseded

Important rule: an ignored proposal can become stale, obsolete, conflicted, or superseded as Kortex evolves. Proposal review must revalidate the proposal before showing or applying it.

## Proposal Basis And Freshness

Every proposal needs enough basis metadata to explain and revalidate itself later.

Required basis/snapshot metadata should include:

- target profile or branch id
- target profile or branch revision, version, or `updatedAt`
- involved node ids
- involved card/item ids
- involved relationship ids or relationship types
- evidence ids
- proposal fingerprint or patch hash
- created timestamp
- checker/ruleset/prompt version later
- context-pack snapshot id later

Before a proposal is reviewed or applied, Kortex checks:

- does the target still exist?
- did the involved cards/nodes/edges change?
- did another proposal already apply the same idea?
- does the patch still apply cleanly?
- does it conflict with newer boundary rules?
- is it now obsolete because the graph/profile learned a better shape?

Possible revalidation outcomes:

- still valid
- stale but refreshable
- partially applied
- obsolete
- conflicted
- superseded

## Context Assembly Layer

Kortex needs a context assembly layer. It should build object-specific context packs instead of loading "everything".

Context packs are needed for:

- Conceptualize
- proposal review
- checker runs
- graph selection chat
- repeated-mistake introspection
- old-card backfill
- future agent/app-builder flows

Context packs should be:

- branch-scoped
- layered
- relevance-ranked
- revalidatable
- explainable
- bounded by token/byte budgets

Pack layers:

- focal object
- exact linked entities
- active branch/profile state
- local graph neighbors
- correction/proposal/event history
- semantic candidates
- contradiction/conflict evidence
- summaries and samples for large affected sets
- drill-down handles for raw data

Relevance signals:

- exact ids
- graph locality
- active branch/profile
- recent events
- evidence freshness
- correction/proposal overlap
- decision history
- semantic similarity
- contradiction/conflict
- risk/blast radius
- structural centrality
- user-fit history
- model uncertainty
- graph uncertainty

Hard rules:

- Active branch/profile is a first-class filter.
- Cross-branch evidence leakage must be gated explicitly.
- Contradictions must not be summarized away.
- Summaries are lossy; keep drill-down paths.
- Prefer structured aggregates, examples, borderline examples, and contradiction examples over vague summaries.
- Semantic similarity helps retrieve context, but it must not decide alone.
- User-fit history can rerank context, but it should not create an echo chamber.
- Context packs need provenance, pack identity, and a state cursor.
- Snapshot context versus live context must be explicit.
- Token/byte budgets and truncation policy must be stable.
- Graph expansion through hub nodes must be capped.
- Cached context packs should key by focal id, ruleset version, graph cursor, branch/profile, and consumer.
- Kortex should log why important context was included or dropped.

## Event And Audit Trail

Events are functional data, not only analytics.

Kortex should keep meaningful knowledge-operation events such as:

- correction recorded
- card conceptualized
- tag/subtag created
- boundary added or changed
- relationship edge accepted or changed
- relationship type accepted or changed
- proposal created
- proposal accepted/rejected/edited/postponed/superseded/stale
- branch overlay changed
- old card reclassified or backfill applied
- why/why-not feedback
- user reasoning added

Events support:

- context assembly
- proposal freshness
- user-fit confidence
- undo/review
- explanations
- repeated-mistake introspection

Future implementation still needs sub-decisions for:

- event schema and versioning
- event storage and indexing
- projections/snapshots/materialized views
- event granularity
- compaction, pruning, or archive strategy for local-first mobile storage

## Apply Model

An accepted proposal is not a raw `ProfilePatch` write.

The apply flow is:

```text
user accepts proposal
-> revalidate proposal/context
-> compile to typed Kortex operation(s)
-> apply operation(s) to the target
-> store audit events
-> mark proposal accepted/applied
```

Typed operations are the Kortex mutation ABI.

Examples:

- add ontology node
- update ontology node boundary
- add relationship edge
- create relationship type
- reclassify card
- merge branch patch
- update branch overlay
- create new base profile version

Definitions:

```text
Proposal
  Context-bound recommendation.

Operation(s)
  Typed, validated, atomic mutations against a target revision.

Effect
  Persisted state change plus audit events.
```

Rules:

- Branch operations and base/core operations should be distinct shapes.
- Operation granularity should be specific, not generic `MutateThing`.
- Composite changes become operation batches.
- Operations need idempotency keys.
- Operations target stable ids plus expected revision, not display names.
- Apply should not do LLM work. If LLM reasoning is needed, the proposal was too vague.
- Apply revalidates context, conflicts, invariants, permission, and scope.
- Failed apply should mark the proposal stale/conflicted/invalidated/apply-failed with a reason.
- Each applied operation emits an event with proposal id, operation type, target id, pre/post revision, actor, branch/profile, context-pack snapshot id, timestamp, and structured diff.

Typed operations are also the right future boundary for a Kortex DSL, agent runtime, app-builder runtime, or external adapter.

## Atomic Apply And Bulk Jobs

Proposal apply is atomic by default.

For one normal proposal:

- all operations commit together, or none commit
- the proposal state transition and audit events are part of the same write transaction
- idempotency records are part of the transaction

Do not include these inside the write transaction:

- LLM calls
- network or IPC side effects
- downstream checker jobs
- cross-branch propagation
- UI notifications

Use a transactional outbox or queued follow-up jobs after commit for revalidation, checker reruns, notifications, or larger downstream work.

Large backfill/reclassification work is different:

- represent it as a bulk job
- split it into smaller atomic chunks
- let the user approve the bulk job once
- process chunks safely in the background
- if one chunk fails, already committed chunks remain
- the failed chunk pauses or marks conflict
- the user gets a failure reason plus refresh/resume path

This avoids long SQLite transactions and UI freezes while keeping each chunk reversible and auditable.

## Undo And Historical Reversal

Immediate undo and historical reversal are different.

Immediate undo:

- for recent, low-risk changes
- no meaningful dependents
- can use direct reversal

Historical reversal:

- for older or higher-impact changes
- requires dependency and blast-radius analysis
- should create a cleanup/reversal proposal
- should not be one-click silent time travel

Why historical reversal is needed:

- user understanding changes later
- wrong tag split/merge
- boundary was too aggressive
- relationship type was wrong
- branch was merged too early
- backfill/reclassification batch was wrong
- accepted AI proposal later proved wrong
- domain changed

Historical reversal flow:

```text
user selects old operation/event
-> Kortex computes dependency/blast radius
-> show impact report
-> user chooses reversal mode
-> Kortex creates reversal proposal
-> normal revalidate/apply/chunking
-> new audit events written
```

Impact report should show:

- directly affected cards/nodes/edges/rules
- child/dependent nodes
- relationship edges using the old thing
- cards changed since
- proposals that depend on it
- branches affected
- conflicts or orphaned references
- what can be cleanly reversed
- what needs user decision

Reversal modes:

- Undo: restore previous state when safe.
- Deprecation / forward correction: stop using it going forward; often better for old changes.
- Retroactive reclassification: reshape consequences without pretending history did not happen.

Avoid:

- cascading deletes without review
- deleting audit history
- reset-hard time travel
- one-click reversal for old high-impact changes
- reversal bypassing normal proposal/revalidation/apply

History remains durable:

- original operation stays
- reversal links to original
- new audit events record the reversal/cleanup

## Reviewer Input

Opus and Gemini 3.1 Pro Preview reviewer sessions reinforced these points:

- Context assembly needs branch/profile scoping, provenance, state cursor, and explicit snapshot versus live context semantics.
- Contradictions and borderline examples must survive summarization.
- Proposal basis metadata is required for freshness/revalidation.
- Apply should compile proposals into typed operations, not directly write vague patches.
- Normal proposal apply should be atomic; large backfills should be chunked bulk jobs.
- Historical undo is valuable, but older undo should be an impact-reviewed reversal proposal rather than one-click time travel.

## Explicit Non-Goals

This document does not implement:

- Conceptualize UI
- checker runtime
- proposal review UI
- graph selection chat
- context pack builder
- event store
- apply service
- undo/reversal service
- trust setting storage
- base profile versioning
- old-card backfill runtime
- agent/subagent runtime
- app-builder runtime
- Kortex DSL/runtime
- external adapters or MCP write-back

## Remaining Implementation Sub-Decisions

The architecture is locked, but implementation still needs smaller decisions:

1. Which first code slice implements Conceptualize correction: existing tag/subtag correction only, or branch-local new tag/subtag creation too?
2. Where trust settings and user-fit confidence are persisted.
3. How context packs are represented and cached.
4. Event schema, event indexes, and event compaction strategy.
5. Which proposal apply operation should be implemented first.
6. How base profile versioning works when apply targets a base/core.
7. UI shape for proposal review and graph selection chat.
8. Agent/subagent execution ontology brief.
9. Self-building-app framework brief.
