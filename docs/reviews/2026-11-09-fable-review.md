# Fable review brief — 2026-11-09

Review the current uncommitted Kordex rule/skill/capability-tooling changes in
`C:\repos\kordex`. Review only; do not edit or commit. Include untracked files:
ordinary `git diff` alone omits most of this adoption. Check actual HEAD/status.

## Original requirement

The user wants a coherent, portable Claude/Codex TypeScript rule system informed
by the most developed local sources, including SEO project refinements. Establish
the SEO-inspired ROOT -> domain business rules -> code-adjacent leaf -> generated
checked inventory approach. Kordex must support multiple future applications;
CodeLens is existing material, not the required product or target architecture.
Do not turn this review into an application rewrite or a universal platform build.

## Read in order

1. Root `AGENTS.md`, `docs/agents/product-and-invariants.md` and
   `docs/agents/README.md`.
2. `docs/engineering/TRANSFER.md`, its source snapshot and relevant topic files.
3. `docs/capabilities/ROOT.md`, domain parents, `SCHEMA.md`, generated map and a
   representative implemented, partial and planned leaf. Inspect their actual
   owners/callers/tests; do not treat a generated map as confirmation.
4. `tools/AGENTS.md`, the schema, parser/import checker, inventory/map generator,
   skill synchronizer, repository gate, tests and CI workflow.
5. Canonical `agent-kit/skills` and both host mirrors; root and nested entrypoints.

If the source repositories are available, compare the transfer against the
actual local files, especially SEO's `.agents/skills/source-of-truth-audit` and
`docs/agents/rule-system-maintenance.md`. Their paths/hashes are in the snapshot.
All 17 SEO TypeScript rule files matched the Claude master at transfer inspection;
selected workflow refinements differ from the Codex pack. Recheck if claiming a
newer source. Source age alone does not decide which policy is correct.

## Questions requiring independent judgment

- Were useful source semantics lost in condensation, especially scope,
  transactions, error contracts, cancellation, rename acceptance and verification?
  Conversely, did inappropriate SEO or framework assumptions survive?
- Is there one practical owner for policy/schema/workflows, with discoverable
  reading routes and checked mirrors? Are any instructions contradictory or dead?
- Do the leaves state truthful, narrowly scoped responsibilities? Have existing
  integration defects been hidden by `implemented`, or future APIs implied by
  planned entries? Inspect the baseline gaps separately from new regressions.
- Does the checker reject the false claims it promises to reject? Look for
  missing/deleted owners, exports, evidence, parents, duplicate bindings, stale
  maps, schema drift and transitive barrel imports. Probe negative cases in
  temporary fixtures, not by damaging application files.
- Are the check limits candid? Symbol existence is not runtime wiring; an
  evidence filename is not a passed test; a mocked transaction is not rollback;
  declared decision import restrictions are not universal purity or isolation.
- Is the tooling proportionate and maintainable? Prefer a smaller sound system
  to extra fields, registries, dependencies or approval ceremonies without a need.

## Validation and expected output

Run `npm --prefix tools run check` (install its locked dependencies with
`npm --prefix tools ci --ignore-scripts` if needed). Inspect the actual CLI result.
Do not claim application/native tests, host hook execution or remote CI success
from this gate. The transfer does not change existing application TypeScript;
application tests were not run during adoption.

Return findings first, ordered by concrete impact, with inspected path/line,
triggering scenario, consequence and smallest useful correction. Separate new
regressions, source-transfer omissions, old baseline gaps and optional ideas.
State checks actually run and remaining uncertainty. If no actionable issue is
found, say so without calling the framework perfect. Finish with a clear judgment
on whether the rule transfer and leaf foundation are ready for subsequent work.
