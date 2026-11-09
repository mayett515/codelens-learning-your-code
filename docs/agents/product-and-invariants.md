# Product meaning and invariants

These are intended constraints for changes, not a claim that every existing
path already enforces them. Known deviations live in the [baseline](baseline.md).

## Product direction

Kordex preserves meaning across interactions: what something is, how it relates
to other things, why it was classified that way and how a person corrected it.
The durable core should support multiple applications and domain profiles.
CodeLens/RN is existing implementation material. The user has explicitly asked
to set it aside when defining Kordex's target: neither preserving that product
nor using its shell is required. Start from the cross-application capabilities.

Use-case directions retained from the user's historical chats are codebase
understanding exposed to tools/MCP, durable context and proposals for agents,
domain models reused by applications, personal knowledge, and a future game
system combining semantic descriptions with deterministic mechanics. These
directions motivate inspectability and reusable boundaries. They do not establish
a shipped SDK, daemon, generic rule interpreter, automatic agent system or engine.

## Existing implementation vocabulary

The terms and constraints below describe the existing profile/proposal design.
They guide changes to that implementation; they are not an approved universal
type system for every future Kordex application. Product-wide intent and the
capability inventory start at [the capability root](../capabilities/ROOT.md).

| Concept | Meaning and boundary |
| --- | --- |
| Capture | A concrete learning record with source/context; not automatically reusable canonical knowledge |
| Concept | A promoted reusable knowledge entry; graph concepts are not ontology categories |
| OntologyNode | A semantic category in a profile; not a capture or graph-card instance |
| DomainProfile | Runtime domain vocabulary and policy; coding and photography are independent bases |
| ProfileDefinition | Persisted base definition used by versioned base apply; not every built-in is automatically materialized |
| ProfileBranch | An overlay with a parent profile and branch kind; not a second independent base |
| ProfileSelection | Base plus ordered selected branches; not a mutation target |
| Correction evidence | Append-only observation of an actual user correction, including the active selection snapshot |
| Proposal | Inert candidate change with explicit target, provenance and revision expectations |
| Proposal event | Audit of a defined lifecycle/review action; not evidence that every action changed ontology |
| ContextPack | Bounded assembled model context; not a new canonical database or authorization layer |
| User-fit projection | Derived signals from scoped history; not model training or permission to apply changes |

## Constraints to preserve

1. **Scope survives the whole use case.** Preserve base identity through UI,
   stores, services, rows, retrieval and promotion. IDs may collide across bases;
   use scoped identity when comparing across them. Do not default an explicitly
   known non-coding context to coding. Capture/concept `profileId` is base scope,
   not a claim of full branch isolation.
2. **Composition is derived.** Keep base definitions and inline branch overlays
   as sources. Do not persist the composed profile as competing truth. The
   selection path groups project, learning, then personal branches, retaining
   order within each group; the raw overlay compositor has its own priority
   contract. Preserve both contracts explicitly when changing composition.
3. **Evidence is not a command.** Store actual correction facts with their full
   selection snapshot. Proposal target selection belongs to the proposal flow;
   it must not be retroactively written into historical correction evidence.
4. **Generation cannot apply.** Conceptualize/checker/model output crosses a
   schema and deterministic validation boundary. Creating a pending proposal
   does not modify its target. Existing user capture edits and evidence writes
   are distinct from ontology evolution and retain their own transaction owner.
5. **Apply revalidates current state.** A preview is insufficient authority after
   the target changes. Validate pending status, target identity, revision and
   supported change against current state. Commit target update, conditional
   proposal transition and corresponding audit together, or roll them back.
6. **Lifecycle and freshness differ.** Current status vocabulary is `pending`,
   `accepted`, `rejected`, `postponed`, `superseded`. Freshness is separately
   derived. Do not invent `applied` as a persisted status from an old chat.
   Edits/refreshes replace and supersede through the existing lifecycle service;
   they do not silently rewrite history. Review events can record reject,
   postpone or ask-why without a semantic apply.
7. **Checker scope remains explicit.** The current checker is manually invoked,
   branch-local and proposal-only. It validates evidence references, maps only
   supported additive node/item-type candidates, dry-runs against current state
   and skips existing pending duplicates. Preserve runtime caps. Base checking,
   background checking and relationship/split/merge mutations require a separate
   intentional product change, not reinterpretation of model output.
8. **Consumers do not invent ontology policy.** UI, retrieval, graph and promotion
   consume the selected profile contract. Display filtering is insufficient proof
   that persistence and identity are correctly scoped.
9. **Descriptions are not executable constraints.** A category's boundaries or
   `isNot` prose do not implement a constraint solver. Future adapters must feed
   supported validated operations into the existing review/apply ownership.

Sources: [why this exists](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/why_this_exists.md),
[decision index](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/README.md),
[current types](../../codelens-rn/src/features/ontology/types.ts), and the
[implementation map](module-map.md). Read the decision for the affected capability;
this summary does not replace its exact schema or acceptance criteria.
