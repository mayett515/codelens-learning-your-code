# Ontology Profile Refactor Plan

This folder captures the strategic plan for extracting Kortex Core while keeping CodeLens useful as
the first serious coding child around that core.

<purpose>
Kortex Core is the reusable ontology/graph/versioned reasoning system.
CodeLens should remain excellent for coding, but the coding app is a child implementation around the core, not the core's boundary.
Future child cores can support another programmer's ontology, math, writing, photography, agent orchestration, or other knowledge domains.
</purpose>

## What We Agreed

<core_agreement>
- The current app is already useful as a coding-first capture and concept system.
- The current architecture is mostly good; the problem is hardcoded domain meaning, not folder structure alone.
- The actual long-term product boundary is Kortex Core: ontology, graph, relationships, corrections, maturity, branches, merges, and headless APIs.
- CodeLens/coding is the first serious child core/wrapper/fork around Kortex Core.
- Future base cores such as photography, work-notes, or lisp are independent siblings by default:
  they use the Kortex schema/engine but do not automatically inherit coding ontology content.
- The sandbox worktree contains the better pattern for dynamic classification: model-owned metadata, strict validation, conservative fallback, and no silent ontology mutation.
- The main app should learn from that pattern and move from hardcoded learning concepts toward dynamic domain profiles.
- Dynamic does not mean random. The model may suggest taxonomy changes, but the user/profile owner approves durable ontology changes.
</core_agreement>

## The Big Shape

```text
Kortex Core
  ontology nodes
  graph state
  relationships
  is / is not boundaries
  correction evidence
  maturity ladder
  branch / overlay / merge semantics
  headless APIs

Coding child core / CodeLens wrapper
  coding ontology
  coding prompts
  coding metadata fields
  coding UI labels
  coding capture/review/retrieval/promotion flows
  coding graph visual encoding

Future child core
  any other ontology
  own relationship semantics
  own graph views
  own app / CLI / MCP / API consumer

Agent/subagent execution ontology
  tags/subtags as behavior and execution constraints
  is / is not boundaries for agent permissions
  extends inheritance for subagent policy
  allowed/forbidden operations and approval gates

Self-building app framework direction
  user intent becomes project app ontology
  app ontology constrains DB / API / UI / test subagents
  generated code stays tied to correctable graph state
  user corrections become ontology evidence and patch suggestions

Future language layer
  Kortex DSL
  possibly Racket-based
  compiles into validated core operations
  adapters handle ecosystem-specific work

Overlay use case
  Kortex over existing systems
  read/write/sync adapters
  non-destructive by default
  codebases, notes, databases, LLMs, project tools
```

## Files In This Folder

- [01_BIG_PLAN.md](01_BIG_PLAN.md) - overall product and architecture plan.
- [02_DYNAMIC_PROFILE_SCHEMA.md](02_DYNAMIC_PROFILE_SCHEMA.md) - proposed profile, ontology, and metadata shapes.
- [03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md](03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md) - category descriptions, correction flow, and periodic checker.
- [04_REFACTOR_WITHOUT_BREAKING_APP.md](04_REFACTOR_WITHOUT_BREAKING_APP.md) - staged implementation plan with low-risk sequencing.
- [05_ANTI_REGRESSION_RULES.md](05_ANTI_REGRESSION_RULES.md) - hard constraints for future agents.
- [06_PROFILE_BRANCHING_AND_MERGE.md](06_PROFILE_BRANCHING_AND_MERGE.md) - profile inheritance, branching, overlays, and merge semantics.
- [07_KORTEX_CORE_AND_CHILD_CORES.md](07_KORTEX_CORE_AND_CHILD_CORES.md) - updated core framing: Kortex Core, child cores, agent execution ontology, self-building app framework direction, graph projections, and relationship semantics direction.
- [08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md](08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md) - future Racket/DSL language-layer direction, protocol-first adapters, and self-update boundaries.
- [09_KORTEX_OVER_EXISTING_SYSTEMS.md](09_KORTEX_OVER_EXISTING_SYSTEMS.md) - Kortex as a non-destructive ontology overlay over codebases, notes, databases, LLMs, and other systems.
- [10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md](10_ACTIVE_PROFILE_RUNTIME_SOURCE_DECISION.md) - locked decision (A2): save/extraction receives composed DomainProfile via options.profile, not activation input. A1 rejected.
- [11_RUNTIME_PROFILE_COORDINATOR_DECISION.md](11_RUNTIME_PROFILE_COORDINATOR_DECISION.md) - locked decision: explicit Runtime Profile Coordinator / Brain Mixer layer above services. Services receive composed DomainProfile. No hidden global active-profile state. No persistence/UI selector/agent runtime/app-builder runtime in this slice.
- [12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md](12_CORRECTION_EVIDENCE_PERSISTENCE_DECISION.md) - locked decision + first implementation: evidence-first persistence, patch suggestions later, no automatic ontology/profile mutation. `ontology_correction_evidence` stores the active selection context where the mistake happened, without branchId/targetLayerId/apply target fields. Proposal storage is separate in doc 19; no checker runtime/UI is implemented.
- [13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md](13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md) - locked decision: persist branch layers separately, not composed runtime profiles. Overlays are the durable source; composition is derived. Merging upward requires approval. Sibling branches do not affect each other. Parent profiles stay clean.
- [14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md](14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md) - locked decision: branch persistence, active selection, branch resolution, and runtime composition are separate boundaries. Selection is per-context, id-based, single-base in v1, and resolved into branch values before the pure Runtime Profile Coordinator composes a DomainProfile. No global active selection, DB, UI, MCP, agent runtime, app-builder runtime, or DSL runtime in this slice.
- [15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md](15_PROFILE_REGISTRY_AND_PROFILE_SOURCES_DECISION.md) - decision + first implementation: base profiles resolve through a source-based ProfileRegistry, separate from ProfileBranchStore. The interface supports future built-in/file/DB/adapter sources. V1 implements only static/in-memory profile source helpers. Duplicate profile ids throw structured errors across all sources.
- [16_RUNTIME_ACTIVATION_WIRING_DECISION.md](16_RUNTIME_ACTIVATION_WIRING_DECISION.md) - locked decision + implementation: runtime activation wiring is a small application/coordinator layer that loads a project/context selection, resolves the base profile through ProfileRegistry, resolves branch ids through ProfileBranchStore, composes via the pure runtime pipeline, and passes only the finished DomainProfile to services. `resolveRuntimeProfileForProject` is implemented as an interface-based helper. No global active profile, DB-owned composition, UI selector, MCP, agent runtime, app-builder runtime, or DSL runtime in this slice.
- [17_BASE_PROFILE_PERSISTENCE_DECISION.md](17_BASE_PROFILE_PERSISTENCE_DECISION.md) - locked decision + first implementation: user-created base cores/profiles persist separately from branches and composed runtime profiles. `profile_definitions` storage now exists and plugs into ProfileRegistry through a synchronous source factory over loaded definitions. New domains such as photography or lisp are independent base profiles by default; branches specialize one selected base.
- [18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md](18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md) - locked docs-only decision: correction evidence stays factual, suggestions stay separate, default behavior is conservative suggest-first, relationship changes use the same trust/risk policy as tags/subtags, personal layer is `branchKind: 'personal'`, risk overrides trust, and base/core changes require explicit approval.
- [19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md](19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md) - locked decision + storage-only v1: patch suggestions, relationship suggestions, branch merge proposals, and manual drafts use one unified `profile_change_proposals` table. Proposals store a `ProfilePatch`, source/evidence, target layer, risk/confidence, and review status. Proposals do not apply themselves; apply/merge is explicit and later.
- [20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md](20_CONCEPTUALIZE_PREVIEW_AND_CORRECTION_SURFACE_DECISION.md) - locked docs-only decision: the first correction surface is the Conceptualize preview before final save. Every correction stores mistake-understanding evidence; Conceptualize starts as a safe correction doorway, not the full Kortex ontology editor.
- [21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md](21_CHECKER_PROPOSAL_REVIEW_CONTEXT_AND_APPLY_DECISION.md) - locked docs-only decision: Conceptualize, checker runs, graph selection chat, proposal review, context assembly, typed apply operations, audit events, bulk jobs, and historical reversal share one coherent architecture.
- [22_CONCEPTUALIZE_FIRST_IMPLEMENTATION_SCOPE_DECISION.md](22_CONCEPTUALIZE_FIRST_IMPLEMENTATION_SCOPE_DECISION.md) - locked and implemented decision: Conceptualize supports existing type correction plus guarded new subtype proposals. Corrected captures store mistake evidence; new subtype creation creates a pending profile-change proposal instead of silently mutating base/core profiles or branch overlays.
- [23_TRUST_SETTING_STORAGE_DECISION.md](23_TRUST_SETTING_STORAGE_DECISION.md) - locked and implemented storage-only decision: trust settings live separately from evidence and proposals. `profile_trust_settings` stores per-base/per-branch trust mode and future low-risk auto-apply policy without adding auto-apply, review UI, checker runtime, event store, or apply service.
- [24_BRANCH_LOCAL_PROPOSAL_APPLY_DECISION.md](24_BRANCH_LOCAL_PROPOSAL_APPLY_DECISION.md) - locked decision + first helper/service/minimal UI implementation: first proposal apply flow is explicit, branch-local, revalidated, and atomic. `branchLocalProposalApply.ts` compiles pending branch proposals into typed operations and merges patches into branch overlay values, while `data/branchLocalProposalApplyService.ts` loads proposal/branch rows and commits branch update plus accepted proposal in one transaction. The first review UI adds a Learning Hub entry and queue/detail modal for Apply, Reject, Postpone, and Ask why / why not without edit support. No base/core mutation, upward merge, old-card backfill, edit-then-apply, or auto-apply is part of the first apply seam.
- [25_PROPOSAL_EVENT_AUDIT_STORAGE_DECISION.md](25_PROPOSAL_EVENT_AUDIT_STORAGE_DECISION.md) - locked decision + implementation: proposal review/apply decisions are append-only event facts in `profile_proposal_events`. Apply/Reject/Postpone now write audit events inside the same guarded transaction as the proposal/branch status change. User-fit learning remains a future projection over events; no checker runtime, auto-apply engine, undo execution, or base/core mutation is added.
- [26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md](26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md) - locked decision + first pure guard/helper slice: labels are display text, not ontology identity. `nodeId` is identity inside a composed active profile; cross-scope references use `(scopeId, nodeId)`. Branch-local meanings that reuse a parent/core label must mint distinct node ids and link related meanings explicitly. `narrows` is exposed in the coding relationship vocabulary; `shadows` is reserved for later. Pure helpers detect same-label scoped meanings and format ambiguous labels with provenance. Future classifier/proposal/apply paths must not target ontology changes by label alone.
- [27_PROJECT_NAMING_KORDEX_DECISION.md](27_PROJECT_NAMING_KORDEX_DECISION.md) - locked docs-only decision: public/core working name moves from Kortex to Kordex. Existing docs may keep legacy Kortex wording until a deliberate cleanup pass. New strategic docs should prefer Kordex, while implementation identifiers stay generic (`DomainProfile`, `ProfileBranch`, `ProfilePatch`, `ContextAssembly`) instead of becoming branded names.
- [28_CONTEXT_ASSEMBLY_DECISION.md](28_CONTEXT_ASSEMBLY_DECISION.md) - locked decision + pure implementation: Kordex context assembly uses one shared typed `ContextPack` contract with scoped ontology refs, structured policy, evidence/proposal snapshots, bounded advisory user-fit signals, deterministic caps, and mandatory `compositionStamp` including `branchOrder`. `contextAssembly.ts` implements pure builder + invariant validator + canonical deterministic JSON serializer only; no prompt renderer, DB, LLM, UI, retrieval/ranking, graph engine, or token optimization.
- [29_CONTEXT_SELECTOR_DECISION.md](29_CONTEXT_SELECTOR_DECISION.md) - locked decision + first pure implementation: Kordex context selection uses one shared `ContextSelector` / `ContextSelection` contract but focused task-specific selector implementations. `contextSelector.ts` implements one deterministic Conceptualize selector over caller-supplied read-only candidates with pinned/elastic buckets and bounded direct-evidence pinning. No DB, LLM, retrieval, graph traversal, UI, prompt rendering, checker runtime, or mutation/apply service.
- [30_CONCEPTUALIZE_CONTEXTPACK_SHADOW_WIRING_DECISION.md](30_CONCEPTUALIZE_CONTEXTPACK_SHADOW_WIRING_DECISION.md) - locked decision + first implementation: the real Conceptualize flow now builds and validates a `ContextPack` in shadow mode after extraction. The seam carries composition stamp, scope legend, selected ontology context, and validation only; it warns on invalid packs and does not change prompts, model behavior, save behavior, suggestions, proposals, or ontology/profile state.
- [31_CONCEPTUALIZE_PROMPT_BUILDER_DECISION.md](31_CONCEPTUALIZE_PROMPT_BUILDER_DECISION.md) - locked decision + pure implementation: Conceptualize prompt building now consumes a validated `ContextPack` and renders a stable instruction shell, compact context payload JSON including bounded `userFit` advisory history, strict output schema, and output validator. Unknown refs are rejected against the original pack. No model call, proposal/evidence write, save behavior change, DB reader, vector retrieval, graph traversal, learned-score persistence, or mutation is added.
- [32_CONCEPTUALIZE_SINGULAR_OUTPUT_AND_DIAGNOSTICS_DECISION.md](32_CONCEPTUALIZE_SINGULAR_OUTPUT_AND_DIAGNOSTICS_DECISION.md) - locked decision + pure implementation: Conceptualize public output is singular. Public extra tags are removed; hidden diagnostic candidates are dynamic, internal-only calibration data and are not persisted unless a later correction-evidence flow deliberately snapshots factual near-miss data.
- [33_CONCEPTUALIZE_EXTRACTOR_FLIP_DECISION.md](33_CONCEPTUALIZE_EXTRACTOR_FLIP_DECISION.md) - locked decision + first live implementation: the real save flow now keeps the old extractor for card text but uses the new ContextPack prompt/validator for ontology placement when it validates. Invalid Conceptualize output falls back to the old extractor placement. No diagnostic persistence, near-miss evidence snapshot, missing-concept UI, proposal creation, or ontology/profile mutation is added.
- [34_RAW_PROPOSED_TYPE_IDENTITY_DECISION.md](34_RAW_PROPOSED_TYPE_IDENTITY_DECISION.md) - locked decision + implementation: raw proposed type identity is structured in memory as either a scoped ontology ref or an unresolved raw extractor id. The old `rawProposedTypeNodeId` string remains only as a compatibility projection for existing correction evidence persistence. No DB migration or near-miss diagnostic persistence is added.
- [35_CORRECTION_EVIDENCE_NEAR_MISS_DECISION.md](35_CORRECTION_EVIDENCE_NEAR_MISS_DECISION.md) - locked decision + implementation: hidden Conceptualize diagnostic candidates are snapshotted only when a user correction writes correction evidence. `near_miss_candidates_json` stores inert scoped candidate refs for later checker/user-fit learning. No visible extra tags, proposal creation, missing-concept UX, confidence update, or ontology/profile mutation is added.
- [36_MISSING_CONCEPT_UX_DECISION.md](36_MISSING_CONCEPT_UX_DECISION.md) - locked decision + implementation: `noStrongMatch` appears as an explicit review state in the Conceptualize modal. `suggestedNewConcept` is review metadata only and can be copied into manual new-subtype correction fields; it is not mapped to an existing type, auto-applied, or persisted as a proposal unless the user saves that correction. Manual new-subtype saves revalidate explicit parent ids and reject non-item node-id collisions before writing evidence/proposals.
- [37_USER_FIT_PROJECTION_DECISION.md](37_USER_FIT_PROJECTION_DECISION.md) - locked decision + implementation: correction evidence, near-miss/missing-concept facts, and proposal decision events can be projected into bounded user-fit node/proposal signals. Node signals are scoped to the active profile selection where the correction happened, so branch-specific fit does not flatten into the base profile. A data-layer facts reader loads bounded recent correction/proposal history without projecting it or persisting learned scores. Conceptualize receives matching bounded user-fit signals inside ContextPack prompt payloads as advisory history, and the pure checker selector can now feed the same bounded `userFit` section into future checker ContextPacks. No trust-setting update, proposal creation, auto-apply, checker runtime/model call, UI policy change, or profile mutation is added.
- [38_BASE_PROFILE_VERSIONING_DECISION.md](38_BASE_PROFILE_VERSIONING_DECISION.md) - locked decision + implementation: base-targeted profile change proposals snapshot `targetProfileVersion`, branch-targeted proposals must not set it, and base/core Apply now uses a separate version-guarded helper/service plus explicit review UI path. No profile version-history table, stale refresh flow, branch merge, old-card backfill, checker runtime, or auto-apply is added.
- [39_EDIT_THEN_APPLY_DECISION.md](39_EDIT_THEN_APPLY_DECISION.md) - locked docs-only decision: richer missing-concept edit/apply is a review-time draft flow over pending proposals. Users may edit label, parent, meaning, reason, and explicit target before save/apply. Branch targets still apply through doc 24, base/core targets through doc 38. No automatic missing-concept apply, checker runtime, stale refresh, old-card backfill, or auto-apply is added.
- [MODEL_REVIEW_2026-05-13_BRANCH_LOCAL_PROPOSAL_APPLY.md](MODEL_REVIEW_2026-05-13_BRANCH_LOCAL_PROPOSAL_APPLY.md) - external model review report for the branch-local apply helper/service. Records Pi/Gemini/Opus reviewers, accepted fixes, the relationship-type-id decision, and post-review verification.
- [MODEL_REVIEW_2026-05-13_PROFILE_PROPOSAL_REVIEW_UI.md](MODEL_REVIEW_2026-05-13_PROFILE_PROPOSAL_REVIEW_UI.md) - external model review report for the minimal profile proposal review UI. Records Pi/OpenRouter reviewers, accepted UI/hook fixes, rejected false positives, reviewer quality notes, and post-review verification.
- [KORTEX_DEVELOPER_EXPLAINER.md](KORTEX_DEVELOPER_EXPLAINER.md) - developer-facing overview of Kortex Core, child/fork workflows, codebase MCP overlay, agent/subagent handoffs, self-building apps, Racket/DSL direction, and game-engine application.
- [humanreadable.md](humanreadable.md) - plain-language sequencing: refactor first, build coding product seriously, add demo profiles later.
- [why_this_exists.md](why_this_exists.md) - human intent and motivation behind the refactor.
- [00_DOC_SYNC.md](00_DOC_SYNC.md) - how this folder correlates with root architecture docs.
- [architecture_contract_for_profile_refactor.md](architecture_contract_for_profile_refactor.md) - adjusted LLM contract for this refactor.
- [architecture_guide_for_profile_refactor_humans.md](architecture_guide_for_profile_refactor_humans.md) - adjusted human guide for this refactor.
- [modules_architecture.md](modules_architecture.md) - draft future module/foldering architecture rules.
- [modules_architecture_humans.md](modules_architecture_humans.md) - human-readable version of the module/foldering rules.
- [implementation_handoff.md](implementation_handoff.md) - current branch implementation notes for other LLMs/reviewers while this refactor is active.
- [TOMORROW_START.md](TOMORROW_START.md) - short startup prompt and next-slice reminder for the next orchestrator session.

## Non-Goal

<non_goal>
Do not make the app generic in a way that destroys the coding product.
The coding profile should be first-class, polished, and opinionated.
The refactor moves coding assumptions into the first coding child/profile while extracting reusable Kortex Core semantics.
Do not let the core depend on CodeLens UI or coding-only relationship assumptions.
</non_goal>
