# Fable re-review for Astra — 2026-11-09

Scope: the uncommitted rule, skill, leaf and tooling adoption in `C:\repos\kordex`
at HEAD `e93822c`, after the follow-up to the first Fable review. Covers the
TypeScript rule transfer, the capability leaves and the repository checker.
The Lotti application is out of scope. Only this file was written; no other file
was edited and nothing was committed.

## Judgment

The rule transfer and the leaf foundation are ready for subsequent work after
one correction: finding 1 below. It makes the new freshness gate fail on correct
repositories as soon as a merge commit exists, which includes every GitHub
`pull_request` run whose base branch touched an owner file. Everything else is
low severity or optional.

All six findings and all four rule omissions from the first review are closed.
I verified each one in the current source, not from the ledger.

## Closed since the first review (verified)

| First-review finding | Current state | Where |
| --- | --- | --- |
| Map staleness coupled to every unowned source file | Map renders the leaf table only; unowned list is a console diagnostic behind `--unowned`; a fixture proves an unrelated helper does not stale the map | `tools/leaf-inventory.ts` `renderMap`, `tools/check-repository.ts` |
| Case-insensitive path resolution on Windows | `fs.realpathSync.native` plus exact string comparison; fixture covers evidence, directory segment and secondary owner | `tools/source-facts.ts` `repositoryFile` |
| Type-only export satisfied an owner binding | Only locally defined runtime values count; nine negative declarations in one fixture | `tools/source-facts.ts` `sourceFacts` |
| Link titles and code spans produced false link findings | Dedicated inline-link parser with fence and code-span handling | `tools/markdown-links.ts` |
| Dead redirect `docs/agents/typescript.md` | Removed; nested AGENTS links the engineering index directly | `codelens-rn/AGENTS.md` |
| Two spellings of the install command | `--ignore-scripts` everywhere, including root AGENTS | `AGENTS.md`, `docs/agents/verification.md` |
| Omitted rules: parser fallback, union-arm tests, deferred proof, attempted-operation context | Restored | `docs/engineering/types-and-validation.md`, `errors-and-async.md`, `tests-and-docs.md` |
| `tools` listed itself as an unowned discovery root | Removed from `leafRoots` | `tools/leaf-inventory.ts` |

## New findings, ordered by impact

### 1. Merge commits make the freshness gate fail on correct leaves (new regression, fix before first CI run)

- Inspected: `tools/leaf-freshness.ts`, the call
  `git log -1 --full-history --format=%cI -- <owner>`.
- Scenario, reproduced in a temporary repository: `main` changes an owner and
  bumps its leaf to the same day (2000-01-03). A feature branch that never
  touched the owner merges `main` on 2000-01-10. The gate reports
  `LEAF_INSPECTION_STALE: ... changed on 2000-01-10, after inspection 2000-01-03`.
  `git log` returned the merge commit, not the commit that changed the file.
- Cause: `--full-history` disables history simplification, so a merge that is
  not TREESAME to one of its parents is listed, with the merge's own date.
- Consequence: every GitHub `pull_request` run checks out a synthetic merge
  commit dated at run time. Once the base branch has touched any owner after
  the PR branched, the gate goes red although owner and leaf agree. The same
  happens locally after `git merge main`. The natural reaction is to bump
  `inspectedOn` without reinspecting, which is exactly what the field forbids.
- Smallest correction: drop `--full-history`. Default simplification follows
  the TREESAME parent to the real touching commit and still lists a merge that
  differs from all parents, so a conflict resolution that edits the owner is
  kept. Add the reproduced case as a fixture: unrelated branch merges a branch
  whose owner and leaf changed together, expect no finding.
- Doc: `docs/capabilities/SCHEMA.md` says merges "may cause extra review". After
  the fix that sentence should name the remaining case only: a merge whose
  result differs from every parent.

### 2. An unbalanced backtick hides real links from the link guard (new, low)

- Inspected: `tools/markdown-links.ts`, the code-span removal regex with
  `[\s\S]*?`.
- Scenario, reproduced: a stray single backtick in one paragraph and an inline
  code span two paragraphs later. Everything between them is removed, including
  a real `[real](missing.md)` link. No `DOC_LINK_MISSING`.
- Consequence: false negative, silent. CommonMark does not let a code span
  cross a blank line.
- Smallest correction: forbid blank lines inside the span match, for example
  `(?:(?!\n\s*\n)[\s\S])*?`, and add the fixture.

### 3. An exported alias of an imported function counts as a local owner (new, low)

- Inspected: `tools/source-facts.ts`, `localValues` accepts any variable with an
  initializer.
- Scenario, reproduced: `import { f } from "./data/x"; export const decide = f;`
  passes the owner check, although the finding text and SCHEMA.md say re-exports
  cannot own a capability.
- Consequence: small candour gap. For `role: decision` the import check still
  flags `./data/x`; for other roles the binding points at a forwarding line.
- Smallest correction: either reject initializers that are a bare identifier
  bound by an import, or narrow the wording to "export declarations with a
  module specifier are rejected". The second is enough.

### 4. Stale count in the first verification record (trivial)

`docs/engineering/TRANSFER.md` keeps "16 positive/negative fixture tests" in the
first dated section and "23" in the follow-up. Both are dated records, so this
is allowed by `tests-and-docs.md`. Mention only so nobody "fixes" the first one.

## Still open from the first review (optional, not blockers)

- **Planned leaves carry no individual information.** All six share identical
  `gaps`, `reason` and `revisit` text. Either give each one concrete acceptance
  scenario or keep fewer leaves. As written they only prove that the schema
  accepts boilerplate.
- **`capture-save` sits under `evolution`.** Captures are learning records in
  `docs/agents/product-and-invariants.md`; no domain parent covers existing
  learning code. Keep it and say why in the leaf body, or add a parent.
- **Evidence may point at any file**, including the owner itself. Documented
  limit. A guard "evidence path is not an owner path" would be three lines.
- **Schema prose is checked one way.** The YAML example must parse; the role and
  evidence-kind enumerations in SCHEMA.md prose are not compared with the enums.
  No false claim, since `LeafSchema` is named as the source.
- **Line endings.** `core.autocrlf=true` and no `.gitattributes`. The checker is
  CRLF-robust (leaf parse, map compare, entrypoint check, skill front matter),
  and mirrors stay byte-equal because all three copies convert alike. A
  `.gitattributes` with `* text=auto eol=lf` would remove the warning noise.
- **Reference-style links are unchecked.** Stated in a code comment only; one
  line in `tools/README.md` under Limits would make it a documented limit.

## Assessment of the `inspectedOn` addition

Proportionate: one required field, one module of about fifty lines, five
fixtures with isolated temporary repositories. The limits are stated candidly in
SCHEMA.md: day precision, owner files only, worktree warnings instead of errors,
full history required, dates are author claims. CI sets `fetch-depth: 0`, which
the shallow-history failure requires. Two remarks:

- The date is required on planned leaves but compared with nothing there. That
  is consistent with "dates inspection of the stated responsibility", and fine.
- Finding 1 is the only defect. With it fixed, the check does what the contract
  says and no more.

## Baseline gaps (old, unchanged, correctly declared)

The three integration gaps in `docs/agents/baseline.md` remain and are declared
`partial` in their leaves. Confirmed in source during the first review:
`resolveProfileSelection` has no `parentProfileId` check; the registry throws
`DuplicateProfileIdError` across sources while base apply needs a stored
definition; the learning-chat save store carries no profile. None is hidden
behind `implemented`. No application TypeScript was changed by this adoption.

## Checks run for this re-review

- `npm --prefix tools run check` on Node 24.19: typecheck clean, 23 of 23
  fixture tests pass, repository gate exit 0, no warnings printed.
- Re-read of all tooling sources, the test file, SCHEMA.md, TRANSFER.md, the
  engineering topics, sample leaves and the CI workflow.
- Three new negative probes in temporary directories and a temporary Git
  repository; probe files were removed afterwards, no application file touched.
- From the first review, still valid: 54 of 54 snapshot hashes match the local
  source packs, SEO HEAD equals the snapshot, skill mirrors are byte-identical.

## Not run, remaining uncertainty

- Application tests, compiler and lint in `codelens-rn` (no `node_modules`).
- Remote CI. Finding 1 predicts a failure mode there; it is reproduced locally,
  not observed on GitHub.
- A fresh Claude or Codex session discovering the skills. No hooks exist.
- Whether an `implemented` leaf hides a defect that only application tests
  would show.
