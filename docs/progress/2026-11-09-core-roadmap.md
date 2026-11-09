# Kordex Core roadmap — owner direction, 2026-11-09

This order supersedes the earlier app-first milestones in the
[historical ledger](2026-11-09-milestones.md). Kordex Core is the product;
`codelens-rn` is existing material and a test bench. No further app M1c,
adoption UI, app backup, mobile Drizzle repair or native tooling work. The
previous slice was committed as `75f608d`; no transaction fix was started.

| Step | Deliverable and proof | Current state |
| --- | --- | --- |
| K0: inventory and boundary | Read-only module/test dependency audit; exact core exports and app compatibility proposal; owner approval before moving files | Complete; owner approved the larger cut with pinned Zod, optional profiles and no speculative ports |
| K1: structural extraction | Standalone package with no app runtime/type dependency; existing app assertions preserved; isolated build/tests and packed consumer | Complete at `8a4b851`; Fable review returned without blocking findings; [evidence](2026-11-09-core-extraction.md) |
| K1b: separate learning extension | Headless profiles need no UI/learning fields; preserve the app extension and package isolation | Implemented locally; [proof and limits](2026-11-09-headless-profile.md) |
| K2: desktop persistence | One local adapter behind core-owned ports; current-state checks and real rollback after each write, reopen and concurrency proof | Not started; R1–R4 accepted, one R3/A1 history basis. Concrete storage schema remains a separate decision |
| K3: headless rule lifecycle (former M5) | CLI: one experience -> proposed rule -> source/scope validation -> explicit acceptance -> restart retrieval -> traceable replacement; stale proposal rejected | Planned; implement approved semantics with real source, scope and persistence checks |
| K4: read-only MCP | Agent retrieves only accepted knowledge with source, scope and revision; pending, replaced and other-scope records cannot masquerade as current accepted rules | Planned after K3 |
| K5: codebase adapter | Read a repository revision into sourced, scoped nodes without silently accepting interpretations | Planned; no executable owner |
| K6: dependency invalidation | Record actual dependencies and mark downstream results needing review when recorded inputs change | Planned; no executable owner |
| K7: history comparison and rollback | Compare retained accepted states; restore through a new guarded acceptance with lineage | Planned; no executable owner |
| K8: scenario lab | Seed and replay lifecycle cases with expected outcomes; stale apply is the first card | Planned; no executable owner |

K0 evidence: [inventory](../reviews/2026-11-09-core-module-inventory.md) and
[package boundary](../reviews/2026-11-09-core-package-boundary.md). Fable's counts
are confirmed; the runtime-only independence claim needs the codec row-type and
test-dependency qualifications. The existing import checker was reused unchanged.

K1 adds a separate package-boundary guard for runtime **and type** imports,
tests and configuration. The stricter decision-leaf checker is unchanged.
See the [test reconciliation](2026-11-09-core-test-reconciliation.md).
The [owner direction](../agents/product-and-invariants.md#engineering-rules-owner-direction-2026-11-09)
settles reuse: engineering rules are a third independent base with repository
branches, using the common proposal lifecycle. No separate rule record type.
The [fit interview](../reviews/2026-11-09-rule-model-interview.md) records R1–R4
as accepted. The owner requires [one accepted-state basis](../reviews/2026-11-09-accepted-state-basis.md)
for rule history and parent/child A1. K1b separates the learning extension before
storage design. Seven in-memory probes demonstrate fit, not storage/restart or
atomic acceptance. K5–K8 preserve the broader ideas without invented owners.

## First product scenario

Seed: repository scope `kordex`, an experience documenting a rejected stale
proposal, its inspected source, and a separate unrelated repository scope.
The human proposes: "Apply must compare the proposal's recorded revision with
the current target before accepting a semantic change."

1. Capture the experience and source without creating an accepted rule.
2. Create a pending scoped rule proposal. Reject missing/unresolvable source and
   scope mismatch; deterministic checks do not certify natural-language truth.
3. Explicitly accept after review, atomically recording accepted state, proposal
   transition and audit. Merely asking the model cannot accept anything.
4. Exit the process; a second process retrieves the accepted rule with its source,
   scope and accepted revision. The other scope and pending candidates are absent.
5. Capture a later decision and explicitly replace the rule; retain the old rule,
   evidence and replacement link. The default retrieval returns the new accepted
   decision while history explains the previous one.
6. Attempt acceptance of a proposal based on the earlier revision. Reject it
   without partial accepted state, status or audit. Repeat injected-write failures
   against the desktop store and inspect after reopening.
7. Expose that same accepted read through MCP, not a separate MCP memory database.

This is the actual Kordex mechanism proof. A reader that lists capability leaves
may remain useful tooling, but is not a prerequisite and does not satisfy K3.
The CLI's first candidate may be supplied deterministically by the human; no
model provider or autonomous generation is required to prove the lifecycle.

## Kept decisions and limits

- First-use materialization and permanent unknown legacy origin remain semantic
  inputs from [Doc 44](../ONTOLOGY_PROFILE_REFACTOR/44_BUILT_IN_BASE_MATERIALIZATION_DECISION.md).
  Their mobile entrypoints, audit schema and backup implementation are not work
  for this roadmap; do not transplant them automatically into the core.
- [Parent/child design](../reviews/2026-11-09-parent-child-semantics-design.md):
  A1 shares R3 history representation; remaining parent update policies and B1/C1
  remain undecided. Do not infer automatic rebase or scoped-edge approval.
- The [mobile rollback finding](../reviews/2026-11-09-base-apply-rollback-finding.md)
  stays open. Core storage must prove its own atomicity independently. Extracting
  pure code neither fixes nor hides the app's persistence limitation.
- Existing app leaves retain their honest gaps. New planned core leaves bind no
  fake owner; after extraction, leaves move beside the real package owners.
- Branch, separate commits, push and PR remain authorized; no merge. Retain
  failing-first tests for behavior changes, matched proof, and stops for new
  dependencies, schema/product choices or invariant contradictions. A pure move
  uses unchanged behavior tests and explicit independence checks.
