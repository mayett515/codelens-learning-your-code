# K1b: headless semantic profile and explicit learning extension

2026-11-09. The owner requested this structural slice before K2. Existing
learning behavior and serialized full profiles remain compatible; headless
profiles no longer need presentation defaults. No storage, rule kind, source
provenance field, rule history, mobile fix or schema migration is implemented.

## Responsibility and callers

`packages/kordex-core/src/types.ts` owns the minimal semantic profile.
`extensions/learningProfile.ts` owns the optional complete learning extension.
The existing semantic composer remains the owner of ordering and ontology
composition, delegating unchanged label/metadata/graph merging to
`extensions/learningProfileComposition.ts`. No second semantic composition loop.

The definition codec owns strict parsing and identity/version agreement. It
accepts either a bare semantic profile or a complete learning profile; it never
strips unknown fields or accepts a partial learning extension. The app facade
selects the strict learning validator. Registry/selection/activation/base-candidate
functions preserve explicit extension types. App registry facades specialize
only the learning type parameter and delegate all decisions to core.

Coding and photography still opt into the same full learning shape. No default
engineering profile is registered. Optional compatibility code remains shipped
inside the pure package to preserve those profiles and their old overlay language;
this slice does not claim all learning concepts have been removed from the package.

The composition, selection and standalone registry leaves stay implemented for
their stated pure responsibility and now cite headless evidence. App persistence
leaves keep their existing partial states. Accepted-state history remains a
separate design in the shared R3/A1 note.

## Failing-first proof and reconciliation

The first four new tests failed against the original implementation: definition
validation rejected eight missing app field groups, and composition, selection
and base-candidate calculation attempted `base.labels.flashback`. They now pass.
Three further core cases cover strict extension boundaries, rejected learning
patches on bare profiles, and preserved photography configuration. One app
regression proves its definition/row boundary still rejects bare profiles.

| Suite | Previous | Current | Difference |
| --- | ---: | ---: | --- |
| Core | 359 | 366 | Seven headless/extension contract cases in one new file |
| App | 780 | 781 | One strict app definition-boundary regression |
| Total | 1139 | 1147 | All existing assertions retained; eight additions |

No tests moved or were deleted. Existing core learning fixtures now name their
explicit learning type; the activation fixtures carry that extension through
annotated source inputs. App architecture guard paths were corrected separately
after relocation, retaining all 91 content assertions.

## Executed checks

- `npm --prefix packages/kordex-core run typecheck` and `run build`: exit 0.
- `npm --prefix packages/kordex-core run verify:isolation`: exit 0; clean install,
  compiler and 366 tests with no app dependency, then a packed consumer containing
  only core and Zod. The consumer also validates/composes a bare profile.
- `npm ci` in `codelens-rn`: refreshed the packed file dependency successfully.
- `npm test` in the app: 781/781 passed; local TypeScript compiler: exit 0.
- App `scripts/check-core-install.cjs`: current packed core and one shared
  Zod 4.3.6 instance confirmed.
- Lint initially caught duplicate facade re-exports; these were replaced with
  explicit exports. Focused lint over every changed app module/test passes.
- Tooling gate including final leaf evidence: 32/32, exit 0; generated map and
  links checked. `git diff --check`: exit 0.
- Full app lint: four pre-existing errors and 196 warnings, unchanged from K1.
  Remaining errors: duplicate `BookmarkId` exports at bookmarks/index.ts:14/15;
  missing display names in ChatBubble.tsx:28 and CodeViewer.tsx:67.
- The seven-check engineering-rule probe passes with a bare semantic profile.

Isolation evidence was retained at
`C:/Users/vonma/AppData/Local/Temp/kordex-core-isolation-osbK28` during this run.
At report creation, remote CI was pending; the PR checks hold subsequent run
results. Native bundling, device UI,
SQLite rollback, durable history/restart, CLI and MCP are not established here.
The known mobile transaction defect stays open. K2 requires a concrete storage
schema decision; this slice creates neither a speculative port nor an adapter.

Next decision: [K2 storage options](../reviews/2026-11-09-k2-storage-choice.md).
Recommendation is SQLite with full immutable accepted-state snapshots, rather
than implementing a replay engine before there is a demonstrated size need.
The owner's schema stop applies; no adapter or durable schema has been created.
