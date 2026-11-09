# TypeScript and capability transfer ledger

Inspected 2026-11-09. This is a deliberate Kordex adaptation, not a claim that a
pack is complete, flawless or automatically kept current. Active instructions
are repository-local; the external paths below document provenance only.

## Which source is current?

- Generic Claude master: `C:\claude\claude-workflows\typescript`.
- Codex translation: `C:\codex\codex-workflows\typescript`.
- Project refinements: `C:\repos\projects\seoproject\Seo_automatisation`.
  Inspected HEAD: `17e29268f7eb38a8db41c084fbe898a0fe3c0b7f`.
  The inspected rules, selected skills and maintenance document were clean in
  that checkout. This says nothing about an unqueried remote version.
- The old TheScheme bundles are historical design input, not the current pack
  authority. Their provenance is retained in the [rule index](../agents/README.md).

Direct SHA-256 comparison found all 17 SEO `.claude/rules/*.md` files identical
to the Claude master's corresponding files. The generic rule text was therefore
not behind SEO at inspection. Comparing only file dates or root READMEs would
not have established this.

Workflows are different: SEO's selected `.agents/skills` match the Codex pack for
anti-regression, repo-review, smoke-verify and type-interview. Its
source-of-truth-audit differs: it includes the rename-acceptance step already in
the Claude master but absent from the inspected Codex translation. Claude-native
and Codex-native skill files also differ in host paths and wording; byte
inequality alone is not evidence that one is newer. The SEO maintenance document
explicitly records the accepted source-of-truth-audit divergence.

The [source snapshot](../../agent-kit/upstream-snapshot.json) records hashes of
the inspected rule files, selected skills and key maintenance sources. It is a
dated comparison aid, not a dependency on those local directories or an updater.

## Rule coverage and intentional differences

| Source topic | Kordex owner / disposition |
| --- | --- |
| type-strategy, zod-boundaries | [Types and validation](types-and-validation.md) |
| functional-core, procedural-shell, boundaries | [Core and boundaries](core-and-boundaries.md) |
| error-modeling, async-concurrency, http-boundaries | [Errors and async](errors-and-async.md); HTTP specifics apply only when an HTTP adapter exists |
| data-access | [Persistence](persistence.md) |
| react, tanstack | [React and query](react-and-query.md), conditional on the actual application stack |
| testing, comments, docs | [Tests and docs](tests-and-docs.md) |
| auth-security | General trusted identity, scope and secret handling retained in errors/persistence; OAuth/session implementation policy deferred until such an adapter is selected |
| nest, fastify-adapter | Read, not adopted as stack requirements; explicit resource ownership and real runtime verification retained in shared rules and smoke-verify |

This table covers topics, not every upstream sentence. Important adaptations:

- Optional and nullable are distinct. The upstream formulation about omissions
  must not turn an absent property into an explicit null contract.
- Parse representations at trust boundaries; recheck mutable permissions,
  revisions and semantic invariants before committing. Avoiding duplicate shape
  parsing never authorizes stale apply.
- Preserve established throw/result contracts during structural refactors.
  Introduce a new error dialect only as an intentional migration.
- BullMQ, Redis, Nest, reverse proxies and browser APIs are not universal Kordex
  infrastructure. Framework adoption and external authorization need their own
  concrete implementation and verification.
- Existing scope and transaction boundaries matter more than folder size.
  Cohesive code may stay together. Do not transplant SEO's module tree.
- Test observable behavior and real boundary effects; do not prohibit a call
  assertion when the invocation itself is the promised effect.
- Clarify genuine unresolved product choices, while preserving authorization
  already given. No mandatory repeat-approval ritual was transferred.

## SEO improvements carried forward

The project layer is more than the generic TypeScript text. Adopted principles:

- Product ROOT -> domain rules -> code-adjacent leaf -> generated inventory.
  Kordex capabilities replace SEO queue-specific lanes/handler registrations.
- Explicit implementation states, reasons/gaps and evidence scope. Future leaves
  cannot pretend to have current runtime owners.
- One canonical workflow source, checked identical Claude/Codex mirrors. No
  silent cross-host fork; source edits are synchronized and checked.
- Generated counts/maps, negative guard fixtures, checks independent of the host.
- Rename acceptance across code, prose and configuration, preserving explicit
  historical records. Repair a claim, not merely its old vocabulary.
- Promote lessons to their narrowest owner; mechanically enforce suitable
  constraints instead of adding blanket incident bans.

SEO's queue artifact graph, runtime handler registry and deployment jobs were
not copied. Kordex's checker binds actual exported source owners and follows
runtime imports for declared decisions; it does not claim SEO's runtime reach.
SEO's host after-edit hooks were inspected as a design reference but are not
installed here. Kordex has a standalone gate and a checked-in CI workflow;
hook payload/activation parity would require separate host runtime verification.
The wider vendored skill collection and project OAuth/deployment workflows are
not part of this transfer.

## Skills and maintenance

Five adapted workflows plus Kordex leaf-maintenance live in
`agent-kit/skills/`: anti-regression, repo-review, source-of-truth-audit,
smoke-verify, type-interview and leaf-maintenance. They are concise local versions,
not byte-for-byte upstream copies. The upstream audit scanner and review casebook
are not installed or referenced as if present.

Edit this repository's canonical source, run `npm --prefix tools run sync:skills`
and `npm --prefix tools run check`. For a future upstream refresh, compare the
snapshot against both generic packs **and** SEO project refinements. Review each
semantic delta and record adopted/deferred decisions here before replacing local
rules. Do not overwrite the adaptation with whichever directory looks newest.

Further changes should answer a concrete defect or capability. A complete set
of Markdown files cannot guarantee correct engineering, app integration or that
an agent loaded its instructions. See [verification](../agents/verification.md).

## Verification recorded on 2026-11-09

`npm --prefix tools run sync:skills` and `npm --prefix tools run generate`
completed successfully. `npm --prefix tools run check` passed the tooling
typecheck, 16 positive/negative fixture tests and checks against this checkout.
The generated inventory contains 11 existing capability leaves and 6 planned
directions. These are an initial inventory, not exhaustive business coverage.
Existing application source files were unchanged; application dependencies were
absent, so no application tests or native flows were run. No remote CI or fresh
host skill-loading session was exercised. No commit or push was performed.

## 2026-11-09: review follow-up and Lotti scope

Following Fable's independent review, unowned source diagnostics moved out of the
committed map, paths gained exact-case checks and owners now require local runtime
value exports. Inline-link title/code handling and the redundant TypeScript index
hop were corrected; install guidance consistently uses `--ignore-scripts`.
The small rule omissions on parser fallback, union-outcome tests, deferred proof
and attempted-operation context were restored.

The user's chosen Lotti plan adds only `inspectedOn` to each leaf and a Git-history
freshness check. Its day precision, worktree warnings and full-history requirement
are explicit in the [leaf contract](../capabilities/SCHEMA.md). This is repository
maintenance, not a Kordex product knowledge model or independent attestation.

Lotti is not installed or integrated. The product-level `PlannerKnowledgeEntity`
mentioned in Fable's comparison is reserved as a possible reference for a later
type interview: scope, acceptance, replacement/revocation and reconsideration
need explicit Kordex decisions first. No precedence algorithm, permanent prompt
hook or external data contract is adopted by this tooling change. The user's
decision does not require asserting that Lotti has no possible export or API.

Follow-up validation: tooling typecheck, all 23 fixture tests and the real
repository gate passed on 2026-11-09. Git chronology tests use isolated temporary
repositories, including later commits, UTC offsets, shallow history and dirty
owners; no application Git history was modified. Application tests and remote CI
were not run. Existing application source remains unchanged.

## 2026-11-09: second review follow-up

Fable's [re-review](../reviews/2026-11-09-fable-rereview.md) identified a false
freshness failure on unchanged merges. Removed `--full-history` from the per-path
log query, retaining the requirement for a full checkout history. Regression
fixtures distinguish unchanged merged owners from conflict resolutions that
change the owner relative to both parents. An unmatched Markdown backtick can
no longer consume a real link across a blank line. The owner contract now
explicitly admits imported-value variable aliases without claiming provenance
analysis. Fable's review and the earlier dated test counts remain historical.

Validation: before the fixes, the new unchanged-merge and unmatched-backtick
fixtures failed with the reported symptoms; the conflict-resolution and alias
scope checks passed. After the fixes, the tooling typecheck, all 27 tests and
the repository gate passed. No application tests or remote CI were run; no
application source was changed and no repository commit or push was performed.

## M0 publication evidence

The adoption was subsequently committed and published under the user's explicit
milestone authorization. Both push and pull-request CI passed for `088ef3d` on
2026-11-09. Exact revision and run links are in the
[milestone record](../progress/2026-11-09-milestones.md). Earlier statements about
uncommitted work or unobserved CI describe their original inspection stage.

## M0b application baseline

On 2026-11-09, the locked app dependencies installed successfully and the
existing suite passed all 1117 tests across 120 files. The compiler passed.
Lint ran and failed on four pre-existing errors, with 213 warnings. Exact
commands, errors and full lint output are linked in the
[milestone record](../progress/2026-11-09-milestones.md). Application source,
dependencies and capability states were not changed for this baseline.

## 2026-11-09: parent/child semantics design

The [dated design note](../reviews/2026-11-09-parent-child-semantics-design.md)
verifies Fable's three hypotheses, gives the current composition algebra,
candidate laws/counterexamples, A-C options, worked scenarios and M4 decisions.
It narrows F2 to flattened lookups rather than claiming all scoped references
retarget. Its recommendations are not adopted schema or product contracts.
Intent stays in domain parents; future tests and existing leaf evidence should
establish enforcement before any optional `Mechanised at:` address convention.
No application source, dependency or schema is changed by the design slice.

The design inspection also reproduced an existing branch proposal revision gap.
The user authorized a separate missing/stale snapshot rejection slice, followed
by explicit refresh for missing-snapshot proposals. These implement/extend the
existing lifecycle and are tracked separately from the parent/child options.

Design-only validation: `npm --prefix tools run check` passed the tooling
compiler, all 27 fixture tests and repository checks on 2026-11-09. This checks
the document's bindings/links, not the proposed algebra or future database laws.

## 2026-11-09: branch snapshot repair and explicit recovery

The separately approved A/B slices now enforce the proposal's original branch
revision at Apply and permit explicit validated refresh of a missing-snapshot
branch proposal. Replacement stays pending; no automatic apply or in-place
backfill was added. The [milestone record](../progress/2026-11-09-milestones.md)
records failing-first cases, 1127 passing app tests, compiler success, unchanged
lint baseline and the 27-test tooling gate. The design note remains a dated
description of its inspected revision; A-C parent/child options remain undecided.

## 2026-11-09: M1a selection guard

The shared selection resolver now rejects a selected branch belonging to another
base while preserving valid ordering and allowing unselected foreign branches.
The selection leaf is `implemented`; the dated baseline preserves the original
finding and records its resolution. Failing-first evidence, 1131 passing app
tests, unchanged lint baseline and the passing tooling gate are recorded in the
[milestone ledger](../progress/2026-11-09-milestones.md). M1b is awaiting a decision
about native verification availability; no capture-chain fix is claimed yet.

## 2026-11-09: M1b Node scope authorized and completed

The user subsequently authorized the profile-transport repair with native proof
explicitly deferred. Route/store/modal now carry the known base ID; context
resolution and preparation reject explicit mismatches rather than defaulting
to coding. The capture-save leaf remains partial and identifies only the remaining
native route/read-back verification gap. Its new evidence starts at store.open
and uses actual resolver/save/repository mappings with model and SQL transport
doubles; it does not render the route/modal or execute SQLite.

The [milestone record](../progress/2026-11-09-milestones.md) records the corrected
collision fixture, failing-first profile loss, 1139 passing app tests, compiler
success, unchanged lint baseline and the 27-test tooling gate. This is the user's
requested Fable review checkpoint before M1c ownership is decided.

## 2026-11-09: Fable design review and M1c decision preparation

The user supplied Fable's positive review of the parent/child design. The
[note](../reviews/2026-11-09-parent-child-semantics-design.md) now distinguishes
a copied parent-node basis from a numeric base version and prioritizes the pure
composition backstop if B1 is approved. Storage, backup and external-dependency
limits are explicit; the recommendations remain unadopted.

The [M1c option sheet](../reviews/2026-11-09-m1c-profile-ownership-options.md)
compares first-edit materialization, first-use materialization and uneditable
templates against Doc 06 and same-version bundled-content changes. It records
Fable's preference for the first and Astra's preference for the second, without
choosing for the user. Runtime source and backup paths were inspected, not
executed. No application, schema, dependency or leaf status changed.

## 2026-11-09: M1c ownership and legacy adoption decided

The user chose first-use materialization. Fable explicitly changed position and
now recommends it too; the earlier first-edit preference above is historical.
The user subsequently approved visible, audited adoption of the current template
for existing installations with unrecoverable earlier origin. Unknown origin
persists across edits/backup; no old content is reclassified or silently verified.
[Doc 44](../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/44_BUILT_IN_BASE_MATERIALIZATION_DECISION.md)
owns the accepted contract; Doc 15 now states the narrow source-ownership exception.

Before implementing, a real file-backed SQLite diagnostic exercised the actual
base apply service and installed Drizzle transaction driver. It reproduced a
premature COMMIT and partial target/status writes after audit failure. See the
[finding](../reviews/2026-11-09-base-apply-rollback-finding.md). No runtime repair,
materialization schema or behavior has been added. The work-order invariant stop
applies; leaves remain partial and the observed rollback gap is recorded.

## 2026-11-09: owner redirects work to standalone Kordex Core

The consolidated owner work order stops app M1c, adoption UI, app backup,
mobile-driver repair and native tooling. The decision/diagnostic slice was
already committed as `75f608d`; no driver fix or materialization code was started.
Recorded semantics and the rollback defect remain valid inputs, not work queued
ahead of the core. The [new roadmap](../progress/2026-11-09-core-roadmap.md)
reorders extraction, desktop persistence, the complete rule lifecycle and MCP.

Read-only inspection used the unchanged decision import checker over all 69
ontology modules, with additional type-import and 52-test-file inspection.
Fable's 24 + 7 + 2 runtime-independent grouping is confirmed; seven codecs still
depend on app database row types. The package proposal separates validation from
row mapping, preserves app compatibility and makes storage/atomic ports explicit.
New core/lifecycle leaves are planned, with no fictitious owners. Agent-context
now names the read-only MCP scenario after accepted-knowledge lifecycle proof.
Source moves, dependencies and schema changes await owner boundary approval.

## 2026-11-09: approved K1 extraction

The larger boundary is approved and implemented. Runtime and type dependencies
are checked across the package boundary, including test/config imports. The
existing decision-leaf checker is unchanged. Core roots and real owner leaves
move with the source; schema validation stays in core and row mapping in app.
See the [K1 report](../progress/2026-11-09-core-extraction.md) and its test
reconciliation. Both hosts still consume this same rule set. Storage/atomic
ports are deferred to K2; the rule-model interview is required before storage
design. No parent/child design option or new rule schema is adopted by K1.

## 2026-11-09: Fable review and six condensation omissions restored

The owner relayed Fable's K1 review: no blocking finding; independent module,
compiler, test, isolation, tooling and CI checks agree with the K1 report. This
is attributed review evidence, not a second Astra execution. The 31 compatibility
subpaths remain a later API-surface task, not a change in this slice.

Fable reports reading 48 of the 54 original scheme files; the remaining six are
the manifest and rule-file generation templates. This records the review's
coverage and does not claim that every original file was independently reread here.

Restored to their existing owners: input immutability; one failure dialect per
layer; the concept/ownership/hidden-state test for files, boundaries and unions;
object parameters and named reasons; the policy/procedure/boundary principle and
its useful scope; and missing versus valid falsy values. The existing coded-apply
versus plain-selection error mixture is recorded in the baseline, not repaired.
No runtime, type, schema, skill mirror or dependency changed.
