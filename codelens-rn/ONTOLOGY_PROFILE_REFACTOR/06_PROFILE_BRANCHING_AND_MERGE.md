# Profile Branching And Merge

This document captures the product model for extensible profiles before more correction/checker implementation work.

## Product Goal

Kortex should support a strong general coding ontology while letting the user branch it for a project, job, learning track, or personal conceptualization effort.

Examples:

```text
coding-general
  -> project-codelens-rn
  -> job-new-company-onboarding
  -> learning-oop
  -> learning-functional-programming
  -> rebuild-existing-program
```

A branch may stay independent forever, or the user may merge selected useful changes back into its parent.

Important nuance: "core" means the immutable base for a specific lineage. It is not a globally fixed ontology forever. A fork, another user, or a future in-app creation flow can create a new ground-zero base profile. Once created, that base should be treated as immutable by default and evolved through approved patch suggestions.

## Architecture Decisions

These are the current product decisions for Kortex:

1. Profile branch types: support temporary learning modes, project ontologies, and personal forks. Distinguish them with `branchKind`.
2. First implementation shape: generic branch with `branchKind`. Initial kinds are `project`, `learning`, and `personal`.
3. Parent profile mutability: immutable by default. Changes go through patch suggestions. Approved promotion can push validated changes up to a parent/core profile. Users may also create their own immutable base profiles.
4. Merge defaults: branch-only by default, but the system can surface merge suggestions automatically. The user always applies them manually.
5. Correction scope: holistic and context-aware. The user can say "this feels wrong"; the system uses context, tags, vectors, relationships, and ontology state to propose structured corrections.
6. First correction UI: smart save modal before saving a capture, not a manual category picker.
7. Manual editing: natural-language correction first; advanced direct ontology editing can come later.
8. LLM correction behavior: evidence-gated. One correction can reclassify an item. Patterns can suggest boundary rules. Stronger evidence can suggest split/merge/create patches.
9. Evidence threshold: dynamic and corpus-relative, not a hardcoded count.
10. Composition precedence: personal corrections win, then active project/learning overlay, then base.
11. Project nodes: never auto-promote into general coding. Checker may recommend promotion, but the user explicitly accepts selected nodes/rules.
12. Export/sharing: architecture should support full branch export, selected patch export, and anonymized ontology export without captures.
13. Next implementation: internal branch/composition types plus pure helpers only. No DB and no UI yet.
14. First code proof: compose base + overlay, add overlay ontology node, and deterministic conflict precedence.
15. Naming: technical internals use `profile`, `profileBranch`, and `profileOverlay`; product name is Kortex.

## Core Model

Treat a profile branch more like a git branch than a settings page.

```text
Base profile
  inherited by branch profile
    optionally combined with project overlay
      optionally combined with personal correction layer
```

The app classifies against the composed active profile, but durable changes stay separated by layer until the user approves a merge.

## Terms

Base profile:
The stable root profile for a lineage. For this app's current default, it is the general coding profile. A fork or user-created knowledge system can define a different base profile.

Branch profile:
A child profile created from a base profile for a focused purpose, such as OOP learning, functional programming, a job, or rebuilding a program.

Project overlay:
A branch or layer that contains project-specific architecture, internal module concepts, naming conventions, and recurring project problems.

Learning lens:
A temporary or long-lived branch focused on a learning goal. It can bias classification and add examples/rules without polluting the general coding profile.

Personal correction layer:
User-specific corrections and boundary rules that reflect how the user wants the ontology to behave.

Patch suggestion:
An inspectable proposed profile change, produced from evidence. It is not applied automatically.

Merge:
The user-approved act of copying selected changes from one branch/layer into another.

Compare mode:
A review view that shows differences across layers or sibling branches: base vs overlay vs personal corrections, or two project/learning branches side by side. Users can inspect overlap/divergence and selectively merge.

## What A Branch Can Change

A branch may:

- add ontology nodes
- add boundary rules
- add examples
- improve meanings and descriptions
- add or override profile-owned labels
- add project-specific metadata fields
- deprecate inherited nodes locally
- add relationships between nodes
- add extraction/classification instructions

A branch should not silently:

- mutate its parent
- rewrite old captures
- rewrite old concepts/items
- apply model-suggested ontology changes without user approval
- merge project-specific concepts into a general profile without review

## Merge Modes

No merge:
Keep the branch independent.

Partial merge:
Select specific nodes, descriptions, rules, examples, metadata fields, or labels to copy back.

Full merge:
Apply all accepted branch changes into the parent profile after review.

Fork only:
Create a branch that is intentionally not expected to merge back.

## Merge Review UX

The app should eventually present profile changes as reviewable patches:

```text
This branch added 4 boundary rules and 2 examples that may improve coding-general.

[Review changes]
  [x] Add boundary rule to React Hook Pattern
  [ ] Add project-specific node: CodeLens Promotion Cluster
  [x] Add example to Stale Closure Risk

[Apply selected] [Keep branch only] [Postpone]
```

Project-specific nodes should default to "keep branch only" unless the user explicitly promotes them.

The checker may still recommend promotion when a project-specific pattern appears broadly useful. This is especially important for beginners: the LLM can act as a mentor by noticing when something the user thinks is project-specific is actually a general programming concept.

## Correction Evidence Relationship

Correction evidence belongs to the active profile/branch where the correction happened.

Current groundwork:

```ts
OntologyCorrectionEvidence {
  profileId: string;
  subjectKind: 'capture' | 'item';
  field: 'typeNodeId';
  previousTypeNodeId: string | null;
  correctedTypeNodeId: string;
  source: 'user';
}
```

This is intentionally narrow. It records user correction evidence but does not decide where the correction should merge.

Future branch-aware correction evidence may need:

```ts
baseProfileId?: string;
branchId?: string;
targetLayerId?: string;
```

Do not add these fields until the app has a concrete branch/overlay implementation.

## Classifier Input

The classifier should receive the composed active profile and enough context to explain branch/layer-specific constraints:

```text
base coding ontology
+ selected branch additions/overrides
+ project overlay additions/overrides
+ personal correction boundary rules
```

The prompt should explain source/layer where useful, especially for project-specific nodes.

Example:

```text
Node: stale-closure-risk
Source: coding-general

Node: codelens-promotion-cluster
Source: project-codelens-rn
Use only for CodeLens architecture captures.
```

## Conflict Rules

When two layers define overlapping behavior:

1. Active branch rules win for classification inside that branch.
2. Project overlay rules win only for that project context.
3. Personal correction rules win for the user's own app behavior.
4. Parent profile remains unchanged until merge approval.
5. Ambiguous conflicts should become patch suggestions, not automatic changes.

Compare mode should make these precedence decisions inspectable rather than invisible.

## What Should Stay General

Good candidates to merge into `coding-general`:

- broadly useful boundary rules
- better examples for existing coding nodes
- clearer descriptions
- general programming concepts
- paradigm-specific concepts that are not project-only

Poor candidates to merge into `coding-general`:

- one codebase's module names
- one employer's internal terminology
- project-specific workflows
- temporary learning labels
- tags created only to organize one rebuild effort

## Implementation Implications

Do not rush into persistence for branches. First define behavior with small pure/domain helpers and tests.

Likely sequence:

1. Keep current `DomainProfile` as the runtime profile shape.
2. Add internal branch/composition types: base profile descriptor, `ProfileBranch`, `ProfileOverlay`, and composed runtime profile.
3. Add pure composition helpers that produce a composed runtime profile from base + overlays.
4. Add tests for overlay node addition, deterministic precedence, and no parent mutation.
5. Only then consider storage for branches/patch suggestions.

## Next Decision Gate

Before implementing UI or persistence, decide:

1. Exact type names for the first internal-only composition slice.
2. Whether `personal` should be a normal `branchKind` or a separate always-on layer.
3. Whether profile export shape should be represented now as types only, or deferred.
4. Whether compare mode is documented only for now, or gets source-level guard tests.

Recommended answer for now:

```text
Start internal-only with pure composition helpers and tests.
Treat the current coding profile as this lineage's immutable base.
Allow other lineages/forks to define their own base profiles later.
Treat project/learning branches as branch-only by default.
Surface merge suggestions, but never auto-merge.
Defer DB, UI, and export implementation.
```
