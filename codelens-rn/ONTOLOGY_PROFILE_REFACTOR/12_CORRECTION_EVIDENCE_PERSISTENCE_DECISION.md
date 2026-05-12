# Correction Evidence Persistence Decision

**Status:** Locked decision on 2026-05-07. Updated and implemented on 2026-05-11 after branch/profile-selection persistence existed.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Evidence-first persistence. Patch suggestions second. No automatic ontology/profile mutation.

In plain terms:

1. **Evidence-first persistence.** The next persistence shape is `OntologyCorrectionEvidence`. When a user corrects a classification, the correction is recorded as evidence. The ontology/profile is not mutated.
2. **Patch suggestions later.** A model or checker may later propose ontology changes by referencing accumulated evidence IDs. Patch suggestions require user approval before any ontology or profile change.
3. **No automatic ontology/profile mutation.** Corrections do not silently rewrite the ontology or profile. Patch suggestions do not auto-apply. The user/profile-owner must approve durable changes.
4. **Direct user-authored ontology changes are allowed.** If the user explicitly creates a tag, node, or rule, that is a user-authored ontology change, not a correction. It becomes durable when that persistence exists.
5. **Model/checker-suggested ontology changes require approval.** Any ontology change proposed by the model or checker (via a patch suggestion) must be accepted by the user before becoming durable.
6. **Store active selection context, not target/apply fields.** Branch and profile-selection persistence now exist, so correction evidence should record the runtime selection context where the correction happened. It should not decide whether the correction belongs permanently in a branch, parent profile, personal layer, or merge proposal.
7. **No checker runtime/UI in this slice.** No checker execution engine, no suggestion generation loop, no approval UI, no auto-apply.
8. **V1 implementation is storage-only.** Migration 015 adds `ontology_correction_evidence`, plus schema, codec, repo, backup support, and guards. This persists evidence only; it does not add checker runtime, patch suggestions, UI, or branch/base mutation.

## The Flow

```text
User corrects classification
  -> store correction evidence
  -> do not mutate ontology

User directly creates a tag/node/rule
  -> store as user-authored ontology change when that persistence exists

Model or checker sees repeated evidence later
  -> creates patch suggestion

User reviews suggestion
  -> accept / edit / reject / postpone

Accepted patch
  -> may merge into target profile/layer
```

## Distinction Between Concepts

| Concept | What It Is | Who Creates It |
|---|---|---|
| Correction evidence | What happened: the user observed a wrong classification and recorded the correction. | User |
| Direct ontology edit | The user intentionally shapes the ontology by creating a tag, node, or rule. | User |
| Patch suggestion | The system proposes a change derived from accumulated evidence. | Model/checker |
| Merge/apply | A user-approved durable change to an ontology, profile, or layer. | User (approval required) |

Correction evidence is a fact about what happened. It is not a pending mutation. It is not a suggestion. A direct ontology edit is an intentional user action that changes the ontology. A patch suggestion is a system-derived proposal backed by evidence IDs. Merge/apply is the point where user approval turns a suggestion into a durable ontology or profile change.

## Recommended First Persisted Shape

```text
OntologyCorrectionEvidence
  id: string
  profileId: string
  activeSelectionSnapshot: {
    baseProfileId: string
    projectBranchIds?: string[]
    learningBranchIds?: string[]
    personalBranchIds?: string[]
  }
  subjectKind: 'capture' | 'item'
  subjectId: string
  field: 'typeNodeId'
  previousTypeNodeId: string | null
  correctedTypeNodeId: string
  reason?: string | null
  source: 'user'
  createdAt: number
```

Design notes:

- `id` is a unique identifier for the evidence record.
- `profileId` identifies the base/current profile context at the time of correction.
- `activeSelectionSnapshot` records the selected base profile and active project/learning/personal branch ids at the time of correction.
- `subjectKind` distinguishes captures from promoted items.
- `subjectId` is the domain entity id being corrected.
- `field` is currently only `typeNodeId`. This union is narrow now; it can grow when other correctable fields exist.
- `previousTypeNodeId` and `correctedTypeNodeId` record the before/after ontology classification.
- `reason` is optional user-provided context for why the correction was made.
- `source` is currently only `user`. This union is narrow now; it can grow when other correction sources exist (checker, import, overlay).
- `createdAt` is a numeric timestamp, matching the current domain type.
- No `branchId`, `targetLayerId`, `applyToBranchId`, or merge target exists in v1. The snapshot records where the correction happened; it does not decide where the correction should be applied.

## Active Context Versus Target Layer

The key distinction:

```text
activeSelectionSnapshot = where the mistake happened
targetLayerId / branchId = where a future approved change should be applied
```

V1 stores the first one only.

Example:

```text
coding base profile
  + react project branch
  + personal coding branch

User corrects a classification from "component" to "type_generics".
```

The evidence should remember:

```text
baseProfileId: coding
projectBranchIds: [react-project]
personalBranchIds: [my-personal-coding]
```

But it should not automatically decide:

```text
Apply this to the React branch.
Apply this to the personal branch.
Apply this to the coding base profile.
```

That decision belongs to a later patch/merge review flow.

## Explicitly Deferred

These are not in this slice. They are recorded here so the decision is clear about what is excluded.

- `branchId`, `targetLayerId`, `applyToBranchId`, or merge target fields on correction evidence
- separate `ontology_patch_suggestions` persistence shape and table
- Checker runtime (suggestion generation loop, periodic or trigger-based)
- Approval UI for patch suggestions
- Auto-apply of any kind
- Agent/app-builder behavior
- `ontology_corrections` legacy table naming
- Branch/base target selection for evidence records
- proposal apply/merge behavior

## Why This Order Is Correct

1. **Safe audit trail.** Recording what happened (evidence) before deciding what to do about it (patch suggestions, merges) ensures no data is lost and every change is traceable.
2. **Facts before decisions.** Evidence records the fact of a user correction. Patch suggestions are decisions derived from those facts. Storing facts first means later decisions can always be re-derived from the evidence.
3. **Avoids polluting parent/base profiles.** Corrections are evidence, not mutations. The base profile stays clean until the user explicitly approves a change.
4. **Branch context is preserved without early application.** The evidence remembers the active selection snapshot, so later systems can understand whether a mistake happened in the base profile, a project branch, a learning branch, or a personal branch. It still does not apply the correction anywhere automatically.
5. **Checker suggestions can reference evidence IDs later.** When the checker runtime exists, patch suggestions will carry `evidenceIds` that point back to the stored correction evidence. The current shape does not block this either.

## Relationship To Existing Decisions

- `03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md`: This decision is consistent with the correction flow described there. The user corrects, the evidence is stored, and the model or checker proposes patches later. No step is automatic.
- `06_PROFILE_BRANCHING_AND_MERGE.md`: This decision is consistent with branching semantics. Evidence stores the active selection context where the correction happened. Personal corrections can win at runtime, but correction evidence itself is still not a mutation.
- `13_BRANCH_OVERLAY_PERSISTENCE_DECISION.md`: Branches persist as overlays and runtime profiles are derived. Correction evidence can reference the active branch ids as context, but it still does not mutate branch overlays or parent profiles.
- `14_PROFILE_SELECTION_AND_BRANCH_RESOLUTION_DECISION.md`: The active selection snapshot mirrors the selected base profile id plus ordered project/learning/personal branch id arrays. It is a historical snapshot, not the canonical active selection row.
- `18_ADAPTIVE_SUGGESTION_POLICY_DECISION.md`: Evidence remains factual; later suggestions are separate objects governed by trust, risk, semantic confidence, user-fit confidence, and explicit approval rules.
- `19_PATCH_MERGE_PROPOSAL_STORAGE_DECISION.md`: Patch suggestions and merge proposals are unified as `profile_change_proposals`. They can reference correction evidence IDs, but they remain separate from evidence and do not apply themselves.
- `05_ANTI_REGRESSION_RULES.md`: This decision does not violate any anti-regression rule. No automatic mutation is introduced. The persistence boundary stores append-only evidence only. No coding-profile dependency enters the core.
- `NEXT_LLM_CONTEXT.md`: This decision is now implemented as storage-only evidence. The adaptive suggestion policy is locked in doc 18, and patch/merge proposal storage is locked and implemented as storage-only v1 in doc 19. The remaining open decisions after this are first correction/proposal UI surface, checker runtime/approval UI, trust setting storage, proposal apply/base-versioning semantics, agent/subagent execution ontology, and self-building-app framework.

## Implemented V1

Implemented on 2026-05-11:

- `src/db/migrations/015-ontology-correction-evidence.ts`
- `src/db/schema.ts`: `ontologyCorrectionEvidence`
- `src/features/ontology/types.ts`: `OntologyCorrectionActiveSelectionSnapshot`
- `src/features/ontology/codecs/ontologyCorrectionEvidence.ts`
- `src/features/ontology/data/ontologyCorrectionEvidenceRepo.ts`
- `src/features/ontology/data/schema.ts`
- `src/features/ontology/data/index.ts`
- backup/export/import/clear/column-map support for `ontology_correction_evidence`
- architecture guards and focused tests

The implemented table name is `ontology_correction_evidence`, not `ontology_corrections`, to keep the stored object clearly evidence-shaped rather than mutation-shaped.

## Model Recommendations

```text
Decision/review: Codex
Implementation: Codex directly unless the human explicitly asks for a worker/model experiment
```

## Hard Boundaries

- Keep correction evidence append-only and evidence-shaped.
- Do not add or edit `ontology_corrections` source/table/schema/migration; the implemented table is `ontology_correction_evidence`.
- Do not add or edit `ontology_patch_suggestions` source/table/schema/migration.
- Do not add checker runtime, correction UI, patch approval UI, auto-apply, target/apply branch fields, agent runtime, app-builder runtime, MCP/adapters, or DSL runtime.
- ASCII only. Use `->`, not Unicode arrows.
