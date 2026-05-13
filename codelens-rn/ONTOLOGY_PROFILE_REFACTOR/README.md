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
- [26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md](26_SCOPED_MEANING_AND_BRANCH_CORE_SEMANTICS_DECISION.md) - locked docs-only decision: labels are display text, not ontology identity. `nodeId` is identity inside a composed active profile; cross-scope references use `(scopeId, nodeId)`. Branch-local meanings that reuse a parent/core label must mint distinct node ids and link related meanings explicitly. `narrows` is locked; `shadows` is reserved for later. Future classifier/proposal/apply paths must not target ontology changes by label alone.
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
