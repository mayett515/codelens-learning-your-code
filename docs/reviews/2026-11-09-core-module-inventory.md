# Ontology module extraction inventory

Inspected 2026-11-09 at `75f608d`. Read-only application inspection; no files moved.

69 non-test TypeScript/TSX modules were evaluated with the existing
[decisionDependencyProblems](../../tools/source-facts.ts) function, unchanged.
22 pass its transitive runtime-import rule; 47 report dependencies. Passing is
not mathematical purity. In addition, an AST traversal followed both runtime
and type-only relative imports inside ontology and recorded every exit below.
The runtime checker deliberately ignores type-only imports, so it alone cannot
prove a package will compile without the app. Exits are transitive, not a claim
that each module directly imports every listed dependency.

18 of the 22 passing modules are directly movable mechanics; the other four are
query keys, two domain templates, and project-specific store orchestration.
No matching ambient clock/random/network calls were found in those 18 during
source/AST inspection; caller-supplied objects/functions are still contracts,
not proof of total purity. The string `process.` in a photography description
was a text-search false positive. No independence test has run yet.

Fable's grouping is confirmed: 24 top-level modules, seven codecs, two profiles,
21 data modules, 11 hooks and four UI modules. The first 33 have no React/Expo,
app DB or AI **runtime** dependency; their only external runtime dependency is
Zod. The qualification is type-level portability: all seven codecs import app
row types, and apply/mapper/barrel consumers inherit that dependency. Also,
runtimeProfileActivation invokes supplied stores rather than being a pure
decision. The [boundary proposal](2026-11-09-core-package-boundary.md) adds the
portable validated algorithms after separating row mapping, and relocates the
two templates through optional exports rather than treating them as core defaults.

Reproduction of the existing runtime check (from the repository root):

```js
import path from "node:path";
import { walkFiles } from "./tools/leaf-inventory.ts";
import { decisionDependencyProblems } from "./tools/source-facts.ts";
const root = process.cwd();
for (const file of walkFiles(root, "codelens-rn/src/features/ontology")) {
  if (/\.tsx?$/.test(file) && !file.includes("/__tests__/")) {
    console.log(file, decisionDependencyProblems(root, path.resolve(root, file)));
  }
}
```

The tables are a dated result, not a new allowlist or a weakened checker.
`zod` is a portable validation library; a checker rejection is not evidence that
Zod is mobile or impure. Its adoption and the row-type split remain explicit.

## Modules passing the runtime check

| Module | Extraction disposition |
| --- | --- |
| [baseProfileVersioning.ts](../../codelens-rn/src/features/ontology/baseProfileVersioning.ts) | Initial core candidate; no external runtime or type import found. |
| [contextAssembly.ts](../../codelens-rn/src/features/ontology/contextAssembly.ts) | Initial core candidate; no external runtime or type import found. |
| [contextSelector.ts](../../codelens-rn/src/features/ontology/contextSelector.ts) | Initial core candidate; no external runtime or type import found. |
| [corrections.ts](../../codelens-rn/src/features/ontology/corrections.ts) | Initial core candidate; no external runtime or type import found. |
| [data/queryKeys.ts](../../codelens-rn/src/features/ontology/data/queryKeys.ts) | App query-cache key vocabulary; keep in app despite checker pass. |
| [metadata.ts](../../codelens-rn/src/features/ontology/metadata.ts) | Initial core candidate; no external runtime or type import found. |
| [profileActivation.ts](../../codelens-rn/src/features/ontology/profileActivation.ts) | Initial core candidate; no external runtime or type import found. |
| [profileBranchStore.ts](../../codelens-rn/src/features/ontology/profileBranchStore.ts) | Initial core candidate; no external runtime or type import found. |
| [profileBranches.ts](../../codelens-rn/src/features/ontology/profileBranches.ts) | Initial core candidate; no external runtime or type import found. |
| [profileComposition.ts](../../codelens-rn/src/features/ontology/profileComposition.ts) | Initial core candidate; no external runtime or type import found. |
| [profileProposalFreshness.ts](../../codelens-rn/src/features/ontology/profileProposalFreshness.ts) | Initial core candidate; no external runtime or type import found. |
| [profileProposalTargetSwitch.ts](../../codelens-rn/src/features/ontology/profileProposalTargetSwitch.ts) | Initial core candidate; no external runtime or type import found. |
| [profileRegistry.ts](../../codelens-rn/src/features/ontology/profileRegistry.ts) | Initial core candidate; no external runtime or type import found. |
| [profileSelection.ts](../../codelens-rn/src/features/ontology/profileSelection.ts) | Initial core candidate; no external runtime or type import found. |
| [profileSelectionDraft.ts](../../codelens-rn/src/features/ontology/profileSelectionDraft.ts) | Initial core candidate; no external runtime or type import found. |
| [profiles/codingProfile.ts](../../codelens-rn/src/features/ontology/profiles/codingProfile.ts) | Domain template data; proposed optional package export, never a core default. |
| [profiles/photographyProfile.ts](../../codelens-rn/src/features/ontology/profiles/photographyProfile.ts) | Domain template data; proposed optional package export, never a core default. |
| [runtimeProfileActivation.ts](../../codelens-rn/src/features/ontology/runtimeProfileActivation.ts) | Calls supplied stores; project selection and coding default. Portable orchestration, not a pure decision; keep outside initial cut. |
| [runtimeProfileCoordinator.ts](../../codelens-rn/src/features/ontology/runtimeProfileCoordinator.ts) | Initial core candidate; no external runtime or type import found. |
| [scopedMeaning.ts](../../codelens-rn/src/features/ontology/scopedMeaning.ts) | Initial core candidate; no external runtime or type import found. |
| [types.ts](../../codelens-rn/src/features/ontology/types.ts) | Initial core candidate; no external runtime or type import found. |
| [userFitProjection.ts](../../codelens-rn/src/features/ontology/userFitProjection.ts) | Initial core candidate; no external runtime or type import found. |

## Every remaining module and its blocker

`app DB` below means `codelens-rn/src/db/client.ts` or `schema.ts`; these are
forbidden core dependencies even when reached only through types.

| Module | Why it does not belong in the initial cut | Transitive exits including type imports |
| --- | --- | --- |
| [baseProfileProposalApply.ts](../../codelens-rn/src/features/ontology/baseProfileProposalApply.ts) | Algorithm reaches Zod validators and transitive app row types; detach validators first, preserve validation behavior. | `app DB/schema.ts`, `zod` |
| [branchLocalProposalApply.ts](../../codelens-rn/src/features/ontology/branchLocalProposalApply.ts) | Algorithm reaches Zod validators and transitive app row types; detach validators first, preserve validation behavior. | `app DB/schema.ts`, `zod` |
| [checkerPromptBuilder.ts](../../codelens-rn/src/features/ontology/checkerPromptBuilder.ts) | Zod-only runtime dependency; portable validation/prompt policy, but not dependency-free. Explicit later validation boundary. | `zod` |
| [checkerProposalMapper.ts](../../codelens-rn/src/features/ontology/checkerProposalMapper.ts) | Algorithm reaches Zod validators and transitive app row types; detach validators first, preserve validation behavior. | `app DB/schema.ts`, `zod` |
| [codecs/ontologyCorrectionEvidence.ts](../../codelens-rn/src/features/ontology/codecs/ontologyCorrectionEvidence.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [codecs/profileBranch.ts](../../codelens-rn/src/features/ontology/codecs/profileBranch.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [codecs/profileChangeProposal.ts](../../codelens-rn/src/features/ontology/codecs/profileChangeProposal.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [codecs/profileDefinition.ts](../../codelens-rn/src/features/ontology/codecs/profileDefinition.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [codecs/profileProposalEvent.ts](../../codelens-rn/src/features/ontology/codecs/profileProposalEvent.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [codecs/profileSelection.ts](../../codelens-rn/src/features/ontology/codecs/profileSelection.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [codecs/profileTrustSetting.ts](../../codelens-rn/src/features/ontology/codecs/profileTrustSetting.ts) | Zod validation mixed with Drizzle row conversion/type import via data/schema; separate domain parsing from app row mapping before reuse. | `app DB/schema.ts`, `zod` |
| [data/baseProfileProposalApplyService.ts](../../codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/branchLocalProposalApplyService.ts](../../codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/checkerRunService.ts](../../codelens-rn/src/features/ontology/data/checkerRunService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/index.ts](../../codelens-rn/src/features/ontology/data/index.ts) | Effectful repository/service barrel; adapter only. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/ontologyCorrectionEvidenceRepo.ts](../../codelens-rn/src/features/ontology/data/ontologyCorrectionEvidenceRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileBranchRepo.ts](../../codelens-rn/src/features/ontology/data/profileBranchRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileChangeProposalEditService.ts](../../codelens-rn/src/features/ontology/data/profileChangeProposalEditService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/profileChangeProposalLifecycleService.ts](../../codelens-rn/src/features/ontology/data/profileChangeProposalLifecycleService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/profileChangeProposalRefreshService.ts](../../codelens-rn/src/features/ontology/data/profileChangeProposalRefreshService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/profileChangeProposalRepo.ts](../../codelens-rn/src/features/ontology/data/profileChangeProposalRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileChangeProposalReviewService.ts](../../codelens-rn/src/features/ontology/data/profileChangeProposalReviewService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/profileChangeProposalTargetSwitchService.ts](../../codelens-rn/src/features/ontology/data/profileChangeProposalTargetSwitchService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [data/profileDefinitionRepo.ts](../../codelens-rn/src/features/ontology/data/profileDefinitionRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileProposalEventRepo.ts](../../codelens-rn/src/features/ontology/data/profileProposalEventRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileProposalFreshnessService.ts](../../codelens-rn/src/features/ontology/data/profileProposalFreshnessService.ts) | Application orchestration with concrete repositories/client; IDs/time/defaults must be supplied and transactions expressed through a core-owned port. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileRegistryBootstrap.ts](../../codelens-rn/src/features/ontology/data/profileRegistryBootstrap.ts) | Concrete stored source and bundled templates; composition root, not core policy. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileSelectionRepo.ts](../../codelens-rn/src/features/ontology/data/profileSelectionRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/profileTrustSettingRepo.ts](../../codelens-rn/src/features/ontology/data/profileTrustSettingRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [data/schema.ts](../../codelens-rn/src/features/ontology/data/schema.ts) | Runtime re-export of the app database schema; adapter only. | `app DB/schema.ts` |
| [data/userFitHistoryRepo.ts](../../codelens-rn/src/features/ontology/data/userFitHistoryRepo.ts) | App database/client, Drizzle queries and row codecs; replace through a storage port, do not move into core. | `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [hooks/manualCheckerReviewAdapter.ts](../../codelens-rn/src/features/ontology/hooks/manualCheckerReviewAdapter.ts) | Concrete AI queue plus checker service; model adapter stays outside core. | `app/ai/queue.ts`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [hooks/useApplyProfileChangeProposal.ts](../../codelens-rn/src/features/ontology/hooks/useApplyProfileChangeProposal.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [hooks/useEditProfileChangeProposal.ts](../../codelens-rn/src/features/ontology/hooks/useEditProfileChangeProposal.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [hooks/useProfileChangeProposals.ts](../../codelens-rn/src/features/ontology/hooks/useProfileChangeProposals.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [hooks/useProfileProposalEvents.ts](../../codelens-rn/src/features/ontology/hooks/useProfileProposalEvents.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [hooks/useProfileProposalFreshness.ts](../../codelens-rn/src/features/ontology/hooks/useProfileProposalFreshness.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `zod` |
| [hooks/useProfileSelection.ts](../../codelens-rn/src/features/ontology/hooks/useProfileSelection.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid/non-secure`, `zod` |
| [hooks/useRefreshProfileChangeProposal.ts](../../codelens-rn/src/features/ontology/hooks/useRefreshProfileChangeProposal.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [hooks/useReviewProfileChangeProposal.ts](../../codelens-rn/src/features/ontology/hooks/useReviewProfileChangeProposal.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [hooks/useRunManualOntologyChecker.ts](../../codelens-rn/src/features/ontology/hooks/useRunManualOntologyChecker.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app/ai/queue.ts`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `react`, `zod` |
| [hooks/useSwitchProfileChangeProposalTarget.ts](../../codelens-rn/src/features/ontology/hooks/useSwitchProfileChangeProposalTarget.ts) | React Query (and in places React/ID generation), concrete services/repos; delivery wiring. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `drizzle-orm`, `nanoid`, `zod` |
| [index.ts](../../codelens-rn/src/features/ontology/index.ts) | Mixed public barrel plus coding defaults; do not transplant. Its apply exports reach validation and app row types. | `app DB/schema.ts`, `zod` |
| [ui/ProfileProposalReviewEntry.tsx](../../codelens-rn/src/features/ontology/ui/ProfileProposalReviewEntry.tsx) | React/React Native, theme and hooks; delivery layer. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `app/ui/theme.ts`, `drizzle-orm`, `react-native`, `zod` |
| [ui/ProfileProposalReviewScreen.tsx](../../codelens-rn/src/features/ontology/ui/ProfileProposalReviewScreen.tsx) | React/React Native, theme and hooks; delivery layer. | `@tanstack/react-query`, `app/ai/queue.ts`, `app DB/client.ts`, `app DB/schema.ts`, `app/ui/theme.ts`, `drizzle-orm`, `nanoid`, `nanoid/non-secure`, `react`, `react-native`, `zod` |
| [ui/ProfileSelectionPanel.tsx](../../codelens-rn/src/features/ontology/ui/ProfileSelectionPanel.tsx) | React/React Native, theme and hooks; delivery layer. | `@tanstack/react-query`, `app DB/client.ts`, `app DB/schema.ts`, `app/ui/theme.ts`, `drizzle-orm`, `nanoid/non-secure`, `react`, `react-native`, `zod` |
| [ui/profileProposalReviewPresentation.ts](../../codelens-rn/src/features/ontology/ui/profileProposalReviewPresentation.ts) | Presentation formatting/error dialect, transitively Zod/app row types; keep in delivery layer. | `app DB/schema.ts`, `zod` |

## Guard that must survive later extraction

The pure `branchLocalProposalApply.ts` helper does not compare the proposal
snapshot with the current branch. The repaired guard is in
`data/branchLocalProposalApplyService.ts`, which calls
`evaluateProfileProposalFreshness` inside its transaction. Moving only the
helper would lose the guarded-apply boundary. The later port-driven use case
must retain this check with current transactional reads and conditional writes.
Base-version validation is in `baseProfileVersioning.ts`; storage atomicity is
still the adapter's obligation. No package proposal may inherit a false rollback
claim from the app's mocked tests.

## Test dependency audit

All 52 ontology test files were inspected for imports and explicit module mocks.
Their runtime dependencies also follow the module graph above. This is source
inspection, not a standalone execution. The existing app-wide architecture guards
also read ontology source files by path and must follow the real owners after
extraction, retaining their assertions.

| Test | Relevant imports / mocks | Disposition |
| --- | --- | --- |
| [activeProfile.test.ts](../../codelens-rn/src/features/ontology/__tests__/activeProfile.test.ts) | `vitest`, `index.ts`, `profiles/codingProfile.ts`, `types.ts` | Keep app default/project/presentation contract test. |
| [baseProfileProposalApply.test.ts](../../codelens-rn/src/features/ontology/__tests__/baseProfileProposalApply.test.ts) | `vitest`, `baseProfileVersioning.ts`, `baseProfileProposalApply.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [baseProfileProposalApplyService.test.ts](../../codelens-rn/src/features/ontology/__tests__/baseProfileProposalApplyService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `baseProfileVersioning.ts`, `data/baseProfileProposalApplyService.ts`, `profiles/codingProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [baseProfileVersioning.test.ts](../../codelens-rn/src/features/ontology/__tests__/baseProfileVersioning.test.ts) | `vitest`, `baseProfileVersioning.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [branchLocalProposalApply.test.ts](../../codelens-rn/src/features/ontology/__tests__/branchLocalProposalApply.test.ts) | `node:fs`, `node:path`, `vitest`, `branchLocalProposalApply.ts`, `profileBranches.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [branchLocalProposalApplyService.test.ts](../../codelens-rn/src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `branchLocalProposalApply.ts`, `data/branchLocalProposalApplyService.ts`, `profiles/codingProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [checkerPromptBuilder.test.ts](../../codelens-rn/src/features/ontology/__tests__/checkerPromptBuilder.test.ts) | `vitest`, `index.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [checkerProposalMapper.test.ts](../../codelens-rn/src/features/ontology/__tests__/checkerProposalMapper.test.ts) | `vitest`, `index.ts`, `codecs/profileChangeProposal.ts`, `ui/profileProposalReviewPresentation.ts` | Move mapper cases; retain presentation assertions in app. Replace app-barrel imports with core entry. |
| [checkerRunService.test.ts](../../codelens-rn/src/features/ontology/__tests__/checkerRunService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `checkerPromptBuilder.ts`, `data/checkerRunService.ts`, `codecs/profileChangeProposal.ts`, `profiles/codingProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [codingProfile.test.ts](../../codelens-rn/src/features/ontology/__tests__/codingProfile.test.ts) | `vitest`, `codelens-rn/src/features/learning/types/learning.ts`, `profiles/codingProfile.ts`, `types.ts`, `metadata.ts` | Split portable profile assertions from learning-type compatibility assertion; keep the latter in app. |
| [contextAssembly.test.ts](../../codelens-rn/src/features/ontology/__tests__/contextAssembly.test.ts) | `vitest`, `contextAssembly.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [contextSelector.test.ts](../../codelens-rn/src/features/ontology/__tests__/contextSelector.test.ts) | `node:fs`, `node:path`, `vitest`, `index.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [corrections.test.ts](../../codelens-rn/src/features/ontology/__tests__/corrections.test.ts) | `vitest`, `profiles/codingProfile.ts`, `index.ts`, `types.ts`, `corrections.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [ontologyCorrectionEvidenceCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/ontologyCorrectionEvidenceCodec.test.ts) | `vitest`, `codecs/ontologyCorrectionEvidence.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [photographyProfile.test.ts](../../codelens-rn/src/features/ontology/__tests__/photographyProfile.test.ts) | `vitest`, `profiles/photographyProfile.ts`, `codecs/profileDefinition.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileActivation.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileActivation.test.ts) | `vitest`, `index.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileBranchCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileBranchCodec.test.ts) | `vitest`, `codecs/profileBranch.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [profileBranchStore.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileBranchStore.test.ts) | `node:fs`, `node:path`, `vitest`, `profileBranchStore.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileBranches.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileBranches.test.ts) | `node:fs`, `node:path`, `vitest`, `profileBranches.ts`, `runtimeProfileCoordinator.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileChangeProposalCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileChangeProposalCodec.test.ts) | `vitest`, `codecs/profileChangeProposal.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [profileChangeProposalEditService.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileChangeProposalEditService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `branchLocalProposalApply.ts`, `baseProfileProposalApply.ts`, `data/profileChangeProposalEditService.ts`, `data/profileChangeProposalLifecycleService.ts`, `profiles/codingProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileChangeProposalLifecycleService.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileChangeProposalLifecycleService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `data/profileChangeProposalLifecycleService.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileChangeProposalRefreshService.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileChangeProposalRefreshService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `branchLocalProposalApply.ts`, `data/profileChangeProposalRefreshService.ts`, `profiles/codingProfile.ts`, `profileRegistry.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileChangeProposalReviewService.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `data/profileChangeProposalReviewService.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileChangeProposalTargetSwitchService.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileChangeProposalTargetSwitchService.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `baseProfileProposalApply.ts`, `profileProposalTargetSwitch.ts`, `data/profileChangeProposalTargetSwitchService.ts`, `profiles/codingProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileComposition.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileComposition.test.ts) | `vitest`, `profileComposition.ts`, `types.ts`, `profiles/codingProfile.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileDefinitionCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileDefinitionCodec.test.ts) | `vitest`, `codecs/profileDefinition.ts`, `profiles/codingProfile.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [profileProposalEventCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileProposalEventCodec.test.ts) | `vitest`, `codecs/profileProposalEvent.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [profileProposalFreshness.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileProposalFreshness.test.ts) | `vitest`, `profileProposalFreshness.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileProposalFreshnessService.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileProposalFreshnessService.test.ts) | `vitest`, `data/profileProposalFreshnessService.ts`, `profiles/codingProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileProposalReviewPresentation.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts) | `vitest`, `branchLocalProposalApply.ts`, `baseProfileProposalApply.ts`, `ui/profileProposalReviewPresentation.ts`, `types.ts` | Keep app default/project/presentation contract test. |
| [profileProposalTargetSwitch.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileProposalTargetSwitch.test.ts) | `vitest`, `profileProposalTargetSwitch.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileRegistry.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileRegistry.test.ts) | `node:fs`, `node:path`, `vitest`, `profileRegistry.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileRegistryBootstrap.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileRegistryBootstrap.test.ts) | `vitest`, `profileRegistry.ts`, `profiles/codingProfile.ts`, `profiles/photographyProfile.ts`, `types.ts`, `data/profileRegistryBootstrap.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [profileSelection.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileSelection.test.ts) | `node:fs`, `node:path`, `vitest`, `profileBranches.ts`, `profileSelection.ts`, `profiles/codingProfile.ts`, `profiles/photographyProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileSelectionCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileSelectionCodec.test.ts) | `vitest`, `codecs/profileSelection.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [profileSelectionDraft.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileSelectionDraft.test.ts) | `vitest`, `profileSelectionDraft.ts`, `index.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [profileTrustSettingCodec.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileTrustSettingCodec.test.ts) | `vitest`, `codecs/profileTrustSetting.ts`, `types.ts` | Move domain-validation cases; keep app row-mapping round trips in app. No Drizzle row type in core tests. |
| [profileTrustSettingRepo.test.ts](../../codelens-rn/src/features/ontology/__tests__/profileTrustSettingRepo.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `data/profileTrustSettingRepo.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [runtimeProfileActivation.test.ts](../../codelens-rn/src/features/ontology/__tests__/runtimeProfileActivation.test.ts) | `node:fs`, `node:path`, `vitest`, `runtimeProfileActivation.ts`, `index.ts`, `profileSelection.ts`, `profileRegistry.ts`, `profileBranchStore.ts`, `profiles/codingProfile.ts`, `types.ts` | Keep app default/project/presentation contract test. |
| [runtimeProfileCoordinator.test.ts](../../codelens-rn/src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts) | `vitest`, `runtimeProfileCoordinator.ts`, `profileActivation.ts`, `profiles/codingProfile.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [scopedMeaning.test.ts](../../codelens-rn/src/features/ontology/__tests__/scopedMeaning.test.ts) | `vitest`, `scopedMeaning.ts`, `types.ts` | Candidate for core tests; redirect barrel/profile imports to standalone exports; preserve source-guard assertions at new owners. |
| [secondBaseForkability.test.ts](../../codelens-rn/src/features/ontology/__tests__/secondBaseForkability.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `checkerPromptBuilder.ts`, `data/baseProfileProposalApplyService.ts`, `data/branchLocalProposalApplyService.ts`, `data/checkerRunService.ts`, `data/profileChangeProposalTargetSwitchService.ts`, `data/profileRegistryBootstrap.ts`, `profileSelection.ts`, `profiles/photographyProfile.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useApplyProfileChangeProposal.test.ts](../../codelens-rn/src/features/ontology/__tests__/useApplyProfileChangeProposal.test.ts) | `vitest`, `profiles/codingProfile.ts`, `profileRegistry.ts`, `hooks/useApplyProfileChangeProposal.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useEditProfileChangeProposal.test.ts](../../codelens-rn/src/features/ontology/__tests__/useEditProfileChangeProposal.test.ts) | `vitest`, `hooks/useEditProfileChangeProposal.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useProfileSelection.test.ts](../../codelens-rn/src/features/ontology/__tests__/useProfileSelection.test.ts) | `vitest`, `hooks/useProfileSelection.ts`, `types.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useRefreshProfileChangeProposal.test.ts](../../codelens-rn/src/features/ontology/__tests__/useRefreshProfileChangeProposal.test.ts) | `vitest`, `hooks/useRefreshProfileChangeProposal.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useReviewProfileChangeProposal.test.ts](../../codelens-rn/src/features/ontology/__tests__/useReviewProfileChangeProposal.test.ts) | `vitest`, `hooks/useReviewProfileChangeProposal.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useRunManualOntologyChecker.test.ts](../../codelens-rn/src/features/ontology/__tests__/useRunManualOntologyChecker.test.ts) | `vitest`, `data/checkerRunService.ts`, `hooks/manualCheckerReviewAdapter.ts`; mocks: `../../../db/client`, `../../../ai/queue` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [useSwitchProfileChangeProposalTarget.test.ts](../../codelens-rn/src/features/ontology/__tests__/useSwitchProfileChangeProposalTarget.test.ts) | `vitest`, `hooks/useSwitchProfileChangeProposalTarget.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [userFitHistoryRepo.test.ts](../../codelens-rn/src/features/ontology/__tests__/userFitHistoryRepo.test.ts) | `vitest`, `codelens-rn/src/db/client.ts`, `data/schema.ts`, `data/userFitHistoryRepo.ts`; mocks: `../../../db/client` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |
| [userFitProjection.test.ts](../../codelens-rn/src/features/ontology/__tests__/userFitProjection.test.ts) | `vitest`, `userFitProjection.ts`, `types.ts` | Keep app integration/wiring test; mocked DB is not standalone persistence proof. |

Seven test files read source paths: branchLocalProposalApply, contextSelector,
profileBranchStore, profileBranches, profileRegistry, profileSelection and
runtimeProfileActivation. The app-wide
[stage10 guards](../../codelens-rn/src/__tests__/stage10-architecture-guards.test.ts)
read additional ontology declarations. A re-export stub must not be mistaken
for the implementation under test; relocate the guard target, never delete the
assertion just to make extraction green.
