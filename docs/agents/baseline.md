# Dated baseline and first candidate slices

Inspected baseline: `main` at `e93822c5281e9d11e0a0a719b5912ab66866b354`,
2026-09-14. Recheck before acting. This is a finding ledger, not permission to
perform every listed change or an assertion that these gaps remain forever.

## Implemented shape

The app has coding and photography bases, a registry/source seam, persisted
definitions, selected branch overlays, correction evidence, inert proposals,
review/freshness/replacement, branch and base apply services, ContextPack,
user-fit projection and a manual branch-local checker. Many consumers now carry
base-profile scope. This is materially later than the older coding-only chats.
See the [module map](module-map.md) for actual owners.

The generic headless package/protocol, universal `KordexPatch`/`KordexCommand`
interpreter, autonomous agent platform and game engine are not implemented by
these seams. The old ratings and use-case examples are product context, not tests.

## Integration gaps identified in the inspected sources

| Finding | Source path and mechanism | Candidate proof/fix boundary |
| --- | --- | --- |
| Built-in registry vs persisted base editing | [Default bootstrap](../../codelens-rn/src/features/ontology/data/profileRegistryBootstrap.ts) combines static coding/photography with persisted definitions; [registry](../../codelens-rn/src/features/ontology/profileRegistry.ts) rejects duplicate IDs. [Base apply](../../codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts) needs a stored definition. No production materialization path was found during the review. | Decide who owns editable built-in state and source precedence. Exercise default bootstrap -> stored definition -> base apply -> reload; do not solve only an injected test registry. |
| Learning-chat save drops known profile context | [Route](../../codelens-rn/app/learning/chat/[id].tsx) has concept profile for retrieval but calls save with message/chat ID. [Save store](../../codelens-rn/src/features/learning/state/save-learning.ts) does not carry that profile; [context resolver](../../codelens-rn/src/features/learning/services/conceptualizeProfileContext.ts) defaults missing project context to the active coding helper. | Trace photography concept -> learning chat -> save modal -> capture -> read-back; carry the required explicit context through the existing owners. |
| Pure selection does not reject a foreign parent | [profileSelection](../../codelens-rn/src/features/ontology/profileSelection.ts) validates base ID, branch existence and branch kind, but not each selected branch's `parentProfileId`. UI filtering is a different boundary. | Reject a coding-owned branch in a photography selection while retaining valid ordering/composition; test at the shared resolver boundary. |

These are source-based findings. They are not reports of having reproduced the
entire flow on a running phone. Existing tests, especially injected forkability
tests, should be read for their actual dependency setup and proof limits.

## Suggested order when implementation is requested

1. Close scope propagation and foreign-parent validation with focused regression
   cases; these have small, identifiable owners.
2. Resolve the built-in/persisted-definition ownership decision and prove the
   default bootstrap/apply/reload path against actual persistence.
3. Extract responsibilities only where the preceding fixes expose duplicated
   policy or mixed ownership. Pin the important import edges with an executable
   check that handles the existing baseline and demonstrates a failing case.
4. Evaluate an operation algebra or additional libraries only for a concrete next
   capability. Do not make platform packaging a prerequisite for correcting the app.

This order is a recommendation, not an approved feature roadmap. It preserves
the broader Kordex product direction while grounding work in observable behavior.

## Verification at rule adoption

The rule change itself changes documentation/instructions only. At inspection,
`codelens-rn/node_modules` was absent; the app's Vitest, compiler and native flows
were not run as part of this adoption. Link/command/source checks do not substitute
for those checks. Exact runnable commands and limitations are in
[verification](verification.md).

## 2026-11-09: rule and capability adoption

The later adoption adds shared engineering guidance, host skill mirrors,
code-adjacent capability leaves and independent repository checks. It does not
refactor application behavior or resolve the integration findings above.
See the [transfer ledger](../engineering/TRANSFER.md) for the actual source
comparison, the [generated inventory](../capabilities/generated-map.md) for
current declarations and the [review brief](../reviews/2026-11-09-fable-review.md)
for independent review. The earlier documentation-only statement describes the
September adoption, not these later executable tools.

## 2026-11-09: branch proposal snapshot enforcement

Design inspection reproduced an additional pre-existing gap: the branch apply
service loaded the current branch inside its transaction and guarded the write
with that current timestamp, but did not compare the proposal's stored
`targetBranchUpdatedAt`. A pending valid patch with snapshot 10 against branch
20 was accepted. Missing snapshots were also accepted. This was present before
rule/leaf adoption, not a regression introduced by it.

Owner: `applyPendingBranchLocalProfileChangeProposal` in
[branch apply service](../../codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts).
The [design note](../reviews/2026-11-09-parent-child-semantics-design.md) records
the inspected semantics. The user authorized rejection at this service boundary,
reusing the existing freshness decision, and a separate explicit missing-snapshot
refresh slice. Progress and executed evidence belong in the
[milestone record](../progress/2026-11-09-milestones.md).

The base path does not have this same gap:
`assertBaseProfileProposalTargetsCurrentVersion` rejects missing or mismatched
`targetProfileVersion`, and the base service subsequently guards its write.
Neither this inspection nor callback-based service tests establish SQLite rollback.
