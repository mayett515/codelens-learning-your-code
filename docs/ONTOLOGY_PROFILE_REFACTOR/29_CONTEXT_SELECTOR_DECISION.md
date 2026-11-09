# Kordex Context Selector Decision

**Status:** Locked decision on 2026-05-15 after human/model review. First pure implementation slice is implemented.
**Branch:** `refactor/ontology-profile`

## Why This Decision Exists

Doc 28 created the shared `ContextPack` shape:

```text
the briefing packet a model/checker/review surface receives
```

That still leaves one important question:

```text
Who decides what goes into that packet?
```

If every caller assembles context differently, Kordex gets hidden drift:

```text
Conceptualize includes correction evidence.
Proposal review includes proposal events.
Graph chat includes graph neighbors.
Checker runs include whatever the current worker remembered to add.
```

That would make the `ContextPack` contract look shared while the real behavior stays fragmented.

If the core owns one giant selector that switches on every consumer, it becomes a GodSelector:

```text
selectContextFor(task)
  if conceptualize...
  if proposalReview...
  if checker...
  if graph...
  if agent...
```

That would pull app-specific persistence, graph, UI, and product workflows into the core.

Kordex needs a middle path:

```text
shared selector contract
focused task-specific selector implementations
read-only inputs
pure handoff into ContextPack assembly
```

## Core Decision

Kordex should have one shared `ContextSelector` contract, but not one universal selector implementation.

The shared contract says:

```text
Given a task/focal object and already available read-only candidates,
choose the pinned and elastic context items that should feed ContextPack assembly.
```

Focused implementations handle product-specific needs:

```text
ConceptualizeContextSelector
ProposalReviewContextSelector
CheckerContextSelector
GraphSelectionContextSelector
RepeatedMistakeContextSelector
BackfillContextSelector
AgentTaskContextSelector
```

The first implementation adds only the contract plus one focused Conceptualize selector, because Conceptualize is already the first correction doorway.

## Layer Boundary

Kordex core owns:

- `ContextSelector` contract
- `ContextSelection` output shape
- pinned/elastic semantics
- deterministic cap/truncation rules
- invariant checks that selected items can become a valid `ContextPack`
- no label-only ontology targets
- no mutation authority

The host app owns:

- concrete repositories
- graph query adapters
- retrieval adapters
- UI caller state
- task-specific candidate loading
- task-specific selector implementations when they need app-specific ports

The selector contract may live near context assembly. Concrete selectors may live near the caller or inside an application/context boundary, depending on whether they need host ports.

Important boundary:

```text
Core selector contract may depend on read-only interfaces.
It must not import concrete DB, React UI, LLM clients, mutation/apply services, or prompt renderers.
```

## Selector Versus Assembler

The selector and assembler are separate.

Selector:

```text
available candidates + focal task
-> ContextSelection
```

Assembler:

```text
ContextSelection + composition stamp + scope legend + policy
-> ContextPack
```

The selector decides priority and inclusion. The assembler enforces the shared packet shape and invariants.

The selector must not return a natural-language prompt.

## Pinned And Elastic

The first selector contract should use two buckets:

```text
pinned
elastic
```

Pinned means:

```text
This item must survive caps because losing it would make the answer unsafe or incoherent.
```

Elastic means:

```text
This item is useful context, included in deterministic priority order until caps are reached.
```

Why not three buckets now:

```text
essential / supporting / peripheral
```

Those labels sound more precise than they are. For the first implementation, binary pinned/elastic is enough and easier to test. Later ranking layers can add scores or sub-reasons without changing the core contract.

## Conceptualize Example

When the user conceptualizes a night-photography note:

```text
"Long exposure city skyline, tripod, blue hour."
```

The selector should pin:

- the focal draft/card
- the active profile and branch stamp
- the current proposed node/type
- the user-corrected node/type when present
- same-label sibling nodes when labels are ambiguous
- direct correction evidence needed to explain this decision
- policy/trust facts that decide whether Kordex may only suggest or may auto-apply later

It may include elastic context such as:

- similar recent correction evidence
- nearby pending proposals
- recent proposal decisions
- examples and borderline examples for relevant ontology nodes
- graph neighbors supplied by the caller

Direct correction evidence is intentionally narrower than "any evidence for any selected node."
For Conceptualize, evidence bypasses evidence caps only when it is cross-scope, explicitly pinned by the caller,
or references the pinned decision center: focal refs, explicit required refs, caller-pinned ontology nodes, and
same-label ambiguity nodes that were pinned for correctness. Evidence that only references an elastic context
node stays elastic and can be capped. This keeps the selector from turning broad historical evidence for nearby
context nodes into unbounded prompt context.

It must not include:

- all old captures
- all graph neighbors
- unrelated branches
- raw DB rows
- model chain-of-thought
- prompt text
- mutation authority

## Read-Only Ports

Selectors can later use read-only ports such as:

```ts
interface ContextCandidateReader {
  listRelevantEvidence(input: EvidenceCandidateQuery): Promise<readonly EvidenceCandidate[]>;
  listRelevantProposals(input: ProposalCandidateQuery): Promise<readonly ProposalCandidate[]>;
  listRecentProposalEvents(input: ProposalEventCandidateQuery): Promise<readonly ProposalEventCandidate[]>;
}
```

But the first slice should not add concrete DB readers unless the implementation is explicitly scoped to that.

Allowed first slice:

```text
caller supplies ordered candidate arrays
selector classifies them into pinned/elastic selection
assembler builds ContextPack
```

Deferred:

```text
DB-backed candidate loading
retrieval ranking
graph traversal
semantic similarity
user-fit reranking
cache strategy
prompt rendering
LLM calls
checker runtime
apply/mutation
```

## Selection Trace

The selector output should include a small trace so Kordex can explain why context was present or missing:

```ts
interface ContextSelectionTraceEntry {
  candidateId: string;
  section: 'ontology' | 'evidence' | 'proposals' | 'proposalEvents' | 'graph';
  bucket: 'pinned' | 'elastic' | 'omitted';
  reason:
    | 'focal'
    | 'directReference'
    | 'sameLabelAmbiguity'
    | 'crossScopeEvidence'
    | 'policyRequired'
    | 'recent'
    | 'callerPriority'
    | 'cap'
    | 'callerExcluded';
}
```

This trace is not a prompt renderer. It is debug/explainability metadata.

## Required Invariants

The selector contract must preserve these rules:

1. Actionable ontology targets use scoped node refs, not labels.
2. Pinned items are never dropped by caps.
3. Same-label ambiguity nodes required by doc 26 are pinned or selected together.
4. Cross-scope evidence needed for base/core mutation policy is pinned.
5. Direct evidence for the pinned decision center can be pinned; evidence for merely elastic context nodes stays capped.
6. Selection is deterministic for identical inputs.
7. Selector output is read-only and mutation-free.
8. Selector output can feed the existing `ContextPack` builder without caller-specific packet formats.
9. Selector trace records omissions caused by caps or caller exclusion.

## Rejected Alternatives

### One GodSelector In Core

Rejected.

Reason: it would centralize every product workflow in one module and eventually import DB, graph, checker, UI, and agent concerns into the core.

### Every Caller Builds Its Own Shape

Rejected.

Reason: it would recreate the same drift the shared `ContextPack` is meant to prevent.

### Host-Only Contract

Rejected.

Reason: Kordex needs a reusable core context ABI. Host apps can own adapters and concrete selector implementations, but the selection contract belongs to the core.

### Selector Owns Retrieval And Ranking Immediately

Rejected for the first slice.

Reason: retrieval, graph traversal, and user-fit ranking are real systems. Adding them now would make the selector impossible to review. They should later feed ordered candidates into the same contract.

## Relationship To Existing Decisions

- **Doc 21:** context assembly is part of checker/proposal/review/apply architecture.
- **Doc 24:** proposal apply must revalidate before mutation; selector output can later provide revalidation context but cannot apply.
- **Doc 25:** proposal events are future input for user-fit and context selection.
- **Doc 26:** scoped meaning and same-label ambiguity must survive selection.
- **Doc 28:** selector feeds the shared `ContextPack` builder and validator.

## Model Review Outcome

Human/model review resolved the main dispute:

1. A shared selector contract is correct.
2. One universal selector implementation is not correct.
3. Task-specific selectors should implement the shared contract.
4. The first implementation should be one focused selector, not a broad selector framework.
5. Read-only ports are the right architecture boundary.
6. Pinned/elastic buckets are enough for the first implementation.

Opus gave the strongest reconciliation: contract in core, implementations focused and host/consumer-specific. Gemini was useful but leaned more toward concrete host selectors. Mimo and Qwen first-round answers were useful; their follow-up drifted into tool-call text and was ignored according to the HR rule recorded in `C:\pi-stuff`.

## First Implementation Slice

Implemented source:

```text
src/features/ontology/contextSelector.ts
src/features/ontology/__tests__/contextSelector.test.ts
src/__tests__/stage10-architecture-guards.test.ts
src/features/ontology/index.ts
```

Implemented:

1. Add `ContextSelector` / `ContextSelection` types near `contextAssembly.ts`.
2. Add pinned/elastic candidate helpers.
3. Add one deterministic `createConceptualizeContextSelector()` that accepts caller-supplied ordered candidates.
4. Add tests for pinned survival, cap omissions, same-label sibling inclusion, cross-scope evidence inclusion, decision-center evidence pinning, elastic-node evidence capping, deterministic output, and no mutation.
5. Add guard coverage proving selector code does not import DB, UI, LLM, retrieval, graph engine, prompt rendering, or apply/mutation services.

This first implementation should not change runtime behavior until a caller is deliberately wired to use it.

Verification after implementation:

```text
TypeScript clean
targeted context selector/assembly/guard tests: 95/95 passed across 3 files
full suite: 812/812 passed across 85 files
```

## Deferred Decisions

- DB-backed candidate readers.
- Retrieval ranking and semantic candidate lookup.
- User-fit reranking from proposal events.
- Graph neighborhood provider.
- Context cache keys and invalidation.
- Context selector persistence or snapshot storage.
- Prompt rendering.
- Checker runtime wiring.
- Proposal revalidation integration.
- Base/core version targeting.
- Agent/app-builder selector policies.
