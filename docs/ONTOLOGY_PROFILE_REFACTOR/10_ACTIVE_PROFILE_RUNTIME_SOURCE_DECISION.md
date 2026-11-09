# Active Profile Runtime Source Decision

Status: locked and implemented on 2026-05-07.

## Locked Decision (A2)

```text
prepareSaveCandidates now accepts an optional already-composed DomainProfile
through options.profile.

Brain mixer elsewhere:
base + project overlay + learning overlay + personal overlay = composed DomainProfile

Save/extraction:
prepareSaveCandidates receives that composed DomainProfile through options.profile
and uses it. Default behavior stays getActiveDomainProfile() with the coding profile.
```

This is A2: the service receives the finished/composed brain, not branch ingredients.

A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was
considered and explicitly rejected for this service. The composition step belongs
elsewhere; the save/extraction consumer only needs the final profile.

## Implementation

Files changed:

```text
src/features/learning/services/prepareSaveCandidates.ts
src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts
```

API:

```ts
prepareSaveCandidates(source, {
  profile?,   // optional composed DomainProfile
  signal?,
  complete?,
  preCheck?,
})
```

Behavior:

```text
const profile = options?.profile ?? getActiveDomainProfile();
buildExtractorSystemPrompt({ profile, relevantConcepts });
```

No DB, UI, persistence, global state, setters, activation input, branch storage,
correction storage, MCP/adapters, agent runtime, app-builder runtime, or DSL
runtime was added.

Tests (4 total):

1. Default behavior still uses the coding profile (ontology nodes appear in prompt).
2. Supplying a composed profile with an overlay-added ontology node causes the
   extractor prompt to include that node.
3. Supplying a composed profile does not mutate the base profile or the overlay.
4. Original mapping test for extractor output -> save modal candidate data.

## Why Save/Extraction First

The active profile matters most where classification happens.

`prepareSaveCandidates()` now does:

```ts
const profile = options?.profile ?? getActiveDomainProfile();
const prompt = buildExtractorSystemPrompt({
  profile,
  relevantConcepts,
});
```

This was the right first caller because:

- it directly affects ontology classification
- it is service-level, not UI-level
- it can be tested with an overlay-added ontology node
- it does not require persistence
- it does not require global active-profile state
- it does not require branch storage
- it does not require correction/checker storage

The save/extraction service should not know how branches are mixed. It only needs the final runtime profile.

## Why Not Persistence Next

Branch/overlay persistence would force decisions that are not settled yet:

- branch table shape
- active branch selection
- merge state
- correction evidence target layer
- compare mode source identity
- export/import format for branches

Those should not be locked until at least one runtime caller proves what it needs.

## Why Not UI Next

UI activation would imply a selected runtime branch/profile.

That would introduce unresolved questions:

- where active selection lives
- whether it is session-only or durable
- whether personal corrections are always on
- whether project and learning overlays can both be active
- what the user sees when overlays conflict

The service seam now exists. The next step is deciding where/when the brain mixer is called.

## Why Not Agent/Subagent Or App Builder Runtime Next

Agent/subagent execution ontology and self-building apps are real future directions, but they are not this or the next slice.

They need the same foundation:

- explicit profile input
- no hidden state
- inspectable policy
- no automatic mutation
- clear source/layer identity

The first runtime source for save/extraction proves that foundation without implementing orchestration.

## Open Decisions After This Slice

The A2 decision is locked and implemented. The next open decisions are bigger-architecture questions:

1. Where/when the brain mixer is called - who composes the runtime profile and passes it?
2. Branch/overlay persistence - storage format, merge semantics, selection.
3. Correction/checker persistence - evidence storage, patch suggestions.
4. Agent/subagent execution ontology brief - how Kortex wraps agents.
5. Self-building-app framework brief - how Kortex supplies project ontology.

## Compatibility Boundaries

Do not rename:

- `LearningConcept.conceptType`
- `ConceptHint.proposedConceptType`
- `concept_type`
- `proposed_concept_type`
- `learning`
- `concept`

Do not introduce:

- DB/schema/migration code
- AsyncStorage
- Zustand/store/global mutable active profile
- setter functions
- automatic profile mutation
- branch persistence
- correction persistence
- UI activation selector
- MCP/adapters
- agent/subagent runtime
- app-builder runtime
- Racket/DSL runtime

## Model Recommendation

Decision/review:

```text
Codex / GPT-5
```

TypeScript implementation worker:

```text
opencode-go/qwen3.6-plus with --thinking high
```

Doc sync worker:

```text
opencode-go/glm-5.1 with --thinking high
```

## Rejected Alternative (A1)

A1 would have passed `ActiveDomainProfileActivationInput` into
`prepareSaveCandidates`, making the save/extraction service responsible for
resolving overlays. This was rejected because composition belongs elsewhere; the
consumer only needs the final profile.

Do not describe the implementation as passing `ActiveDomainProfileActivationInput`
into `prepareSaveCandidates`. That is A1 and was explicitly rejected for this
service.
