# CodeLens — Save as Learning Redesign Spec for Codex

> **Purpose**
>
> This document is the implementation brief for redesigning **Save as Learning** in CodeLens.
> It is written for an AI coding agent such as Codex.
>
> It is intentionally explicit, repetitive where useful, and structured for execution rather than elegance.
>
> The product is **coding-first**. Do not dilute the UX into a vague generic learning app. But do build the save flow and data model so the engine can later support domain forks such as math, economics, or personal ontology.

---

## <mission>

Redesign the **Save as Learning** feature from a **concept-first flow** into a **learning-capture-first flow**.

### The critical product rule

**Save as Learning does not mean create a concept.**

It means:
- capture what the user just understood
- capture why it mattered
- capture the source evidence that triggered the learning moment
- optionally attach that capture to a concept later

### The wrong mental model

```text
Save as Learning
    ↓
Create concept
```

### The correct mental model

```text
Save as Learning
    ↓
Create learning capture
    ↓
System may organize it into concepts later
```

The **primary saved object** must become a **Learning Capture**, not a Concept.

</mission>

---

## <product_truth>

CodeLens is a **software-development learning app**.

It is not a bland generic learning platform.

The software-development experience should feel native, intuitive, and opinionated.

At the same time, the underlying engine should be structured so a future fork can replace:
- taxonomy
n- relation types
- extraction prompts
- card labels
- viewer behavior
- review heuristics

without rewriting the entire storage, retrieval, or graph core.

### Framing to preserve

Use this framing consistently:

- **coding-first product**
- **domain-extensible learning core**
- **concepts are downstream organization**
- **learning captures are the saved user truth**

### Framing to avoid

Do **not** frame the current redesign as:
- building a totally generic learning app
- replacing all concept infrastructure
- deleting the graph direction
- turning the save flow into a giant ontology editor

</product_truth>

---

## <architecture_contract>

This spec does not replace the existing repo architecture contract.
It extends it.

**Authoritative file:** `codelens-rn/whatwe_agreedonthearchitecture.md`

All changes made under this spec must also comply with the hard constraints in that file.
If this spec and that file conflict, stop and call out the conflict explicitly before continuing.

The constraints most directly relevant to this redesign are:

```xml
<binding_constraints>
  <constraint id="1">
    Barrel discipline.
    Outside `src/features/learning/`, import learning APIs only from `@/src/features/learning`.
    Do not import internal learning paths (data/, application/, state/, ui/) from outside the feature.
  </constraint>

  <constraint id="2">
    Query key factories.
    All React Query keys must come from `src/features/learning/data/query-keys.ts` or `src/hooks/query-keys.ts`.
    Do not hardcode `queryKey: [...]` literals anywhere.
  </constraint>

  <constraint id="3">
    Transaction discipline.
    The new commit path writes to `learning_captures` AND optionally to `concepts` AND to `learning_sessions`.
    All multi-table writes that must be atomic must run inside a Drizzle `db.transaction()`.
    All data helpers that participate in transactions must accept an optional `executor: DbOrTx` parameter.
  </constraint>

  <constraint id="4">
    TypeScript strictness.
    The repo runs `strict + exactOptionalPropertyTypes`.
    Preserve branded IDs — use `LearningCaptureId = string & { readonly __brand: 'LearningCaptureId' }`.
    Prefer `unknown + narrowing` over `any`.
    No new `as any` casts in data layer files.
  </constraint>

  <constraint id="5">
    DB boundary hardening.
    JSON columns (languageOrRuntime, surfaceFeatures, keywords, captureIds) must be parsed via Zod codecs at boundaries.
    Do not read raw JSON from the DB and spread it directly into domain types.
  </constraint>

  <constraint id="6">
    No silent failures.
    Do not return fake success values from commit or persist paths when they fail.
    Throw explicit errors with context — especially on persistence, embedding, and restore paths.
  </constraint>

  <constraint id="7">
    Route screens stay thin.
    The `app/` route files that trigger Save as Learning must not contain multi-step orchestration logic.
    Orchestration belongs in `src/features/learning/application/`.
  </constraint>

  <constraint id="8">
    Embedding architecture.
    Embeddings are local-first. Do not silently reroute capture-embedding to remote providers.
    If this redesign requires embedding new capture objects, confirm the embedding path is local or explicitly flag the decision.
  </constraint>
</binding_constraints>
```

### Verification checklist for architecture compliance

Before finalizing any file touched by this redesign, verify:
- [ ] No barrel leaks (internal paths imported from outside the feature)
- [ ] No hardcoded query key literals
- [ ] Multi-table writes wrapped in `db.transaction()`
- [ ] Data helpers accept `DbOrTx` executor
- [ ] JSON columns read through Zod codecs
- [ ] No new `as any` casts
- [ ] No silent catch blocks on commit/persist paths
- [ ] Branded `LearningCaptureId` used, not raw `string`
- [ ] `tsc --noEmit` passes
- [ ] Targeted Vitest tests added/updated for changed logic

</architecture_contract>

---

## <hard_constraints>

These are hard constraints. Obey all of them.

1. **Do not keep concept creation as the primary save action.**
2. **Do not rename concept-first code while preserving concept-first behavior.** The behavior must actually change.
3. **Do not force the user to resolve concept identity before saving.** A learning capture must save successfully even when no concept is created or linked.
4. **Do not make merge the default action.** If concept suggestions exist, they are secondary and optional.
5. **Do not over-generalize the app architecture now.** Keep the implementation coding-first.
6. **Do not redesign unrelated systems.** Ignore backup, queue, fallback engine, broad graph refactors, and unrelated infrastructure.
7. **Do not make the mobile save modal heavier than it is today.** The redesign should feel faster and more intuitive, not more academic.
8. **Do not overload one scalar as both mastery and recurrence.** Repeated saves may indicate importance or recurrence, not necessarily familiarity.
9. **Do not throw away the existing concept layer.** It still matters, but it becomes secondary in this flow.
10. **Do not introduce vague or hand-wavy types.** Use explicit and stable TypeScript shapes.
11. **Do not use “Save Concept(s)” in the save flow UI.** The copy must reflect learning capture language.
12. **Do not silently treat a learning capture as a concept row in storage.** The DB model must represent the distinction.

</hard_constraints>

---

## <scope>

Only the following files are in scope for this redesign.

### Core save flow
- `src/features/learning/application/extract.ts`
- `src/features/learning/application/commit.ts`
- `src/features/learning/application/retrieve.ts`
- `src/features/learning/ui/SaveAsLearningModal.tsx`
- `src/features/learning/state/save-learning.ts`

### Data model
- `src/db/schema.ts`
- `src/db/migrations/001-initial-schema.ts`
- `src/features/learning/data/concepts.ts`
- `src/features/learning/data/learning-sessions.ts`
- `src/features/learning/data/embeddings-meta.ts`
- `src/features/learning/data/codecs.ts`

### Domain types + prompts
- `src/domain/types.ts`
- `src/domain/prompts.ts`
- `src/features/learning/application/prompts.ts`

### Philosophy / reference docs
- `comparision java vs react native/save_as_learning_philosophy.md`
- `comparision java vs react native/version_comparison.md`

### Explicitly out of scope
Do not expand work into:
- backup/restore
- queue system
- fallback engine
- broad graph rewrites
- embeddings infrastructure except where needed to support changed retrieval semantics
- unrelated UI screens

</scope>

---

## <desired_outcome>

After this redesign:

- the user long-presses something meaningful
- opens **Save as Learning**
- sees **1–3 learning capture candidates**
- each candidate explains:
  - what clicked
  - why it mattered
  - source evidence/context
- the user can save one or more captures immediately
- the system may optionally show a **related saved idea** or **possible concept link**
- the save works even if concept resolution is left unresolved

The UI should feel like:
- saving an insight
- preserving a learning moment
- keeping evidence
- optionally organizing knowledge

It should **not** feel like:
- creating ontology entries
- cleaning taxonomy
- doing concept merge administration

</desired_outcome>

---

## <state_machine>

Use this execution state machine while implementing.

```xml
<execution_machine>
  <rule>
    IF a type, prompt, UI label, DB row, or state variable assumes that a save produces concepts first,
    THEN replace that assumption with learning-capture-first semantics.
  </rule>

  <rule>
    IF a save-path function cannot persist the user's learning moment without concept creation,
    THEN the implementation is incorrect.
  </rule>

  <rule>
    IF retrieval logic proposes an existing concept,
    THEN surface it as a secondary hint such as "Related saved idea" or "Possible concept link",
    NOT as a required merge.
  </rule>

  <rule>
    IF a repeated save touches an existing concept,
    THEN treat it as another observation / recurrence signal,
    NOT as automatic proof of mastery.
  </rule>

  <rule>
    IF a code change is only renaming concepts to captures while leaving storage or commit semantics unchanged,
    THEN reject that change and continue redesigning.
  </rule>

  <rule>
    IF the save modal becomes more complex than before,
    THEN simplify the first-save path and move optional structure behind secondary interactions.
  </rule>

  <rule>
    IF a future-domain abstraction is tempting,
    THEN keep the current implementation coding-first unless the abstraction is directly needed to support learning-capture-first behavior.
  </rule>
</execution_machine>
```

</state_machine>

---

## <core_model_shift>

This redesign depends on one structural shift.

### Old structure

```text
snippet/chat
   ↓
extract concepts
   ↓
review concepts
   ↓
save concept ids in learning session
```

### New structure

```text
snippet/chat
   ↓
extract learning captures
   ↓
review what clicked
   ↓
save capture(s)
   ↓
optionally link to concept(s) or propose concept(s)
```

### Primary saved object

The system must introduce a new primary saved object.

```text
LearningCapture
```

A Concept still exists, but becomes a downstream knowledge organization object.

</core_model_shift>

---

## <taxonomy>

The product is coding-first, but the storage and structure should be extensible enough that later domains can swap taxonomy.

### LearningCapture

A Learning Capture is the record of a specific learning moment.

It should store:
- what was learned
- why it mattered
- what evidence triggered it
- what coding context it came from
- whether the system thinks it relates to an existing concept

### Concept

A Concept is a more stable knowledge object that one or more captures may attach to.

It should represent a recurring or structured piece of knowledge, not every single save moment.

### Concept structure

```text
Concept
├─ Identity
│  ├─ name
│  ├─ canonical_summary
│  └─ normalized_key
├─ Type
│  └─ concept_type
├─ Abstraction
│  ├─ core_concept
│  ├─ architectural_pattern
│  └─ programming_paradigm
├─ Concrete Context
│  ├─ language_or_runtime
│  └─ surface_features
├─ Learning Structure
│  ├─ prerequisites
│  ├─ related_concepts
│  └─ contrast_concepts
└─ Evidence
   ├─ representative_snippets
   └─ observations[]
```

### Why this structure matters

- **Identity** prevents concept drift.
- **Type** prevents `core_concept` from becoming a junk drawer.
- **Abstraction** supports cross-language or cross-context bridging.
- **Concrete Context** keeps the product useful for coding, not just theory.
- **Learning Structure** supports future review and graph usefulness.
- **Evidence** keeps the system grounded in actual saved moments.

### Required taxonomy correction

Do not use only these as the whole model:
- `core_concept`
- `architectural_pattern`
- `programming_paradigm`
- `language_syntax`
- `snippets`

That is not enough.

At minimum, add or preserve the ability to express:
- `concept_type`
- `prerequisites`
- `contrast_concepts`
- distinction between concept identity and evidence
- distinction between language/runtime and surface features/syntax

### Naming correction

Prefer:
- `language_or_runtime`
- `surface_features`

instead of collapsing everything into `language_syntax`.

</taxonomy>

---

## <data_model>

The following TypeScript-style shapes define the intended model.

These are design targets. They can be adapted to the codebase's exact conventions, but the semantics must remain intact.

### LearningCapture

```ts
export type LearningCaptureId = string & { readonly __brand: 'LearningCaptureId' }

export type LearningCapture = {
  id: LearningCaptureId

  sourceChatId: ChatId
  sourceMessageId?: MessageId
  sourceType: 'bubble' | 'chat'

  rawSnippet: string

  title: string
  whatClicked: string
  whyItMattered: string
  localSummary?: string | null

  languageOrRuntime: string[]
  surfaceFeatures: string[]
  keywords: string[]

  conceptStatus: 'unresolved' | 'linked' | 'proposed_new'
  linkedConceptId?: ConceptId | null
  proposedConceptName?: string | null
  proposedConceptSummary?: string | null
  proposedConceptType?: string | null

  extractionConfidence: number

  createdAt: string
  updatedAt: string
}
```

### Concept

```ts
export type Concept = {
  id: ConceptId

  name: string
  canonicalSummary: string
  normalizedKey: string

  conceptType:
    | 'mechanism'
    | 'pattern'
    | 'language_feature'
    | 'api_idiom'
    | 'data_structure'
    | 'algorithmic_idea'
    | 'architecture_principle'
    | 'debugging_heuristic'
    | 'performance_principle'
    | 'tooling_workflow'
    | 'failure_mode'

  coreConcept?: string | null
  architecturalPattern?: string | null
  programmingParadigm?: string | null

  languageOrRuntime: string[]
  surfaceFeatures: string[]
  keywords: string[]

  prerequisiteConceptIds: ConceptId[]
  relatedConceptIds: ConceptId[]
  contrastConceptIds: ConceptId[]

  familiarityScore: number
  importanceScore: number

  representativeObservationIds: LearningCaptureId[]

  createdAt: string
  updatedAt: string
}
```

### Session / save event

If the codebase keeps `LearningSession`, its semantics should change.

Instead of:
- grouping concept ids

it should group:
- learning capture ids

```ts
export type LearningSession = {
  id: LearningSessionId
  title: string
  source: string
  sourceChatId: ChatId
  captureIds: LearningCaptureId[]
  rawSnippet: string
  createdAt: string
}
```

### Important model rule

A saved learning moment must be representable **even when it is not mapped to a concept yet**.

</data_model>

---

## <database_rules>

The database must reflect the new truth.

### Required DB change

Add a new `learning_captures` table.

Suggested shape:

```ts
learningCaptures = sqliteTable('learning_captures', {
  id: text('id').primaryKey(),
  sourceChatId: text('source_chat_id').notNull(),
  sourceMessageId: text('source_message_id'),
  sourceType: text('source_type', { enum: ['bubble', 'chat'] }).notNull(),

  rawSnippet: text('raw_snippet').notNull(),

  title: text('title').notNull(),
  whatClicked: text('what_clicked').notNull(),
  whyItMattered: text('why_it_mattered').notNull(),
  localSummary: text('local_summary'),

  languageOrRuntime: text('language_or_runtime', { mode: 'json' }).notNull(),
  surfaceFeatures: text('surface_features', { mode: 'json' }).notNull(),
  keywords: text('keywords', { mode: 'json' }).notNull(),

  conceptStatus: text('concept_status', {
    enum: ['unresolved', 'linked', 'proposed_new'],
  }).notNull(),
  linkedConceptId: text('linked_concept_id'),
  proposedConceptName: text('proposed_concept_name'),
  proposedConceptSummary: text('proposed_concept_summary'),
  proposedConceptType: text('proposed_concept_type'),

  extractionConfidence: real('extraction_confidence').notNull(),

  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### Session grouping rule

Either:
- change `learning_sessions` to store `capture_ids`

or
- add a new save-event grouping table

Prefer the smaller migration that preserves current app stability.

### Concept persistence rule

Do not force a new concept row for every save.

### Migration preference

Use additive migrations where possible.

Prefer:
- adding `learning_captures`
- adjusting session storage from concept ids to capture ids
- gradually evolving concept fields where needed

Avoid unnecessary destructive migrations.

</database_rules>

---

## <extractor_rules>

The extractor is currently concept-first. That must change.

### New extractor output shape

The extractor should return **1–3 learning captures**, not 1–5 concepts.

Suggested shape:

```ts
export type ExtractedLearningCapture = {
  title: string
  whatClicked: string
  whyItMattered: string
  localSummary?: string
  languageOrRuntime: string[]
  surfaceFeatures: string[]
  keywords: string[]
  conceptHint?: {
    name?: string
    summary?: string
    conceptType?: string
    coreConcept?: string
    architecturalPattern?: string
    programmingParadigm?: string
  }
  confidence: number
}

export type ExtractionResult = {
  captures: ExtractedLearningCapture[]
}
```

### Prompting rules

The extractor prompt must instruct the model to:
- identify what the learner likely understood in this moment
- explain it clearly and concretely
- preserve coding context
- include why the moment matters
- prefer fewer strong captures over many weak ones
- avoid forcing abstract concept creation
- include concept hints only when helpful, not as the required main output

### Extraction quality rules

The model should prefer:
- mechanism clarity
- source-grounded interpretation
- mobile-readable phrasing
- coding-specific language

The model should avoid:
- generic educational fluff
- over-abstracted taxonomy language
- too many candidates
- making every save look like a formal CS ontology entry

</extractor_rules>

---

## <ui_rules>

The Save as Learning UI must change to reflect the new model.

### Primary UX goal

The save flow should feel like:
- “save what clicked”
- “save what I understood”
- “save this learning moment”

### UI language rules

Use phrases like:
- `Save as Learning`
- `What clicked`
- `Why this mattered`
- `Save Learning`
- `Save Capture`
- `Related saved idea`
- `Possible concept link`

Avoid phrases like:
- `Save Concept`
- `Merge into Concept`
- `Concept Extraction`
- `Concept Candidate`

### Candidate card structure

Each save candidate should read like a learning card.

Suggested compact structure:

```text
┌──────────────────────────────────────────────┐
│ Effect reruns track dependencies         [✓] │
│                                              │
│ What clicked                                 │
│ The dependency array tells React when to     │
│ rerun this effect.                           │
│                                              │
│ Why this mattered                            │
│ I finally understood that reruns come from   │
│ explicit tracked values, not magic.          │
│                                              │
│ React · hooks · dependency array             │
│                                              │
│ Related saved idea: Effect scheduling        │
└──────────────────────────────────────────────┘
```

### Save flow behavior rules

1. Show 1–3 candidates maximum.
2. Keep the initial review path lightweight.
3. Let the user save immediately.
4. Allow editing of:
   - title
   - whatClicked
   - whyItMattered
5. Concept links should be secondary and optional.
6. Do not require side-by-side merge review before saving.

### Important UX principle

The first interaction is about preserving momentum.

Do not turn the modal into a heavy curation workflow.

</ui_rules>

---

## <retrieval_rules>

Existing retrieval can still be used, but its semantics must change.

### Old retrieval meaning

- find merge candidates for extracted concepts

### New retrieval meaning

- find related saved ideas
- find possible concept links

### Behavior rules

- Retrieval suggestions are hints, not required actions.
- Similarity should support optional linking.
- Similarity should not imply forced sameness.
- False linking is less harmful than false merging.
- False merging is destructive and should be avoided.

### Labeling rules

Prefer labels like:
- `Related saved idea`
- `Possible existing concept`
- `Looks similar to`

Avoid labels like:
- `Merge target`
- `Same concept` unless confidence is extremely high

</retrieval_rules>

---

## <commit_rules>

The commit path must reflect the new primary object.

### Required commit behavior

For each selected learning capture:
1. persist a `learning_capture` row
2. optionally attach it to an existing concept if the user or system has a link decision
3. optionally create a concept only when appropriate
4. persist the parent grouped save/session if the codebase still uses one

### Critical commit rule

Saving must succeed even when:
- no concept exists yet
- no concept link is chosen
- no merge happens

### Repeated-save rule

If a new capture attaches to an existing concept:
- treat it as another observation / recurrence signal
- do not automatically claim user mastery

### Scoring rule

If concept scoring is updated at all:
- bias toward recurrence / importance
- do not equate repeat saves with familiarity

If feasible, split scores into:
- `importanceScore`
- `familiarityScore`

If not feasible immediately, at least avoid inflating the current score in a way that implies mastery.

</commit_rules>

---

## <file_by_file_plan>

This section defines what to do in each file.

### `src/features/learning/application/extract.ts`

**Current problem:** concept-first extraction schema and prompt.

**Required changes:**
- replace extracted concept schema with extracted learning capture schema
- replace result shape from `{ title, concepts[] }` to `{ captures[] }`
- keep concept hints optional, not primary
- cap candidate count at 1–3
- rewrite prompt language around learning moments and what clicked

**Acceptance for this file:**
- no primary output type named around extracted concepts
- prompt no longer instructs model to produce concepts as the main saved object

---

### `src/features/learning/ui/SaveAsLearningModal.tsx`

**Current problem:** modal is built around concepts, concept selection, merge candidates, and concept-saving copy.

**Required changes:**
- change UI language from concept-saving to learning-saving
- render capture cards with `whatClicked` and `whyItMattered`
- keep selection/deselection behavior but for captures
- make related concept suggestions secondary and compact
- update CTA copy to `Save Learning` or equivalent
- support inline editing of the learning phrasing fields

**Acceptance for this file:**
- no primary save CTA says `Save Concept(s)`
- user can save a capture without resolving concept structure

---

### `src/features/learning/state/save-learning.ts`

**Current problem:** state is concept-shaped.

**Required changes:**
- rename and retype state around captures
- store extracted captures
- store selected capture indices
- store link suggestions instead of merge assumptions
- rename actions to match capture-first semantics

**Acceptance for this file:**
- state names no longer imply that save flow produces concepts first

---

### `src/features/learning/application/commit.ts`

**Current problem:** commit path creates/merges concepts and treats concept ids as the saved result.

**Required changes:**
- persist learning captures first
- make concept creation/linking optional
- adjust repeated-save behavior away from automatic mastery assumptions
- group saved captures in session/save event record

**Acceptance for this file:**
- a save can complete with unresolved concept status
- commit code clearly persists captures as first-class records

---

### `src/features/learning/application/retrieve.ts`

**Current problem:** retrieval semantics center on merge candidates.

**Required changes:**
- preserve retrieval mechanics if useful
- rename or adapt functions to represent related concept / possible link suggestions
- lower semantic force from merge to hint/link

**Acceptance for this file:**
- retrieval is no longer presented as required merge logic

---

### `src/db/schema.ts`

**Current problem:** schema encodes sessions→concept ids as the save truth.

**Required changes:**
- add `learning_captures`
- support capture-first storage
- evolve session grouping toward capture ids
- extend concept schema only as needed for cleaner concept identity and structure

**Acceptance for this file:**
- DB can represent a saved learning moment independently of concept creation

---

### `src/db/migrations/001-initial-schema.ts`

**Current problem:** initial schema bakes in concept-first storage.

**Required changes:**
- update migration strategy to add capture storage support
- prefer additive change path where possible

**Acceptance for this file:**
- migration supports capture-first persistence semantics

---

### `src/features/learning/data/concepts.ts`

**Current problem:** concept data layer is implicitly the save destination.

**Required changes:**
- keep concept CRUD useful
- stop making it the only destination for Save as Learning
- add utilities if needed for optional linking or later concept derivation

**Acceptance for this file:**
- concepts remain supported, but are no longer assumed to be created on every save

---

### `src/features/learning/data/learning-sessions.ts`

**Current problem:** sessions store concept ids.

**Required changes:**
- change grouped save/session semantics to reference capture ids
- preserve current grouping UX if helpful

**Acceptance for this file:**
- a session/save event can represent saved captures without concept rows

---

### `src/features/learning/data/embeddings-meta.ts`

**Required changes:**
- only adjust if capture-first retrieval/linking needs metadata changes
- keep changes minimal

**Acceptance for this file:**
- no unnecessary refactor

---

### `src/features/learning/data/codecs.ts`

**Required changes:**
- add codecs for learning captures and any adjusted session payloads
- keep serialization explicit and stable

**Acceptance for this file:**
- new capture types are encoded/decoded cleanly

---

### `src/domain/types.ts`

**Current problem:** concept-first mental model is embedded in domain types.

**Required changes:**
- add `LearningCaptureId`
- add `LearningCapture`
- update session type to point to captures
- evolve concept type shape where needed

**Acceptance for this file:**
- core domain types reflect learning-capture-first reality

---

### `src/domain/prompts.ts`

**Required changes:**
- keep coding-first tone
- align language with learning moment capture rather than concept extraction
- avoid premature generalization

**Acceptance for this file:**
- prompt vocabulary reinforces the new product truth

---

### `src/features/learning/application/prompts.ts`

**Required changes:**
- adjust prompt-building helpers to support learning capture extraction and related-link hints

**Acceptance for this file:**
- helper prompts no longer assume concept-first output

</file_by_file_plan>

---

## <non_goals>

These are not goals of this change.

- Do not fully redesign the learning graph.
- Do not create a complete domain-plugin framework right now.
- Do not migrate the whole app into a generic knowledge platform.
- Do not build advanced review logic for all domains yet.
- Do not overbuild concept ontology management.
- Do not add huge settings surfaces for taxonomy editing.
- Do not make the user manage abstraction trees.

This redesign is about **fixing the saved object and the save flow**.

</non_goals>

---

## <implementation_style>

### TypeScript rules

```xml
<typescript_rules>
  <rule>Prefer explicit domain types over loose object literals.</rule>
  <rule>Avoid `any` and avoid new `as any` casts.</rule>
  <rule>Preserve branded ids or the codebase's existing id discipline.</rule>
  <rule>Prefer additive type evolution over breaking broad refactors.</rule>
  <rule>Keep naming aligned with product truth: capture-first in this flow.</rule>
</typescript_rules>
```

### React Native rules

```xml
<react_native_rules>
  <rule>Optimize the first save interaction for speed and clarity.</rule>
  <rule>Keep candidate cards readable on mobile.</rule>
  <rule>Do not increase required taps for the default save path.</rule>
  <rule>Use progressive disclosure for optional concept-link details.</rule>
  <rule>Do not let the modal become a dense admin surface.</rule>
</react_native_rules>
```

### Architecture rules

```xml
<architecture_rules>
  <rule>Keep concept infrastructure intact but secondary in this flow.</rule>
  <rule>Preserve coding-first UX and language.</rule>
  <rule>Use future-extensibility only where it directly supports the redesign.</rule>
  <rule>Do not spread domain-generalization concerns through unrelated files.</rule>
  <rule>The save-flow truth must be visible in types, prompts, state, storage, and UI copy.</rule>
</architecture_rules>
```

</implementation_style>

---

## <acceptance_criteria>

The redesign is only correct if all of the following are true.

1. The primary saved record is a **Learning Capture**.
2. A user can save a learning moment without creating or merging a Concept.
3. The save modal no longer presents the action as concept creation.
4. Extraction returns 1–3 capture candidates with `whatClicked` and `whyItMattered`.
5. Retrieval suggestions are optional and secondary.
6. Session/save grouping can represent captures instead of concept ids.
7. The DB can persist unresolved captures.
8. The flow remains coding-first in language and UX.
9. Repeated saves do not automatically imply mastery.
10. The implementation changes actual behavior, not just names.

</acceptance_criteria>

---

## <self_verification>

Before finalizing code changes, run this checklist mentally and explicitly.

```xml
<self_verification>
  <check>Did I change the primary saved object from concept-first to capture-first in actual behavior, not just naming?</check>
  <check>Can a save complete with no concept creation and no concept merge?</check>
  <check>Did I remove concept-first copy from the save modal and CTA labels?</check>
  <check>Does extraction now return learning captures with whatClicked and whyItMattered?</check>
  <check>Did I cap extracted candidates to 1–3?</check>
  <check>Did I add a concrete DB representation for learning captures?</check>
  <check>Did I change session/save grouping away from concept ids as the primary payload?</check>
  <check>Did I avoid turning retrieval hints into required merges?</check>
  <check>Did I avoid new `any` or sloppy casts?</check>
  <check>Did I avoid over-generalizing the app beyond what this redesign needs?</check>
  <check>Does the resulting UX feel like saving what clicked, not curating ontology?</check>
</self_verification>
```

</self_verification>

---

## <final_instruction>

Implement the redesign so that **Save as Learning** finally means what the product actually intends:

> **save the learning moment first**
>
> **organize it into concepts second**

That is the standard to hold through every file touched.

</final_instruction>
