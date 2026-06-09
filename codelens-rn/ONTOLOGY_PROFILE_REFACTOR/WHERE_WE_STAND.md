# Where We Stand - 2026-05-08

Repo: `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`
Branch: `refactor/ontology-profile`

This file captures the current state after implementing correction evidence persistence v1, locking the adaptive suggestion policy, implementing storage-only patch/merge proposal persistence v1, locking and implementing the first Conceptualize correction loop, adding raw-proposed-type preservation for normalized extractor mistakes, implementing storage-only trust settings, implementing the branch-local proposal apply helper/service, adding the first minimal proposal review UI, adding proposal event/audit storage for proposal decisions, implementing the first pure context assembly slice, implementing the first pure context selector slice, wiring the real Conceptualize flow to build/validate a ContextPack, implementing the pure Conceptualize prompt builder/output validator, hardening Conceptualize to use a singular public output plus internal dynamic diagnostic candidates, flipping Conceptualize classification live through a guarded classification-only adapter, making raw proposed type identity structured in memory while keeping the old string projection for current evidence persistence, persisting hidden near-miss diagnostics only when user correction evidence is written, surfacing missing Conceptualize matches as explicit review metadata, projecting correction/proposal facts into bounded user-fit signals, adding a DB-backed facts reader for bounded recent user-fit history, feeding matching current-scope user-fit signals into Conceptualize ContextPacks as advisory prompt context, adding a pure checker selector seam that can consume the same bounded `ContextPack.userFit` section, hardening manual missing-concept proposal creation with parent-id and node-id collision revalidation, adding the first base-profile proposal target-version guard, adding the first base-profile apply helper/service for persisted profile definitions, wiring explicit base/core apply into the proposal review UI, adding the first richer missing-concept draft slice with editable meaning plus proposal provenance, and adding a Conceptualize-to-proposal-review handoff for created pending proposals.

## Last Status Response

Done.

Codex direct slice (Missing-Concept Draft Meaning And Provenance):

- Correction drafts now carry editable `newTypeMeaning`.
- `Use suggestion` copies suggested label, meaning, reason, and valid parent into the editable draft.
- The store still does not auto-fill missing-concept suggestions when candidates are loaded.
- New subtype proposal nodes use edited meaning first, then `suggestedNewConcept.meaning`, then user reason/fallback text.
- Missing-concept proposal reasons preserve the original suggested label, parent, meaning, reason, and which fields the user edited.
- No direct Apply from Conceptualize, target-layer switching UI, stale refresh, superseding persistence, old-card backfill, checker runtime, auto-apply, graph/vector retrieval, trust-setting update, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification:
  - TypeScript clean
  - focused missing-concept draft tests: 31/31 passed across 3 files

Codex direct slice (Base/Core Apply Review UI):

- `useApplyProfileChangeProposal` now routes by proposal target:
  - branch targets still use `applyPendingBranchLocalProfileChangeProposal()`
  - base/core targets use `applyPendingBaseProfileChangeProposal()`
- The review screen now enables explicit base/core Apply with `Apply to core` copy.
- Base/core proposals show stronger blast-radius wording: base changes affect derived branches and do not rewrite old notes automatically.
- Base apply errors now map to user-facing review messages for stale/missing target versions, base-definition conflicts, unsupported proposal kinds, and base patch conflicts.
- Reject, Postpone, and Ask why stay shared; Ask why remains explanation-only.
- No auto-apply, stale refresh flow, edit-then-apply, branch merge apply, profile version-history UI, old-card backfill, checker runtime, historical undo, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification:
  - TypeScript clean
  - focused review/apply tests: 118/118 passed across 8 files
  - full suite: 932/932 passed across 98 files
  - diff check clean with CRLF warnings only

Codex direct slice (Base Profile Apply Helper/Service):

- Added pure `baseProfileProposalApply.ts` helper:
  - compiles `apply_profile_patch_to_base_profile` operations
  - calls the base-profile version guard before mutation
  - revalidates patch conflicts against the current base profile
  - creates the next `ProfileDefinition` / `DomainProfile` version
  - marks the proposal accepted
  - keeps relationship type ids opaque to match the branch-local apply decision
  - documents the synthetic `patchToOverlay` adapter and `overrideOntology.nodes` add-only compatibility behavior
- Added DB-backed `applyPendingBaseProfileChangeProposal(input)` behind `src/features/ontology/data`.
- Added conditional `updateProfileDefinitionIfUnchanged()` so profile writes fail closed on stale version/`updatedAt`.
- The service writes the next profile definition version, accepted proposal, and `applied` proposal event in one transaction.
- Hardened proposal validation so base-profile `target.profileId` must match `baseProfileId`.
- Added architecture guards proving the pure helper stays DB/UI-free and the DB service stays behind the data boundary.
- In this helper/service slice, no proposal review UI wiring for base/core apply, automatic base/core mutation, profile version-history table, stale proposal refresh flow, branch merge into base/core, auto-apply, checker runtime, old-card backfill, agent runtime, app-builder runtime, or DSL runtime was added. The later Base/Core Apply Review UI slice wires the explicit review action.
- Verification:
  - TypeScript clean
  - focused base-apply/versioning/codec/guard tests: 120/120 passed across 6 files
  - full suite: 928/928 passed across 97 files
  - diff check clean with CRLF warnings only

Codex direct slice (Base Profile Versioning Target Contract):

- Added migration 022 for `profile_change_proposals.target_profile_version`.
- Added `ProfileChangeProposal.targetProfileVersion` to the proposal codec/row mapping and backup column maps.
- Base-targeted Conceptualize proposals now snapshot the active profile version.
- Branch-targeted proposals must not set `targetProfileVersion`; they continue using branch `updatedAt` guards.
- Added pure `assertBaseProfileProposalTargetsCurrentVersion(input)` guard for future base/core apply code.
- No base-profile apply service, base/core mutation, profile version-history table, stale proposal refresh, UI behavior change, checker runtime, auto-apply, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification:
  - TypeScript clean
  - focused migration/versioning/codec/correction/backup/guard tests: 166/166 passed across 6 files
  - full suite: 909/909 passed across 95 files
  - diff check clean with CRLF warnings only

Codex direct slice (Missing-Concept Proposal Revalidation):

- Hardened the existing manual new-subtype correction/proposal path in `saveConceptualizedCapture.ts`.
- Explicit parent ids are now revalidated against the active composed profile before a new subtype proposal is created.
- New subtype labels that normalize to an existing non-item ontology node id are rejected before evidence/proposal rows can be written.
- Added focused tests for stale parent ids and non-item node-id collisions.
- No automatic missing-concept apply, automatic proposal creation from model suggestions, checker runtime, learned-score persistence, branch overlay mutation, base/core mutation, UI policy change, or auto-apply was added.
- Verification:
  - TypeScript clean
  - focused conceptualize-correction/architecture-guard tests: 82/82 passed across 2 files
  - full suite: 899/899 passed across 93 files
  - diff check clean with CRLF warnings only

Codex direct slice (Checker User-Fit Context Selector):

- Extended doc 37 so future checker callers can consume the same bounded advisory `ContextPack.userFit` section.
- Added `createCheckerContextSelector()` and `selectCheckerContext()` to `contextSelector.ts`.
- The checker selector reuses the existing pure pinned/elastic/capped selector machinery and sets `consumer: 'checker'`.
- Added focused tests proving selected checker context can assemble into a valid checker `ContextPack` with advisory user-fit node/proposal signals.
- Added stage10 guard coverage so the selector stays pure and exposes the checker seam deliberately.
- No checker runtime, model call, proposal creation, proposal apply, auto-apply, trust-setting update, learned-score persistence, graph traversal, vector retrieval, UI behavior change, or ontology/profile mutation was added.
- Verification:
  - TypeScript clean
  - focused checker/context assembly/guard tests: 107/107 passed across 3 files

Codex direct slice (User-Fit ContextPack Wiring):

- Extended doc 37 so Conceptualize consumes bounded user-fit history through the shared `ContextPack.userFit` section.
- Added typed user-fit node/proposal sections and caps to `contextAssembly.ts` / `contextSelector.ts`.
- `resolveConceptualizeProfileContext()` now loads bounded user-fit facts and projects them into advisory history.
- `buildConceptualizeContextPackShadow()` includes only signals from the exact active selection scope and pins matching scoped node refs into the pack.
- `conceptualizePromptBuilder.ts` renders `userFit.nodeSignals` and tells the model that user fit is correction history, not semantic truth.
- If user-fit history cannot be loaded, Conceptualize uses an empty projection instead of blocking save.
- No learned-score persistence, trust-setting update, proposal creation, checker runtime, auto-apply, vector retrieval, graph traversal, UI behavior change, or ontology/profile mutation was added.
- Verification:
  - TypeScript clean
  - focused user-fit ContextPack/prompt/profile-context/guard tests: 151/151 passed across 8 files
  - full suite: 887/887 passed across 93 files

Codex direct slice (User-Fit History Reader):

- Extended doc 37 with a facts-only DB-backed history reader.
- Added `userFitHistoryRepo.ts` with `loadUserFitProjectionFacts(input)`.
- The reader loads bounded recent correction evidence and proposal events for one `baseProfileId`.
- Defaults are 500 correction evidence rows and 200 proposal event rows.
- Added migration 021 with composite recency indexes for `ontology_correction_evidence(profile_id, created_at DESC, id DESC)` and `profile_proposal_events(base_profile_id, created_at DESC, id DESC)`.
- Bumped backup `SCHEMA_VERSION` to 21; archive layout/format version is unchanged.
- Added focused reader and migration tests plus stage10 guards proving the reader remains data-only and the pure projection stays DB-free.
- No learned-score persistence, projection caching, ContextPack/checker wiring, UI/model call, trust setting update, proposal creation, auto-apply, base/core mutation, graph traversal, vector retrieval, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification so far:
  - TypeScript clean
  - focused reader/projection/migration/guard tests: 85/85 passed across 4 files

Codex direct slice (User-Fit Projection):

- Created `37_USER_FIT_PROJECTION_DECISION.md` with locked decision:
  - user-fit learning is a derived projection over durable facts, not a new source of truth
  - correction evidence, missing-concept corrections, near-miss hits, and proposal decision events can become bounded node/proposal signals
  - no DB-backed readers, learned-score persistence, trust setting updates, proposal creation, auto-apply, checker runtime, or profile mutation belong in this slice
- Added `userFitProjection.ts` with `projectUserFitSignals(input)` and `profileChangeProposalTargetKey(target)`.
- The projection groups node signals by base profile, scope, and node id.
- After Opus review, node signal scope is now explicitly the active profile selection where the correction happened. Plain `coding` and `coding + react-project` produce separate user-fit signals.
- Matching near-miss hits now fold into the active correction scope instead of creating a second signal under the diagnostic candidate scope.
- The projection groups proposal signals by base profile, proposal kind, and target key.
- Missing-concept corrections and near-miss hits are weak positive evidence; postponed proposals are mild negative evidence; asked-why remains neutral.
- Output is bounded with omitted counts so future context/checker callers know when more facts exist than were returned.
- Added focused user-fit projection tests and a stage10 architecture guard.
- No DB reader, learned-score persistence, trust setting update, proposal creation, checker runtime, auto-apply, Conceptualize behavior change, vector retrieval, graph traversal, UI change, agent runtime, app-builder runtime, DSL runtime, or ontology/profile mutation was added.
- Verification so far:
  - TypeScript clean
  - focused user-fit projection/stage10 tests: 79/79 passed across 2 files
  - full suite: 877/877 passed across 91 files
  - `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src ARCHITECTURE.md` clean with CRLF warnings only

Codex direct slice (Missing-Concept UX):

- Created `36_MISSING_CONCEPT_UX_DECISION.md` with locked decision:
  - `noStrongMatch` appears as a review state instead of a fake fallback type
  - `suggestedNewConcept` is review metadata, not an existing ontology node
  - the user may explicitly copy the suggestion into manual new-subtype correction fields
  - saving without selecting a type or filling a new subtype remains unresolved
- Added `ConceptualizeMissingConceptReview` / `ConceptualizeSuggestedNewConceptReview` to `SaveModalCandidateData`.
- Updated `conceptualizeClassification` to map missing Conceptualize output into review metadata while keeping `conceptHint`, `rawProposedTypeIdentity`, and `rawProposedTypeNodeId` null.
- Updated the candidate card and correction controls to show type-review state and an explicit `Use suggestion` action.
- Kept the store from auto-filling `newTypeLabel`, so no proposal is created unless the user saves that correction.
- Added focused classifier, prepare, store, UI guard, and stage10 tests.
- No automatic missing-concept apply, automatic proposal creation, ontology/profile mutation, checker runtime, DB-backed history readers, user-fit projection, confidence/ranking update, vector retrieval, graph traversal, old-card backfill, auto-apply, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification:
  - TypeScript clean
  - focused missing-concept classifier/prepare/store/UI/guard tests: 106/106 passed across 5 files
  - full suite: 866/866 passed across 90 files
  - `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src ARCHITECTURE.md` clean with CRLF warnings only

Codex direct slice (Correction Evidence Near-Miss):

- Created `35_CORRECTION_EVIDENCE_NEAR_MISS_DECISION.md` with locked decision:
  - hidden Conceptualize diagnostic candidates can be snapshotted only on user correction evidence
  - successful uncorrected saves do not persist diagnostics
  - near-miss snapshots are inert evidence, not public extra tags, proposals, confidence updates, or ontology/profile mutations
- Added migration 020 for `ontology_correction_evidence.near_miss_candidates_json`.
- Added `OntologyCorrectionNearMissCandidate` and `OntologyCorrectionEvidence.nearMissCandidates`.
- Updated the correction evidence codec, schema, backup column maps, backup format/schema versions, and stage10 guards.
- Updated `conceptualizeClassification` to carry hidden diagnostics into save candidates as `conceptualizeNearMissCandidates`.
- Updated `saveConceptualizedCapture` to write near-miss candidates only when correction evidence is written.
- Added follow-up hardening so diagnostic candidates cannot reuse the public primary rank, and uncorrected saves are guarded against near-miss persistence.
- Added focused migration, codec, classifier, correction-save, backup, and guard tests.
- No visible extra tags, missing-concept UX, checker runtime, proposal creation, user-fit projection, confidence/ranking update, automatic ontology/profile mutation, DB-backed history readers, graph traversal, vector retrieval, old-card backfill, auto-apply, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification:
  - TypeScript clean
  - targeted near-miss migration/codec/classifier/correction/backup/guard tests: 163/163 passed across 6 files
  - full suite: 862/862 passed across 90 files
  - `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src ARCHITECTURE.md` clean with CRLF warnings only

Codex direct slice (Raw Proposed Type Identity):

- Created `34_RAW_PROPOSED_TYPE_IDENTITY_DECISION.md` with locked decision:
  - `rawProposedTypeIdentity` is the canonical in-memory shape
  - valid Conceptualize refs are scoped refs with `scopeId` and `nodeId`
  - legacy extractor-invented invalid ids are unresolved raw ids with active scope context
  - `rawProposedTypeNodeId` remains a derived legacy string projection for existing correction evidence persistence
- Added `rawProposedTypeIdentity.ts` helpers:
  - `createScopedRawProposedTypeIdentity`
  - `createUnresolvedRawProposedTypeIdentity`
  - `rawProposedTypeIdentityToLegacyString`
- Updated `prepareSaveCandidates`, `conceptualizeClassification`, and `saveConceptualizedCapture` to use structured identity internally and project to the old string only at compatibility boundaries.
- Added focused tests and a stage10 architecture guard for the structured identity / legacy projection boundary.
- No DB migration, near-miss diagnostic persistence, missing-concept UI, proposal creation, ontology/profile mutation, checker runtime, user-fit projection, graph traversal, vector retrieval, old-card backfill, auto-apply, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification:
  - TypeScript clean
  - targeted raw identity/classifier/prepare/correction/guard tests: 95/95 passed across 5 files
  - full suite: 853/853 passed across 89 files
  - `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src` clean with CRLF warnings only

Codex direct slice (Conceptualize Extractor Flip):

- Created `33_CONCEPTUALIZE_EXTRACTOR_FLIP_DECISION.md` with locked decision:
  - first Extractor Flip is classification-only
  - old extractor still owns card text extraction
  - new Conceptualize classifier owns ontology placement through ContextPack -> prompt builder -> model call -> strict validator -> adapter
  - invalid Conceptualize output falls back to the old extractor placement and logs a warning
  - `noStrongMatch` stays unclassified instead of defaulting
  - `suggestedNewConcept` remains a suggestion and is not mapped into `conceptHint.proposedConceptType`
- Added `conceptualizeClassification.ts`:
  - `runConceptualizeClassification`
  - `applyConceptualizeClassificationToCandidate`
  - `classifySaveCandidateWithConceptualize`
  - guarded retry/failure error type
- Updated `prepareSaveCandidates.ts`:
  - accepts optional `conceptualizeContext`
  - keeps old extraction for title/body/snippet/keywords
  - applies new Conceptualize classification when validation succeeds
  - falls back to old placement when validation/model output fails
- Updated `SaveAsLearningModal.tsx` to pass `ConceptualizeProfileContext` into `prepareSaveCandidates` and remove the modal-owned shadow-only ContextPack call.
- Added focused classifier/prepare tests and a stage10 guard proving the classifier is a model/adapter seam, not a persistence/mutation seam.
- No diagnostic persistence, near-miss evidence snapshot, missing-concept UI, proposal creation, ontology/profile mutation, checker runtime, user-fit projection, graph traversal, vector retrieval, old-card backfill, auto-apply, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification so far:
  - TypeScript clean
  - targeted classifier/prepare/guard tests: 77/77 passed across 3 files
  - full suite: 841/841 passed across 88 files
  - `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src` clean with CRLF warnings only

Codex direct slice (Conceptualize singular output and diagnostics):

- Created `32_CONCEPTUALIZE_SINGULAR_OUTPUT_AND_DIAGNOSTICS_DECISION.md` with locked decision:
  - Conceptualize public output is one primary placement plus confidence/noStrongMatch/suggestedNewConcept/rationale
  - visible extra tags are not part of the polished product contract
  - hidden ambiguity candidates remain possible as internal diagnostics
  - hidden candidates are dynamic and policy-driven from the ContextPack, not a fixed product count
  - diagnostics are not persisted unless a later correction-evidence flow deliberately snapshots factual near-miss data
- Updated `conceptualizePromptBuilder.ts`:
  - removed public `additionalNodeRefs`
  - removed caller-supplied prompt limits
  - added `diagnostics.candidateRefs`
  - added `deriveConceptualizeDiagnosticCandidatePolicy(pack)`
  - added `getConceptualizePublicClassification(output)`
  - validator checks diagnostic refs against the original pack, rejects duplicates with the public primary placement, rejects over-budget diagnostics, and rejects bad rank ordering
- Expanded `conceptualizePromptBuilder.test.ts` for singular output, dynamic diagnostic policy, hidden candidate validation, no-strong-match validation, and unknown suggested-concept parent refs.
- Updated stage10 guard coverage and learning barrel exports.
- No live extractor prompt flip, model call, correction evidence migration, save behavior change, correction UI, proposal/evidence write, checker runtime, user-fit projection, automatic confidence/ranking update, DB reader, vector retrieval, graph traversal, branch overlay mutation, base/core mutation, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification so far:
  - TypeScript clean
  - targeted Conceptualize prompt/context selector/assembly/guard tests: 115/115 passed across 5 files
  - full suite: 832/832 passed across 87 files
  - `git diff --check -- ONTOLOGY_PROFILE_REFACTOR src` clean with CRLF warnings only

Codex direct slice (Conceptualize prompt builder):

- Created `31_CONCEPTUALIZE_PROMPT_BUILDER_DECISION.md` with locked decision:
  - prompt builder consumes validated `ContextPack`
  - it renders stable instruction shell + compact Kordex context payload JSON
  - it exports a strict output schema and output validator
  - unknown refs are rejected against the original pack
  - at this prompt-builder slice, live extractor prompt/model behavior had not been flipped; doc 33 later wires classification live
- Implemented `conceptualizePromptBuilder.ts`:
  - `buildConceptualizePrompt({ pack })`
  - `ConceptualizePromptOutputSchema`
  - `validateConceptualizePromptOutput(rawOutput, pack)`
  - deterministic payload rendering with scoped refs, scope legend, same-label siblings, evidence/proposal slots, policy, and budget report
- Added `conceptualizePromptBuilder.test.ts`:
  - deterministic prompt payload rendering
  - same-label scoped meaning preservation
  - known-ref validation
  - unknown-ref rejection with no label coercion
  - missing-concept suggestion representation
  - invalid-pack rejection before rendering
- Added stage10 guard coverage and exports from the learning barrel.
- No live extractor prompt change, model call, proposal/evidence write, save behavior change, DB reader, vector retrieval, graph traversal, user-fit projection, missing-concept apply, branch overlay mutation, base/core mutation, checker runtime, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification so far:
  - TypeScript clean
  - targeted Conceptualize prompt/context selector/assembly/guard tests: 107/107 passed across 5 files
  - full suite: 824/824 passed across 87 files

Codex direct slice (Conceptualize ContextPack shadow wiring):

- Created `30_CONCEPTUALIZE_CONTEXTPACK_SHADOW_WIRING_DECISION.md` with locked decision:
  - A is split into A1 shadow wiring, A2 prompt builder, and A3 missing-concept allowance/apply
  - A1 is the only implemented step in this slice
  - Conceptualize may build and validate a real `ContextPack` from the real caller
  - invalid packs warn only
  - prompt text, model behavior, save behavior, suggestions, proposals, ontology/profile state, DB readers, vector/user-fit, and graph traversal stay unchanged
- Implemented `conceptualizeContextPack.ts`:
  - `buildConceptualizeContextPackShadow()`
  - Conceptualize-specific mapping from prepared save candidates and enriched profile context into selector candidates
  - deterministic ContextSelection -> ContextPack -> validation path
  - suggest-first policy with no auto-apply and no base/profile silent mutation
  - scope-aware ontology node refs so same-label core/branch nodes remain distinguishable
- Extended `conceptualizeProfileContext.ts`:
  - profile context now carries `baseProfile`, active `branches`, a composition stamp, and a scope legend
  - no-project behavior still resolves the coding profile as before
- Wired `SaveAsLearningModal.tsx` in shadow mode:
  - after candidates are prepared, each candidate builds and validates a ContextPack
  - failures are caught and logged with `console.warn`
  - user-facing Conceptualize/save behavior is unchanged
- Added `conceptualizeContextPack.test.ts` and a stage10 purity guard.
- No prompt renderer, LLM/model call, DB reader, vector retrieval, graph traversal, checker runtime, proposal write, save mutation, missing-concept apply, user-fit projection, base/core mutation, agent runtime, app-builder runtime, or DSL runtime was added.
- Verification so far:
  - TypeScript clean
  - targeted Conceptualize ContextPack shadow/context selector/assembly/guard tests: 102/102 passed across 5 files
  - full suite: 816/816 passed across 86 files

Codex direct slice (Context Selector):

- Created `29_CONTEXT_SELECTOR_DECISION.md` with locked decision:
  - one shared `ContextSelector` / `ContextSelection` contract belongs to Kordex
  - selector implementations stay focused per task/consumer rather than becoming one GodSelector
  - host/app adapters can own concrete read-only candidate loading behind ports
  - selector output feeds `ContextPack` assembly; it is not a prompt renderer
  - first implementation uses pinned/elastic buckets
  - first implementation is one deterministic Conceptualize selector over caller-supplied ordered candidates
- Implemented `contextSelector.ts`:
  - shared selector/selection types
  - `createConceptualizeContextSelector()`
  - `selectConceptualizeContext()`
  - deterministic pinned/elastic selection over caller-supplied candidates
  - trace entries for pinned, elastic, and omitted candidates
  - same-label ambiguity preservation
  - cross-scope evidence preservation
  - bounded direct-evidence pinning: evidence tied only to elastic ontology context stays capped; only cross-scope, explicit, or pinned-decision-center evidence bypasses evidence caps
  - input cloning/no-mutation behavior
- Exported selector types/helpers from the ontology root barrel.
- Added `contextSelector.test.ts` and a stage10 purity guard.
- No DB, UI, LLM, retrieval, graph traversal, prompt rendering, checker runtime, apply/mutation, base/core versioning, agent runtime, app-builder runtime, DSL runtime, or runtime behavior wiring was added.
- Updated doc 28 status to reflect that the first pure context assembly slice is implemented:
  - `contextAssembly.ts`
  - `contextAssembly.test.ts`
  - stage10 context assembly guard
- Updated README, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, and implementation_handoff.
- Verification:
  - TypeScript clean
  - targeted context selector/assembly/guard tests: 95/95 passed across 3 files
  - full suite: 812/812 passed across 85 files

Codex direct follow-up (Conceptualize raw proposed type preservation):

- Added migration 017 to add `raw_proposed_type_node_id` to `ontology_correction_evidence`.
- Added `rawProposedTypeNodeId` to correction evidence schema/codecs, backup column maps, and Conceptualize save evidence.
- `prepareSaveCandidates` now records the raw extractor type when it has to normalize an unknown model-generated type id to the active profile default.
- Added tests for raw type preservation, `saveAsProposedNew` passthrough during Conceptualize correction/proposal saves, and project runtime profile context resolution.
- Updated doc 22 and handoff/startup docs to record that saved preview state stays profile-safe while evidence can preserve the invalid raw model id.
- Verification:
  - TypeScript clean
  - targeted Conceptualize/save/evidence/backup/guard tests: 144/144 passed across 9 files
  - full suite: 705/705 passed across 73 files
  - `git diff --check` clean with CRLF warnings only

Codex direct slice (trust setting storage v1):

- Created `23_TRUST_SETTING_STORAGE_DECISION.md` with locked decision:
  - trust settings are user policy, separate from correction evidence and proposals
  - default mode is conservative `suggest_first`
  - user-fit learning belongs to future event/audit projections, not the setting row
  - base-profile targets cannot enable auto-apply
  - `manual_only` and `suggest_first` cannot enable auto-apply
  - branch-local future auto-apply is limited to classification, ontology-node, and relationship proposals with strict risk caps
- Implemented storage-only `ProfileTrustSetting` persistence:
  - migration 018 creates `profile_trust_settings`
  - Drizzle schema exposes `profileTrustSettings`
  - strict codec validates target shape, scope key, trust mode, risk caps, and auto-apply proposal kind limits
  - ontology data-boundary repo supports insert/upsert/get-by-id/get-by-target/list-by-base-profile/delete
  - backup/export/import/clear/columnMaps support `profile_trust_settings`
  - `ARCHITECTURE.md` backup/archive version notes updated to format 7 / schema 18
  - `FORMAT_VERSION` bumped 6 -> 7 and `SCHEMA_VERSION` bumped 17 -> 18
  - stage10 guards allow the table only in the planned persistence boundary
- Model-review hardening fixed `upsertProfileTrustSetting` so `scopeKey` conflicts preserve the existing `id` and `createdAt` for future audit/event references.
- No UI, checker runtime, apply service, event/audit store, user-fit projection store, auto-apply engine, old-item backfill, base-profile versioning, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added.
- Verification so far:
  - TypeScript clean
  - targeted trust-setting repo/codec/migration/backup/guard tests: 129/129 passed across 5 files
  - full suite: 723/723 passed across 76 files
  - `git diff --check` clean with CRLF warnings only

Codex direct slice (branch-local proposal review/apply helpers):

- Created `24_BRANCH_LOCAL_PROPOSAL_APPLY_DECISION.md` with locked decision:
  - the first proposal apply flow is explicit and branch-local
  - first review actions are Apply, Reject, Postpone, and Ask why / why not
  - proposals remain inert until a review/apply operation runs
  - apply revalidates the pending branch-target proposal, compiles it to typed operations, mutates only the target branch overlay, and marks the proposal accepted/applied atomically
  - risk and confidence stay distinct: confidence means "is Kortex probably right?", risk means "how much could this break if wrong?"
  - user-facing risk copy must explain blast radius, not just show `riskScore`
  - edit-then-apply, auto-apply, base/core mutation, upward merge, sibling propagation, old-card backfill, historical undo, and external write-back are future seams
- Implemented first pure helper slice:
  - `branchLocalProposalApply.ts` compiles pending branch-target proposals into `apply_profile_patch_to_branch_overlay` operations
  - applies operations to copied branch overlay values by merging `ProfilePatch` into the target branch overlay
  - returns an accepted proposal value with `reviewedAt`, `appliedAt`, and `updatedAt`
  - validates pending status, branch target, branch id, base profile id, branch/overlay kind, apply timestamp, branch drift after compile, duplicate patch ids, stale add-node ids, missing override-node ids, duplicate item/relationship type ids, and missing item-type node ids
  - intentionally treats relationship type ids as opaque profile relationship ids; current coding ids such as `prerequisite`, `related`, and `contrast` do not have matching ontology nodes
  - exports pure helpers from the ontology root barrel
  - adds focused tests for happy path, nested merge behavior, operation cloning, mismatch errors, stale patches, branch kind mismatch, and no persistence imports
- Implemented first persistence-backed apply service slice:
  - `branchLocalProposalApplyService.ts` loads a proposal and target branch inside one DB transaction
  - accepts the caller-provided `baseProfile`, so persistence does not resolve runtime activation or branch selection
  - calls the pure branch-local apply helper, then conditionally saves the updated branch and accepted proposal in the same transaction
  - rejects branch/proposal write conflicts when the stored `updatedAt` or pending proposal status changed after load
  - exports only from `src/features/ontology/data/index.ts`, not the root ontology barrel
  - adds focused tests for successful transaction orchestration, missing proposal, missing branch, and no-write propagation of branch-local apply errors
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, and implementation_handoff.
- No checker runtime, event/audit store, auto-apply engine, base-profile versioning, old-card backfill, agent runtime, app-builder runtime, or DSL runtime added.
- Verification:
  - TypeScript clean
  - targeted service/apply/proposal/branch/guard tests: 91/91 passed across 5 files
  - full suite: 739/739 passed across 78 files
  - stage10 architecture/doc guards: 55/55 passed
  - `git diff --check` clean with CRLF warnings only

Codex direct slice (minimal proposal review UI):

- Added the first pending proposal review surface without edit support:
  - `ProfileProposalReviewEntry` adds a Learning Hub entry only when pending proposals exist
  - `ProfileProposalReviewScreen` opens a queue/detail modal for pending profile-change proposals
  - the detail view shows target, proposal kind, blast-radius risk wording, semantic confidence, user-fit confidence, patch summary, reason, and evidence
  - Apply calls the branch-local apply service through a hook that resolves the default profile registry above the data service
  - Reject and Postpone call a tiny review-status service that conditionally updates only pending proposals
  - Ask why / why not is explanation-only and does not mutate data
- Added React Query keys/hooks for pending proposals, apply, and review-status mutations.
- Model-review hardening fixed missing-base-profile errors, explicit success/error message tone, non-branch Apply disablement, branch-key invalidation, pending-action list switching, reason/message reset, and ontology-node names in patch summaries.
- Kept the first surface narrow: no edit-then-apply, no checker runtime, no event/audit store, no auto-apply engine, no upward merge, no base/core mutation, and no old-card backfill.
- Verification:
  - TypeScript clean
  - targeted review/apply/proposal/branch/guard tests: 101/101 passed across 7 files
  - full suite: 749/749 passed across 80 files
  - `git diff --check` clean with CRLF warnings only

Codex direct slice (proposal event audit storage):

- Created `25_PROPOSAL_EVENT_AUDIT_STORAGE_DECISION.md` with locked decision:
  - proposal review/apply decisions are append-only event facts
  - proposal rows keep current state; event rows keep decision history
  - user-fit learning is a future projection over events, not hidden mutation in trust settings or proposal rows
  - event rows do not store runtime/composed profiles, auto-apply jobs, undo jobs, or user-fit projections
- Implemented `ProfileProposalEvent` persistence:
  - migration 019 creates `profile_proposal_events`
  - Drizzle schema exposes `profileProposalEvents`
  - strict codec validates target shape, action/status transitions, timestamp order, and details JSON
  - ontology data-boundary repo supports insert/get/list by proposal/base profile/target branch
  - backup/export/import/clear/columnMaps support `profile_proposal_events`
  - `ARCHITECTURE.md` backup/archive version notes updated to format 8 / schema 19
  - `FORMAT_VERSION` bumped 7 -> 8 and `SCHEMA_VERSION` bumped 18 -> 19
  - stage10 guards allow the table only in the planned persistence boundary
- Wired audit events into existing services:
  - Apply writes an `applied` event in the same transaction that updates the target branch and accepts the proposal
  - Reject/Postpone write `rejected` / `postponed` events in the same transaction that reviews the proposal
  - if branch/proposal conditional writes fail, no event is inserted
- Kept the slice narrow: no user-fit projection, checker runtime, auto-apply engine, edit-then-apply, historical undo execution, base/core mutation, upward merge, old-card backfill, event-history UI, agent runtime, app-builder runtime, or DSL runtime.
- Verification so far:
  - TypeScript clean
  - targeted proposal-event/apply/review/backup/guard tests: 145/145 passed across 6 files
  - full suite: 764/764 passed across 82 files
  - `git diff --check` clean with CRLF warnings only

Codex direct slice (correction evidence persistence v1):

- Implemented storage-only `OntologyCorrectionEvidence` persistence:
  - migration 015 creates `ontology_correction_evidence`
  - Drizzle schema exposes `ontologyCorrectionEvidence`
  - `OntologyCorrectionActiveSelectionSnapshot` is required on `OntologyCorrectionEvidence`
  - strict codec rejects target/apply fields and validates profile/snapshot consistency
  - ontology data-boundary repo supports insert, get-by-id, list-by-profile, list-by-subject, and delete
  - backup/export/import/clear/columnMaps support `ontology_correction_evidence`
  - `ARCHITECTURE.md` backup/archive version notes updated to format 5 / schema 15
  - `FORMAT_VERSION` bumped 4 -> 5 and `SCHEMA_VERSION` bumped 14 -> 15
  - stage10 guards allow the table only in the planned persistence boundary and still ban legacy `ontology_corrections` / `ontology_patch_suggestions`
- Updated `validateOntologyCorrection()` so correction evidence records active selection context where the mistake happened.
- No correction UI, checker runtime, target/apply branch fields, automatic profile mutation, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added in the correction-evidence slice. Proposal storage was added later in doc 19.
- Verification so far:
  - TypeScript clean
  - targeted tests: 133/133 passed across 5 files
  - full suite: 676/676 passed across 68 files
  - stage10 doc/source guards after proposal storage: 53/53 passed
  - `git diff --check` clean with CRLF warnings only

Codex docs-only decision slice (adaptive suggestion policy):

- Created `18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md` with locked decision:
  - correction evidence stays factual
  - patch suggestions stay separate from evidence
  - default behavior is conservative suggest-first
  - manual tag/subtag/relationship creation is allowed through a structured validate/preview/target/audit/undo flow
  - personal layer is the same branch machinery with `branchKind: 'personal'`
  - relationship tags and edges use the same trust/risk policy as tags and subtags
  - adaptive behavior combines semantic confidence, user-fit confidence, risk score, and trust mode
  - risk overrides trust
  - base/core changes, upward merges, old-data rewrites, agent/app-builder policy, and external write-back always require explicit approval
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff, and cross-references.
- No source code, tests, DB, UI, checker runtime, patch suggestion storage, trust storage, or auto-apply engine added in this docs-only slice.

Codex docs-only decision slice (patch/merge proposal storage and review):

- Created `19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md` with locked decision:
  - patch suggestions, relationship suggestions, branch merge proposals, and manual drafts share one `profile_change_proposals` concept
  - product language can still distinguish patch suggestions from merge proposals
  - persistence/review uses one lifecycle and one review shape
  - proposals store source/evidence, explicit target layer, `ProfilePatch`, risk/confidence, and review status
  - `ProfilePatch` is overlay-like diff language without branch identity
  - proposals do not apply themselves
  - apply/merge is explicit and later
  - separate `ontology_patch_suggestions` and `profile_merge_proposals` tables are rejected for v1
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff, and cross-references.
- No source code, tests, DB, UI, checker runtime, apply service, trust storage, auto-apply, or base-profile versioning added in this docs-only slice.

Codex direct slice (profile change proposals storage v1):

- Implemented storage-only `ProfileChangeProposal` persistence:
  - migration 016 creates `profile_change_proposals`
  - Drizzle schema exposes `profileChangeProposals`
  - `ProfilePatch` is the overlay-like diff language without branch identity
  - strict codec validates target shape, evidence/source requirements, no-op patches, risk/confidence, and review/apply status constraints
  - ontology data-boundary repo supports insert, upsert, get-by-id, list-by-status, list-by-base-profile, list-by-target-branch, and delete
  - backup/export/import/clear/columnMaps support `profile_change_proposals`
  - `ARCHITECTURE.md` backup/archive version notes updated to format 6 / schema 16
  - `FORMAT_VERSION` bumped 5 -> 6 and `SCHEMA_VERSION` bumped 15 -> 16
  - stage10 guards allow the table only in the planned persistence boundary and still ban separate `ontology_patch_suggestions` / `profile_merge_proposals`
- No review UI, checker runtime, apply service, trust storage, auto-apply, old-data backfill, base-profile versioning, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added.
- Verification so far:
  - TypeScript clean
  - targeted proposal/migration/codec/backup/guard tests: 121/121 passed across 4 files
  - full suite: 691/691 passed across 70 files
  - `git diff --check` clean with CRLF warnings only

Codex docs-only decision slice (Conceptualize preview and correction surface):

- Created `20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md` with locked decision:
  - the first correction surface is the Conceptualize preview before final save
  - "save as learning" should grow toward Conceptualize
  - every correction stores mistake-understanding evidence, not only the final corrected label
  - new tag/subtag creation validates against the composed active profile
  - approved new ontology nodes are branch-local by default
  - Conceptualize starts as a safe correction doorway, not the full Kortex ontology editor
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, and implementation_handoff.
- No source code, tests, UI, checker runtime, apply service, trust storage, auto-apply, old-item backfill, or base/core mutation added in this docs-only slice.

Codex docs-only decision slice (checker/proposal/context/apply architecture):

- Created `21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md` with locked decision:
  - checker output has three kinds: explanation, evidence, and proposal
  - Conceptualize, checker runs, graph selection chat, repeated-mistake review, old-card backfill, and future agent/app-builder flows share one proposal/review/apply architecture
  - proposal review tracks both user review status and freshness/validity
  - proposal basis metadata is required for revalidation before review/apply
  - context assembly is a first-class branch/profile-scoped layer with provenance, relevance ranking, contradiction preservation, and drill-down paths
  - accepted proposals compile to typed Kortex operations, not raw patch writes
  - normal proposal apply is atomic; large backfills become chunked bulk jobs
  - historical undo is an impact-reviewed reversal proposal, not silent time travel
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, and implementation_handoff.
- No source code, tests, UI, checker runtime, context builder, event store, apply service, undo service, graph selection chat, trust storage, agent runtime, app-builder runtime, or DSL runtime added in this docs-only slice.

Batch 8 Slice 1 (correction evidence persistence decision doc):

- Created `12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md` with locked decision:
  - evidence-first persistence: correction evidence is stored as fact, not mutation
  - patch suggestions come later and require user approval
  - no automatic ontology/profile mutation
  - direct user-authored ontology changes are allowed
  - model/checker-suggested ontology changes require approval
  - 2026-05-11 update: active selection context is stored where the mistake happened
  - no `branchId`, `targetLayerId`, or apply target in v1
  - no checker runtime/UI in this slice
  - no DB/migration/source implementation in this slice
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff
- No source code or tests changed in this slice

Batch 9 Slice 1 (branch/overlay persistence decision doc):

- Created `13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md` with locked decision:
  - persist branch layers separately, not composed runtime profiles
  - overlays are the durable source; composition is derived
  - merging upward requires approval
  - sibling branches do not affect each other
  - parent profiles stay clean
  - rejected alternatives: store only composed profiles, let child branches mutate parents directly, make everything event-sourced immediately, make branches full profile copies
  - consistent with doc 06 product model, doc 10/A2 runtime source, doc 11 coordinator, doc 12 correction evidence
  - no DB, UI, storage API, automatic merge, checker runtime, patch suggestion table, correction storage, agent/subagent runtime, app-builder runtime, Racket/DSL implementation, or MCP/adapters is implemented in this slice
- Added pointer from doc 06 to doc 13 for the locked persistence-source decision
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff
- No source code or tests changed in this slice

Batch 10 Slice 1 (domain-only ProfileBranch model):

- Added `ProfileBranchKind` and `ProfileBranch<TItemTypeNodeId>` to `types.ts`
- Added `profileBranches.ts` with pure helpers:
  - `profileBranchToOverlay`
  - `groupProfileBranchesByKind`
  - `createActiveDomainProfileSourceFromBranches`
  - `composeRuntimeDomainProfileFromBranches`
- Added `profileBranches.test.ts` with 14 tests covering empty-branch reference behavior, project branch ontology additions, personal/learning/project precedence, same-kind later-wins behavior, sibling independence/no mutation, frozen inputs, grouping order, runtime composition equivalence, and forbidden-name/source-boundary checks
- Exported branch types/helpers from `src/features/ontology/index.ts`
- No DB, migration, storage API, UI selector, automatic merge, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added

Batch 11 Slice 0 (profile selection and branch resolution decision):

- Created `14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md` with locked decision:
  - branch persistence, active selection, branch resolution, and runtime composition are separate boundaries
  - `ProfileSelection` is per-context and id-based
  - v1 selection has one `baseProfileId` plus ordered project/learning/personal branch id arrays
  - resolver turns selected ids into branch values before runtime composition
  - Runtime Profile Coordinator stays pure and receives resolved values
  - no global active selection, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition in this slice
- Updated README doc map, NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, implementation_handoff
- No source code or tests changed in this doc slice

Batch 11 Slice 1 (domain-only ProfileSelection helper):

- Added `ProfileSelection` to `types.ts`
- Added `profileSelection.ts` with pure helpers:
  - `resolveProfileSelection`
  - `composeRuntimeDomainProfileFromSelection`
- Added `profileSelection.test.ts` with 19 tests covering empty selection reference behavior, selected project branch ontology additions, selection-order same-kind precedence, personal/learning/project precedence, missing branch id errors, base id mismatch, wrong-kind errors, frozen input immutability, composition equivalence with branch helpers, and source-boundary forbidden-name checks
- Exported selection types/helpers from `src/features/ontology/index.ts`
- No DB, migration, storage API, profile registry, UI selector, global active selection, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, multi-base composition, merge, or promotion logic added

Batch 12 Slice 1 (ProfileRegistry/ProfileSource v1 static helper):

- Locked duplicate profile id behavior in `15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md`:
  - duplicate profile ids throw structured duplicate-id errors across all sources
  - registry detects conflicts, but future UI/import/profile-manager asks create new version / rename / replace / merge later / cancel
- Added `DomainProfileSummary`, `ProfileSource<TItemTypeNodeId>`, and `ProfileRegistry<TItemTypeNodeId>` to `types.ts`
- Added `profileRegistry.ts` with:
  - `DuplicateProfileIdError`
  - `ProfileNotFoundError`
  - `toDomainProfileSummary`
  - `createStaticProfileSource`
  - `createProfileRegistry`
- Added `profileRegistry.test.ts` with 26 tests covering summary shape, static source lookup/listing, duplicate ids within one source, registry lookup/listing, duplicate ids across sources, unknown id errors, frozen input handling, caller array mutation after creation, and source-boundary forbidden-name checks
- Exported registry types/helpers from `src/features/ontology/index.ts`
- Preserved the direction:
  - base profiles resolve through a source-based `ProfileRegistry`
  - `ProfileRegistry` is separate from `ProfileBranchStore`
  - future sources may include built-in, file, DB, and adapter sources
  - v1 implements only static/in-memory profile source helpers
  - no DB, migration, storage API, profile persistence, file source, adapter source, profile editor UI, global active registry, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, branch persistence, branch composition changes, active selection changes, service changes, multi-base composition, merge, promotion, automatic versioning, rename, or replace flow added

Verification:

- TypeScript clean.
- `runtimeProfileCoordinator.test.ts` 5/5 passed.
- `stage10-architecture-guards.test.ts` all passed (guard count: 40 -> 42).
- Targeted selection/branch/coordinator/activation tests: 77/77 passed across 4 test files.
- Targeted registry/selection/branch tests: 67/67 passed across 3 test files.
- Full suite: 528/528 passed across 57 test files.
- No non-ASCII in `profileRegistry` source/test or doc 15.
- No forbidden state/persistence/runtime names, `as any`, `@ts-ignore`, or `@ts-expect-error` in `profileRegistry` source/test.
- `git diff --check` clean with CRLF warnings only.

Kimi Code CLI Slice 1 (ProfileBranchStore v1 static helper):

- Added `ProfileBranchStore<TItemTypeNodeId>` to `types.ts`.
- Added `profileBranchStore.ts` with `createStaticProfileBranchStore({ branches })`.
- Added `profileBranchStore.test.ts` with 12 tests covering single lookup, missing lookup, requested-id order, missing-id skipping, duplicate requested ids, parent filtering, empty parent lists, constructor-order listing, caller array mutation after construction, frozen input arrays, and source-boundary forbidden-name checks.
- Exported `ProfileBranchStore` and `createStaticProfileBranchStore` from `src/features/ontology/index.ts`.
- No DB, migration, backup, storage adapter, UI selector, global active selection, automatic merge, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, or profile persistence added.
- Kimi Code CLI source result was accepted without source fixes. The CLI process exited with a Windows console Unicode/charmap final-report crash after doing the work, so that is recorded as a harness/reporting risk.

Verification:

- TypeScript clean.
- Targeted branch-store/branch/selection tests: 53/53 passed across 3 files.
- Full suite: 540/540 passed across 58 files.
- Forbidden-name rg clean for `profileBranchStore` source/test.
- No non-ASCII in `profileBranchStore` source/test.
- `git diff --check` clean for Kimi-touched files with CRLF warnings only.

Pi/Qwen Slice 1 (project-scoped ProfileSelection persistence v1):

- Added migration `013-profile-selections` and registered it after migration 012.
- Added Drizzle `profileSelections` schema:
  - one row per project via unique `project_id`
  - `project_id` references `projects(id)` with cascade delete
  - `base_profile_id`
  - ordered project/learning/personal branch id arrays as JSON columns
  - timestamps
- Added ontology data-boundary codec/repo:
  - `validateProjectProfileSelection`
  - `rowToProjectProfileSelection`
  - `projectProfileSelectionToRow`
  - insert/upsert/get-by-id/get-by-project/delete-for-project repo methods
- Added backup/export/import/clear support for `profile_selections`; archive format is now v3 and schema version is 13.
- Updated stage10 guards so `profile_selections` is allowed only in planned persistence boundary files/tests.
- Reviewer fixes after Pi:
  - `FORMAT_VERSION` bumped to 3 because the archive layout gained a new NDJSON file
  - `upsertProjectProfileSelection` now conflicts on `projectId`, matching the one-selection-per-project invariant
  - selection row codec now parses raw JSON-string branch id columns as well as decoded arrays
  - clear-all-data deletes `profile_selections` before `projects`
- No UI selector, global active selection singleton, DB-owned runtime composition, profile/base persistence, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime added in the profile-selection slice.

Codex Decision Slice (runtime activation wiring):

- Added `16_RUNTIME_ACTIVATION_WIRING_DECISION.md` with locked decision:
  - runtime activation wiring is a small application/coordinator layer above screens/services and above low-level repos
  - it reads a project/context selection
  - it resolves the base profile through `ProfileRegistry`
  - it resolves branch ids through `ProfileBranchStore`
  - it composes through the existing pure selection/runtime profile pipeline
  - services still receive only the finished `DomainProfile`
  - missing project selection rows fall back to the coding base
  - invalid base/branch references should throw structured activation errors
  - repos remain fact storage
  - Runtime Profile Coordinator remains pure
  - no global active profile, DB-owned composed profile, UI selector, MCP, agent runtime, app-builder runtime, or DSL runtime in this slice

Pi/Qwen Slice (runtime activation helper implementation):

- Added `src/features/ontology/runtimeProfileActivation.ts`:
  - `resolveRuntimeProfileForProject(input)`
  - `ProjectRuntimeProfileActivationInput`
  - `ProjectRuntimeProfileActivationResult`
  - `ProjectProfileSelectionStore`
  - `RuntimeProfileActivationError`
  - `RuntimeProfileActivationErrorCode`
  - `DEFAULT_RUNTIME_PROFILE_BASE_PROFILE_ID`
- The resolver reads project selection through a caller-supplied store, resolves the base profile through `ProfileRegistry`, resolves selected branch ids through `ProfileBranchStore`, validates missing/wrong-kind branch ids with structured errors, composes through `composeRuntimeDomainProfileFromSelection`, and returns the finished `DomainProfile` plus trace data.
- Missing project selection rows fall back to the `coding` base profile.
- The helper is interface-based and does not import DB repos, services, UI, MCP/adapters, agent runtime, app-builder runtime, or DSL runtime.
- Added `src/features/ontology/__tests__/runtimeProfileActivation.test.ts` with fallback, custom default, persisted selection, branch order/precedence, structured error, immutability, barrel export, and boundary tests.
- Pi/Qwen completed the implementation but timed out during doc-finalization; Codex removed the scratch artifact, fixed two test issues, and verified the slice.

## Current Implementation State

The ontology-profile refactor has moved beyond profile labels and compatibility naming. The current state is:

- `codingProfile` is the current base profile for this app lineage.
- Independent future base profiles such as `photography`, `work-notes`, or `lisp` should be sibling base profiles built from the shared Kortex schema/engine, not automatic children of `coding`. Branches remain different: they specialize one selected parent/base profile, such as `coding -> react` or `photography -> night-photography`.
- Future LLM-assisted creation should support both paths: broad setup questions for a new base core/profile, and parent-difference questions for a branch. The user may accept suggestions, edit manually, reject them, or mix manual and suggested ontology work.
- Adaptive suggestion policy is locked in doc 18: evidence stays factual, suggestions stay separate, default behavior is conservative suggest-first, relationship changes follow the same policy as tags/subtags, personal layer is `branchKind: 'personal'`, and risk overrides trust.
- Patch/merge proposal storage is locked and v1 storage is implemented in doc 19: patch suggestions, relationship suggestions, branch merge proposals, and manual drafts share `profile_change_proposals`; proposals store `ProfilePatch` plus source/evidence, target, risk/confidence, and review status; proposals do not apply themselves.
- `composeDomainProfile(base, overlays)` composes project, learning, and personal overlays.
- `getActiveDomainProfile(overlays?)` preserves old behavior for no overlays:
  - no argument returns `codingProfile` by reference
  - empty array returns `codingProfile` by reference
  - explicit overlays compose a runtime profile
- `ActiveDomainProfileSource` gives a structured input shape:
  - `baseProfile`
  - optional/null `overlays`
- `resolveActiveDomainProfile(source)` is the pure resolver.
- `ActiveDomainProfileActivationInput<TItemTypeNodeId>` provides grouped overlay input.
- `createActiveDomainProfileSource(input)` and `resolveActiveDomainProfileFromActivationInput(input)` compose grouped overlays.
- `prepareSaveCandidates` now accepts `options.profile?: DomainProfile` and defaults to `getActiveDomainProfile()` when omitted. The A2 decision is locked: the service receives the finished/composed brain, not branch ingredients. A1 (passing `ActiveDomainProfileActivationInput` into `prepareSaveCandidates`) was explicitly rejected.
- The runtime profile coordinator decision is locked (doc 11): the brain mixer is an explicit separate layer above runtime services. Services receive composed `DomainProfile`, do not know branch groups, do not call activation input resolvers, and do not read hidden global active-profile state.
- The coordinator helper is now implemented and tested: `runtimeProfileCoordinator.ts` is the explicit above-services coordinator boundary. `composeRuntimeDomainProfile(input)` delegates to `resolveActiveDomainProfileFromActivationInput(input)`. `RuntimeProfileCoordinatorInput` aliases `ActiveDomainProfileActivationInput`. Services still receive composed `DomainProfile`; they do not call this helper directly unless their caller passes the result. No DB, UI, persistence, global store, service hidden lookup, agent runtime, app-builder runtime, or DSL runtime was added.
- Composition still belongs to the coordinator layer. The branch/overlay persistence decision is now locked (doc 13): persist branch layers separately, not composed runtime profiles. Overlays are the durable source; composition is derived. Merging upward requires approval. Sibling branches do not affect each other. Parent profiles stay clean.
- The domain-only branch model is implemented. `ProfileBranchKind`, `ProfileBranch<TItemTypeNodeId>`, and `profileBranches.ts` helpers turn branch layers into grouped overlays and composed runtime profiles through the existing activation/coordinator pipeline.
- The profile selection and branch resolution decision is locked (doc 14): selection is per-context and id-based, with one `baseProfileId` plus ordered project/learning/personal branch id arrays in v1. A resolver turns selected ids into branch values before the Runtime Profile Coordinator composes the runtime `DomainProfile`. No global active selection, DB, UI, MCP, agent runtime, app-builder runtime, DSL runtime, or multi-base composition is part of this slice.
- The domain-only profile selection helper is implemented. `ProfileSelection`, `resolveProfileSelection`, and `composeRuntimeDomainProfileFromSelection` let callers select a base id and ordered branch ids, resolve them from provided branch values, and compose through the existing branch/coordinator pipeline without DB/UI/global state.
- The ProfileRegistry/ProfileSource v1 static helper is implemented. Base profiles resolve through a source-based registry, and duplicate profile ids throw structured errors. The interface still leaves room for future built-in/file/DB/adapter sources without changing callers.
- The ProfileBranchStore v1 static helper is implemented. Branch stores are now a separate seam from ProfileRegistry and ProfileSelection. The first implementation is in-memory only, snapshots the branch array at construction, returns branch objects by reference, and exposes async read methods for future persistent adapters.
- The branch/overlay DB persistence v1 slice is implemented: `profile_branches` rows with inline `overlay_json`, ontology data-boundary repo/codec, backup/export/import/clear support, and guards. Active selection and merge proposals stay separate.
- The project-scoped selection DB persistence v1 slice is implemented: `profile_selections` stores one active selection per project as one base profile id plus ordered project/learning/personal branch id arrays. Runtime composition remains derived and caller-owned.
- The runtime activation helper is implemented and tested. `runtimeProfileActivation.ts` builds runtime profiles through an explicit interface-based resolver that reads a project/context selection, registry, and branch store, then delegates composition to pure helpers.
- The base profile persistence / user-created cores decision is locked and v1 storage is implemented in doc 17. `profile_definitions` stores full base `DomainProfile` payloads behind the ontology data boundary, and `createProfileDefinitionSource({ id, definitions })` plugs loaded definitions into ProfileRegistry without changing ProfileRegistry to async.
- The profile registry bootstrap v1 is implemented. `profileRegistryBootstrap.ts` provides `loadPersistedProfileDefinitionSource()` and `loadDefaultProfileRegistry()` to load persisted definitions once through the ontology data boundary and expose them as synchronous `ProfileSource` / `ProfileRegistry` values alongside built-in profiles. The root ontology barrel does not export DB-backed bootstrap helpers.
- Correction evidence persistence v1 is implemented: `ontology_correction_evidence` stores append-only evidence with an active selection context snapshot, but no target/apply branch fields and no automatic profile mutation.
- The Conceptualize preview/correction-surface decision is locked in doc 20: first correction surface is before final save, user corrections store mistake-understanding evidence, and approved new ontology nodes are branch-local by default.
- The checker/proposal/context/apply decision is locked in doc 21: explanations, evidence, and proposals are separate; proposal review includes freshness/revalidation; context assembly is a branch/profile-scoped layer; accepted proposals compile to typed Kortex operations; normal apply is atomic; large backfills are chunked; historical undo is an impact-reviewed reversal proposal.
- The Conceptualize first implementation scope is locked and implemented in doc 22: existing type corrections save immediately with evidence; new subtype creation saves the corrected type id and creates a guarded pending profile-change proposal instead of silently mutating base/core profiles or branch overlays. If extraction invented an unknown type id that was normalized to the profile default, correction evidence can preserve the invalid raw model id as `rawProposedTypeNodeId`.
- The branch-local proposal review/apply decision is locked in doc 24 and the helper/service plus first minimal UI slices are implemented: first apply is explicit, branch-local, revalidated, and atomic; first review actions are Apply, Reject, Postpone, and Ask why / why not; risk/confidence wording explains blast radius; edit-then-apply, auto-apply, base/core mutation, upward merge, and old-card backfill stay future seams.
- The proposal event audit storage decision is locked and implemented in doc 25: Apply/Reject/Postpone append `profile_proposal_events` inside the same guarded transactions as the proposal/branch state changes. User-fit learning remains a future projection over those events.
- The remaining open work is: (1) base profile versioning for accepted operations, (2) richer missing-concept edit/apply flows after base/core target safety is versioned, (3) agent/subagent execution ontology brief, (4) self-building-app framework brief.

## Core Activation Files

```text
src/features/ontology/profileActivation.ts
src/features/ontology/__tests__/profileActivation.test.ts
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
```

## Changed Files In Batch 5

```text
src/__tests__/stage10-architecture-guards.test.ts  (added source guard test)
src/features/ontology/types.ts  (added ActiveDomainProfileActivationInput)
src/features/ontology/profileActivation.ts  (added grouped source helper and convenience resolver)
src/features/ontology/__tests__/profileActivation.test.ts  (added grouped activation input tests)
src/features/ontology/index.ts  (added exports for new activation helpers)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
```

## Changed Files In Batch 6

Slice 1 (A2 implementation):

```text
src/features/learning/services/prepareSaveCandidates.ts  (added profile option)
src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts  (added 3 new tests, total 4)
```

Slice 2 (doc sync):

```text
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 7

Slice 1 (coordinator decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

Slice 2 (coordinator helper implementation):

```text
src/features/ontology/runtimeProfileCoordinator.ts  (added coordinator helper)
src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts  (added 5/5 tests)
src/features/ontology/index.ts  (added exports for coordinator helper)
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md  (updated with implementation section)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md  (coordinator implemented, next decisions updated)
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md  (coordinator implemented, next decisions updated)
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md  (current-state for Batch 7 Slice 2)
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md  (coordinator helper bullet)
```

Slice 3 (coordinator guard and docs):

```text
src/__tests__/stage10-architecture-guards.test.ts  (added 2 coordinator guard tests)
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md  (added implementation section)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md  (coordinator helper implemented and tested)
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md  (coordinator helper implemented and tested)
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md  (Batch 7 Slice 3 status)
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md  (coordinator guard bullet)
```

## Changed Files In Batch 8

Slice 1 (correction evidence persistence decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 9

Slice 1 (branch/overlay persistence decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md  (added pointer to doc 13)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 11

Slice 0 (profile selection and branch resolution decision doc):

```text
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md  (created decision doc)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

Slice 1 (domain-only ProfileSelection helper):

```text
src/features/ontology/types.ts  (added ProfileSelection)
src/features/ontology/profileSelection.ts  (new pure selection helper module)
src/features/ontology/__tests__/profileSelection.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md  (implementation section)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 12

Slice 1 (ProfileRegistry/ProfileSource v1 static helper):

```text
src/features/ontology/types.ts  (added DomainProfileSummary, ProfileSource, ProfileRegistry)
src/features/ontology/profileRegistry.ts  (new pure registry helper module)
src/features/ontology/__tests__/profileRegistry.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md  (duplicate-id lock and implementation section)
ONTOLOGY_PROFILE_REFACTOR/README.md  (doc map)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Kimi Code CLI Slice 1

```text
src/features/ontology/types.ts  (added ProfileBranchStore)
src/features/ontology/profileBranchStore.ts  (new static/in-memory branch store helper)
src/features/ontology/__tests__/profileBranchStore.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
```

## Changed Files In Batch 10

Slice 1 (domain-only ProfileBranch model):

```text
src/features/ontology/types.ts  (added ProfileBranchKind and ProfileBranch)
src/features/ontology/profileBranches.ts  (new branch helper module)
src/features/ontology/__tests__/profileBranches.test.ts  (new tests)
src/features/ontology/index.ts  (exports)
```

## Important Existing Changed Files

These tracked files are expected to be modified in the current worktree:

```text
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/17_BASE_PROFILE_PERSISTENCE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md
ONTOLOGY_PROFILE_REFACTOR/KORTEX_DEVELOPER_EXPLAINER.md
src/__tests__/stage10-architecture-guards.test.ts
src/features/ontology/__tests__/profileActivation.test.ts
src/features/ontology/__tests__/profileBranches.test.ts
src/features/ontology/__tests__/profileSelection.test.ts
src/features/ontology/__tests__/profileRegistry.test.ts
src/features/ontology/__tests__/profileBranchStore.test.ts
src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
src/features/ontology/index.ts
src/features/ontology/profileActivation.ts
src/features/ontology/profileBranches.ts
src/features/ontology/profileSelection.ts
src/features/ontology/profileRegistry.ts
src/features/ontology/profileBranchStore.ts
src/features/ontology/runtimeProfileCoordinator.ts
src/features/ontology/types.ts
src/features/learning/services/prepareSaveCandidates.ts
src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts
```

Untracked local tool folder:

```text
.claude/settings.local.json
```

Do not include `.claude/` unless explicitly requested.

## Verification Already Run

Final verification after Batch 10 (domain-only ProfileBranch model):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/ontology/__tests__/profileBranches.test.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/profileComposition.test.ts
npm test -- --run
rg -n "AsyncStorage|sqlite|drizzle|schema|db|migration|zustand|createStore|setActiveBranch|useActiveBranch|profile_branches|profile_overlays|automaticMerge|autoMerge|applyMerge|MCP|agent|app-builder|Racket|DSL" src/features/ontology/profileBranches.ts src/features/ontology/__tests__/profileBranches.test.ts
rg -n "[^\x00-\x7F]" src/features/ontology/profileBranches.ts src/features/ontology/__tests__/profileBranches.test.ts
git diff --check
```

Result: TypeScript clean; targeted branch/coordinator/activation/composition tests 73/73 passed across 4 files; full suite 475/475 passed across 55 files; forbidden-name rg clean for profileBranches source/test; non-ASCII rg clean; `git diff --check` clean with CRLF warnings only.

Final verification after Batch 7 (Runtime Profile Coordinator):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/corrections.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm test -- --run
npm test -- --run src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts src/__tests__/stage10-architecture-guards.test.ts
rg -n "[^\x00-\x7F]" src/__tests__/stage10-architecture-guards.test.ts ONTOLOGY_PROFILE_REFACTOR/11_RUNTIME_PROFILE_COORDINATOR_DECISION.md ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md src/features/ontology/runtimeProfileCoordinator.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
rg -n "getRuntimeProfile|setRuntimeProfile|useRuntimeProfile|AsyncStorage|zustand|createStore|activeProfileStore|activeOverlays|profile_overlays|profile_branches|active_profile_overlay|prepareSaveCandidates" src/features/ontology/runtimeProfileCoordinator.ts src/features/ontology/__tests__/runtimeProfileCoordinator.test.ts
```

Result: TypeScript clean; focused profile/guard/correction/activation/save/coordinator set 136/136 passed across 7 test files; full suite 461/461 passed across 54 test files; targeted runtimeProfileCoordinator + stage10 47/47 passed; no non-ASCII in changed docs/source test files; no forbidden state/persistence/runtime names in coordinator source/test.

Final verification after Batch 6 (A2 implementation + doc sync):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/corrections.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm test -- --run
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/__tests__/stage10-architecture-guards.test.ts
rg -n [^\x00-\x7F] ONTOLOGY_PROFILE_REFACTOR/10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
rg -n ActiveDomainProfileActivationInput src/features/learning/services/
git diff --check
```

Result: TypeScript clean; focused profile/guard/correction/activation/save set 129/129 passed across 6 test files; full suite 454/454 passed across 53 test files; targeted stage2 + stage10 44/44 passed; no non-ASCII in changed docs/source test files; no `ActiveDomainProfileActivationInput` in changed learning service files; `git diff --check` clean.

Prior verification (Batch 6 Slice 1 code only):

```powershell
npm test -- --run src/features/learning/services/__tests__/stage2-prepareSaveCandidates.test.ts src/__tests__/stage10-architecture-guards.test.ts
rg -n ActiveDomainProfileActivationInput src/features/learning/services/
```

Result: stage2 4/4 passed, stage10 40/40 passed; no forbidden names in learning service files.

Prior verification (Batch 5):

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm test -- --run src/__tests__/stage10-architecture-guards.test.ts src/features/ontology/__tests__/profileActivation.test.ts
npm test -- --run src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/corrections.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm test -- --run
```

Result: focused profile/guard/correction/activation set 125/125 across 5 test files; full suite 451/451 across 53 test files.

## CLI Harness HR State

CLI harness HR data is current:

- `C:\pi-stuff\model_hr_db.json`
- `C:\pi-stuff\hr_findings_viewer.html`
- `C:\pi-stuff\HR_DATABASE.md`
- `C:\pi-stuff\FUTURE_PI_PROMPTING.md`
- `C:\pi-stuff\HR_REPORT_2026-05-09_BATCH12_PROFILE_REGISTRY_V1.md`
- `C:\pi-stuff\HR_REPORT_2026-05-08_BATCH11_PROFILE_SELECTION_HELPER.md`
- `C:\pi-stuff\HR_REPORT_2026-05-08_BATCH10_DOMAIN_PROFILE_BRANCH_MODEL.md`

Current HR count:

```text
46 evaluations
44 generalized lessons
```

Latest accepted worker:

```text
model: Kimi Code CLI default model
runner: Kimi Code CLI
score: 8/10
slice: ProfileBranchStore v1 static helper
```

Reusable HR lessons from this slice:

- Kimi Code CLI is usable for strict, bounded in-memory/domain helper seams after Codex/human architecture is locked.
- Require ASCII-only final reports from Kimi Code CLI on Windows; the code was usable, but the runner crashed while printing a Unicode final-report character.
- Treat Kimi final-report counts as untrusted until Codex verifies actual test counts.

## Current Gate Hygiene And Next Work

Current update: doc 39 is locked and the first source slices are implemented. Conceptualize missing-concept drafts now carry editable meaning, `Use suggestion` copies suggested label/meaning/reason/valid parent, new subtype proposal nodes use edited meaning before suggestion/reason fallback, proposal reasons preserve original suggestion provenance plus edited-field provenance, Conceptualize correction controls show a read-only target/blast-radius summary, and saved drafts that create pending proposals can open the existing proposal review/apply surface with that proposal selected. No one-click direct Conceptualize Apply, target switching controls, stale refresh, superseding persistence, checker runtime, auto-apply, or ontology/profile mutation was added.

Decision hygiene rule: before treating a topic as a new architecture decision, check the numbered decision docs and classify it as already locked, partially implemented, an open implementation gap, or actually undecided. If behavior is already locked, cite the doc and discuss implementation only unless the human explicitly asks to reconsider.

The A2 decision for `prepareSaveCandidates` is locked and implemented. The runtime profile coordinator decision is locked (doc 11). The correction evidence persistence decision is locked and v1 storage is implemented (doc 12): evidence stores active selection context, but not target/apply branch fields. The branch/overlay persistence decision is locked (doc 13). The profile selection and branch resolution decision is locked (doc 14). The ProfileRegistry/ProfileSource v1 static helper is implemented (doc 15). The runtime activation wiring decision is locked (doc 16) and the interface-based runtime activation helper is implemented. The base profile persistence / user-created cores decision is locked and v1 storage is implemented (doc 17). The adaptive suggestion policy decision is locked (doc 18). The patch/merge proposal storage decision is locked and v1 storage is implemented (doc 19). The Conceptualize preview/correction-surface decision is locked (doc 20). The checker/proposal/context/apply decision is locked (doc 21). The Conceptualize first implementation scope is locked and implemented (doc 22). The trust setting storage decision is locked and v1 storage is implemented (doc 23). The branch-local proposal review/apply decision is locked and helper/service plus minimal UI slices are implemented (doc 24). The proposal event audit storage decision is locked and implemented (doc 25). The Conceptualize Extractor Flip is locked and implemented (doc 33). Raw proposed type identity is locked and implemented (doc 34): structured in-memory identity plus legacy string projection. Correction-evidence near-miss snapshots are locked and implemented (doc 35): hidden Conceptualize diagnostics persist only when user correction evidence is written. Missing-concept UX is locked and implemented (doc 36): `noStrongMatch` is an explicit review state and `suggestedNewConcept` can be copied into manual new-subtype fields without auto-apply; the manual new-subtype path rejects stale explicit parents and non-item node-id collisions before writing evidence/proposals. User-fit projection/history/ContextPack consumption is locked and implemented (doc 37), including the pure checker selector seam. Base profile versioning, base-profile apply helper/service, and explicit base/core review UI wiring are locked and implemented (doc 38): proposals can snapshot the target base profile version, base/core apply rejects missing or stale target versions, patch revalidation runs before mutation, and successful apply creates the next persisted profile definition version. Doc 39 is now partially implemented: target behavior is already locked as active branch/local first, base/core only explicit and version-guarded, no silent widening; draft meaning/provenance, target readout, and proposal-review handoff are implemented, but target switching, one-click direct Conceptualize Apply, superseding, and stale refresh remain implementation gaps. The next work is implementation, not re-decision.

Kimi Code CLI Slice 2 (profile definitions persistence v1):

- Added migration 014 for `profile_definitions` table with expected columns, source_kind CHECK constraint, and indexes
- Added `ProfileDefinition` and `ProfileDefinitionSourceKind` to ontology types
- Added `profileDefinition.ts` codec with:
  - `validateProfileDefinition`
  - `rowToProfileDefinition`
  - `profileDefinitionToRow`
  - validates complete DomainProfile shape with strict schemas
  - validates top-level definition fields match nested profile fields (id, label, description, version)
  - parses profile_json from string or object
- Added `profileDefinitionRepo.ts` with insert/upsert/getById/getByIds/list/delete
- Added `createProfileDefinitionSource` to `profileRegistry.ts`:
  - returns synchronous `ProfileSource` from loaded `ProfileDefinition[]`
  - returns profiles by reference
  - lists summaries from definition fields
  - throws `DuplicateProfileIdError` for duplicate ids within one source
- Added backup/export/import/clear/columnMaps support for `profile_definitions`
  - bumps FORMAT_VERSION 3 -> 4 and SCHEMA_VERSION 13 -> 14
  - exports as `profile_definitions.ndjson`
  - imports old backups without `profile_definitions.ndjson` safely as zero definitions
  - parses `profile_json` as JSON before insert
- Added focused tests:
  - migration 014 schema and execution tests (4 tests)
  - profile definition codec tests (17 tests)
  - profileRegistry definition source tests (10 tests)
  - backup column map tests for profile_definitions (4 tests)
- Updated stage10 architecture guards:
  - `profile_definitions` allowed only in planned persistence boundary files and tests
  - still forbids `profile_overlays`, `active_profile_overlay`, `active_profile_selection`, `profile_merge_proposals`, `persisted_runtime_profile`, `runtime_profile_json`, `composed_profile_json`
- Updated `NEXT_LLM_CONTEXT`, `WHERE_WE_STAND`
- No UI, services, MCP/adapters, agent runtime, app-builder runtime, Racket/DSL runtime, merge proposal code, correction storage, or runtime activation changes

Kimi Code CLI Slice 3 (profile registry bootstrap v1):

- Added `profileRegistryBootstrap.ts` with:
  - `PERSISTED_PROFILE_DEFINITION_SOURCE_ID`
  - `BUILT_IN_PROFILE_SOURCE_ID`
  - `loadPersistedProfileDefinitionSource(options?)` - async loader returning synchronous `ProfileSource`
  - `loadDefaultProfileRegistry(options?)` - async loader returning synchronous `ProfileRegistry` with built-in + persisted + optional additional sources
- Built-in coding profile source precedes persisted definition source in registry order
- Duplicate ids across built-in and persisted sources throw `DuplicateProfileIdError`
- Dependency injection supported for tests: `listDefinitions`, `sourceId`, `additionalSources`
- Exported from `src/features/ontology/data/index.ts`, not the root ontology barrel
- Added `profileRegistryBootstrap.test.ts` with focused tests:
  - injected listDefinitions usage and sync source return
  - persisted source id exposure (default and custom)
  - summaries without full profile fields
  - loaded definition order preservation
  - built-in + persisted registry composition
  - built-in before persisted in listProfiles order
  - custom persisted profile resolution by id
  - duplicate persisted id `coding` throws `DuplicateProfileIdError`
  - caller additionalSources array is not mutated
  - snapshot behavior for additional source arrays
- Added stage10 boundary guard proving root ontology barrel does not export DB-backed bootstrap helpers
- Updated `NEXT_LLM_CONTEXT`, `WHERE_WE_STAND`, `TOMORROW_START`
- No global active registry, no singleton mutable state, no UI, no services, no MCP/adapters, no agent runtime, no app-builder runtime, no DSL runtime

Verification:

- TypeScript clean.
- `profileRegistryBootstrap.test.ts` 13/13 passed.
- `profileRegistry.test.ts` 36/36 passed.
- `stage10-architecture-guards.test.ts` all passed.
- Full suite: 660/660 passed across 66 test files.

The coordinator helper is now implemented and tested. The adaptive suggestion policy is locked as a docs-only decision, patch/merge proposal storage v1 is implemented as storage-only code, Conceptualize preview is locked as the first correction surface, the checker/proposal/context/apply architecture is locked, the first Conceptualize correction loop is implemented, trust setting storage v1 is implemented, the branch-local proposal review/apply helper/service plus minimal UI slices are implemented from doc 24, proposal event audit storage is implemented from doc 25, the first pure context assembly slice is implemented from doc 28, the first pure context selector slice is implemented from doc 29, the first Conceptualize ContextPack shadow caller is implemented from doc 30, the pure Conceptualize prompt builder is implemented from doc 31, the classification-only Extractor Flip is implemented from doc 33, raw proposed type identity is implemented from doc 34, near-miss correction snapshots are implemented from doc 35, missing-concept UX/proposal revalidation is implemented from doc 36, user-fit projection is implemented from doc 37, base/core apply is implemented from doc 38, and the first doc 39 draft meaning/provenance, target readout, and proposal-review handoff slices are implemented. The remaining open decision/implementation gaps require Codex plus human input:

```text
1. Continue doc 39 richer missing-concept edit/apply implementation: target switching with blast-radius copy, optional one-click direct Apply through doc 24/doc 38, and later superseding/stale-refresh behavior. Target semantics are already locked; do not re-decide them.
2. Agent/subagent execution ontology decision brief.
3. Self-building-app framework decision brief.
```

Model recommendation:

- Decision/review: Codex
- Implementation: Codex directly unless the human explicitly asks for a worker/model experiment

## Commit Message

```text
Add profile branch, selection, and registry helper seams
```

## Commit Summary

```text
Added the domain-only ProfileBranch, ProfileSelection, and ProfileRegistry helper seams. ProfileBranchKind/ProfileBranch, ProfileSelection, DomainProfileSummary, ProfileSource, and ProfileRegistry now live in ontology types. profileBranches.ts turns branch layers into overlays/grouped activation input/runtime profiles through the coordinator pipeline. profileSelection.ts resolves per-context id-based selections into branch values. profileRegistry.ts resolves base profiles from static/in-memory profile sources and throws structured duplicate/not-found errors. Added focused tests for branch grouping, selection order, registry lookup/listing, duplicate ids, precedence, immutability, frozen inputs, caller array stability, runtime composition equivalence, and forbidden-name boundaries. No DB, migration, storage API, profile persistence, file source, adapter source, UI selector, global active selection/registry, automatic merge/versioning, correction branch fields, MCP/adapters, agent runtime, app-builder runtime, DSL runtime, or multi-base composition added.
```

## Detailed Commit Body

```text
- Added ProfileBranchKind and ProfileBranch<TItemTypeNodeId> to ontology types
- Added profileBranches.ts with pure helpers:
  - profileBranchToOverlay
  - groupProfileBranchesByKind
  - createActiveDomainProfileSourceFromBranches
  - composeRuntimeDomainProfileFromBranches
- Added profileBranches.test.ts with focused tests for:
  - empty branch list returns base profile by reference
  - project branch overlay adds ontology node
  - personal branch wins over project
  - learning branch wins over project when personal absent
  - later same-kind project branch wins
  - sibling branches remain independent and inputs are not mutated
  - frozen branch arrays/objects compose correctly
  - grouped helper preserves input order inside each kind
  - branch composition matches existing runtime composition path
  - profileBranches source remains free of forbidden persistence/runtime terms
- Exported ProfileBranch types and branch helpers from ontology index
- Added ProfileSelection to ontology types
- Added profileSelection.ts with pure helpers:
  - resolveProfileSelection
  - composeRuntimeDomainProfileFromSelection
- Added profileSelection.test.ts with focused tests for:
  - empty selection returns base by reference
  - selected project branch adds ontology node
  - selection order wins independent of raw branch array order
  - personal/learning/project precedence
  - missing branch id, base id mismatch, and wrong-kind branch id errors
  - frozen input immutability
  - equivalence to composeRuntimeDomainProfileFromBranches
  - profileSelection source/test forbidden-name boundaries
- Added DomainProfileSummary, ProfileSource<TItemTypeNodeId>, and ProfileRegistry<TItemTypeNodeId> to ontology types
- Added profileRegistry.ts with pure helpers:
  - DuplicateProfileIdError
  - ProfileNotFoundError
  - toDomainProfileSummary
  - createStaticProfileSource
  - createProfileRegistry
- Added profileRegistry.test.ts with focused tests for:
  - summary shape contains only id/version/label/description
  - static source lookup/listing
  - duplicate profile ids inside one source
  - registry lookup/listing
  - duplicate profile ids across sources
  - unknown profile id errors
  - frozen input and caller array mutation stability
  - profileRegistry source/test forbidden-name boundaries
- Updated NEXT_LLM_CONTEXT, TOMORROW_START, WHERE_WE_STAND, and implementation_handoff
- No DB, migration, storage API, profile persistence, file source, adapter
  source, UI selector, global active selection/registry, automatic merge,
  automatic versioning, correction branch fields, MCP/adapters, agent runtime,
  app-builder runtime, DSL runtime, or multi-base composition added
```

## Commit Caveat

Do not include local tool folders unless explicitly requested:

```text
.claude/
C:\pi-stuff\sessions\
```

The Pi HR files under `C:\pi-stuff` are a separate repo/work area from the app repo. Commit them separately if desired.
