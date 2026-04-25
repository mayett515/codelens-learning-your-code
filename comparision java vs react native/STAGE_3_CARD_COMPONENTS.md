# Stage 3 — Card Components

> Builds on Stage 1 data and Stage 2 save-flow contracts.
> Defines the component system for capture and concept UI without introducing reusable mega-cards.
> Codex-implementable. This stage is UI component architecture only; screen layout is Stage 4.

---

## Required Reading

Before implementing this stage, read:

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. `CODELENS_MASTER_PLAN.md`
4. `STAGE_1_DATA_FOUNDATION.md`
5. `STAGE_2_EXTRACTOR_AND_SAVE_FLOW.md`
6. This file

If there is a conflict:
- Regression Guard wins for product safety.
- Stage 2 wins for save-modal data contract.
- This file wins for card component boundaries and UI component responsibilities.

---

## Scope

### In scope

- Capture card components
- Concept card components
- Inline capture/concept reference chip
- Shared primitive components
- Field sets per card
- Navigation/tap behavior
- Component prop contracts
- Anti-regression rules for card separation
- Tests/acceptance criteria for component behavior

### Out of scope

- Learning Hub screen layout (Stage 4)
- Promotion UI flow (Stage 5)
- Retrieval injection display (Stage 6)
- Review Mode internals (Stage 7)
- Native graph UI (Stage 9)
- Final visual design polish

---

## Core Purpose

<stage_3_purpose>
Stage 3 creates purpose-built UI components for capture and concept surfaces.

The goal is to preserve cognitive separation:

Candidate = decision.
Compact = scanning.
Full = reading / understanding.

The system must not collapse these into variant props or one reusable mega-card.
</stage_3_purpose>

---

## Core Rule

<core_rule>
Each card serves ONE cognitive task.

Do NOT reuse cards across tasks.
Do NOT use variant props.
Do NOT create a shared base card.
Do NOT make the save modal use a full detail component as its primary surface.
</core_rule>

---

## Component List

### Capture components

1. `CandidateCaptureCard`
   - save modal decision card
   - not persisted detail
   - optimized for fast yes/no save decision

2. `CaptureCardCompact`
   - scanning card for lists
   - used in Recent Captures and compact evidence lists

3. `CaptureCardFull`
   - full capture detail surface
   - used for understanding one capture deeply

4. `CaptureChip`
   - small inline reference
   - used in evidence lists, concept detail, chat/review references

### Concept components

5. `ConceptCardCompact`
   - scanning card for concepts

6. `ConceptCardFull`
   - full concept detail surface
   - concept understanding/navigation hub

### Shared primitives

- `ConceptTypeChip`
- `StrengthIndicator`
- `StateChip`
- `SourceBreadcrumb`
- `LanguageChip`

<component_identity_rules>
- The six card components are distinct.
- Shared primitives are allowed.
- Shared card layouts are forbidden.
- `variant`, `mode`, `density`, `compact`, `isFull`, or similar layout flags are forbidden.
</component_identity_rules>

---

## Shared Types

Use Stage 1/2 domain types. Example shape below is guidance; actual imports should come from feature-owned type files.

```ts
type CaptureState = 'unresolved' | 'linked' | 'proposed_new';

type ConceptType =
  | 'mechanism'
  | 'mental_model'
  | 'pattern'
  | 'architecture_principle'
  | 'language_feature'
  | 'api_idiom'
  | 'data_structure'
  | 'algorithmic_idea'
  | 'performance_principle'
  | 'debugging_heuristic'
  | 'failure_mode'
  | 'testing_principle';
```

<type_rules>
- Do not duplicate source-of-truth types if they already exist in Stage 1/2 implementation.
- UI components receive typed props.
- UI components do not parse DB rows directly.
- UI components do not call repositories directly.
</type_rules>

---

## Shared Primitives

### `ConceptTypeChip`

Purpose: show the internal concept type as a subtle label when useful.

Allowed:
- plain label
- optional icon/color
- small/medium size variants only if implemented as primitive size, not card density

Forbidden:
- showing classification questions
- "what frame should I think with?" style UI
- making type visually dominate the card

```ts
interface ConceptTypeChipProps {
  type: ConceptType;
  size?: 'sm' | 'md';
}
```

### `StrengthIndicator`

Purpose: show computed concept strength.

Allowed:
- dot
- bar
- gradient
- numeric tooltip only if needed later

Forbidden:
- editing strength inline
- implying capture count equals mastery
- "due" language

```ts
interface StrengthIndicatorProps {
  strength: number; // computed 0..1
  size?: 'sm' | 'md';
}
```

### `StateChip`

Purpose: show capture organization state.

States:
- `unresolved`
- `linked`
- `proposed_new`

For linked captures, prefer showing linked concept name near the chip.

```ts
interface StateChipProps {
  state: CaptureState;
}
```

### `SourceBreadcrumb`

Purpose: show compact source context.

Format:
- compact: `filename · relative date`
- full: `path/to/file.ts · lines 12–18 · 2 weeks ago`
- chat captures: `chat · session title/date`

```ts
interface SourceBreadcrumbProps {
  fileName?: string | null;
  filePath?: string | null;
  startLine?: number | null;
  endLine?: number | null;
  relativeTime?: string;
  sessionLabel?: string | null;
  compact?: boolean;
}
```

`compact` here is allowed because it is a primitive formatting size, not a card density prop.

### `LanguageChip`

Purpose: show language/runtime/framework context.

```ts
interface LanguageChipProps {
  label: string;
  size?: 'sm' | 'md';
}
```

<shared_primitive_rules>
- Primitives may have size props.
- Card components may not have density/variant props.
- Primitives must remain visually consistent across surfaces.
</shared_primitive_rules>

---

## Component 1 — `CandidateCaptureCard`

### Purpose

Fast save decision: "Is this the thing I want to save?"

### Used in

- Save modal only

### Must not be used in

- Recent Captures
- Concept detail evidence list
- Hub concept list
- Capture detail route

### Prop contract

```ts
interface CandidateCaptureCardProps {
  candidateId: string;
  title: string;
  whatClicked: string;
  rawSnippet: string;
  conceptType?: ConceptType | null;
  linkedConceptName?: string | null;
  isNewLanguageForExistingConcept?: boolean;
  crossLanguageHint?: string | null;
  extractionConfidence?: number | null;
  saveState: CandidateSaveState;
  onSave: () => void;
  onInspect: () => void;
}
```

### Field rules

Show:
- title
- `whatClicked` max 1 line
- rawSnippet preview max 2–3 lines
- optional subtle `ConceptTypeChip`
- optional concept hint: `Related: [concept name]`
- optional cross-language hint, one line only
- subtle uncertainty indicator if extraction confidence is low
- Save action
- Inspect action

Do not show:
- full `whyItMattered`
- full snippet
- full source breadcrumb
- session detail
- concept taxonomy
- full concept summary
- learning structure
- evidence list

### Layout rules

<candidate_layout_rules>
- Max height ≈ 1/3 screen.
- No internal scrolling.
- Long text truncates.
- Large source content never expands the card.
- 2–3 candidate cards should be viewable in the modal by scrolling the modal, not each card.
</candidate_layout_rules>

### Behavior rules

<candidate_behavior_rules>
- Save button is always visible unless candidate is already saved.
- Save is per candidate.
- Saved state is local to the card.
- Saving one candidate does not close the modal.
- Inspect opens `CaptureCardFull` or an equivalent full capture detail preview.
- Inspect does not save.
</candidate_behavior_rules>

---

## Component 2 — `CaptureCardCompact`

### Purpose

Scanning captures: "Which capture do I want to open?"

### Used in

- Recent Captures section
- Concept detail evidence lists when compact
- Session detail capture lists
- Search results

### Must not be used in

- Save modal candidate decision
- Full capture detail route/modal

### Prop contract

```ts
interface CaptureCardCompactProps {
  captureId: LearningCaptureId;
  title: string;
  state: CaptureState;
  whatClicked: string;
  linkedConceptName?: string | null;
  sourceLabel?: string | null;
  relativeTime?: string;
  onPress: (captureId: LearningCaptureId) => void;
}
```

### Field rules

Show:
- title
- `StateChip`
- linked concept name if state is linked
- `whatClicked` max 1 line
- source breadcrumb: `file · time` or `session · time`

Do not show:
- rawSnippet
- full whyItMattered
- deep context
- concept taxonomy
- inline actions beyond maybe secondary overflow later

### Layout rules

<compact_capture_layout_rules>
- Dense list-friendly layout.
- Optimized for scanning ~20 items quickly.
- No inline expansion.
- No full snippet.
</compact_capture_layout_rules>

### Behavior rules

<navigation_rules>
- Tap `CaptureCardCompact` → open `CaptureCardFull`.
- Do not expand inline.
- Do not mutate state from compact card except via future explicit overflow actions.
</navigation_rules>

---

## Component 3 — `CaptureCardFull`

### Purpose

Deep understanding of one saved capture: "What did I understand here?"

### Used in

- Capture detail modal/route
- Inspect flow from CandidateCaptureCard
- Session detail when opening a capture

### Must not be used as

- Primary save modal candidate card
- Compact list card

### Prop contract

```ts
interface CaptureCardFullProps {
  captureId?: LearningCaptureId; // absent only for pre-save inspect preview
  title: string;
  conceptType?: ConceptType | null;
  state?: CaptureState;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang?: string | null;
  snippetSourcePath?: string | null;
  snippetStartLine?: number | null;
  snippetEndLine?: number | null;
  relativeTime?: string | null;
  sessionLabel?: string | null;
  linkedConcept?: {
    id: ConceptId;
    name: string;
    summary?: string | null;
  } | null;
  derivedFromCaptureId?: LearningCaptureId | null;
  derivedChildrenCount?: number;
  editableUntil?: number | null;
  now?: number;
  onContinue?: () => void;
  onEdit?: () => void;
  onLinkConcept?: () => void;
  onUnlinkConcept?: () => void;
  onDelete?: () => void;
}
```

### Field rules

Show:
- title
- optional `ConceptTypeChip`
- state if persisted
- relative time, e.g. `2 weeks ago`
- session context if available
- full `whatClicked`
- full `whyItMattered` if available
- full rawSnippet in scrollable code/text area
- full source breadcrumb if available
- linked concept preview if linked
- chain information if derived from another capture or if children exist

### Actions

Allowed:
- Continue from this capture
- Edit, only if within 24h
- Link concept
- Unlink concept
- Delete

### Rules

<full_capture_rules>
- rawSnippet text is immutable.
- Boundary adjustment may be exposed only if still within allowed edit/boundary window.
- Long snippet/content must scroll inside the full view, not overflow the screen.
- Full capture detail may be modal or route.
- It must never be the primary candidate card in the save modal.
</full_capture_rules>

---

## Component 4 — `ConceptCardCompact`

### Purpose

Scanning concepts: "Which concept do I want to open?"

### Used in

- Learning Hub concept list/grid
- Knowledge Health concept list if not using specialized visualization
- Related concept previews
- Graph tap preview if a compact card is needed

### Must not be used in

- Full concept detail
- Capture list
- Save modal

### Prop contract

```ts
interface ConceptCardCompactProps {
  conceptId: ConceptId;
  name: string;
  conceptType: ConceptType;
  strength: number;
  languageOrRuntime: string[];
  canonicalSummary: string | null;
  relationshipLine?: string | null;
  onPress: (conceptId: ConceptId) => void;
}
```

### Field rules

Show:
- name
- `ConceptTypeChip`
- `StrengthIndicator`
- up to 2 `LanguageChip`s plus `+N`
- canonical_summary max 1–2 lines
- optional relationship line only if relation confidence > 0.7

Do not show:
- full taxonomy
- raw snippets
- linked captures list
- prerequisites/related/contrast sections
- review count/details unless added later

### Layout rules

<compact_concept_layout_rules>
- Scannable.
- No inline expansion.
- No evidence snippets.
- Strength should be visible but not dominant.
</compact_concept_layout_rules>

### Behavior rules

<navigation_rules>
- Tap `ConceptCardCompact` → open `ConceptCardFull`.
- Do not expand inline.
- Concept type is a label/chip only; never show internal classification questions.
</navigation_rules>

---

## Component 5 — `ConceptCardFull`

### Purpose

Full concept understanding and navigation: "What do I know about this pattern?"

### Used in

- Concept detail modal/route
- Entry from concept list, graph, Knowledge Health, related concept links

### Must not be used in

- Concept list compact scanning
- Save modal
- Capture detail as the main component

### Prop contract

```ts
interface ConceptCardFullProps {
  conceptId: ConceptId;
  name: string;
  conceptType: ConceptType;
  strength: number;
  canonicalSummary: string | null;

  coreConcept?: string | null;
  architecturalPattern?: string | null;
  programmingParadigm?: string | null;

  languageOrRuntime: string[];
  surfaceFeatures: string[];
  keywords?: string[];

  prerequisites: Array<{ id: ConceptId; name: string }>;
  relatedConcepts: Array<{ id: ConceptId; name: string }>;
  contrastConcepts: Array<{ id: ConceptId; name: string }>;

  linkedCaptures: Array<{
    id: LearningCaptureId;
    title: string;
    whatClicked: string;
    sessionId?: string | null;
    sessionLabel?: string | null;
    languageOrRuntime?: string | null;
    createdAt: number;
  }>;

  representativeCaptureIds: LearningCaptureId[];
  originSessions: Array<{
    sessionId: string;
    sessionLabel: string;
    captureCount: number;
    lastCaptureAt: number;
    projectLabel?: string | null;
  }>;

  onStartReview: () => void;
  onViewGraph: () => void;
  onOpenConcept: (id: ConceptId) => void;
  onOpenCapture: (id: LearningCaptureId) => void;
  onJumpToSession?: (sessionId: string) => void;
}
```

`originSessions` powers a dedicated "Where you learned this" section.
It is session provenance derived from linked captures, not a second knowledge model.

### Always visible

- name
- `ConceptTypeChip`
- `StrengthIndicator`
- canonical_summary
- primary actions: Start Review, View in Graph

### Section: Abstraction

Show:
- core_concept
- architectural_pattern if present
- programming_paradigm if present

### Section: Context

Show:
- all language_or_runtime chips
- surface_features chips
- keywords if useful and not noisy

### Section: Where You Learned This

Show:
- one row per source session when `session_id` metadata exists
- session label/date
- capture count from that session
- optional project or file-origin hint when available

Rules:
- this section is provenance, not hierarchy
- sessions do not become concept nodes or concept children
- tapping a session row calls `onJumpToSession(sessionId)`
- `onJumpToSession` opens the shared read-only flashback surface defined in Stage 4
- if no source session metadata exists, this section may hide entirely

### Section: Learning Structure

Default collapsed.

Contains:
- prerequisites
- related concepts
- contrast concepts

Rules:
- every concept relation is tappable
- no inline graph rendering here

### Section: Evidence

Default collapsed.

Contains:
- linked captures grouped beneath source session and/or language
- representative captures highlighted first
- compact capture rows, not full capture cards by default

Rules:
- evidence is derived from captures
- do not duplicate snippet text on concept
- opening a capture navigates to `CaptureCardFull`

### Actions

- Start Review
- View in Graph
- Navigate to related/prerequisite/contrast concept
- Open linked capture
- Jump to session flashback, if session metadata exists

<full_concept_rules>
- Use progressive disclosure.
- Do not overwhelm first load.
- "Where you learned this" stays concise and never inline-renders a full session transcript.
- Learning Structure and Evidence are collapsible by default.
- This is a full view, not a compact card.
</full_concept_rules>

---

## Component 6 — `CaptureChip`

### Purpose

Tiny inline reference to a capture or concept relationship.

### Used in

- concept evidence
- chat injection preview
- review flows
- small related references

### Prop contract

```ts
interface CaptureChipProps {
  label: string;
  sublabel?: string | null;
  onPress?: () => void;
}
```

### Rules

<capture_chip_rules>
- Minimal.
- Tappable if it references an entity.
- No heavy info.
- No snippet.
- No multiline explanation.
</capture_chip_rules>

---

## Concept Type Visibility

<type_visibility_rules>
- `concept_type` may appear as a subtle chip/label.
- `concept_type` classification questions must never appear in UI.
- Compact cards may show type chip.
- Full views may show type chip.
- Type chip should never dominate the content.
</type_visibility_rules>

---

## Cross-Language Hint

<cross_language_rules>
- Cross-language hint appears only on `CandidateCaptureCard`.
- Exactly one line.
- No interaction.
- No timeline section.
- Format: "You also saved [concept name] in [language] [relative time]."
- Only show if `isNewLanguageForExistingConcept === true` and the match is strong enough to link or hint.
</cross_language_rules>

---

## Navigation Rules

<navigation_rules>
- `CaptureCardCompact` opens `CaptureCardFull`.
- `ConceptCardCompact` opens `ConceptCardFull`.
- `CandidateCaptureCard` Inspect opens `CaptureCardFull` as inspect preview.
- `CandidateCaptureCard` Save triggers Stage 2 save flow.
- Compact cards must never expand inline.
- Full views may open as modal or route, but behavior must be consistent within a screen.
</navigation_rules>

---

## State & Action Ownership

<action_ownership_rules>
- Cards receive callbacks; they do not call repositories directly.
- Cards do not know about DB transactions.
- Cards do not run extraction.
- Cards do not enqueue embeddings.
- Host screens/services own data fetching and mutations.
</action_ownership_rules>

---

## Accessibility & Mobile Interaction

<mobile_rules>
- All tappable actions must have adequate touch targets.
- Primary action must be reachable with thumb in modal flows.
- Candidate save action must remain visible without opening inspect.
- Long content in full views must scroll smoothly.
- Compact lists must not require horizontal scrolling.
</mobile_rules>

---

## Styling Boundaries

<style_rules>
- This stage defines structure, not final visual polish.
- Dark-mode compatibility required because CodeLens primary UI is dark.
- Shared primitives keep visual language consistent.
- Cards may look visually related, but must not share a base layout abstraction.
</style_rules>

---

## Forbidden Patterns

<forbidden_patterns>
- `CardBase`
- `LearningCard`
- `CaptureCard variant="candidate"`
- `CaptureCard density="full"`
- `ConceptCard mode="compact"`
- boolean props like `isCompact`, `isFull`, `inSaveModal`
- inline expansion for compact cards
- full capture UI inside save modal as the primary candidate surface
- snippets in compact concept cards
- classification questions in any user-facing card
</forbidden_patterns>

---

## Deliverables

1. `src/features/learning/ui/cards/CandidateCaptureCard.tsx`
2. `src/features/learning/ui/cards/CaptureCardCompact.tsx`
3. `src/features/learning/ui/cards/CaptureCardFull.tsx`
4. `src/features/learning/ui/cards/ConceptCardCompact.tsx`
5. `src/features/learning/ui/cards/ConceptCardFull.tsx`
6. `src/features/learning/ui/cards/CaptureChip.tsx`

Shared primitives:

7. `src/features/learning/ui/primitives/ConceptTypeChip.tsx`
8. `src/features/learning/ui/primitives/StrengthIndicator.tsx`
9. `src/features/learning/ui/primitives/StateChip.tsx`
10. `src/features/learning/ui/primitives/SourceBreadcrumb.tsx`
11. `src/features/learning/ui/primitives/LanguageChip.tsx`

Types:

12. `src/features/learning/ui/cards/types.ts` if needed, but prefer importing domain types from feature-owned types.

Exports:

13. Update feature barrel exports according to architecture contract.

Tests:

14. Component rendering tests for each card.
15. Interaction tests for `onPress`, `onSave`, `onInspect`, and `onJumpToSession`.
16. Regression tests proving no `variant`/`density` props exist on card components.
17. Snapshot or structural tests ensuring compact cards do not render snippets.

---

## Acceptance Criteria

<acceptance_criteria>
- Six distinct card components exist.
- No card component accepts `variant`, `density`, `mode`, `isCompact`, or `isFull`.
- No shared base card component exists.
- CandidateCaptureCard is used for save decision UI.
- CaptureCardFull is not used as the primary save modal candidate card.
- CandidateCaptureCard truncates long content.
- CaptureCardCompact does not render rawSnippet.
- ConceptCardCompact does not render evidence snippets.
- Compact cards open full views rather than expanding inline.
- Concept type appears only as subtle label/chip, never as classification question.
- rawSnippet text is not editable inside cards.
- `ConceptCardFull` can show a concise "Where you learned this" provenance section without turning sessions into concepts.
- Cards call callbacks; they do not call DB/repositories directly.
</acceptance_criteria>
