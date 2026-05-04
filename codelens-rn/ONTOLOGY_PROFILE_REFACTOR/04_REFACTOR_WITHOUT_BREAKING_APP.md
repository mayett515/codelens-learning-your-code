# Refactor Without Breaking The App

This is the staged implementation plan. The order matters.

<primary_rule>
Do not start with broad renames.
First introduce profile seams while preserving current coding behavior.
</primary_rule>

## Stage 0 - Baseline And Guards

Goals:

- Confirm current tests and typecheck status.
- Add guard tests for new profile boundaries before big changes.
- Document current hardcoded domain assumptions.

Checks:

```text
CONCEPT_TYPES usage
concept_type DB assumptions
extractor prompt coding assumptions
promotion concept type ordering
retrieval concept type filters
card labels and metadata sections
learning chat scope/routing
backup/import/export assumptions
```

## Stage 1 - Add Profile Types And Default Coding Profile

Create:

```text
src/features/ontology/
  types/
  profiles/
    codingProfile.ts
```

Move current coding taxonomy into the profile, but keep existing exports compatible.

Result:

```text
App behavior stays the same.
Coding concept types live in profile config.
No DB migration yet.
```

## Stage 2 - Profile-Aware Validation

Replace direct `z.enum(CONCEPT_TYPES)` assumptions with profile-aware validation.

Rules:

- current coding types must still pass
- invalid type strings still fail at boundary
- active profile owns allowed item types
- temporary/suggested nodes must be explicit, not silently accepted

## Stage 3 - Add Metadata JSON Columns

Add flexible columns:

```text
concepts.metadata_json
concepts.profile_id
concepts.type_node_id
learning_captures.profile_id
learning_captures.classification_json
```

Backfill existing concept fields:

```text
architectural_pattern -> metadata.architecturalPattern
programming_paradigm -> metadata.programmingParadigm
core_concept -> metadata.coreConcept
concept_type -> type_node_id
```

Keep `language_or_runtime_json` and `surface_features_json` as first-class concept columns for this compatibility step. They are still used directly by retrieval, embedding, and mutation helpers.

Keep old columns readable during transition.

## Stage 4 - Profile-Driven Extractor

Change extractor prompt construction from hardcoded coding text to:

```ts
buildExtractorSystemPrompt({
  profile,
  relevantItems,
  sourceContext,
});
```

The coding profile supplies:

- base assistant role
- capture field labels
- ontology node definitions
- classification rules
- boundary rules
- output schema instructions

No persona prompt layers enter extraction.

## Stage 5 - Profile-Aware Save Modal

Keep existing modal UX but move labels/sections to profile definitions.

Examples:

```text
Save Capture -> profile.labels.saveAction
What clicked -> profile.labels.bodyFieldLabel
Why it mattered -> profile.labels.contextFieldLabel
Snippet -> profile.labels.sourceFieldLabel
Concept type chip -> ontology node label
```

Also add correction affordance:

```text
Wrong category?
Change classification
Remember this boundary?
```

## Stage 6 - Profile-Aware Cards

Do not make one huge generic card.

Keep distinct cards:

```text
CandidateCaptureCard
CaptureCardCompact
CaptureCardFull
ConceptCardCompact
ConceptCardFull
CaptureChip
```

But let profile metadata fields decide which metadata rows render.

## Stage 7 - Promotion Rules Behind Profile Helpers

Move hardcoded promotion assumptions into profile helpers:

```ts
profile.promotion.defaultTypeNodeId
profile.promotion.rankTypeNode(typeNodeId)
profile.promotion.isContextOnlyKeyword(keyword)
profile.promotion.buildItemDraft(captures)
```

This replaces:

- hardcoded language/runtime token sets
- hardcoded concept type order
- default `mental_model`
- coding-specific advanced fields in promotion UI

## Stage 8 - Retrieval And Memory Formatting

Move user-visible memory text into profile:

```ts
profile.retrieval.formatCaptureMemory(capture)
profile.retrieval.formatItemMemory(item)
profile.retrieval.defaultHeader
```

Coding can keep:

```text
Relevant context from your saved learning
What clicked
Snippet
Concept
```

Other profiles can use their own labels.

## Stage 9 - Ontology Correction And Checker

Add:

```text
ontology_corrections
ontology_patch_suggestions
runOntologyReview
OntologyReviewScreen
```

Start manual-only:

```text
Run now
Show suggestions
Apply selected suggestions
```

Add reminders only after manual flow is stable.

## Stage 10 - Graph Design

Graph should consume profile-neutral graph data:

```ts
GraphNode {
  id
  label
  typeNodeId
  strength
  metadata
}

GraphEdge {
  from
  to
  relationshipTypeNodeId
  weight
}
```

Profile owns:

- colors
- node icons
- grouping rules
- relationship labels
- visual priority

## Stage 11 - Rename Carefully If Still Worth It

Only after profile seams exist, consider renames:

```text
learning -> knowledge
concept -> item
LearningHub -> KnowledgeHub
```

This may not be needed immediately. Public product labels can change through profile labels first.

## Nested Hotspot Cleanup

Clean these after profile seam work starts:

- `SaveAsLearningModal` -> host plus extraction/review/promotion child components
- `LearningHubScreen` -> detail host/router plus separate detail components
- `PromotionReviewScreen` -> draft form, capture inclusion list, conflict handler, metadata editor
- `computeClusters` -> graph construction, candidate scoring, dismissal filtering, type selection helpers

<nesting_rule>
Do not split files only for aesthetics.
Split when profile-aware behavior creates real responsibility boundaries.
</nesting_rule>
