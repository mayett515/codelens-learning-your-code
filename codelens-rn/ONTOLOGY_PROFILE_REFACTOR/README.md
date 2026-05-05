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
