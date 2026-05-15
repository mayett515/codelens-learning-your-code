# Kordex Context Assembly Decision

**Status:** Locked docs-only decision on 2026-05-15 after human/model review. Not implemented.
**Branch:** `refactor/ontology-profile`

## Why This Decision Exists

Kordex will often ask an LLM, checker, review surface, graph chat, or future agent to reason about one object or one situation.

That reasoning should not receive either of these unsafe packets:

```text
Too little:
  Category means broad kind.
  Category means branch-local sub-area.
  Good luck.

Too much:
  Here are 900 captures, every proposal event, every graph neighbor,
  every profile branch, and the whole ontology.
  Good luck.
```

Kordex needs one bounded, provenance-aware context assembly layer that answers:

```text
What exact briefing packet does this consumer need right now?
```

The packet must preserve scoped meaning from Doc 26:

```text
Photography Core:
  category = broad kind of photography

Night Photography branch:
  night_photo_subarea, label "Category" = sub-area inside night photography
```

The model must see that these are related or same-label meanings only when the pack says so explicitly. It must not infer identity from labels.

## Core Decision

Kordex should use a shared, typed `ContextPack` contract for Conceptualize, checker runs, proposal review, graph selection chat, repeated-mistake introspection, old-card backfill, future agents, and future app-builder flows.

The first implementation slice is deliberately narrow:

```text
caller-supplied ordered inputs
-> pure ContextPack builder
-> invariant validator
-> canonical deterministic JSON serializer
```

The first slice does not include:

- prompt renderer
- LLM calls
- DB reads
- UI
- retrieval/ranking engine
- semantic similarity
- token optimization
- graph query engine
- caching
- proposal apply
- checker runtime

Context assembly is a projection layer over already-resolved state. It does not own profile activation, branch resolution, retrieval, proposal apply, or mutation logic.

## Shared Contract, Task-Specific Inputs

There should be one shared ContextPack model and invariant set, not five incompatible packet formats.

Different consumers can pass different task inputs and caps:

```text
Conceptualize
  focal capture/card
  relevant ontology nodes
  recent correction evidence
  proposal snapshots near that classification (pending proposals are a likely example)

Checker run
  repeated mistake pattern
  evidence claims
  target branch/profile context
  proposal policy

Proposal review
  proposal snapshot
  basis evidence
  target layer
  freshness cursor

Graph selection chat
  selected nodes/edges
  caller-supplied local graph neighborhood
  related proposals/events

Future agent/app-builder
  task focal object
  allowed operations
  scoped ontology constraints
```

The pack builder should not fetch these inputs. The caller supplies them in already-prioritized order.

## Locked ContextPack Shape

The exact TypeScript names can still be adjusted during implementation, but the structural contract is locked.

```ts
type ScopeId = string;
type NodeId = string;

interface ScopedNodeRef {
  scopeId: ScopeId;
  nodeId: NodeId;
}

interface ContextPack {
  packId: string;
  packVersion: 'context-pack-v1';
  createdAt: number;
  consumer: ContextConsumer;

  focal: ContextFocal;
  compositionStamp: CompositionStamp;
  scopeLegend: ScopeLegend;

  ontology: OntologyContextSection;
  evidence: EvidenceContextSection;
  proposals: ProposalContextSection;
  proposalEvents: ProposalEventContextSection;

  policy: ContextPolicy;
  graph?: GraphContextSection;

  budgetReport: ContextBudgetReport;
  expandHandles: Record<string, ContextExpandHandle>;
}

type ContextConsumer =
  | 'conceptualize'
  | 'checker'
  | 'proposalReview'
  | 'graphSelectionChat'
  | 'repeatedMistakeReview'
  | 'backfill'
  | 'agent';

interface CompositionStamp {
  baseProfileId: string;
  activeProfileId: string;
  branchOrder: Array<{
    branchId: string;
    kind: 'project' | 'learning' | 'personal';
  }>;
  compositionHash: string;
}

interface ScopeLegend {
  activeScopeId: string;
  scopes: Array<{
    scopeId: string;
    label: string;
    kind: 'baseProfile' | 'branch' | 'composedProfile';
  }>;
}

interface OntologyContextSection {
  nodes: Array<{
    ref: ScopedNodeRef;
    label: string;
    meaning: string;
    useWhen: string[];
    doNotUseWhen: string[];
    examples: string[];
    relationshipRefs: Array<{
      typeNodeRef: ScopedNodeRef;
      targetNodeRef: ScopedNodeRef;
    }>;
  }>;
  sameLabelSiblings: Array<{
    label: string;
    nodeRefs: ScopedNodeRef[];
  }>;
}

interface EvidenceContextSection {
  claims: EvidenceClaim[];
  omittedCount: number;
}

interface EvidenceClaim {
  evidenceId: string;
  subjectNodeRef?: ScopedNodeRef;
  previousNodeRef?: ScopedNodeRef;
  correctedNodeRef?: ScopedNodeRef;
  reason?: string;
  patternFrequency: number;
  latestAt: number;
  crossScope: boolean;
  sourceIds: string[];
}

interface ProposalContextSection {
  snapshots: ProposalSnapshot[];
  aggregatedSignals: {
    pendingCount: number;
    highestRiskScore: number;
    branchLocalCount: number;
    baseOrCoreTargetCount: number;
  };
  omittedCount: number;
}

interface ProposalEventContextSection {
  recentDecisionSignals: ProposalEventSignal[];
  omittedCount: number;
}

interface ContextPolicy {
  trustMode: 'manual' | 'suggest' | 'autoApplyLowRisk';
  autoApplyEnabled: boolean;
  maxAutoApplyRiskScore: number;
  approvalRequiredFor: string[];
  forbiddenSilentMutations: string[];
  coreMutationRule: 'explicitUserIntentOrCrossScopeEvidenceOnly';
  opsMustUseNodeRef: true;
}

interface GraphContextSection {
  selectedNodeRefs: ScopedNodeRef[];
  neighborNodeRefs: ScopedNodeRef[];
  expansionDepth: number;
  omittedNeighborCount: number;
}

interface ContextBudgetReport {
  caps: {
    maxNodes: number;
    maxEvidenceClaims: number;
    maxProposals: number;
    maxProposalEvents: number;
    maxGraphNeighbors: number;
  };
  included: Record<string, number>;
  omitted: Record<string, number>;
  truncationLog: Array<{
    section: string;
    dropped: number;
    reason: 'cap' | 'notPinned' | 'callerExcluded';
  }>;
}
```

`ProposalSnapshot`, `ProposalEventSignal`, and `ContextExpandHandle` should be small structured snapshots, not full DB rows.

## CompositionStamp Is Mandatory

Every ContextPack must include a `compositionStamp`.

Locked fields:

```text
baseProfileId
activeProfileId
branchOrder
compositionHash
```

`branchOrder` is required even when empty.

Reason:

Kordex profile composition is an order-sensitive function of base profile plus branch layers. If branch order is omitted, the pack can no longer explain or reproduce which composed meaning the consumer saw.

Bad stamp:

```text
activeProfileId + compositionHash
```

Why bad:

The hash becomes opaque and harder to debug, and future branch ordering can force a breaking stamp migration.

Good stamp:

```text
baseProfileId + activeProfileId + branchOrder + compositionHash
```

This makes freshness checks, apply revalidation, caching, and debugging explicit.

## Renderer Decision

The first implementation slice should not include a prompt renderer.

Allowed:

```text
canonical deterministic JSON serializer
```

Not allowed in the first slice:

```text
renderContextPackToPrompt(pack)
natural-language prompt formatter
system prompt builder
model-specific context text
```

Reason:

A prompt renderer that exists will quickly become the de facto contract. Then schema work starts optimizing for prose shape instead of invariant correctness.

The authoritative surfaces in the first slice are:

```text
typed ContextPack
invariant validator
canonical serialized JSON
```

The JSON serializer is the debug and snapshot surface. It is not a prompt renderer.

Prompt rendering can come later after the pack schema has survived first real integration.

## Inclusion Policy

The first ContextPack builder should include only caller-supplied, bounded inputs.

Include:

- focal object identity and summary
- active profile/branch scope legend
- composed-profile stamp
- ontology nodes relevant to the focal object
- same-label scoped ambiguity groups
- correction evidence claims relevant to the focal object or target nodes
- `crossScope` flag on evidence
- proposal snapshots relevant to the focal object or target nodes (pending proposals are a common example)
- aggregated proposal signals
- recent proposal decision signals when caller supplies them
- structured policy and allowed/forbidden operation rules
- caller-supplied graph neighborhood when present
- deterministic budget report
- expand handles for later drill-down

## Exclusion Policy

Exclude unless a later consumer explicitly requests it:

- all raw captures/cards
- all raw correction evidence
- full proposal event history
- unrelated branches or base profiles
- full graph neighborhoods
- hub-node expansion beyond caps
- raw embeddings or vector scores
- semantic similarity internals
- prompt text
- model chain-of-thought or reviewer reasoning
- DB rows as-is
- label-only ontology targets
- automatic base/core mutation authority

## Budget And Ordering Policy

The first slice does not rank.

Caller supplies ordered inputs. The builder applies deterministic caps and records omissions.

Pinned items must survive caps:

- focal object
- active scope legend
- composition stamp
- task-named ontology nodes
- same-label sibling nodes for any included ambiguous label
- evidence claims marked `crossScope: true` when they are required to evaluate core/base mutation policy
- structured policy

Everything else is included in caller order until the section cap is reached.

No semantic ranking, token optimization, embedding lookup, recency scoring, graph scoring, or user-fit reranking belongs in this slice.

Those can be later ranking/projection layers that feed ordered inputs into the same pack contract.

## Required Invariants

The validator must reject packs that violate these rules:

1. Every actionable ontology reference uses `ScopedNodeRef`, not label text.
2. Labels are annotation/display/search text only.
3. Same-label different-node meanings included in the pack appear in `sameLabelSiblings`.
4. Evidence claims include explicit `crossScope`.
5. Policy is structured. Prose guardrails are not enough.
6. `compositionStamp` is present and non-empty.
7. `branchOrder` is present even when no branches are active.
8. The canonical serializer produces byte-identical output for identical inputs.
9. Pinned items are not dropped by caps.
10. Graph context, if present, is caller-supplied and capped.

## Relationship To Existing Decisions

- **Doc 10:** services receive composed DomainProfile, not activation input.
- **Doc 11:** profile mixing happens in a coordinator layer above services.
- **Doc 12:** evidence is factual and append-only.
- **Doc 13:** branch overlays are durable; composed runtime profiles are derived.
- **Doc 14:** branch selection and order are explicit runtime inputs.
- **Doc 18:** risk overrides trust; base/core changes require explicit approval.
- **Doc 19:** proposals are stored separately and do not apply themselves.
- **Doc 21:** context packs are required for checker/proposal/review/apply flows.
- **Doc 24:** apply is revalidated and atomic.
- **Doc 25:** proposal events are durable facts and future user-fit input.
- **Doc 26:** labels are not identity; scoped meaning must preserve provenance.
- **Doc 27:** new strategic docs should prefer Kordex naming.

## Model Review Outcome

Human/model review resolved the open questions as follows:

1. Opus, GLM, MiniMax, and Mimo converged on no prompt renderer in the first slice after focused follow-up.
2. Kimi preferred a thin debug text formatter, but that was rejected because even a non-authoritative renderer can become a second contract too early.
3. All successful reviewers agreed that `compositionStamp` is mandatory.
4. The final dispute round converged that `branchOrder` belongs in `compositionStamp` now, even if empty.
5. All successful reviewers agreed that ranking/retrieval/token optimization should stay out of the first slice.

## First Implementation Slice

A safe first implementation after this decision:

1. Add pure context pack types.
2. Add pure builder that accepts already-ordered caller input.
3. Add invariant validator.
4. Add canonical deterministic JSON serializer.
5. Add tests for scoped identity, same-label sibling inclusion, `crossScope`, `compositionStamp`, `branchOrder`, pinned items, caps, and deterministic serialization.
6. Add architecture guard that no first-slice context assembly code imports DB, LLM, UI, retrieval, or graph engine modules.

This first implementation should not change runtime behavior until a later consumer is wired to call it.

## Deferred Decisions

- Exact canonical hash algorithm and hash input subset.
- Exact `EvidenceClaim` derivation helper for `crossScope`.
- Exact proposal/event snapshot fields.
- Prompt renderer format after schema stabilization.
- ContextPack cache strategy.
- Ranking and retrieval layer that feeds ordered inputs.
- Graph neighborhood provider and hub-node cap policy.
- LLM-specific prompt shape.
- Context pack persistence or snapshot storage.
- Agent/app-builder-specific operation policy.
