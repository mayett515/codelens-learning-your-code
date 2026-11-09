# K1 test reconciliation — 2026-11-09

Baseline: app at a2efaee, 1139 passing assertions in 121 files.
After extraction: **359 core + 780 app = 1139**.
Core has 29 files; app has 104. The additional files are
split files, not added or duplicated domain assertions.

Compared the sorted multiset of original filename + Vitest full test name,
including multiplicity, across the baseline and both resulting JSON reports.
No assertion identity is missing, renamed or duplicated. SHA-256 of that sorted
identity list: `3f74ed6337310c831496abc86760d0a148d85f62a215a01a003fa3b6e232c1b5`. This proves identity/count reconciliation, not
equivalence of behavior; existing assertions were retained and executed.

Core paths below are under `packages/kordex-core/src/__tests__/`. Remaining
app paths are under `codelens-rn/src/features/ontology/__tests__/`.

| Original test file | Before | Core | App | Disposition |
| --- | ---: | ---: | ---: | --- |
| baseProfileProposalApply.test.ts | 9 | 9 | 0 | Moves with its domain owner |
| baseProfileVersioning.test.ts | 4 | 4 | 0 | Moves with its domain owner |
| branchLocalProposalApply.test.ts | 9 | 9 | 0 | Moves with its domain owner |
| checkerPromptBuilder.test.ts | 6 | 6 | 0 | Moves with its domain owner |
| checkerProposalMapper.test.ts | 8 | 7 | 1 | Split: app mapping, default-profile or presentation assertions remain |
| codingProfile.test.ts | 13 | 12 | 1 | Split: app mapping, default-profile or presentation assertions remain |
| contextAssembly.test.ts | 21 | 21 | 0 | Moves with its domain owner |
| contextSelector.test.ts | 16 | 16 | 0 | Moves with its domain owner |
| corrections.test.ts | 18 | 15 | 3 | Split: app mapping, default-profile or presentation assertions remain |
| ontologyCorrectionEvidenceCodec.test.ts | 8 | 5 | 3 | Split: app mapping, default-profile or presentation assertions remain |
| photographyProfile.test.ts | 6 | 5 | 1 | Split: app mapping, default-profile or presentation assertions remain |
| profileActivation.test.ts | 31 | 28 | 3 | Split: app mapping, default-profile or presentation assertions remain |
| profileBranchCodec.test.ts | 11 | 6 | 5 | Split: app mapping, default-profile or presentation assertions remain |
| profileBranches.test.ts | 14 | 14 | 0 | Moves with its domain owner |
| profileBranchStore.test.ts | 12 | 12 | 0 | Moves with its domain owner |
| profileChangeProposalCodec.test.ts | 12 | 8 | 4 | Split: app mapping, default-profile or presentation assertions remain |
| profileComposition.test.ts | 23 | 23 | 0 | Moves with its domain owner |
| profileDefinitionCodec.test.ts | 17 | 12 | 5 | Split: app mapping, default-profile or presentation assertions remain |
| profileProposalEventCodec.test.ts | 8 | 5 | 3 | Split: app mapping, default-profile or presentation assertions remain |
| profileProposalFreshness.test.ts | 11 | 11 | 0 | Moves with its domain owner |
| profileProposalTargetSwitch.test.ts | 4 | 4 | 0 | Moves with its domain owner |
| profileRegistry.test.ts | 34 | 34 | 0 | Moves with its domain owner |
| profileSelection.test.ts | 31 | 31 | 0 | Moves with its domain owner |
| profileSelectionCodec.test.ts | 19 | 12 | 7 | Split: app mapping, default-profile or presentation assertions remain |
| profileSelectionDraft.test.ts | 17 | 17 | 0 | Moves with its domain owner |
| profileTrustSettingCodec.test.ts | 9 | 7 | 2 | Split: app mapping, default-profile or presentation assertions remain |
| runtimeProfileCoordinator.test.ts | 5 | 5 | 0 | Moves with its domain owner |
| scopedMeaning.test.ts | 9 | 9 | 0 | Moves with its domain owner |
| userFitProjection.test.ts | 12 | 12 | 0 | Moves with its domain owner |
| Other 92 app files | 742 | 0 | 742 | Stay in app, including architecture guards with updated owner paths |
| **Total** | **1139** | **359** | **780** | **No lost or additional domain tests** |

Mixed files retain shared fixture values as needed. Unused fixture declarations
and imports were removed after partitioning. The context-selector source guard
now reads its adjacent core owner; app architecture guards point explicitly to
moved owners instead of inspecting facades. Their assertions remain intact.

Additional verification is reported separately, not counted as migrated domain
tests: 5 new tooling fixtures (32 total instead of 27), isolated source install,
packed-consumer entrypoint/validation smoke and app/core Zod resolution check.
See the [K1 report](2026-11-09-core-extraction.md) for executed results and limits.
