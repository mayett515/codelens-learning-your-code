# Ontology Profile Refactor Plan

This folder captures the strategic plan for making CodeLens forkable, profile-driven, and ontology-aware without breaking the working coding-first app.

<purpose>
CodeLens should remain excellent for coding, but the engine must not be hardwired to one coding ontology.
The product direction is a memory graph system with a strong default coding profile.
Future profiles can support another programmer's ontology, math, writing, photography, or other knowledge domains.
</purpose>

## What We Agreed

<core_agreement>
- The current app is already useful as a coding-first capture and concept system.
- The current architecture is mostly good; the problem is hardcoded domain meaning, not folder structure alone.
- The sandbox worktree contains the better pattern for dynamic classification: model-owned metadata, strict validation, conservative fallback, and no silent ontology mutation.
- The main app should learn from that pattern and move from hardcoded learning concepts toward dynamic domain profiles.
- Dynamic does not mean random. The model may suggest taxonomy changes, but the user/profile owner approves durable ontology changes.
</core_agreement>

## The Big Shape

```text
App engine
  capture memory
  concept/item graph
  retrieval
  promotion
  review
  ontology checker

Default domain profile
  coding ontology
  coding prompts
  coding metadata fields
  coding UI labels
  coding graph visual encoding

Future domain profile
  any other ontology
  own prompts
  own metadata fields
  own UI labels
  own graph visual encoding
```

## Files In This Folder

- [01_BIG_PLAN.md](01_BIG_PLAN.md) - overall product and architecture plan.
- [02_DYNAMIC_PROFILE_SCHEMA.md](02_DYNAMIC_PROFILE_SCHEMA.md) - proposed profile, ontology, and metadata shapes.
- [03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md](03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md) - category descriptions, correction flow, and periodic checker.
- [04_REFACTOR_WITHOUT_BREAKING_APP.md](04_REFACTOR_WITHOUT_BREAKING_APP.md) - staged implementation plan with low-risk sequencing.
- [05_ANTI_REGRESSION_RULES.md](05_ANTI_REGRESSION_RULES.md) - hard constraints for future agents.
- [06_PROFILE_BRANCHING_AND_MERGE.md](06_PROFILE_BRANCHING_AND_MERGE.md) - profile inheritance, branching, overlays, and merge semantics.
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
The refactor only moves coding assumptions into a profile instead of scattering them through schema, prompts, UI, retrieval, and promotion logic.
</non_goal>
