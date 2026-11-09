# Engineering-rule fit interview — shared mechanism decided

2026-11-09, inspected against K1 (`9e7e0ed`; subsequent `9423a1b` is documentation
only). Fable's K1 review reports no blocking finding. The owner's standing
intent settles the architectural direction; the earlier separate-rule-record
question in this document is superseded, not waiting for another approval.

The owning product decision is in [product and invariants](../agents/product-and-invariants.md#engineering-rules-owner-direction-2026-11-09).
Rules are nodes in an independent engineering base profile and use the common
profile/proposal lifecycle. Generic engineering scheme = base; SEO and Kordex
refinements = sibling project branches. Deliberate corrections override base
nodes locally; a new sourced experience proposes a new node in its repository
branch. No separate rule record type or second acceptance mechanism.

## What the existing mechanism actually supplies

| Concern | Inspected owner and result |
| --- | --- |
| Rule-shaped content | [OntologyNode](../../packages/kordex-core/src/types.ts) already has label, meaning, useWhen, boundaries and examples. `createdBy` is an actor category, not source provenance. `rule` is not an allowed kind. |
| Source references | Proposals have `evidenceIds`; `BoundaryRule` has source/evidence only for a negative boundary. Neither is general origin on the accepted node. The [codec](../../packages/kordex-core/src/codecs/profileChangeProposal.ts) checks ID shape, not source existence or scope. |
| Experience capture | `OntologyCorrectionEvidence` currently describes a user's `typeNodeId` correction on a capture/item. A discovered stale-apply defect is not that event. Do not fabricate a classification correction; admit sourced experiences through an appropriate evidence extension within the same mechanism. |
| Add and override | [Branch apply](../../packages/kordex-core/src/branchLocalProposalApply.ts) calculates added nodes and whole-node overrides. [Composition](../../packages/kordex-core/src/profileComposition.ts) produces a branch-local view without editing the base. Whole-node replacement is not a field-level merge. |
| Staleness | [Freshness](../../packages/kordex-core/src/profileProposalFreshness.ts) compares saved/current target revision. The [app service](../../codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts) enforces it before writes. The pure apply helper alone is not that boundary. |
| Proposal replacement | [Lifecycle service](../../codelens-rn/src/features/ontology/data/profileChangeProposalLifecycleService.ts) supersedes **pending** proposals with pending replacements. It rejects accepted originals; it does not establish accepted rule-revision lineage. |
| Durable acceptance | Services/audit orchestration still live in app code; portable orchestration, evidence resolution and desktop storage are not implemented. The known mobile rollback failure stays open. |

Thus the common mechanism fits the direction, but “every step is already built”
would overstate it. Adding four fields alone would not supply accepted history,
source validation or atomic persistence.

## Executed compatibility probe

Run from the repository root:

```sh
npm --prefix packages/kordex-core run build
node docs/reviews/fixtures/rule-profile-fit.cjs
```

Both exited 0; the [probe](fixtures/rule-profile-fit.cjs) reports seven checks.
It uses an in-memory engineering base and Kordex/SEO branches. **Current
`category` kind and borrowed presentation fields are test scaffolding only**;
this is neither a registered third profile nor approval to encode rules as
categories. No production type, runtime behavior or storage was changed.

1. A pending proposal adding the stale-apply node produces an accepted candidate
   and a composed branch view. Original base/branch inputs remain unchanged.
2. A sibling SEO branch does not acquire the Kordex-only rule.
3. An explicit override of the base's optional/nullable node changes the Kordex
   view and leaves the base unchanged.
4. Snapshot 10 against branch 11 is rejected by the existing freshness decision.
5. `kind: rule` and hypothetical origin/lineage/reconsideration fields are rejected
   by the strict current node schema, as expected before any extension.
6. An unresolved evidence string is accepted syntactically by the proposal
   codec; that is a demonstrated proof boundary, not source verification.
7. A later proposal can replace the node's displayed content, but both proposal
   objects remain accepted and no accepted-predecessor link appears automatically.

No audit, storage, restart, rollback or complete guarded-apply proof is claimed.
The probe is additional interview evidence, not seven newly shipped product tests.

## Concrete stale-apply scenario and remaining work

Seed identity: independent base `engineering-rules`, selected project branch
`repo:kordex`, sibling `repo:seo`, and node `apply-revalidates-revision`. These
names are illustrative; scope plus node identity matters, not the display label.

| Step | Required result and fit |
| --- | --- |
| Capture | Retain the inspected stale-apply experience and its actual source revision as an observation. Evidence must represent this experience without pretending it was a classification correction. Its admission/resolution is still to implement. |
| Propose | Ordinary pending profile change against the Kordex branch, with its current snapshot and evidence. It changes no accepted node merely by existing. Existing proposal vocabulary/patch machinery is reusable. |
| Check and accept | Resolve source, match scope, validate supported patch and recheck target revision in the same atomic acceptance boundary. Commit node change, conditional proposal transition and audit together. Validation of strings or a pure calculated result is insufficient. |
| Restart and retrieve | Retrieve the current accepted rule with scope and provenance; pending proposals and the sibling branch must not appear as Kordex's accepted knowledge. No portable persistent path is proved yet. |
| Improve the rule | A new pending proposal deliberately replaces the current version. On acceptance, preserve the previous accepted content and explicit predecessor relation. The prior acceptance remains a historical fact; do not repurpose pending-proposal supersession to erase it. |
| Reject stale work | A competing proposal prepared at branch 10 must fail after branch 11 is accepted, with no partial node/status/audit writes. Reuse the existing freshness decision at the new transactional owner. |

## Four remaining owner choices

These are proposed semantics, **not approved types or storage design**.

| Choice | Recommended option | Alternative and consequence |
| --- | --- | --- |
| R1: recognize a rule | Add an explicit `rule` node kind. It describes inspectable guidance, not executable code or automatic authority. It must pass the existing schema/patch/review boundary. | Use an existing category/tag kind with a convention. Fewer schema edits, but consumers cannot reliably distinguish rules without another implicit convention. |
| R2: origin of an accepted rule | Give the node an explicit link to retained source evidence with the inspected source basis and accepting proposal. Permit a sourced experience as evidence, not only classification corrections. Preserve unknown historical origin as unknown, even after edits. | Keep only a live external source link. Simpler, but a moved/edited source cannot substantiate what was actually reviewed later. Neither option certifies the truth of source prose. |
| R3: accepted replacement | Keep the stable scoped node identity for revisions of the same rule; preserve each accepted version and its predecessor through the common history/audit mechanism. Pending-proposal replacement and accepted-content history stay distinct. | Mint a new node ID for every wording revision and explicitly retire/link its predecessor. This makes revisions separate nodes and requires every consumer to follow retirement/replacement. Truly different meanings already need different IDs under Doc 26; R3 concerns revisions of one rule. |
| R4: reconsideration | An optional due date marks an accepted rule as due for review. Retrieval still returns it as accepted, visibly due, until an explicit replacement/withdrawal decision. No date means no scheduled review, not “verified forever.” | Treat the date as expiry and exclude the rule from default retrieval. This changes availability automatically and needs explicit fallback/empty-context behavior. A proposal's stale target and a rule's review date remain different facts. |

Recommendation: R1–R4 as listed. The owner decides these before type changes or
storage design. Detailed schema representation and storage layout are not
specified here.

## Additional fit limits kept visible

- Current `DomainProfile` requires learning/UI/promotion/retrieval/graph fields.
  The probe borrows these as fixtures; this coupling must not silently become
  product policy for a headless engineering profile. Keep its later decoupling
  separate from the rule semantics and preserve existing app compatibility.
- Parent/child A1/B1/C1 remain undecided. The probe holds the base fixed. Whole
  overrides do not track the copied parent basis; branch freshness does not
  certify that a changed parent leaves an override valid. No automatic SEO-to-
  Kordex inheritance, parent update, upward merge or collision policy is approved
  by the third-profile direction. Such scenarios need their existing decision
  work before claiming support.
- Rule prose remains descriptive. Accepting “validate source” does not execute
  source validation, and recency alone cannot accept or replace meaning.
- The 31 compatibility export subpaths remain a recorded later API-narrowing
  task. They are not changed during this fit interview.

Source context: [why this exists](../ONTOLOGY_PROFILE_REFACTOR/why_this_exists.md),
[Doc 07](../ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md),
[Doc 19](../ONTOLOGY_PROFILE_REFACTOR/19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md),
[Doc 26](../ONTOLOGY_PROFILE_REFACTOR/26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md).
Their older app-first sequencing and implementation status are historical; the
current owner direction and inspected code above govern this next slice.
