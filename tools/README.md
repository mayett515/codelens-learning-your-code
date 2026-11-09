# Repository checks

These tools maintain shared engineering guidance and the capability inventory.
They are separate from application dependencies and do not execute application
modules. Node 22.18+ is required; Node 24 is used for the initial verification.

From the repository root:

```powershell
npm --prefix tools ci --ignore-scripts
npm --prefix tools run check
```

The gate typechecks the tools, executes negative/positive fixtures, then checks
the real repository's leaves, local runtime value exports, exact path casing,
Git inspection dates, declared decision imports, generated map, skill mirrors,
shared host entrypoints and inline documentation links.

After changing canonical skills or leaves:

```powershell
npm --prefix tools run sync:skills
npm --prefix tools run generate
npm --prefix tools run check
```

`sync:skills` writes only managed skill copies from `agent-kit/skills/` to
`.agents/skills/` and `.claude/skills/`; extra files inside a managed skill are
reported, not deleted. Unrelated host skills are left alone. `generate` only
writes the map when leaves and inspection dates pass validation. It never advances
inspection dates. Unowned source-file diagnostics are console-only:
`npm --prefix tools run check:leaves -- --unowned`.

Git with full history is required for bound owners. An owner changed on a later
UTC day than its leaf's `inspectedOn` fails. Same-day chronology is intentionally
not inferred. New/staged/unstaged owners produce explicit warnings, not an assertion
that the worktree was inspected. See the schema for the full freshness limits.

The checked-in [workflow](../.github/workflows/repository-checks.yml) runs the
same gate on push/pull request. It is configured here, but remote CI execution
is not claimed until a run actually occurs. No host hooks are installed by this
transfer: this gate remains runnable independently of Claude/Codex tool dialects.

## Limits

K1 adds [a package boundary check](core-boundary.ts) over core source, tests,
scripts and compiler/test configuration. It includes erased type imports and
re-exports, rejects relative escapes, undeclared imports and computed
import/require calls, and distinguishes development dependencies from runtime
dependencies. Zod is explicitly declared by the package. This is separate from
the unchanged, stricter runtime-import check on decision leaves. Indirect loading
through arbitrary functions is not statically proved; the isolated core install
and packed-consumer smoke run in the separate core CI job.

Leaf discovery includes `packages/kordex-core/src`. Its fixture first failed
because the core leaf was absent, then passed after the root was added. Negative
package-boundary fixtures cover app type imports, re-exports, runtime imports,
development-only dependencies and test/config escapes.

See [leaf schema](../docs/capabilities/SCHEMA.md). The decision import check is
opt-in for declared modules and conservative about unknown runtime imports. It
does not prove mathematical purity, runtime reachability or global architecture.
Owner syntax is read with the TypeScript parser; application dependencies and
native code are not imported. Existing app tests are referenced but not run by
this gate. Shape checks and byte-identical host skills do not prove model behavior.

See [transfer ledger](../docs/engineering/TRANSFER.md) for source provenance and
deliberate adaptations. Tools use pinned local dependencies and a lockfile;
there is no automatic upstream pack updater or arbitrary code download on check.

The Markdown guard checks inline links/images, with optional titles, and skips
top-level fenced code and inline code spans. It is not a full Markdown renderer:
reference-style links, HTML and nested block containers are outside its contract.
