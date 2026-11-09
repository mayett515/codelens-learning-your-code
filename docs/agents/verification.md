# Verification and evidence

Repository tooling, Leaves and shared skills have an independent gate:
`npm --prefix tools ci --ignore-scripts`, then `npm --prefix tools run check` from the root.
See [tooling](../../tools/README.md) for generation, mirror sync and exact limits.
The application commands below apply to the existing RN implementation.

After K1, build the local core before installing the app: run
`npm --prefix packages/kordex-core ci` and
`npm --prefix packages/kordex-core run build`, then install the app lockfile.
The app's `install-links=true` packs the built file dependency into its own
`node_modules`; rerun app `npm ci` after rebuilding changed core source.
`node codelens-rn/scripts/check-core-install.cjs` verifies the installed copy and
shared Zod resolution. It does not exercise Metro or a device.

Core checks run from `packages/kordex-core/`: `npm run build`,
`npm run typecheck`, `npm test`, and `npm run verify:isolation`.
The last command installs only the copied core's own lockfile in a clean
temporary directory, builds/tests there, then installs a packed consumer with
only core and Zod. No app dependencies are needed. See the
[K1 reconciliation](../progress/2026-11-09-core-test-reconciliation.md).

Commands below run from `codelens-rn/` and use the existing
[package.json](../../codelens-rn/package.json), npm lockfile and
[tsconfig.json](../../codelens-rn/tsconfig.json). Install the locked dependencies
with `npm ci` when implementation work requires them and the environment permits
it; this runs the repository's `patch-package` postinstall. A docs-only change
does not require an install or a native build.

| Check | Command | What it establishes |
| --- | --- | --- |
| Selected app behavior tests | `npm test -- src/features/ontology/__tests__/runtimeProfileActivation.test.ts` | Assertions in that test under Vitest's configured environment; pure selection tests now run in core |
| Existing architecture guards | `npm test -- src/__tests__/stage10-architecture-guards.test.ts` | Specific source-text constraints; not a complete semantic/import graph proof |
| Full existing suite | `npm test` | Existing suite results, including any environment failures |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | Compile-time consistency with the app configuration |
| Lint | `npm run lint` | Existing Expo ESLint rules; do not claim rules that are not configured |

There is no `npm run typecheck`, Knip command or dependency-cruiser gate in the
current package scripts. General module boundaries in [module-map](module-map.md)
remain review policy except where a specific guard enforces one. The leaf checker
follows static runtime imports of explicitly declared `decision` owners;
it does not check all modules or replace runtime/application tests.
Do not claim that writing AGENTS.md made imports mechanically safe.

## GitHub checks

The [workflow](../../.github/workflows/repository-checks.yml) runs separate
repository-tooling, isolated-core and application jobs on pushes and pull requests. The app job
installs its lockfile dependencies (including the existing postinstall), runs
the full Vitest suite and the local TypeScript compiler on Linux/Node 24.
The workflow does not run a native build or establish SQLite rollback.
The core job executes the isolated source build, tests and packed consumer.
The app job builds core before app installation and checks shared Zod resolution.

Lint is not a blocking CI step while the four recorded baseline errors remain;
see the [baseline run](../progress/2026-11-09-milestones.md). Local lint and the
requirement to introduce no new findings still apply. Workflow configuration
alone is not execution evidence; cite the observed run and revision when
reporting remote verification.

## Select proof by the changed responsibility

Pure ontology tests named below moved to `packages/kordex-core/src/__tests__/`.
App service/repository/UI tests remain in `codelens-rn`; mixed codec/default-profile
tests are split across both packages. Consult the reconciliation for exact counts.

| Change | Relevant existing tests / required additional evidence |
| --- | --- |
| Registry, selection, composition | `src/features/ontology/__tests__/profileRegistryBootstrap.test.ts`, `profileSelection.test.ts`, `profileComposition.test.ts`; exercise foreign-parent and duplicate-source cases where relevant |
| Freshness or apply | Ontology tests `profileProposalFreshness.test.ts`, `branchLocalProposalApplyService.test.ts`, `baseProfileProposalApplyService.test.ts`; real DB failure/rollback proof for transaction changes |
| Checker mapping/runtime | Ontology tests `checkerProposalMapper.test.ts`, `checkerRunService.test.ts`; validate unsupported input, unknown evidence, duplicates, caps, cancellation and concurrent target change |
| A second base profile | Ontology `secondBaseForkability.test.ts` plus the default production bootstrap/save/read-back path; injected dependencies alone do not prove that path |
| Capture/profile propagation | Learning service tests `stage2-saveCapture.test.ts`, `conceptualizeProfileContext.test.ts`, `conceptualizeCorrections.test.ts`; route/store/modal propagation and read-back for non-coding context |
| DB/codec/backup | Affected migration and codec tests plus an actual database with representative pre-migration rows; round-trip export/import when the durable shape changes |
| UI/navigation/native wiring | Exercise the affected flow in a running supported app environment; Node tests cannot prove native SQLite, navigation or layout |
| Rules/docs only | Check local links, referenced files and commands, shared imports, contradictory claims and `git diff --check`; no implementation-mirroring test required |

## Interpret results honestly

- A mocked `transaction(callback)` that invokes the callback cannot prove
  rollback or actual SQLite concurrency. Test an injected failure after a write
  against the real persistence boundary when modifying atomic behavior.
- Assert intended effects and absence of unintended effects: stale or invalid
  apply must not leave target/status/audit partly committed. Checker duplicate
  handling must not rewrite an existing pending proposal.
- Test scope through the complete caller chain, including colliding node IDs in
  different bases. Profile-aware retrieval does not prove profile-aware saving.
- Prefer observable behavior over snapshots of implementation text. Keep useful
  source guards, but change them with a legitimate extraction rather than pinning
  obsolete file structure forever.
- Use generated/property tests when a combinatorial invariant warrants them;
  the old bundle's suggestion is not a requirement to install `fast-check` for
  every task. Concrete regression examples remain valuable.
- If a needed check cannot run, name the missing dependency/environment and the
  unproved claim. Do not replace it with a cheaper check and call it equivalent.
- For a future automated hook/CI guard, demonstrate a deliberate invalid case
  fails and the repaired case passes before calling that mechanism enforced.
