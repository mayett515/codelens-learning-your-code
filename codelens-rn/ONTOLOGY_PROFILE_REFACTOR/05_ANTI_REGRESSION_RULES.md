# Anti Regression Rules

Use this file as an instruction contract for future agents working on the ontology/profile refactor.

## Hard Constraints

<hard_constraints>
- Keep the coding app usable at every stage.
- Do not remove existing coding taxonomy until profile-backed replacements are live.
- Do not silently apply model-suggested ontology changes.
- Do not let invalid category/type strings pass through persistence boundaries.
- Do not add domain-specific columns for every new profile idea.
- Do not move hardcoded coding assumptions from one file into another and call it dynamic.
- Do not make cards generic in a way that degrades the current coding UX.
- Do not put persona/chat prompt composition into extractor prompts.
- Do not break backup/import/export compatibility without an explicit migration plan.
- Do not stage, commit, push, reset, or checkout without explicit user approval.
</hard_constraints>

## Dynamic Profile Rules

<dynamic_profile_rules>
- Domain-specific labels come from the active profile.
- Domain-specific metadata fields come from the active profile.
- Domain-specific category descriptions come from ontology nodes.
- Domain-specific extraction instructions come from the active profile.
- Domain-specific graph visual encoding comes from the active profile.
- The default coding profile must preserve current coding behavior unless a product change is explicit.
</dynamic_profile_rules>

## Ontology Rules

<ontology_rules>
- Every ontology node needs a label, meaning, examples, useWhen, and contextual doNotUseWhen boundary rules.
- Boundary rules should be specific to real confusion cases.
- User corrections are evidence.
- Repeated corrections can produce patch suggestions.
- Suggested nodes start as suggestions, not active durable categories.
- The user/profile owner approves durable ontology mutations.
</ontology_rules>

## LLM Output Rules

<llm_output_rules>
- Prefer existing ontology nodes when one fits.
- Suggest a new node only when no existing node fits cleanly.
- Every suggested node must include parentId, meaning, examples, and whyExistingNodesDoNotFit.
- Every ontology patch suggestion must include evidenceIds and reason.
- Do not rewrite user captures during ontology review.
- Do not invent source evidence.
</llm_output_rules>

## Data Rules

<data_rules>
- Add flexible metadata JSON before removing old coding-specific fields.
- Parse metadata JSON with codecs at read boundaries.
- Keep exactOptionalPropertyTypes compatibility.
- Prefer unknown plus narrowing over any.
- Add migration tests for profile and ontology schema changes.
</data_rules>

## UI Rules

<ui_rules>
- The user must see and be able to correct classification.
- The user must be able to inspect ontology checker suggestions before applying.
- Reminders for ontology review are optional.
- Manual ontology review is always available.
- Do not hide uncertainty. Surface it calmly as "needs review" or equivalent profile-owned wording.
</ui_rules>

## Verification Checklist

<verification_checklist>
- TypeScript passes.
- Relevant Vitest tests pass.
- Static grep shows no new hardcoded query keys.
- Static grep shows no new extractor/persona coupling.
- Static grep shows no new profile-specific hardcoded labels outside the profile or intentional UI fixtures.
- Existing save capture flow still works.
- Existing promotion flow still works.
- Existing retrieval formatting still produces useful coding context.
- Backup/import/export plan is updated if schema changes.
</verification_checklist>

## Refactor Gates

<logic_gate>
IF a change adds a new hardcoded coding field,
THEN stop and ask whether it belongs in metadataFields instead.

IF a change adds a new concept type,
THEN add it to the active profile ontology, not a scattered enum.

IF a model suggests ontology changes,
THEN store a patch suggestion and wait for user approval.

IF a UI label says learning/concept/capture,
THEN check whether it should come from profile labels.

IF a migration touches concepts or learning_captures,
THEN update backup/import/export expectations.
</logic_gate>

## Naming Boundary Rules

The ontology-profile refactor renamed several fields from `conceptType`/`proposedConceptType` to `typeNodeId`/`proposedTypeNodeId`/`typeNodeIds` in feature-owned scopes. These renames are enforced by stage10 architecture guards. The following legacy names are **intentionally kept** at documented compatibility boundaries and must not be globally banned:

<naming_boundary>

### Renamed (must use new name in these scopes)

| Scope | Old name | New name | Guarded by |
|---|---|---|---|
| `GraphNode` (graph) | `conceptType` | `typeNodeId` | stage10 graph guard |
| `PromotionConfirmInput` (promotion) | `conceptType` | `typeNodeId` | stage10 promotion guard |
| `PromotionReviewModel` (promotion) | `proposedConceptType` | `proposedTypeNodeId` | stage10 promotion guard |
| `ClusterCandidate`/`PromotionSuggestion` (promotion) | `proposedConceptType` | `proposedTypeNodeId` | stage10 promotion guard |
| `RetrievedConceptPayload` (retrieval) | `conceptType` | `typeNodeId` | stage10 retrieval guard |
| `RetrieveFilters` (retrieval) | n/a | `typeNodeIds` (preferred) | stage10 retrieval guard |
| `TypeNodeChip` (UI primitive) | `type` | `typeNodeId` | stage3/stage4 chip guard |
| `ConceptListFilters` (hook) | `conceptType` | `typeNodeIds` (preferred) | stage10 hook guard |

### Allowed legacy boundaries (do not rename yet)

| Legacy name | Where | Why still legacy |
|---|---|---|
| `LearningConcept.conceptType` | `src/features/learning/types/learning.ts` | App-wide domain type; not renamed in this refactor cycle |
| `ConceptHint.proposedConceptType` | `src/features/learning/types/learning.ts` | Capture codec compatibility shape |
| `concept_type` / `proposed_concept_type` | DB column names | Persistence boundary; requires a future migration |
| `conceptTypes` filter alias | `RetrieveFilters` | Explicitly kept as legacy alias for `typeNodeIds` |
| `ConceptListFilters.conceptType` | `src/features/learning/hooks/useConceptList.ts` | Legacy alias for `typeNodeIds`; kept for backwards compatibility |
| `ConceptTypeChip` wrapper prop `type` | `src/features/learning/ui/primitives/ConceptTypeChip.tsx` | Deprecated compat wrapper that maps `type` to `typeNodeId` |
| Card boundary `conceptType` props | `ConceptCardCompact`, `ConceptCardFull`, `CaptureCardFull`, `CandidateCaptureCard` | Mirror `LearningConcept.conceptType` at card input boundary |

</naming_boundary>
