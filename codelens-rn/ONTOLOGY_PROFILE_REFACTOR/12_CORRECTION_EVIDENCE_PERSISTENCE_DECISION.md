# Correction Evidence Persistence Decision

**Status:** Locked decision on 2026-05-07.
**Branch:** `refactor/ontology-profile`

## Locked Decision

Evidence-first persistence. Patch suggestions second. No automatic ontology/profile mutation.

In plain terms:

1. **Evidence-first persistence.** The next persistence shape is `OntologyCorrectionEvidence`. When a user corrects a classification, the correction is recorded as evidence. The ontology/profile is not mutated.
2. **Patch suggestions later.** A model or checker may later propose ontology changes by referencing accumulated evidence IDs. Patch suggestions require user approval before any ontology or profile change.
3. **No automatic ontology/profile mutation.** Corrections do not silently rewrite the ontology or profile. Patch suggestions do not auto-apply. The user/profile-owner must approve durable changes.
4. **Direct user-authored ontology changes are allowed.** If the user explicitly creates a tag, node, or rule, that is a user-authored ontology change, not a correction. It becomes durable when that persistence exists.
5. **Model/checker-suggested ontology changes require approval.** Any ontology change proposed by the model or checker (via a patch suggestion) must be accepted by the user before becoming durable.
6. **No `branchId` / `targetLayerId` until branch persistence exists.** The correction evidence shape does not include branch or layer fields until the branching/overlay persistence system is implemented.
7. **No checker runtime/UI in this slice.** No checker execution engine, no suggestion generation loop, no approval UI, no auto-apply.
8. **No DB/migration/source implementation in this slice.** No `ontology_corrections` table, schema, migration, store file, or ORM model is added in this slice. This is a decision document, not an implementation.

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
- `profileId` identifies the profile context at the time of correction.
- `subjectKind` distinguishes captures from promoted items.
- `subjectId` is the domain entity id being corrected.
- `field` is currently only `typeNodeId`. This union is narrow now; it can grow when other correctable fields exist.
- `previousTypeNodeId` and `correctedTypeNodeId` record the before/after ontology classification.
- `reason` is optional user-provided context for why the correction was made.
- `source` is currently only `user`. This union is narrow now; it can grow when other correction sources exist (checker, import, overlay).
- `createdAt` is a numeric timestamp, matching the current domain type.
- No `branchId` or `targetLayerId` until branch persistence exists.

## Explicitly Deferred

These are not in this slice. They are recorded here so the decision is clear about what is excluded.

- `branchId` and `targetLayerId` on correction evidence
- `ontology_patch_suggestions` persistence shape and table
- Checker runtime (suggestion generation loop, periodic or trigger-based)
- Approval UI for patch suggestions
- Auto-apply of any kind
- Agent/app-builder behavior
- DB/migration/source implementation (no `ontology_corrections` table, schema, migration, or store)
- Correction storage API or persistence layer
- Branch persistence implementation
- Overlay persistence implementation

## Why This Order Is Correct

1. **Safe audit trail.** Recording what happened (evidence) before deciding what to do about it (patch suggestions, merges) ensures no data is lost and every change is traceable.
2. **Facts before decisions.** Evidence records the fact of a user correction. Patch suggestions are decisions derived from those facts. Storing facts first means later decisions can always be re-derived from the evidence.
3. **Avoids polluting parent/base profiles.** Corrections are evidence, not mutations. The base profile stays clean until the user explicitly approves a change.
4. **Branch system can extend evidence later.** When branch persistence exists, a `branchId` can be added to evidence records. The current shape does not block this extension.
5. **Checker suggestions can reference evidence IDs later.** When the checker runtime exists, patch suggestions will carry `evidenceIds` that point back to the stored correction evidence. The current shape does not block this either.

## Relationship To Existing Decisions

- `03_CATEGORIZATION_AND_ONTOLOGY_CHECKER.md`: This decision is consistent with the correction flow described there. The user corrects, the evidence is stored, and the model or checker proposes patches later. No step is automatic.
- `06_PROFILE_BRANCHING_AND_MERGE.md`: This decision is consistent with branching semantics. Evidence is stored per profile. Branch fields are deferred until branch persistence exists. Personal corrections win over base/project classifications at runtime, but they are evidence, not mutations.
- `05_ANTI_REGRESSION_RULES.md`: This decision does not violate any anti-regression rule. No automatic mutation is introduced. No persistence is added. No coding-profile dependency enters the core.
- `NEXT_LLM_CONTEXT.md`: This decision is the locked next boundary. The remaining open decisions after this one are branch/overlay persistence, agent/subagent execution ontology, and self-building-app framework.

## Model Recommendations

```text
Doc/guard worker: opencode-go/glm-5.1 with --thinking high
Persistence/migration implementation: Codex/GPT-5 only until HR says otherwise
```

## Hard Boundaries

- Do not describe persistence as implemented in this slice.
- Do not add or edit `ontology_corrections` source/table/schema/migration.
- Do not add or edit `ontology_patch_suggestions` source/table/schema/migration.
- Do not add checker runtime, UI, DB, migrations, stores, branch persistence, approval UI, auto-apply, agent runtime, app-builder runtime, MCP/adapters, or DSL runtime.
- ASCII only. Use `->`, not Unicode arrows.
