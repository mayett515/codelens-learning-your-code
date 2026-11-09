# Parent changes, child meaning and scoped references

Design note, inspected 2026-11-09 at `5493b085` (application identical to
`8192ee4`). This is decision preparation for M4, not an adopted schema or an
implementation order. Recommendations below remain proposals. The separately
authorized revision-guard correction implements an existing invariant; it does
not decide these designs.

## Conclusion

The smallest useful next model records **which parent state a child depends on**
and makes conflicts visible before using a changed composition. Whole-node
replacement can remain a valid, deliberate operation. It needs a recorded basis
and an explicit rebase decision; copying a node is not evidence that every field
was intentionally forked. Scoped identity and revision are different concerns:
`(scope, id)` answers *which entity*; a revision answers *which accepted state*.

Recommended sequence, subject to owner decisions: A1 (recorded basis for current
overrides), B1 (collision rejection with a composition backstop), then C2 (small
typed scoped edge model when the narrowing scenario is chosen). Add A3's narrow
field operations only when boundary-only changes justify them. Do not introduce
arbitrary chains or a universal operation language to fix today's flat branches.

## Intent and authority

The source requirements are [why this exists](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/why_this_exists.md),
[06: branches](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md),
[07: child cores](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md)
and [26: scoped meaning](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md).
Their intent, not a claim of complete enforcement:

1. Labels are presentation. Across scopes, identity includes scope and node ID.
   Doc 26 deliberately uses a hybrid: node IDs are unique within a composed
   runtime; cross-scope comparison uses `(scopeId, nodeId)`. Different branch
   meanings require distinct IDs; same-ID overrides remain deliberate exceptions.
2. A child specialises a parent without changing it. Promotion is an explicit,
   reviewed change to the parent, not an effect of composition.
3. Independent bases share mechanisms, not implicit inheritance or vocabulary.
4. Corrections are evidence. Model suggestions need validation, review and
   guarded application before becoming accepted state.
5. `is`, `is not` and explicit specialisation describe meaning. They do not by
   themselves enforce agent permissions, prove logical implication or implement
   a rule interpreter. `extends` must not silently mean the same as `narrows`.

Already locked: those scope/authority boundaries, derived runtime composition,
and explicit proposal lifecycle. Partially implemented: scoped helpers and
profile-owned relationship vocabulary. Open design: parent dependence/rebase,
collision policy across evolving scopes, stored scoped edges and chains.

## Source key for implementation claims

References below name the functions or declarations actually inspected. These
keys apply to the current-behaviour statements and counterexamples, not to the
proposed designs.

| Key | Source and inspected owner |
| --- | --- |
| T | [types.ts](../../codelens-rn/src/features/ontology/types.ts): `OntologyNode`, `BoundaryRule`, `DomainProfile`, `ProfileDefinition`, `ProfileOverlay`, `ProfileBranch`, `ProfileSelection`, `ProfilePatch`, `ProfileChangeProposal` |
| C | [profileComposition.ts](../../codelens-rn/src/features/ontology/profileComposition.ts): `composeDomainProfile`, `orderOverlaysForComposition`, `overlayPriority`, `mergeLabels`, `mergeGraphProfiles`, `mergeMetadataFields` |
| R | [profileBranches.ts](../../codelens-rn/src/features/ontology/profileBranches.ts): `groupProfileBranchesByKind`, `composeRuntimeDomainProfileFromBranches`; [profileActivation.ts](../../codelens-rn/src/features/ontology/profileActivation.ts): `createActiveDomainProfileSource`, `resolveActiveDomainProfile` |
| S | [profileSelection.ts](../../codelens-rn/src/features/ontology/profileSelection.ts): `resolveProfileSelection`, `resolveIds`, `composeRuntimeDomainProfileFromSelection` |
| I | [scopedMeaning.ts](../../codelens-rn/src/features/ontology/scopedMeaning.ts): `createScopedOntologyNodeReferences`, `findSameLabelScopedMeanings` |
| BA | [branchLocalProposalApply.ts](../../codelens-rn/src/features/ontology/branchLocalProposalApply.ts): `compileBranchLocalProposalApplyOperation`, `assertBranchLocalProposal`, `assertPatchAppliesToCurrentBranchProfile`, `mergePatchFieldsIntoOverlay`, `applyBranchLocalProfilePatchOperation` |
| BS | [branchLocalProposalApplyService.ts](../../codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts): `applyPendingBranchLocalProfileChangeProposal`, `BranchLocalProposalApplyServiceDependencies` |
| PA | [baseProfileProposalApply.ts](../../codelens-rn/src/features/ontology/baseProfileProposalApply.ts): `compileBaseProfileProposalApplyOperation`, `assertPatchAppliesToCurrentBaseProfile`, `applyBaseProfilePatchOperation`; [baseProfileVersioning.ts](../../codelens-rn/src/features/ontology/baseProfileVersioning.ts): `assertBaseProfileProposalTargetsCurrentVersion` |
| PS | [baseProfileProposalApplyService.ts](../../codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts): `applyPendingBaseProfileChangeProposal`, `BaseProfileProposalApplyServiceDependencies` |
| F | [profileProposalFreshness.ts](../../codelens-rn/src/features/ontology/profileProposalFreshness.ts): `evaluateProfileProposalFreshness`, `evaluateBranchFreshness`, `evaluateBaseProfileFreshness` |
| D | [profileBranch codec](../../codelens-rn/src/features/ontology/codecs/profileBranch.ts): `OntologyNodeSchema`, `ProfileBranchSchema`, `validateProfileBranch`, `profileBranchToRow`, `rowToProfileBranch`; [database schema](../../codelens-rn/src/db/schema.ts): `profileBranches`, `profileDefinitions`, `profileChangeProposals`, `conceptLinks` |
| V | [codingProfile.ts](../../codelens-rn/src/features/ontology/profiles/codingProfile.ts): `codingProfile`; [photographyProfile.ts](../../codelens-rn/src/features/ontology/profiles/photographyProfile.ts): `photographyProfile` |

## Findings verified before modelling

**F1: confirmed, with a boundary on the claim.** C replaces an overridden node
in full, including meaning, examples and boundary arrays. BA merges replacement
nodes by ID; neither T's `ProfileBranch` nor D's branch codec/table records the
parent revision from which that copy came. To retain a parent's other fields
while adding one boundary in today's language, the author supplies the whole
node. A later parent edit to that node is hidden by the old replacement. A whole
replacement may be intentional, so hiding the edit is not inherently wrong;
silently losing the distinction between intentional fork and copied baseline is
the design problem. Proposal revision fields are not a durable child basis (T,F).

**F2: collision confirmed; universal reference-retargeting claim narrowed.** C
skips a colliding `addOntologyNodes` entry, and also a colliding
`overrideOntology.nodes` entry, without returning a conflict. If the base gains
that ID later, its node wins over the previously visible branch addition.
PA validates against the current base alone. PS reads the proposal and base
definition, not branches; its dependency contract has no child lookup. This
base-apply path therefore has no descendant-collision check. BA prevents adding
an already-present ID to the current branch view; it does not prevent a later
base addition.

A lookup of the bare ID in that flattened runtime now returns the base meaning.
The stored overlay has not been deleted. A correctly resolved source-scoped
reference is not automatically rewritten. I explicitly warns that provenance
cannot be recovered from an already-composed profile. No claim is made here
that every stored capture or scoped context reference retargets.

**F3: confirmed for the inspected ontology contract, not all graph data.** Among
the two built-in profiles V, only coding includes the `narrows` relationship ID.
T and D have untyped related/contrast node ID arrays and a boundary rule's optional
bare `preferNodeId`; they have no typed ontology edge with scope on both ends.
D's `conceptLinks` does store typed learning-concept links; these are different
entities and do not supply scoped ontology relations. A relationship vocabulary
ID is not an edge instance. Doc 26 explicitly deferred persisted scoped edges.

**Known selection/chain limits confirmed.** S checks base identity, existence
and kind, but not a selected branch's parent at this inspected revision. R groups
flat branches over one base. T has `parentProfileId`, not a resolved, versioned
branch-parent chain. Reusing that string for a branch ID would not implement
recursive resolution, cycle detection or chain revision checks.

### Additional finding: proposal age is not write concurrency

At this inspected revision BA compiles `expectedBranchUpdatedAt` from the
*current branch*. BS uses that value for its conditional write. Neither compares
`proposal.targetBranchUpdatedAt` with the current branch. F can report a stale
proposal, but that is a separate readout. The
[apply hook](../../codelens-rn/src/features/ontology/hooks/useApplyProfileChangeProposal.ts),
`applyProfileChangeProposal`, delegates to BS without that check.

An isolated call to `applyBranchLocalProfileChangeProposal` with proposal snapshot
10, current branch timestamp 20 and a valid new-node patch returned `accepted`,
compiling expected timestamp 20. This is an existing invariant-5 enforcement
gap, not introduced by rule adoption. PA already rejects missing/mismatched base
proposal versions. The branch leaf's `implemented` declaration needs correction
and regression evidence; UI disabling cannot establish commit-boundary safety.

The user subsequently authorized two separate corrective slices: first reject
missing/mismatched branch snapshots using the existing freshness decision; then
allow an explicit, validated refresh of a missing-snapshot proposal via a new
replacement and supersession. Neither is claimed implemented by this note.

## 1. Small current model

Assume well-formed input nodes have unique IDs within each owning source; the
raw compositor is not itself a schema/uniqueness validator (C).

- **Node** `n = (id, label, kind, parentId, meaning, useWhen, boundaries,
  examples, relatedIds, contrastIds, status, provenance, timestamps)` (T).
- **Scope** is an owning base or branch identity for cross-source interpretation,
  not a first-class stored scope object on each node. `Ref = (scopeId, nodeId)`
  is supplied by callers; I wraps nodes with the supplied scope.
- **Base** `B = (id, version, N, vocabulary, labels, metadata, policies, graph)`
  is a `DomainProfile`. A persisted `ProfileDefinition` wraps it with source kind
  and timestamps; runtime and persistence are not synonyms (T,D).
- **Overlay** `O = (id, kind, Add, Replace, labelPatch, metadataPatch,
  graphPatch, vocabularyAdds, legacyOntologyAdds)` (T,C).
- **Branch** `b = (id, parentProfileId, kind, name, O, createdAt, updatedAt)`.
  No copied-parent revision is present (T,D).
- **Selection** `s = (baseId, ordered project IDs, ordered learning IDs,
  ordered personal IDs)`. S resolves these lists; R converts them to overlays.
- **Patch** carries overlay-like operation fields without overlay identity or
  priority. **Proposal** wraps a patch with target, provenance/evidence,
  lifecycle status, optional expected target revision and timestamps. It is not
  a command merely by existing (T,BA,PA).

For nodes, `compose(B, Os)` is a left fold over a copied ordered node array and
ID index. In each overlay, in this order (C):

```text
Add(id, n):     if id absent, append n; otherwise do nothing
Replace(id,n):  if id present, replace the entire node in its slot;
               otherwise append n
LegacyAdd:     same absent-only rule as Add, performed after Replace
```

Item/relationship type arrays are appended with first-occurrence deduplication.
Labels and specified nested graph maps merge by key; metadata replaces whole
definitions by ID and appends new IDs. Untouched policy fields, base ID and base
version pass through. The resulting base version is **not** a revision of all
the selected overlays (C).

Raw C sorts project/learning at equal priority, preserving input order, with
personal last. R/S's normal selection path first groups project, learning,
personal and preserves order within each group. These are distinct contracts.
Raw composition with no overlays returns a copied structure; R's activation
path with no overlays returns the base by reference. Neither is a deep-freeze
promise for a consumer that later mutates an object (C,R).

BA's apply validation is stricter than raw composition: additions must be new
in the current branch view and replacements must already exist. PA similarly
validates against the base. Composition is consequently not interchangeable with
validated apply (BA,PA,C).

## 2. Candidate laws, status and counterexamples

Let `semantic(view)` ignore incidental array order, timestamps and audit IDs only
where those are explicitly declared irrelevant. Do not use this equivalence to
erase real precedence or visible ordering.

| Candidate law | Current status and smallest witness | Proposed boundary |
| --- | --- | --- |
| Determinism: identical values and ordered inputs yield identical values | Satisfied by the inspected pure fold (C,R); no random/time input is read there. | Preserve both raw and grouped ordering contracts. |
| Order independence for independent effects | Only conditional. Two replacements of `x` with meanings A and B are last-wins; two additions of absent `x` are first-wins. Even disjoint additions `x,y` produce differently ordered arrays when swapped (C). | Commutation only for non-interfering read/write sets and an explicitly order-insensitive projection. Do not claim exact JSON commutativity. |
| Parent immutability: applying a branch-local change leaves the base input and stored base unchanged | Pure C/BA do not write their base inputs; BS writes branch, proposal and audit, not a base definition. This is source evidence, not real-DB rollback evidence. | Keep one branch transaction owner; separately authorize parent promotion. Do not promise immunity to later external object mutation (R). |
| Cross-scope reference stability or detected invalidation | Not established globally. Base gains `x`; branch `Add(x, child)` is suppressed; a flattened ID lookup changes meaning with no conflict (C,PA,PS). A source-scoped reference is not the same lookup (I). | Preserve entity identity; dependencies carry observed revisions. Other-scope edits must not silently retarget a reference or silently revalidate a dependent assertion. |
| Controlled propagation of parent edits | No semantic change classifier exists in C. Non-overridden nodes track current base values, while all fields of an overridden node remain replaced. A copied meaning hides a parent correction (F1). | Use the explicit flow/review/block policy below; do not call all additions monotone. |
| Detect every parent-state dependence | Fails: two identical child overlays can have been copied from different parent versions, yet have identical stored branch fields (T,D). F tracks proposal targets, not the child's parent basis. | Record dependency basis; missing legacy basis means unknown, never silently current. |
| Proposal freshness at commit boundary | Base path guards expected version (PA,PS). Branch path only guards the current timestamp captured at compilation (BA,BS); snapshot 10/current 20 is accepted as shown above. | Existing invariant, authorized fix separate from A-C. Parent-read dependencies will additionally need guards if adopted. |
| Convergence of unrelated approved changes | Conditional for disjoint keys in a content-map view. Whole-node patches changing different fields of one node are not independent writes: later replacement loses the earlier change (C,BA). Exact audit history is order-sensitive. | Two children with the same initial state, operations and resolved bases converge semantically after successful revalidation; differing local overrides may legitimately yield different views. No CRDT claim. |
| Chains preserve all preceding laws | Unsupported by R/S/T, not disproved for an implemented chain algorithm. Sorting three kinds is not traversing parent edges. | Acyclic lineage, explicit precedence and an effective dependency revision for every ancestor. |

**Define monotonicity before promising it.** It cannot mean that a new meaning
is always a semantic superset: natural-language meanings are not machine-proven
sets. A usable candidate is *preservation of accepted child decisions*: after a
parent update, each decision is retained under its checked assumptions, or made
explicitly unresolved; it is never silently replaced or certified valid.

Under the recommended conservative policy:

- Auto-flow only changes proved irrelevant to a child's recorded read set, such
  as an explicitly presentation-only field. Adding an unrelated ID can flow only
  after collision and vocabulary/dependency checks. New competing categories may
  affect classification even when their IDs differ, so a classifier can depend
  on the whole vocabulary revision.
- Meaning, kind, parent hierarchy, applicability examples and boundary changes
  require revalidation of dependent decisions. They are not automatically safe
  just because they are additions or use a different field.
- Missing/ambiguous endpoints, collisions and unsupported operations block the
  affected activation/apply. A changed but understood dependency becomes
  `needs_review`. A conservative whole-profile basis may over-invalidate; a
  narrower read set may be introduced only when it is sound for that operation.

These are proposed policies, not states currently present in T. Revision equality
detects change; it does not prove meaning equivalence or protect against changes
that failed to advance the revision.

## 3. Design options and smallest proofs

### A. How a child modifies a parent node

| Option | Law consequences and tradeoff | Existing data and compatibility | Smallest proof slice |
| --- | --- | --- | --- |
| A1: retain whole replacements, record parent basis | Smallest change; makes hidden drift detectable while preserving deliberate whole-node forks. A base revision alone over-invalidates and cannot reconstruct the copied node. | Add a versioned basis record and retain the relevant old node/state or retrievable history. Existing overrides start `unknown`; do not stamp them with today's version as if reviewed. Explicit rebase establishes a basis. Keep legacy rendering distinguishable from verified applicability. | Reproduce F1; parent edit produces review-needed state, not silently fresh composition; explicit three-way review records the new basis. Also prove old input untouched. |
| A2: field-level semantic deltas | `AddBoundary(ruleId, rule)` can retain new parent examples; `ReplaceMeaning` is deliberately different. Read sets still include meaning/hierarchy: editing one field can invalidate another's interpretation. More operation, conflict and ordering policy. | Version codecs/patch language. A full legacy node cannot be reliably converted to intent without its old parent. Preserve it as a legacy replacement until reviewed. Update backup and older-client compatibility; unknown operations fail explicitly. | Boundary-add survives a provably unrelated presentation edit; meaning edit requires review; same rule-ID conflict fails. Two truly unrelated deltas commute under declared equivalence. |
| A3: staged mix | Keep explicit whole replacement and introduce only needed deltas, initially boundary addition. Best eventual fit, with two clearly tagged operation meanings rather than guessed intent. | A1 basis first; legacy whole overrides stay whole. Opt-in conversion after review. Dispatch must distinguish operations; old clients cannot silently ignore new deltas. | A1 proof first; then one delta, one whole replacement and their documented precedence/conflict tested separately. |

**Recommendation:** A1 now if the owner chooses parent tracking, A3 when one
boundary-only use case is selected. Do not build A2's general diff engine first.
Rebase is a reviewed comparison of old parent, current parent and child intent.
Possible outcomes: adopt parent and reapply local change; deliberately keep a
fork; replace the local decision; postpone. Only a successful review records a
new basis. A parent version without old content supports detection, not a
reliable three-way explanation.

### B. IDs that collide as scopes evolve

| Option | Law consequences and tradeoff | Existing data and compatibility | Smallest proof slice |
| --- | --- | --- | --- |
| B1: reject conflicting base additions | Preserves today's flat runtime ID contract. Check all stored children of that base, not just active ones. A child can therefore constrain a parent's next ID; independent bases remain independent. | No renaming needed for safe existing rows. Scan/report existing collisions and refuse affected composition; do not silently rewrite history. Add a composition guard for sibling/import collisions too: base-apply checking alone is insufficient. | Real transaction: child owns `x`, base proposal adds different `x`; reject with target/status/audit unchanged. Concurrent child creation cannot race past the check. |
| B2: scope-qualified runtime identity | Both nodes can coexist; strongest long-term identity distinction. Changes Doc 26's current flat-view contract and many bare-ID consumers. Override-of-parent needs an explicit target separate from a new child entity. | Migrate references throughout nodes, boundaries, vocabulary, selections/context, persistence and backups. Backfill only from known source ownership; ambiguous historical flattened IDs need review. A display alias cannot be an authoritative identity. | Persist two scoped `x` nodes, restart, resolve both and a scoped relation correctly; prove old-format ambiguous import is rejected or quarantined. |
| B3: surface a conflict proposal | Lets the owner choose rename, merge/specialise or defer. Requires an unresolved composition result or a pinned old parent; cannot publish a successful flat view and merely notify afterward. | Add explicit conflict/basis representation and retain old valid state. No reference rewrite until a reviewed migration covers every affected reference. Unknown references remain unresolved. | Collision creates inert conflict; reads cannot silently return the other meaning; approved resolution changes sources and references atomically with history. |

**Recommendation:** B1 as the smallest enforcement of today's contract; a
proposal can explain a rejected change without implementing all of B3. Choose
B2 only when simultaneous same-ID scoped entities in one runtime are a concrete
requirement. Any re-ID must name which entity changes and preserve traceability;
rename the incoming addition where possible rather than silently editing a
child's established references. That resolution is still an owner choice.

### C. Typed relations between scoped nodes

| Option | Law consequences and tradeoff | Existing data and compatibility | Smallest proof slice |
| --- | --- | --- | --- |
| C1: defer stored edges | Valid minimal choice while relation queries are not required. Makes no claim that `narrows` survives a split or that cross-scope relationships exist durably. | Keep current vocabulary/arrays without interpreting them as missing typed edges. | An acceptance test/document explicitly rejects requests requiring a stored scoped relation; no fabricated edge. |
| C2: explicit scoped edge records | Candidate edge: ID, owner scope, predicate reference, from/to `(scope,id)`, observed endpoint/predicate revisions, evidence and acceptance/replacement lineage. Smallest model that can answer the split scenario. | New persistence/backup contract, typed proposals and validator/apply owner needed. Leave old related/contrast arrays as legacy hints; do not infer `narrows` from labels, `parentId` or `is not`. Backfill only edges with explicit provenance and endpoint scope. | Accept one branch-owned narrowing edge; reload; parent change marks it review-needed; split does not pick a replacement endpoint; stale review fails without partial writes. |
| C3: model relations as first-class ontology entities | Can attach the same metadata/relations to edges, but adds meta-level identity, recursion and validation questions. Unnecessary unless users need to discuss/version relations as entities themselves. | Larger graph and API migration; still needs C2's endpoint, ownership and stale rules. Generic nodes do not supply these automatically. | Prove an actual relation-about-relation use case plus all C2 endpoint checks; otherwise defer. |

**Recommendation:** C2 when the narrowing use case is approved, C1 until then.
The branch that asserts an edge owns it; editing that edge does not edit either
endpoint or assert a reciprocal fact in the parent. A profile owns its predicate
vocabulary; predicates have identity and semantics independent of display label.
Cross-base edges require an explicit later policy, never implicit inheritance.

Endpoint/predicate changes require checking recorded dependencies. Removal leaves
an inspectable unresolved/tombstoned reference; no automatic cascade deletion or
retargeting. A split offers new endpoints for review. History retains the old
edge, and acceptance replaces/supersedes it. `narrows` can mean accepted subset
intent, but free-text nodes do not prove set inclusion. `extends` can instead
mean added capabilities; choose its semantics before inferring either relation.
An `is not` boundary is a node-owned constraint with evidence, not automatically
a symmetric negative edge. A suggested preferred node is a scoped reference to
validate, not proof of logical exclusion.

### What chains require beyond A-C

A candidate lineage model needs parent references that distinguish bases from
branches, acyclicity, missing-parent handling, a deterministic root-to-leaf fold,
and a decision about single versus multiple parents. Start with a single-parent
tree if a demonstrated use case needs chains. Effective revision must include
all relevant ancestors, not just a direct parent's unchanged local timestamp.
Rebase propagates invalidation to dependent descendants; applying a leaf decision
must guard the ancestor state it read. Promotion names a target ancestor and
requires that target's validation and authority.

Composition precedence must also distinguish ancestry from simultaneous selected
siblings; a personal layer is not automatically an ancestor. Pinning, deletion,
reparenting and permissions require explicit policy. Flat project/learning/personal
kinds can serve today's single-level overlays, but cannot substitute for chains:
they describe precedence roles and encode neither ancestry nor dependence (T,R).

## 4. Three worked scenarios

These are small hypothetical inputs, not claims about a saved user's data.

### Photography meaning correction under a night branch

Before: photo v1 has node `exposure = {meaning: M1, examples: E1, boundaries: []}`.
Night stores whole replacement `{meaning: M1, examples: E1, boundaries: [Rnight]}`.
Parent v2 corrects meaning to M2 and examples to E2.

**Today:** C yields night `{M1,E1,[Rnight]}` over both parent versions. The parent
itself remains `{M2,E2,[]}`. No child basis distinguishes intentional M1 from an
unintended stale copy (T,D,C). An isolated execution using photography's first
node reproduced this: revised parent meaning was hidden; original child meaning
remained. This was a pure computation, not a running-app experiment.

**Recommended A1, then optional A3:** record basis v1 and its relevant node.
Parent v2 makes this dependent override review-needed. Do not silently combine
M2 and Rnight: Rnight was justified under M1. The owner can accept `{M2,E2,[Rnight]}`
after review and establish basis v2, or retain M1 as an explicit fork. With A3,
Rnight is an `AddBoundary` operation, but a meaning change still invalidates its
read assumptions. Only an irrelevant presentation edit may flow automatically.

### Base addition collides with a branch addition

Before: base has no `x`; night adds `x = long-exposure noise`. A base proposal
adds `x = exposure duration`, a different meaning.

**Today:** PA/PS accept the otherwise valid base addition without loading night.
C then ignores night's `Add(x,...)`; flattened lookup of `x` returns exposure
duration. The stored child addition remains long-exposure noise. An isolated
composition run observed `CHILD MEANING -> BASE MEANING` while the stored child
object retained `CHILD MEANING`. This does not demonstrate that a source-scoped
reference was changed (I).

**Recommended B1:** detect the child's occupied ID in the same protected write
boundary; reject base apply before any effect. Base, proposal and audit remain
unchanged. An explicit replacement proposal may choose a new base ID such as
`exposure-duration`; existing child references then need no rewriting. Existing
collisions found on load instead yield a visible conflict until resolved, not a
new silent winner. Real storage/concurrency proof is required before claiming B1.

### A narrowing edge whose parent node splits

Before: night node `aurora-exposure` is intended to narrow photo `exposure`.
The parent later distinguishes `sensor-exposure` and `perceived-brightness`.

**Today:** this cannot be represented as the proposed durable typed scoped
edge. Adding the `narrows` vocabulary ID alone creates no such relation (T,D,V).
There is no split operation in `ProfilePatch` (T); the supported add/replace
language could add two nodes and mark an old one deprecated, but supplies no
scoped-edge replacement lifecycle (C,PA). Bare related/contrast IDs cannot choose
which successor preserves the original narrowing assertion.

**Recommended C2 with A1 dependence:** edge e1 is owned by night and records
`(night,aurora-exposure) -> narrows -> (photo,exposure)` with checked revisions.
The parent split is an explicit future operation, not assumed implemented.
It marks e1 review-needed and retains the original endpoint/history. A reviewer
may accept e2 to `sensor-exposure`, superseding e1 after validating current
endpoints/predicate; may select multiple justified edges; or may withdraw the
assertion. A review based on pre-split revisions cannot apply. No automatic
retargeting based on label similarity or sibling position is allowed.

## 5. Owner decisions for M4

1. **Parent following:** A1 whole overrides with recorded basis now, A3 limited
   deltas later, or A2 now? A1 is smaller but requires more manual rebase; A2 adds
   substantial operation/compatibility policy. Which edits must automatically
   follow the parent, and what child behavior should remain usable while stale?
2. **Legacy basis:** block verified use until explicit rebase, or permit clearly
   marked legacy reading while blocking dependent apply? Neither may label an
   uninspected row current. Retaining old parent content costs storage but enables
   explanation and review; a version alone only detects movement.
3. **Collision authority:** B1 reject, B2 scoped runtime IDs or B3 unresolved
   proposals? B1 lets stored children constrain parent additions; B2 requires a
   broad reference migration; B3 requires retained valid views and conflict state.
   Decide whether inactive/archived descendants, if supported later, reserve IDs.
4. **Relationship scope and meaning:** defer C1 or implement C2? Who may assert
   each edge, can independent bases be linked, and does `extends` mean inclusion
   or capability inheritance? C2 costs persistence, review and vocabulary policy;
   C3 is justified only by an actual meta-relation requirement.
5. **End changes and splits:** block affected use, retain explicitly unresolved
   edges, or permit a pinned prior view? Choose review responsibility and withdrawal
   policy. None authorizes silent deletion or retargeting of historical evidence.
6. **Chains:** keep one level until a concrete need, or choose single-parent chains?
   Multiple parents additionally require merge/diamond semantics. Kind ordering
   alone cannot implement either choice.
7. **Shared lifecycle with rules:** which experiences justify a rule, which scope
   owns it, what invalidates its assumptions, and who replaces/reconsiders it?
   Use the same distinctions between identity, version, evidence and accepted
   assertion in M4. Do not assume node overrides and rule replacement must share
   one generic interpreter or Lotti's precedence policy.

## Intent, leaves and honest self-verification

No `enforces` field or new leaf schema is proposed. Keep accepted product intent
once in [ROOT](../capabilities/ROOT.md) and the owning
[meaning](../capabilities/domains/meaning.md) / [evolution](../capabilities/domains/evolution.md)
parents. Existing D1/D2 and G1/G3 already cover much of the scope/guard intent.
Do not copy undecided A-C laws into every leaf or label them enforced.

After owner decisions: write the resolved contract in its canonical decision
location, then add the matching invariant tests at the actual owner. Useful
properties are parent-input preservation, deterministic precedence, detected
collisions, dependency invalidation and stale-apply rejection. Bound generated
cases to the supported operation language; a property library is not required.
Persisted rollback/concurrency needs real database experiments, not arbitrary
objects or a callback pretending to transact.

Leaves then point to those tests through existing `evidence` and an honest
`covers`. A future `Mechanised at:` convention in a parent can name a code symbol
or test file and check its existence. That would establish a resolvable address,
not that the test proves the prose, was executed or still passes. Decide that
small tooling change separately after the laws and tests exist. No such checker,
field, app schema or new property test is added by this design note.

## Evidence and limits

Source inspection covered the owners listed above. A read-only Node diagnostic
used the installed TypeScript transpiler to load the actual pure modules and
executed F1, F2 and the branch revision counterexample. It modified no source or
persistent data. The worked split scenario remains a model exercise because its
operation/edge types do not exist in the inspected contract.

The existing app suite passed 1117/1117 tests and its compiler passed during M0b;
lint has four pre-existing errors and 213 warnings, fully recorded in the
[baseline record](../progress/2026-11-09-milestones.md). Passing existing tests
does not cover the newly found revision mismatch. The repository gate is run
after adding this note; its result is recorded in the transfer ledger.

Not verified: native UI interception, actual SQLite rollback/concurrent writes,
production built-in-profile materialization, real user datasets with collisions,
future migration feasibility on all backups, logical truth of natural-language
relations, or any of the recommended but unimplemented laws. A flat reader or
green metadata gate is not a proof of a headless Kordex lifecycle.
