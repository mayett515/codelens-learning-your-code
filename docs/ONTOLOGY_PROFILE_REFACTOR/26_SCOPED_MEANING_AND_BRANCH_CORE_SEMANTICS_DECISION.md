# Scoped Meaning And Branch/Core Semantics Decision

**Status:** Locked decision on 2026-05-13 after human/model review. First pure guard/helper slice implemented.
**Branch:** `refactor/ontology-profile`

## Why This Decision Exists

Kortex branches can reuse words from their parent/core while meaning something narrower, local, or deliberately different.

Photography example:

```text
Photography Core
  category = broad kind of photography

Night Photography branch
  category = sub-area inside night photography
```

Both nodes can display the word `category`, but they must not become the same ontology meaning by accident.

This decision prevents a future checker, classifier, graph view, or LLM from doing the unsafe shortcut:

```text
same label = same meaning
```

That shortcut would break branch semantics, upward merge, correction learning, and parent/core immutability.

## Locked Direction

Ontology meaning is identified by stable node identity and scope, not by display labels.

```text
label = human-facing display text
node id = machine-facing ontology identity inside a composed active profile
scope/provenance = where that meaning lives and how it relates to parent/core meanings
```

When a branch uses the same label differently from the parent/core, it must mint a distinct node id and add an explicit scope relationship if the meanings are related.

Within one composed active profile, `nodeId` is the operational identity and must be unique.

Across scopes, durable references and documentation should use `(scopeId, nodeId)`:

```text
scopeId = owning profile id or branch id
nodeId = ontology node id inside the composed active profile
```

This keeps the current runtime composition model simple while making cross-core, cross-branch, export, graph, and future MCP/agent references unambiguous.

## Core Rules

### 1. Node ID Is Identity Inside A Composed Profile

Kortex must not merge, classify, apply, or resolve ontology meaning by label alone.

Allowed:

```text
target node id = urban_night
target scope id = night-photography
```

Not allowed:

```text
target label = "Urban night"
```

Labels are useful for display, search, and explanation, but they are not durable identity.

Node ids must be unique inside one composed active profile. A branch-local scoped meaning must not reuse a parent/core node id for a different meaning. It must mint a new node id.

Allowed:

```text
core:
  id: category
  label: Category

night photography branch:
  id: night_photo_subarea
  label: Category
  narrows: core/category
```

Not allowed:

```text
core:
  id: category
  label: Category

night photography branch:
  id: category
  label: Category
  meaning: sub-area inside night photography
```

Reusing a parent/core node id is only for deliberate override semantics. That behavior is not defined by this decision.

At scope boundaries, references should be qualified:

```text
(photography-core, category)
(night-photography-branch, night_photo_subarea)
```

Inside a single active composed profile, `nodeId` alone remains the runtime identity.

### 2. Same Label Can Exist In Different Scopes

Same-label nodes can coexist when their meaning differs.

Photography example:

```text
core node:
  id: category
  label: Category
  meaning: broad kind of photography

branch node:
  id: night_photo_subarea
  label: Category
  meaning: sub-area inside night photography
```

These are not duplicates. They are scoped meanings.

Same-label nodes may also be unrelated. If there is no explicit scope relationship, Kortex must treat the relationship as undeclared, not infer that the meanings are the same or that one narrows the other.

Label override and scoped meaning are different:

```text
label override
  same node id, same meaning, different display text

scoped meaning
  different node id, possibly same label, different meaning
```

The UI and prompt/context assembly should show provenance when ambiguity matters:

```text
Category (Photography Core)
Category (Night Photography branch)
```

### 3. Related Scoped Meanings Need Explicit Links

If a branch-local node is related to a parent/core node, that relationship must be explicit.

Locked relationship meanings for this decision:

```text
narrows
  Branch meaning is a narrower/specialized version of the parent meaning.

parent_of / child_of
  Normal hierarchy relationship; branch node is simply a child/subtag under a parent concept.
```

Photography examples:

```text
night_photo_subarea narrows core:category
urban_night child_of core:night_photography
```

`narrows` is not a global hardcoded ontology law. It is a recommended Kortex relationship semantic that profiles can expose through their relationship vocabulary.

`shadows` is reserved as a possible future relationship name, but this decision does not define its runtime meaning. It may later mean local reinterpretation, local hiding, or another explicit override behavior, but that needs a separate decision because it affects composition precedence and branch apply semantics.

### 4. Branch-Local Corrections Stay Branch-Local By Default

If a correction pattern only appears inside one branch, Kortex should propose a branch-local change by default.

Example:

```text
Core:
  astrophotography = celestial objects are central

Night Photography branch keeps misclassifying city-night captures as astrophotography.

User corrects:
  "No, I meant city lights, not stars."
```

Default proposal:

```text
Add/strengthen a branch-local boundary:
  astrophotography is not urban night photography when city lights are central.
```

The parent/core stays unchanged.

### 5. Parent/Core Changes Require Cross-Scope Evidence Or Explicit User Intent

Kortex may propose a parent/core change when evidence shows the parent/core meaning is wrong or incomplete.

Safe triggers:

```text
same correction direction appears across multiple branches
same correction direction appears in parent/core or personal context
user explicitly says the parent/core definition is wrong
branch-local concept repeatedly proves broadly useful and should be promoted
```

Parent/core changes must be proposals, not silent mutations.

Example:

```text
Core says:
  night_photography = dark scenes

User repeatedly corrects:
  night photography includes neon streets, blue hour cityscapes, and indoor low-light events.
```

Potential parent/core merge proposal:

```text
Expand core night_photography boundary to include bright artificial-light night scenes and blue-hour cityscape work.
```

### 6. Branch-To-Parent Promotion Is Explicit

A branch can learn a useful local concept that may belong in the parent/core.

Example:

```text
Night Photography branch:
  blue_hour_cityscape
```

If the concept proves broadly useful, Kortex can propose:

```text
Promote blue_hour_cityscape under Photography Core -> night_photography?
```

Promotion must include:

- source branch
- target parent/core
- proposed node id/label/meaning
- boundary rules
- examples
- evidence ids
- risk/blast-radius explanation

Promotion never happens automatically.

### 7. Ask Why Opens Clarification, Not Rejection

`Ask why` is not negative feedback by itself.

It opens a clarification thread.

```text
Kortex: This is astrophotography.
User: Why?
Kortex: Because the note mentions night sky and long exposure.
User: No, I meant city lights, not stars.
```

Only the follow-up determines the learning signal.

Possible outcomes:

```text
accept after explanation
  explanation helped

reject after explanation
  possible boundary misunderstanding

edit after explanation
  correction evidence

ask more questions
  explanation need or concept uncertainty

no follow-up
  no correctness signal yet
```

Kortex should be allowed to say:

```text
I may have misunderstood you. I treated this as astrophotography because of night-sky wording, but you mean urban night photography. I can adjust this item and check similar older captures.
```

That response is a projection over the clarification thread and correction evidence. The durable facts are still evidence, proposal events, and approved proposals.

## Proposal Targeting Rule

The checker should choose proposal target from evidence context, not label similarity.

Evidence must first resolve to stable node ids. Label-only evidence can be used for search/explanation, but it is not enough to target an ontology patch.

Locked rule:

```text
If evidence against a parent/core node appears only inside one branch:
  target = that profile branch
  proposal = branch-local classification/ontology patch

If evidence against a parent/core node appears across multiple branches:
  target = base profile / parent core
  proposal = parent/core ontology patch or branch merge proposal

If user explicitly asks to change the parent/core:
  target = base profile / parent core
  proposal = parent/core ontology patch

If evidence direction is inconsistent:
  no automatic proposal
  keep evidence and surface uncertainty
```

The checker may recommend a target, but the user/profile owner approves durable changes.

## Storage Direction

Store durable facts and approved structure.

Store:

- node ids
- node labels/meanings/boundaries/examples
- branch overlays
- explicit scope relationships such as `narrows`
- correction evidence with active selection context
- proposal rows
- proposal event rows

Do not store label-only ontology targets.

Derive:

- whether a correction pattern is branch-local or parent/core-level
- whether a branch assumption is wrong
- whether the parent/core has a gap
- whether a branch-local concept should be promoted
- user-fit confidence
- clarification-thread interpretation

Reason:

Derived interpretations can improve over time. The durable source should remain evidence and approved ontology structure, not early model guesses.

## Relationship To Existing Decisions

- **Doc 06:** branches specialize parent profiles; parent profiles stay clean unless a merge is approved.
- **Doc 07:** Kortex Core supports child cores, scoped relationship semantics, graph projections, and future agent/app-builder ontologies.
- **Doc 13:** branch overlays are the durable source; composed runtime profiles are derived.
- **Doc 18:** risk overrides trust; base/core changes require explicit approval.
- **Doc 19:** patch suggestions and merge proposals share the `profile_change_proposals` lifecycle.
- **Doc 20:** Conceptualize is the first correction doorway.
- **Doc 21:** checker output is explanation/evidence/proposal; context assembly must be provenance-aware.
- **Doc 24:** branch-local apply is explicit, revalidated, and atomic.
- **Doc 25:** proposal decision events are durable facts; user-fit is derived later.

## Failure Modes To Avoid

### Label-As-Identity

Bad:

```text
find node where label = "category"
```

Why bad:

Two scoped meanings can share the same label.

### Silent Parent Mutation

Bad:

```text
branch correction silently edits parent/core node
```

Why bad:

One branch would corrupt the shared core for other branches.

### Scope Relationship Omitted

Bad:

```text
branch creates "category" with no relation to core "category"
```

Why bad:

Future checker/merge/review cannot tell whether it is unrelated, narrower, or a local override.

### Ask Why Treated As Rejection

Bad:

```text
asked_why lowers semantic confidence
```

Why bad:

The user may be curious, learning, auditing, or asking for evidence.

### Branch-Local Meaning Promoted Too Early

Bad:

```text
one branch uses a term
system promotes it to parent/core automatically
```

Why bad:

Parent/core becomes polluted with local vocabulary.

### Prompt Context Without Provenance

Bad:

```text
Category: broad kind of photography
Category: night photography sub-area
```

Why bad:

The LLM sees contradictory definitions without knowing which scope owns each one.

Better:

```text
Category (Photography Core): broad kind of photography
Category (Night Photography branch): sub-area inside night photography; narrows Photography Core category
```

## First Implementation Slice

Implemented on 2026-05-13:

- `narrows` is exposed in the coding relationship vocabulary.
- Pure scoped-meaning helpers detect same-label different-id ontology meanings.
- Pure formatting helpers can render ambiguous labels with scope provenance.
- Stage10 guards protect the hybrid identity anchors and forbid label-only ontology target identifiers in proposal/apply paths.

This is intentionally a source-level safety seam. It does not add checker runtime or mutate profile data automatically.

## What This Decision Does Not Implement

This decision does not add:

- new DB tables
- new migrations
- scope relationship runtime
- checker runtime
- user-fit projection
- clarification-thread UI
- base/core apply path
- automatic branch-to-parent promotion
- graph rendering changes
- old-card backfill
- agent runtime
- app-builder runtime
- DSL runtime

## Candidate First Implementation Slice

After this locked decision, a safe first implementation slice would be:

1. Add source-level guard/tests that ontology logic does not resolve meaning by label alone.
2. Add standard scoped-relationship ids to the coding profile or Kortex relationship vocabulary:
   - `narrows`
   - reserve `shadows` as a name only; no runtime semantics yet
3. Add pure helper/tests for detecting same-label scoped ambiguity in a composed profile.
4. Add context-assembly guidance/tests proving duplicate labels are rendered with provenance.
5. Add a guard that future classifier/proposal/apply paths must not resolve ontology targets by label alone.

This should stay domain/pure-helper first. It should not add checker runtime or base/core mutation.

## Locked Review Outcomes

Model/human review resolved the open questions as follows:

1. Scoped relationships should be explicit relationship edges. Ownership/provenance comes from profile/branch/overlay membership and context assembly, not from labels.
2. `narrows` is locked. Normal hierarchy remains available through parent/child structure. `shadows` is reserved for a future decision, not implemented by this one.
3. Same-label branch nodes are allowed without an explicit relation only when the relationship is intentionally undeclared or unrelated. Kortex must not infer sameness from the label.
4. Identity is hybrid: `nodeId` inside a composed active profile; `(scopeId, nodeId)` for cross-scope references, proposals, graph/export contexts, and documentation.
5. `Ask why` is confidence-neutral by itself and maps to the proposal-event/audit direction from Doc 25. A durable clarification thread id can be decided later.
6. Future guards should prevent classifier/proposal/apply code from using label-only ontology resolution. Labels may support display, search, and explanation, not durable targeting.

## Deferred Decisions

- Exact context-assembly rendering format for duplicate labels.
- Exact graph rendering style for same-label scoped meanings.
- Runtime semantics for `shadows`.
- Historical/promotion mechanics when a branch-local node moves to parent/core.
- Whether clarification threads need first-class durable thread ids.
