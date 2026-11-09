# K1 extraction report — 2026-11-09

Owner-approved larger cut implemented in `packages/kordex-core` on
`codex/kordex-rule-leaf-adoption`. Baseline: `a2efaee`. Stop after K1 for
Fable review; no K2 storage, rule-model implementation or merge into main.

## Result and responsibility

- 22 top-level domain modules and two optional seed profiles moved with `git mv`.
  Their source is unchanged after normalizing line endings against the baseline.
- Seven codecs moved their domain validation into core. Their 14 row conversion
  functions and app schema types remain in the app. AST comparison confirmed
  all 102 original codec declarations are unchanged, apart from exporting
  existing helpers needed by the row mappers. No schema or policy was copied.
- App callers retain existing paths through compatibility exports. App
  `index.ts` keeps coding defaults; `runtimeProfileActivation.ts`, services,
  repositories, hooks and UI keep their responsibilities. Pure apply helpers
  calculate candidates; they are not portable transactional writers.
- Core initializes no registry/storage and selects no profile. Coding and
  photography are optional subpaths. No new ports, schema, rule records,
  parent/child behavior or mobile-driver repair are part of K1.

Four composition/selection/context/projection leaves moved beside their owners,
staying `implemented` for unchanged narrow responsibilities. The former planned
`standalone-core` leaf now binds the actual registry owner and scopes its claim
to explicit source resolution through an independently executable package. App
leaf states/gaps remain unchanged; one freshness-test evidence path moved.
Discovery roots and generated map now include the package.

## Resolution

No workspace or compiler-only alias: the app uses
`file:../packages/kordex-core` with `.npmrc` `install-links=true`. Build core,
then install the app lockfile. Compiler, Vitest and Metro receive built JS/types
inside app `node_modules`. The install verifier checks the packed copy against
the current build. After a core change, rebuild and rerun app `npm ci`.

Zod stays **4.3.6**: exact core peer/dev dependency and exact app dependency.
Build/test tools reuse TypeScript 5.9.2, Vitest 4.1.4 and Node types 24.10.0.
The packed package contains no development `node_modules`. Both sides resolve
the same Zod path and instance; schema composition crosses the boundary in a
smoke check. Domain acceptance does not use `instanceof` as its protocol.

**Metro/native execution is unverified.** App suite/compiler and Node package
resolution are the app proof. No device, emulator or native tooling was used.

## Local proof

| Command / check | Observed result |
| --- | --- |
| Baseline app Vitest JSON run before moving | 1139/1139, 121 files |
| Core `npm run build` and `npm run typecheck` | Exit 0, independent configuration |
| Core `npm test` | 359/359, 29 files |
| App `npm ci --no-audit --no-fund` | Exit 0; existing op-sqlite patch applies |
| App `node node_modules/typescript/bin/tsc --noEmit` | Exit 0 |
| App `npm test` | 780/780, 104 files |
| `node codelens-rn/scripts/check-core-install.cjs` | Current packed core, same Zod, cross-package schema parsing passes |
| Core `npm run verify:isolation` | Independent install/build/compiler, 359/359 tests, tarball installed into a second empty consumer; exports and validation pass |
| `npm --prefix tools run check` | Exit 0; compiler and 32/32 fixtures |
| App `npm run lint` | Exit 1; same four baseline errors, 196 warnings |
| `git diff --check` | Exit 0 |

The [reconciliation](2026-11-09-core-test-reconciliation.md) lists every moved or
split file. **359 + 780 = 1139**; a multiset comparison of original filename and
full test name confirms no loss or duplication. New checker/smoke checks are
separate. Source-reading guards now inspect actual core owners.

New tooling fixtures ran red first: root discovery missed the core leaf, and
three boundary fixtures accepted prohibited type/runtime/config dependencies.
All pass after implementation. The stricter decision checker was not weakened
to permit Zod; package independence is a separate check including erased types.

The first packed-consumer smoke fixture omitted required label/description
fields. Correcting that fixture, without changing validation, made it pass.
Successful local isolation evidence remains under
`C:/Users/vonma/AppData/Local/Temp/kordex-core-isolation-WfXiPP`.

The unchanged lint errors are duplicate `BookmarkId` exports at
`codelens-rn/src/features/bookmarks/index.ts:14` and `:15`, and missing display
names at `src/ui/components/ChatBubble.tsx:28` and `CodeViewer.tsx:67`.
The lower warning count reflects relocated source and removal of unused split
fixtures/imports, not a newly lint-clean core. No lint rule was disabled.

## Remote evidence

The workflow has separate repository, isolated-core and app jobs. Actual remote
results will be recorded after observing the K1 run; configuration alone is not
a passed CI claim.

## Limits and next step

The mobile Drizzle rollback defect remains open. Pure tests and compilation do
not prove database transactions, native scheduling or route handover. No desktop
storage, CLI rule lifecycle or MCP surface exists. A1/B1/C1 remain undecided.

Next is K1 review. The [rule-model interview](../reviews/2026-11-09-rule-model-interview.md)
compares scoped-profile lifecycle reuse with a separate rule record and names
what each reuses/duplicates. Resolve it before storage design; do not silently
turn ontology categories into generic rules.
