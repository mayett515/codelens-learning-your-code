# Documentation Sync

This file explains how the root architecture docs and this refactor folder should stay connected.

## Root Docs

<root_docs>
- `MAIN.md` is the master doc index and prompt-bundle map.
- `ARCHITECTURE.md` describes the current implementation.
- `whatwe_agreedonthearchitecture.md` is the strict LLM execution contract.
- `whatwe_agreedonthearchitecture_humans.md` is the human-readable architecture agreement.
- `PERSISTENCE.md` is the canonical storage/SQLite/vector reference.
- `current_state.md` is the phase/status tracker.
</root_docs>

## Refactor Docs

<refactor_docs>
- `README.md` is the folder entry point.
- `humanreadable.md` explains the sequencing in plain language.
- `01_BIG_PLAN.md` explains the product and architecture north star.
- `02_DYNAMIC_PROFILE_SCHEMA.md` sketches the profile/ontology schema.
- `03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md` defines categorization, correction, and checker ideas.
- `04_REFACTOR_WITHOUT_BREAKING_APP.md` defines the staged implementation plan.
- `05_ANTI_REGRESSION_RULES.md` defines hard rules for profile/ontology work.
- `06_PROFILE_BRANCHING_AND_MERGE.md` defines profile inheritance, branching, overlays, and merge semantics.
- `07_KORTEX_CORE_AND_CHILD_CORES.md` defines the updated product boundary: Kortex Core, child cores, agent execution ontology, self-building app framework direction, graph projections, and dynamic relationship semantics direction.
- `08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md` defines the future Racket/DSL language-layer direction, protocol-first adapters, and self-update boundary.
- `09_KORTEX_OVER_EXISTING_SYSTEMS.md` defines the non-destructive overlay model for codebases, notes, databases, LLMs, and other existing systems.
- `10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md` locks the A2 service seam: services receive composed DomainProfile values.
- `11_RUNTIME_PROFILE_COORDINATOR_DECISION.md` locks the explicit runtime coordinator / brain mixer layer.
- `12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md` locks evidence-first correction persistence.
- `13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md` locks branch overlay persistence as source, not composed runtime profiles.
- `14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md` locks id-based per-context selection and branch resolution.
- `15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md` locks source-based base profile resolution through ProfileRegistry.
- `16_RUNTIME_ACTIVATION_WIRING_DECISION.md` locks the application/coordinator runtime activation wiring seam.
- `17_BASE_PROFILE_PERSISTENCE_DECISION.md` locks user-created base profiles as their own future persistence source, separate from branches.
- `18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md` locks suggest-first adaptive behavior, trust/risk separation, personal layer semantics, and explicit approval for risky/base/core changes.
- `19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md` locks unified profile change proposal storage for patch suggestions, manual drafts, and merge proposals.
- `20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md` locks Conceptualize preview as the first correction doorway before final save.
- `21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md` locks the shared architecture for Conceptualize, checker proposals, graph chat, context assembly, typed apply, audit events, and historical reversal.
- `22_CONCEPTUALIZE_FIRST_IMPLEMENTATION_SCOPE_DECISION.md` locks existing type correction and guarded new-subtype proposal scope.
- `23_TRUST_SETTING_STORAGE_DECISION.md` locks separate trust setting storage without current auto-apply.
- `24_BRANCH_LOCAL_PROPOSAL_APPLY_DECISION.md` locks explicit branch-local proposal apply.
- `25_PROPOSAL_EVENT_AUDIT_STORAGE_DECISION.md` locks append-only proposal decision/lifecycle event facts, including ask-why and superseded audit events.
- `26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md` locks scoped node identity and label/meaning boundaries.
- `27_PROJECT_NAMING_KORDEX_DECISION.md` locks Kordex naming direction while leaving generic implementation identifiers.
- `28_CONTEXT_ASSEMBLY_DECISION.md` locks shared ContextPack assembly and validation.
- `29_CONTEXT_SELECTOR_DECISION.md` locks shared context selection contracts with focused task selectors.
- `30_CONCEPTUALIZE_CONTEXTPACK_SHADOW_WIRING_DECISION.md` locks behavior-neutral Conceptualize ContextPack shadow wiring.
- `31_CONCEPTUALIZE_PROMPT_BUILDER_DECISION.md` locks prompt building over validated ContextPack.
- `32_CONCEPTUALIZE_SINGULAR_OUTPUT_AND_DIAGNOSTICS_DECISION.md` locks singular public output and internal-only diagnostics.
- `33_CONCEPTUALIZE_EXTRACTOR_FLIP_DECISION.md` locks the classification-only live Conceptualize extractor flip with guarded fallback.
- `34_RAW_PROPOSED_TYPE_IDENTITY_DECISION.md` locks structured raw proposed type identity.
- `35_CORRECTION_EVIDENCE_NEAR_MISS_DECISION.md` locks near-miss diagnostics as inert evidence only when a correction is written.
- `36_MISSING_CONCEPT_UX_DECISION.md` locks missing-concept review UX and no auto-fill/auto-apply.
- `37_USER_FIT_PROJECTION_DECISION.md` locks bounded derived user-fit projection from evidence/events.
- `38_BASE_PROFILE_VERSIONING_DECISION.md` locks base/core proposal version guards and explicit apply path.
- `39_EDIT_THEN_APPLY_DECISION.md` locks richer draft/edit/proposal handoff behavior without direct Conceptualize apply. It now also locks and implements the first target-layer switching path through the review surface: explicit branch-local additive proposal -> base/core replacement-plus-supersede with fresh base version snapshot, no in-place retargeting, no model/checker initiation, no sibling/bulk switching, and no immediate Apply.
- `40_PROPOSAL_FRESHNESS_AND_STALE_REFRESH_DECISION.md` locks proposal freshness as a separate derived review condition and refresh as replacement-plus-supersede.
- `41_CHECKER_RUNTIME_FIRST_SLICE_DECISION.md` consolidates the scattered future checker vision and locks the first checker runtime as manual-on-demand, branch-local, proposal-only, and additive ontology-node/item-type only. The pure prompt/output contract, deterministic mapper, manual runtime service, UI trigger/readout, concrete model adapter seam, correction-pattern `patternFrequency` aggregation, and `isItemType` parent hints are implemented. Relationship/boundary operations, base/core checker targeting, background modes, checker-run tables, and auto-apply remain deferred.
- `42_BRANCH_PROFILE_SELECTION_UI_DECISION.md` locks the first branch/profile selection UI as a minimal project-scoped selector over existing docs 13/14/16/17 seams. The pure selection-draft helper, focused data hooks, compact selection panel, and explicit project-context route wiring are implemented. The gate may create empty branches, save selected base/branch ids, reorder selected branches, and pass an explicit checker branch target, but it must not add global active selection, composed-profile persistence, target switching, branch merge/fork UX, multi-base composition, base mutation, or auto-apply.
- `43_SECOND_BASE_PROFILE_FORKABILITY_DEMO_DECISION.md` locks and implements the first second-base-profile proof as a minimal photography forkability demo. It proves the existing registry, profile-definition persistence/backup mapping, project selection, branch creation/composition, checker/proposal review, target-switch, and base apply seams work against a non-coding base profile. Its follow-ups implement profile-scoped learning capture, save-candidate, precheck, concept-list, retrieval, Learning Hub/chat retrieval, graph, review, and promotion consumers for overlapping type ids such as `composition`, and it must not be used as a license for profile-gallery UX, cross-base behavior, new operation vocabulary, maturity lifecycle, or source-sync work.
- `FABLE_STRATEGIC_REVIEW_2026-06-09/` preserves Claude Fable's historical strategic review as guidance only; durable bans and routing guidance are folded into active docs and it does not override numbered decisions.
- `architecture_contract_for_profile_refactor.md` is the local adjusted LLM contract for this refactor.
- `architecture_guide_for_profile_refactor_humans.md` is the local adjusted human guide.
- `modules_architecture.md` is a draft future module/foldering architecture guide.
- `modules_architecture_humans.md` is the human-readable version of the module/foldering guide.
- `FUTURE_CONCEPTS/GAME_ENGINE/` preserves non-authoritative game-engine inspiration. It is routed
  from the active docs for discoverability, but it does not override numbered decisions or open an
  implementation gate by itself.
</refactor_docs>

## Update Rules

<update_rules>
- If the general architecture rule changes, update the root `whatwe_agreedonthearchitecture.md` and mirror the relevant profile-specific rule here.
- If the profile/ontology strategy changes, update this folder first, then add a short pointer in `MAIN.md` or `ARCHITECTURE.md` if it affects repo-wide rules.
- If the Kortex Core / child-core product boundary changes, update `07_KORTEX_CORE_AND_CHILD_CORES.md` first.
- If tags/subtags gain agent behavior, permission, execution, or subagent policy meaning, update `07_KORTEX_CORE_AND_CHILD_CORES.md` first and mirror the adapter implications in `09_KORTEX_OVER_EXISTING_SYSTEMS.md`.
- If Kortex-as-self-building-app-framework changes, update `07_KORTEX_CORE_AND_CHILD_CORES.md` first and mirror the overlay implications in `09_KORTEX_OVER_EXISTING_SYSTEMS.md`.
- If the Kortex language layer, adapter strategy, or self-update boundary changes, update `08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md` first.
- If the Kortex-over-existing-systems overlay model, adapter ownership, source sync, or write-back policy changes, update `09_KORTEX_OVER_EXISTING_SYSTEMS.md` first.
- If persistence schema changes for profiles or ontology, update `PERSISTENCE.md`, `ARCHITECTURE.md`, and `04_REFACTOR_WITHOUT_BREAKING_APP.md`.
- If a phase completes, update `current_state.md`.
- Do not let old handoff/session notes become canonical. Promote durable decisions into root docs or this folder.
- Keep documents under `FUTURE_CONCEPTS/` explicitly non-authoritative. Before implementing one of
  those concepts, reconcile it with current numbered decisions and lock the new gate separately.
- Use `NEXT_LLM_CONTEXT.md` as the canonical active handoff while the refactor is active. `WHERE_WE_STAND.md` and `implementation_handoff.md` are historical logs/pointers unless a specific old slice is being audited.
- Before proposing a new architecture decision, first check the numbered decision docs and classify the topic as `already locked`, `partially implemented`, `open implementation gap`, or `actually undecided`. Do not re-open locked behavior unless the human explicitly asks to reconsider it.
- After classifying a topic as already locked, do not start a new code slice from an ambiguous continuation like "continue" alone. Ask for explicit implementation approval unless the human has already clearly requested code.
</update_rules>

## End-State Consolidation

<end_state_doc_policy>
This folder is planning scaffolding for an active strategic refactor.
It should not become a permanent second architecture system.

When the profile/ontology refactor stabilizes:
- promote durable architecture decisions into root canonical docs
- keep `MAIN.md` as the doc map
- keep `ARCHITECTURE.md` as the current architecture description
- keep `whatwe_agreedonthearchitecture.md` as the strict agent contract
- keep `whatwe_agreedonthearchitecture_humans.md` as the plain-English guide
- keep `PERSISTENCE.md` as the storage reference
- keep `current_state.md` as the status tracker
- archive, mark superseded, or delete temporary planning docs that are no longer needed
</end_state_doc_policy>

## Recommended Final Location

<final_location_policy>
Canonical architecture docs should stay in the `codelens-rn/` root.
That is where agents and humans already look first.

Use root files for durable project-wide truth:
- `MAIN.md`
- `ARCHITECTURE.md`
- `whatwe_agreedonthearchitecture.md`
- `whatwe_agreedonthearchitecture_humans.md`
- `PERSISTENCE.md`
- `current_state.md`

Use subfolders for temporary or phase-specific planning:
- `ONTOLOGY_PROFILE_REFACTOR/`
- `PHASE_6/`
- future stage folders

After a refactor stabilizes, root docs should point to the final architecture and the temporary folder should no longer be required reading.
</final_location_policy>

## Possible Future Root Docs

<future_root_docs>
If module/foldering rules become large enough that `ARCHITECTURE.md` gets too dense, promote `modules_architecture.md` to the `codelens-rn/` root and link it from `MAIN.md`.

If the rules remain compact, merge the durable content into `ARCHITECTURE.md` instead.
</future_root_docs>

## Agent Reading Bundles

For any profile/ontology refactor implementation, read:

```text
MAIN.md
whatwe_agreedonthearchitecture.md
whatwe_agreedonthearchitecture_humans.md
ARCHITECTURE.md
PERSISTENCE.md
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
ONTOLOGY_PROFILE_REFACTOR/humanreadable.md
ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md
ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md
```

For historical strategic-review context and risk-pattern sanity checking, read:

```text
ONTOLOGY_PROFILE_REFACTOR/FABLE_STRATEGIC_REVIEW_2026-06-09/00-system-index.md
ONTOLOGY_PROFILE_REFACTOR/FABLE_STRATEGIC_REVIEW_2026-06-09/05-next-gates.md
ONTOLOGY_PROFILE_REFACTOR/FABLE_STRATEGIC_REVIEW_2026-06-09/07-anti-regression-contract.md
```

The Fable review pack is historical review guidance. Its first gate sequence has been implemented; use it to spot risk patterns, not as current planning authority. Numbered decision docs remain the source of truth.

For a smaller planning-only discussion, read:

```text
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
ONTOLOGY_PROFILE_REFACTOR/humanreadable.md
ONTOLOGY_PROFILE_REFACTOR/01_BIG_PLAN.md
ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md
ONTOLOGY_PROFILE_REFACTOR/FABLE_STRATEGIC_REVIEW_2026-06-09/01-kordex-architecture-review.md
```
