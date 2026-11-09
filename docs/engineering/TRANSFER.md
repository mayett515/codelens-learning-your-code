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
