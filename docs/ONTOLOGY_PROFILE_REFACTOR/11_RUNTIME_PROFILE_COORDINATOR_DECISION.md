# Runtime Profile Coordinator Decision

Status: locked decision on 2026-05-07.

## Locked Decision

The brain mixer is an explicit separate layer above runtime services.

```text
Runtime Profile Coordinator / Brain Mixer
  receives caller-owned inputs:
    base profile
    project overlays
    learning overlays
    personal overlays
  composes them into a runtime DomainProfile
  passes the composed DomainProfile to services

Services:
  receive a composed DomainProfile
  do not know branch groups
  do not call activation input resolvers
  do not read hidden global active-profile state
```

What this means concretely:

- There is an explicit Runtime Profile Coordinator layer that sits above services.
- The coordinator receives caller-owned inputs (base profile, project overlays,
  learning overlays, personal overlays) and composes them into a single
  `DomainProfile` that is passed to services.
- Services receive the composed `DomainProfile` and do not know about branch
  groups, overlay kinds, or activation input resolution.
- Services do not call activation input resolvers.
- Services do not read any hidden global active-profile state.
- The coordinator can later grow into the Kortex Runtime, but not in this
  slice. This slice locks the decision; it does not implement a coordinator
  helper module.

## What Is NOT In This Slice

This decision does not add:

- DB tables or persistence for profiles, overlays, or branches
- UI selector for active profile or overlay activation
- global `getRuntimeProfile()` or active-profile store
- persistence-owned composed profile as the current shape
- agent runtime or subagent orchestration
- app-builder runtime
- DSL runtime

## Reason

```text
1. Services stay reusable and testable.
   A service that receives a composed DomainProfile can be tested by passing
   any profile. It does not need to know overlay kinds, branch groups, or
   activation input resolution. It does what it does with the profile it
   receives.

2. UI does not scatter merge rules.
   If each UI screen mixed overlays independently, merge precedence would
   live in many places. The coordinator owns composition; screens and
   callers provide inputs.

3. Persistence can feed the coordinator later.
   The coordinator receives caller-owned inputs. When overlay persistence
   exists, it can provide overlays to the coordinator. The coordinator
   itself does not read persistence. This keeps the composition layer
   pure.

4. Agents/subagents can feed the coordinator later.
   When agent execution ontology and explicit overlay policy exist, they
   can provide overlays to the coordinator. The coordinator does not
   depend on agent runtime.

5. The layer can later grow into Kortex Runtime.
   The coordinator is a named architecture boundary. When Kortex Runtime
   needs to coordinate profiles, agents, and overlays, this boundary is
   already in place.
```

## Alternatives Rejected

```text
1. Service-owned mixing.
   Each service resolves its own overlays and composes its own profile.
   Rejected because services would know branch groups and overlay kinds,
   scatter composition logic, and become harder to test in isolation.

2. UI-screen-owned mixing.
   Each UI screen or component mixes overlays into a profile independently.
   Rejected because merge precedence rules would be duplicated across
   screens, UI components would contain composition logic, and the merge
   path would be hard to trace or change.

3. Hidden global getRuntimeProfile() / active-profile store.
   A global function or mutable store returns the "current" runtime profile.
   Rejected because hidden global state makes composition order invisible,
   makes tests non-deterministic without careful setup, hides which inputs
   produced which output, and makes it easy to accidentally read stale state.

4. Persistence-owned composed profile as the current shape.
   The active branch is persisted and the saved composed profile is treated
   as the current runtime shape.
   Rejected because persistence shape should not determine runtime behavior.
   The coordinator receives inputs and composes; persistence can feed the
   coordinator later, but persistence does not own composition.
```

## Current Implementation Relation

The following existing code already implements the composition semantics that
the coordinator will formalize:

```text
composeDomainProfile(base, overlays)
  Pure composition helper in profileComposition.ts.
  Composes project/learning/personal overlays onto a base profile.
  Does not mutate inputs.
  This is the coordinator's core composition function.

ActiveDomainProfileActivationInput
  Type in types.ts.
  Groups projectOverlays, learningOverlays, personalOverlays.
  This is the coordinator's input shape.

resolveActiveDomainProfileFromActivationInput(input)
  Convenience resolver in profileActivation.ts.
  Takes grouped inputs, normalizes overlay order (project -> learning ->
  personal), and composes them through composeDomainProfile.
  This is the coordinator's composition pipeline.

prepareSaveCandidates
  Already receives options.profile?: DomainProfile.
  Already implements the A2 pattern: service receives composed profile,
  does not know branch groups, does not call activation input resolvers.
```

The coordinator layer formalizes what already exists in composition form:

```text
Current callers provide grouped overlays to resolveActiveDomainProfileFromActivationInput
or provide a composed DomainProfile directly.
The coordinator is the explicit named boundary where this composition call
happens, so services never need to know about overlay groups or resolution.
```

## Next Code Slice Recommendation

```text
Add a tiny pure coordinator helper module as a named architecture boundary.

This would:
  - Import composeDomainProfile and resolveActiveDomainProfileFromActivationInput
  - Provide a single coordinator entry point
  - Make the composition layer explicit in module naming
  - NOT add DB, UI, persistence, global store, service hidden lookup,
    activation input in services, branch storage, correction storage,
    MCP/adapters, agent runtime, app-builder runtime, or DSL runtime

The coordinator helper is a thin wrapper that formalizes the existing
composition pipeline as a named boundary. It does not add state,
persistence, or new resolution logic.
```

## Current Implementation

The coordinator helper is now implemented and tested:

```text
src/features/ontology/runtimeProfileCoordinator.ts
  - composeRuntimeDomainProfile(input) delegates to resolveActiveDomainProfileFromActivationInput(input)
  - RuntimeProfileCoordinatorInput<TItemTypeNodeId> aliases ActiveDomainProfileActivationInput<TItemTypeNodeId>
  - Pure function, no state, no persistence, no side effects
  - The explicit above-services coordinator boundary

src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
  - 5/5 tests passed

src/__tests__/stage10-architecture-guards.test.ts
  - Architecture guard proves composeRuntimeDomainProfile, RuntimeProfileCoordinatorInput,
    and resolveActiveDomainProfileFromActivationInput are present
  - Architecture guard proves no forbidden state/persistence/runtime strings
```

Services still receive composed `DomainProfile`. They do not call this helper directly
unless their caller passes the result. No DB, UI, persistence, global store, service
hidden lookup, agent runtime, app-builder runtime, or DSL runtime was added.

## Compatibility Boundaries

Do not rename or remove:

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

Doc/guard worker:

```text
opencode-go/glm-5.1 with --thinking high
```

TypeScript helper worker:

```text
opencode-go/qwen3.6-plus with --thinking high
```