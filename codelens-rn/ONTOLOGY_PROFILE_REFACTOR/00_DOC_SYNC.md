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
- `architecture_contract_for_profile_refactor.md` is the local adjusted LLM contract for this refactor.
- `architecture_guide_for_profile_refactor_humans.md` is the local adjusted human guide.
- `modules_architecture.md` is a draft future module/foldering architecture guide.
- `modules_architecture_humans.md` is the human-readable version of the module/foldering guide.
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
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
ONTOLOGY_PROFILE_REFACTOR/humanreadable.md
ONTOLOGY_PROFILE_REFACTOR/04_REFACTOR_WITHOUT_BREAKING_APP.md
ONTOLOGY_PROFILE_REFACTOR/05_ANTI_REGRESSION_RULES.md
```

For a smaller planning-only discussion, read:

```text
ONTOLOGY_PROFILE_REFACTOR/README.md
ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md
ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md
ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md
ONTOLOGY_PROFILE_REFACTOR/humanreadable.md
ONTOLOGY_PROFILE_REFACTOR/01_BIG_PLAN.md
ONTOLOGY_PROFILE_REFACTOR/03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md
```
