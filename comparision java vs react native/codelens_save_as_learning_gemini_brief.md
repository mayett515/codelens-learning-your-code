# CodeLens — Save as Learning Implementation Brief

> **For:** Gemini (implementation agent)
> **Status:** Authoritative. Supersedes prior specs where conflicts exist.
> **Scope:** Redesign Save as Learning from concept-first to capture-first.
> **Standard:** save the learning moment first, organize it into concepts second.

---

<meta>
  <audience>Gemini coding agent working inside `codelens-rn/`</audience>
  <purpose>Single source of truth for the Save as Learning redesign</purpose>
  <predecessors>
    This brief consolidates and supersedes:
    - `codelens_save_as_learning_codex_spec.md` (earlier implementation spec)
    - `save_as_learning_philosophy.md` (earlier product thinking, partially stale)
    - `opus_final_alignment_locked.md` (product truth, now embedded here)
  </predecessors>
  <reference_hierarchy>
    1. This brief (authoritative for Save as Learning)
    2. `codelens-rn/whatwe_agreedonthearchitecture.md` (authoritative for code organization)
    3. `ARCHITECTURE.md`, `PERSISTENCE.md`, `current_state.md` (implementation detail)
    4. `save_as_learning_philosophy.md` (background only — stale where it conflicts)
  </reference_hierarchy>
</meta>

---

## <core_truth>

**Save as Learning does not mean create a concept.**

It means:
- capture what the user just understood
- capture why it mattered
- capture the source evidence that triggered the learning moment
- optionally attach that capture to a concept later

The primary saved object is a **Learning Capture**, not a Concept.
Concepts are downstream organization built from captures.

</core_truth>

---

## <mental_model>

```text
Capture  = moment of understanding
Concept  = stabilized pattern across moments

User saves ──▶ Learning Capture
System organizes ──▶ Concepts (optional, confirmed)
```

Three rules that follow from this model:

1. Save must always succeed — no concept required.
2. Concepts exist, work, and matter — they are not deprecated.
3. Promotion from capture → concept is explicit, never silent.

</mental_model>

---

## <architecture_contract>

These constraints come from `codelens-rn/whatwe_agreedonthearchitecture.md` and are binding on every file touched.

<hard_constraints>
  <constraint id="1">
    Route screens in `app/` stay thin.
    Allowed: composition, query hook usage, rendering, local UI state.
    Not allowed: multi-step orchestration, data-layer mutation flows, domain logic.
  </constraint>

  <constraint id="2">
    Feature-owned code stays in `src/features/<feature>/`.
    All learning code lives under `src/features/learning/`.
  </constraint>

  <constraint id="3">
    Barrel discipline.
    Outside `src/features/learning/`, import only from `@/src/features/learning`.
    No deep imports into `data/`, `application/`, `state/`, `ui/` from outside.
  </constraint>

  <constraint id="4">
    Query keys come from factories only.
    Add new keys to `src/features/learning/data/query-keys.ts`.
    No hardcoded `queryKey: [...]` literals anywhere.
  </constraint>

  <constraint id="5">
    JSON columns are parsed via Zod codecs at the DB boundary.
    No raw JSON spread into domain types.
    No `as any` in the data layer.
  </constraint>

  <constraint id="6">
    Multi-table writes that must be atomic run inside `db.transaction()`.
    Data helpers accept an optional `executor: DbOrTx` parameter.
    The commit path (capture + optional concept + session) is one transaction per save batch.
  </constraint>

  <constraint id="7">
    TypeScript strict + exactOptionalPropertyTypes stays enabled.
    Use branded IDs: `LearningCaptureId = string & { readonly __brand: 'LearningCaptureId' }`.
    Prefer `unknown` + narrowing over `any`.
  </constraint>

  <constraint id="8">
    No silent failures on critical paths.
    Save must succeed or throw with context. Never fake-success.
    Empty retrieval results are valid data, not a failure.
  </constraint>

  <constraint id="9">
    Embeddings are local-first via ExecuTorch.
    Do not reroute embedding generation to remote providers silently.
    Both captures and concepts get embedded on the same local pipeline.
  </constraint>

  <constraint id="10">
    Pure logic is testable.
    Orchestration lives in pure functions/hooks with dependency injection.
    Add Vitest tests for behavior changes and failure paths.
  </constraint>
</hard_constraints>

---

## <primary_objects>

### LearningCapture (first-class saved object)

Represents a specific learning moment, grounded in source evidence.

Must remain valid when:
- no concept exists
- no concept link is chosen
- no taxonomy is resolved

### Concept (secondary, but fully functional)

Represents a recurring pattern consolidated across captures.
Exists to support graph structure, review, and retrieval.
Is never auto-created at save time.

### LearningSession (save-event grouping)

Groups captures from a single save flow.
Replaces the old concept-id-grouping semantics.

</primary_objects>

---

## <data_model>

Design targets. Adapt to codebase conventions, but preserve semantics.

### LearningCapture

```ts
export type LearningCaptureId = string & { readonly __brand: 'LearningCaptureId' }

export type LearningCapture = {
  id: LearningCaptureId

  sourceChatId: ChatId
  sourceMessageId?: MessageId
  sourceType: 'bubble' | 'chat'

  rawSnippet: string               // source-grounded evidence; not text-editable

  title: string
  whatClicked: string              // user's a-ha in their own words (AI-suggested, user-editable)
  whyItMattered: string            // why this matters to the user (AI-suggested, user-editable)
  localSummary?: string | null

  languageOrRuntime: string[]      // e.g. ['javascript', 'node'] — distinct from surface syntax
  surfaceFeatures: string[]        // e.g. ['async/await', 'destructuring']
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

  // Identity — prevents concept drift
  name: string
  canonicalSummary: string
  normalizedKey: string

  // Type — prevents core_concept becoming a junk drawer
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

  // Abstraction — cross-language / cross-context bridging
  coreConcept?: string | null
  architecturalPattern?: string | null
  programmingParadigm?: string | null

  // Concrete context — keeps product grounded in real code
  languageOrRuntime: string[]
  surfaceFeatures: string[]
  keywords: string[]

  // Learning structure — populated at promotion time or manually. NEVER by capture extraction.
  prerequisiteConceptIds: ConceptId[]
  relatedConceptIds: ConceptId[]
  contrastConceptIds: ConceptId[]

  // Scoring — single field, save never mutates this, only explicit review does
  strength: number

  createdAt: string
  updatedAt: string
}
```

<scoring_decision>
  Ship with a single `strength` field. Do not add `familiarityScore` + `importanceScore` to the schema yet.

  Rationale:
  - No review data exists yet to validate a split
  - Adding a second score field later is cheap
  - Removing two undefined scalars after they've been written to is harder
  - The "repeated saves ≠ mastery" principle is enforced by write rules, not by field count

  Write rules:
  - Save path never writes `strength`
  - Concept creation initializes `strength = 0.3`
  - Only explicit user review (time spent in Learning chat above 2 minutes, or explicit "I know this" toggle) increments `strength`
  - Time-based decay of 0.05/week runs on a background pass
  - Clamp to [0, 1]

  Direction A (split scores) is a planned v2 extension, not a v1 requirement.
</scoring_decision>

### Concept evidence

Concept evidence is a **view**, not separate storage.

```ts
// Derived, not stored:
export function conceptEvidence(concept: Concept, captures: LearningCapture[]) {
  const attached = captures.filter(c => c.linkedConceptId === concept.id)
  return {
    observations: attached,
    representativeSnippets: pickRepresentative(attached, { limit: 3 })
      // most recent + most diverse by languageOrRuntime/surfaceFeatures
  }
}
```

Do not add a separate `evidence` table or duplicate snippet storage on concepts.

### LearningSession

```ts
export type LearningSession = {
  id: LearningSessionId
  title: string
  source: string
  sourceChatId: ChatId
  captureIds: LearningCaptureId[]    // was: conceptIds
  rawSnippet: string
  createdAt: string
}
```

Sessions remain. They group captures from one save event. Do not remove.

</data_model>

---

## <database_schema>

### New table: `learning_captures`

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

### Evolved table: `learning_sessions`

Column change: store `capture_ids` instead of `concept_ids`.
Prefer additive migration — rename column, adapt codec, keep existing session rows.

### Existing table: `concepts`

Additive evolution only:
- Add `conceptType`, `normalizedKey` if missing
- Add `languageOrRuntime`, `surfaceFeatures` as JSON columns if not present
- Add `prerequisiteConceptIds`, `relatedConceptIds`, `contrastConceptIds` as JSON arrays
- Keep single `strength` column
- Do not add `familiarityScore` or `importanceScore`

### Migration preference

Additive migrations only. No destructive data changes.
Codec changes must preserve old payloads (fallback reader for legacy shape).

</database_schema>

---

## <extraction_rules>

### Extractor output

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

### Extractor must

- return 1–3 captures, not more
- prefer fewer strong captures over many weak ones
- express `whatClicked` + `whyItMattered` in the user's register, not textbook register
- preserve coding context
- include `conceptHint` only when genuinely useful, never as the primary output

### Extractor must not

- attempt to populate `prerequisiteConceptIds`, `relatedConceptIds`, `contrastConceptIds` — these are graph-level, filled at promotion
- generate generic educational fluff
- force every save into formal CS ontology phrasing
- produce more than 3 candidates
- write to or decide concept identity

<prompt_tone>
  Examples of good `whatClicked` phrasing:
  - "The dependency array tells React when to rerun this effect."
  - "Context propagates without explicit prop-drilling because providers are discovered upward."
  - "Borrowing prevents data races by enforcing exclusive mutable access at compile time."

  Examples of bad `whatClicked` phrasing:
  - "useEffect is a hook in React that..."
  - "This demonstrates the functional programming paradigm..."
  - "A key concept in computer science..."

  First style: user's mental model. Second style: textbook regurgitation.
</prompt_tone>

</extraction_rules>

---

## <commit_rules>

### Commit flow

```text
For each selected capture:
  1. persist learning_capture row
  2. if user chose to link to existing concept → update linkedConceptId, conceptStatus='linked'
  3. if user chose to create concept → create concept, link capture, conceptStatus='linked'
  4. otherwise → conceptStatus='unresolved'

Wrap entire batch in db.transaction().
Persist learning_session grouping all captureIds.
```

### Commit must

- succeed even when no concept exists
- succeed even when no concept link is chosen
- succeed even when no merge happens
- run as a single transaction per save batch
- throw explicit errors with context on failure (no fake success)

### Commit must not

- auto-create concepts without explicit user confirmation
- update `strength` on any concept
- increment a mastery score based on save
- drop captures on partial failure — the transaction fails whole

### Repeated-save rule

If a new capture's user choice links to an existing concept:
- update `linkedConceptId`
- do not touch `strength`
- do not change concept metadata (name, summary, taxonomy)
- recurrence is tracked implicitly via `COUNT(captures WHERE linkedConceptId = X)`

</commit_rules>

---

## <retrieval_rules>

Retrieval surfaces suggestions, never enforces them.

### Dual-source retrieval

Search both captures and concepts. Concepts weighted higher.

```text
rank(item) = cosine_similarity(query, item.embedding) * weight(item.type)
  where weight('concept') = 1.0
        weight('capture') = 0.7
```

Threshold for display: cosine ≥ 0.60. Above 0.85, label as "likely related"; between 0.60 and 0.85, label as "possibly related."

### Embedding strategy

- Both captures and concepts are embedded on save/update via local ExecuTorch pipeline
- Embedding input for captures: `${title}\n${whatClicked}\n${whyItMattered}\n${keywords.join(' ')}`
- Embedding input for concepts: `${name}\n${canonicalSummary}\n${coreConcept ?? ''}\n${keywords.join(' ')}`
- Storage via sqlite-vec, Hot/Cold tier unchanged
- No silent reroute to remote providers

### Retrieval labeling

Use:
- `Related saved idea`
- `Possible existing concept`
- `Looks similar to`

Do not use:
- `Merge target`
- `Same concept` (unless cosine ≥ 0.92 and user confirms)

### Latency model

- Chat open: pre-compute candidate pool of ~50 items by file/section context (async, cache in session memory)
- Message send: re-rank the 50-candidate pool against current message (sync, <50ms)
- No user-visible loading state for retrieval

</retrieval_rules>

---

## <promotion_mechanism>

This mechanism is mandatory. Without it, unresolved captures accumulate silently and the system collapses into an archive.

### Manual promotion (always available)

From any capture preview or capture card, a user can choose:
- **"Make this a concept"** → opens a minimal concept-creation sheet prefilled from `conceptHint`

### System-suggested promotion (background)

On each capture save, run a clustering check:

<promotion_trigger>
  <condition>
    All of:
    - cluster size ≥ 3 captures
    - pairwise embedding cosine ≥ 0.75 within cluster
    - at least 1 shared keyword across all cluster members
    - captures come from ≥ 2 distinct sourceChatIds (session diversity guard)
  </condition>

  <surface>
    Two entry points:
    1. Inline post-save toast: "You've saved several similar learning moments. Group them?" [Yes / Later / Dismiss]
    2. Persistent "Suggestions" section in Learning Hub (shows pending clusters)
  </surface>

  <user_action>
    - Yes → create concept from cluster, link all member captures, conceptStatus='linked'
    - Later → snooze 7 days
    - Dismiss → mark cluster as "not a concept," never re-suggest unless new capture joins
  </user_action>
</promotion_trigger>

### Promotion rules

- Never auto-create concepts without explicit user confirmation
- Never force promotion at save time
- Concept creation UI stays minimal — no multi-step wizard
- Suggestion copy stays plain: *"You have saved several very similar learning moments. Do you want to group them into a concept?"*

</promotion_mechanism>

---

## <learning_hub_surface>

Unresolved captures must be visible. Without visibility, they silently accumulate.

### Recent Captures section

Location: top of Learning Hub, above Concepts list.

Shows: all captures created in the last 30 days, ordered by `createdAt DESC`.

Each card displays:
- `title`
- first line of `whatClicked`
- state tag:
  - `Unresolved` (gray) — no linked concept
  - `Linked to: [concept name]` (muted green) — attached
  - `Proposed: [name]` (yellow) — cluster suggestion pending
- tap → capture preview modal

Capped at 20 visible. "See all" navigates to full capture list.

### Capture preview modal

Opens on tap. Shows:
- full `title`, `whatClicked`, `whyItMattered`
- `rawSnippet` in monospace
- taxonomy chips: `languageOrRuntime`, `surfaceFeatures`, `keywords`
- state + actions:
  - if unresolved: `Link to concept...` / `Make this a concept`
  - if linked: `View concept` / `Unlink`
  - if proposed: `Confirm cluster` / `Dismiss`

### Failure mode to prevent

> unresolved captures accumulate silently → user never sees them again → concept structure never forms

Recent Captures prevents this. Do not skip this surface.

</learning_hub_surface>

---

## <ui_rules>

### Save modal — primary goal

Save flow feels like *"I just saved something I understood."*
Never feels like *"I just managed my knowledge system."*

### Save modal — flow

```text
1. User long-presses bubble / code selection
2. Taps Save as Learning
3. Modal opens → ~2s spinner while AI extracts
4. 1–3 capture cards render
5. User can deselect any card
6. User can edit: title, whatClicked, whyItMattered
7. User can adjust rawSnippet BOUNDARIES (not text content)
8. If retrieval finds related items → shown as compact secondary chips
9. Primary CTA: "Save Learning" (or "Save N Learnings")
10. Commit fires → cards fly up animation → modal closes
```

### Save modal — capture card

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
│ Related saved idea: Effect scheduling  (tap) │
└──────────────────────────────────────────────┘
```

### UI language

Use:
- `Save as Learning`
- `What clicked`
- `Why this mattered`
- `Save Learning` / `Save Capture`
- `Related saved idea`
- `Possible concept link`
- `Make this a concept`

Avoid:
- `Save Concept` / `Save Concepts`
- `Merge into Concept`
- `Concept Extraction`
- `Concept Candidate`

### Editable fields

| Field | Editable? | Notes |
|--|--|--|
| `title` | ✅ | inline text edit |
| `whatClicked` | ✅ | inline text edit |
| `whyItMattered` | ✅ | inline text edit |
| `rawSnippet` text | ❌ | evidence integrity — never editable |
| `rawSnippet` boundaries | ✅ | drag handles to shrink/expand selection |
| `languageOrRuntime` / `surfaceFeatures` / `keywords` | ✅ | chip add/remove |
| `conceptHint` / `linkedConceptId` | ✅ | tap to link/create/skip |

### The save modal must not

- require concept resolution before saving
- show a merge review screen by default
- have more than one primary CTA
- grow taller than the current modal
- gate save on any optional field

</ui_rules>

---

## <dot_connector_forward_compat>

Memory injection into section chats is **out of scope for this redesign** but the data model here determines what it can do later.

Requirement: the capture shape must support a future Dot Connector that injects both captures and concepts into section chat system prompts.

Planned injection format (for reference — do not implement):

```json
{
  "type": "capture",
  "title": "Effect reruns track dependencies",
  "whatClicked": "...",
  "whyItMattered": "...",
  "rawSnippet": "useEffect(() => {...}, [count])"
}
```

```json
{
  "type": "concept",
  "name": "Effect scheduling via dependency array",
  "coreConcept": "...",
  "strength": 0.7,
  "linkedCaptureCount": 5,
  "representativeSnippet": "..."
}
```

The fields above must exist on the data model delivered by this redesign so the Dot Connector can consume them without further schema changes.

</dot_connector_forward_compat>

---

## <graph_model>

The knowledge graph remains concept-level.

```text
Concept nodes       ← visible graph structure
    ▲
Captures            ← evidence layer, not graph nodes
```

Rules:
- Concepts are graph nodes.
- Captures attach as evidence to concepts, not as graph nodes.
- Unresolved captures live in Learning Hub → Recent Captures, not in the graph.
- Do not grow capture nodes during this redesign.

</graph_model>

---

## <scope>

### In scope

**Save flow:**
- `src/features/learning/application/extract.ts`
- `src/features/learning/application/commit.ts`
- `src/features/learning/application/retrieve.ts`
- `src/features/learning/ui/SaveAsLearningModal.tsx`
- `src/features/learning/state/save-learning.ts`

**Data:**
- `src/db/schema.ts`
- `src/db/migrations/` (new migration file for learning_captures)
- `src/features/learning/data/concepts.ts`
- `src/features/learning/data/learning-sessions.ts`
- `src/features/learning/data/learning-captures.ts` (new)
- `src/features/learning/data/codecs.ts`
- `src/features/learning/data/embeddings-meta.ts`
- `src/features/learning/data/query-keys.ts` (new keys)

**Domain + prompts:**
- `src/domain/types.ts`
- `src/domain/prompts.ts`
- `src/features/learning/application/prompts.ts`

**Learning Hub (minimum viable orphan surface):**
- `src/features/learning/ui/LearningHub.tsx` — add Recent Captures section
- `src/features/learning/ui/RecentCapturesSection.tsx` (new)
- `src/features/learning/ui/CapturePreviewModal.tsx` (new)

**Promotion:**
- `src/features/learning/application/promote.ts` (new — clustering + suggestion logic)
- `src/features/learning/ui/PromotionSuggestionToast.tsx` (new)

### Out of scope

Do not expand into:
- backup/restore flow
- AI request queue
- fallback engine
- broad graph rewrites
- Dot Connector / memory injection (future work)
- persona / gem system
- syntax highlighting
- existing chat infrastructure

If a change feels tempting but is out of scope — stop and flag.

</scope>

---

## <file_by_file_plan>

### `src/features/learning/application/extract.ts`
- Replace concept-extraction schema with capture-extraction schema (see `<extraction_rules>`)
- Change result shape: `{ captures: ExtractedLearningCapture[] }`
- Rewrite prompt around learning moments
- Cap candidates at 1–3
- Do not extract graph-relation fields (prerequisites, related, contrast)

### `src/features/learning/application/commit.ts`
- Implement capture-first commit path (see `<commit_rules>`)
- Wrap batch in `db.transaction()`
- Thread `DbOrTx` executor to data helpers
- Never touch concept `strength` on save
- Throw on failure with context; no fake success

### `src/features/learning/application/retrieve.ts`
- Preserve existing vector retrieval mechanics
- Add dual-source retrieval (captures + concepts, concept-weighted)
- Rename semantics from "merge candidates" to "related saved ideas"
- Return confidence bands: `likely related` / `possibly related`

### `src/features/learning/application/promote.ts` (new)
- Clustering check on each capture insert
- Trigger rules per `<promotion_mechanism>`
- Persist pending cluster suggestions
- Handle confirm / snooze / dismiss actions

### `src/features/learning/ui/SaveAsLearningModal.tsx`
- Render capture cards per `<ui_rules>`
- Inline edit title / whatClicked / whyItMattered / taxonomy chips
- Boundary-only editor for rawSnippet
- Secondary concept-link chips, not primary
- CTA: "Save Learning"

### `src/features/learning/ui/LearningHub.tsx`
- Add Recent Captures section above Concepts
- Order by createdAt DESC, cap at 20
- Wire to capture data layer

### `src/features/learning/ui/RecentCapturesSection.tsx` (new)
- Capture cards with state tags (unresolved / linked / proposed)
- Tap → CapturePreviewModal

### `src/features/learning/ui/CapturePreviewModal.tsx` (new)
- Full capture display
- Actions: link to concept / make concept / unlink / confirm cluster / dismiss

### `src/features/learning/ui/PromotionSuggestionToast.tsx` (new)
- Inline post-save toast for cluster suggestions
- Yes / Later / Dismiss

### `src/features/learning/state/save-learning.ts`
- Retype around captures, not concepts
- Store extracted captures + selection state
- Link suggestions, not merge assumptions

### `src/features/learning/data/concepts.ts`
- Keep CRUD
- Remove assumption that save writes here
- Add helper: `linkCaptureToConcept(captureId, conceptId, tx?)`
- Add helper: `createConceptFromCluster(captureIds, hint, tx?)`

### `src/features/learning/data/learning-captures.ts` (new)
- Full CRUD over capture rows
- All helpers accept `DbOrTx`
- Zod codec for JSON columns

### `src/features/learning/data/learning-sessions.ts`
- Change payload from conceptIds to captureIds
- Preserve session-grouping UX

### `src/features/learning/data/codecs.ts`
- Add codec for learning capture shape
- Add fallback reader for legacy session shape during migration

### `src/features/learning/data/embeddings-meta.ts`
- Add capture embeddings alongside concept embeddings
- Same local ExecuTorch pipeline
- No remote reroute

### `src/features/learning/data/query-keys.ts`
- Add keys: `captures.list`, `captures.byId`, `captures.recent`, `captures.bySession`, `captures.byConcept`, `promotions.pending`
- No hardcoded arrays in query hooks

### `src/db/schema.ts`
- Add `learning_captures` table
- Evolve `learning_sessions` column from concept_ids to capture_ids (or additive new column + legacy support)
- Additive concept column evolution only

### `src/db/migrations/` (new file)
- Additive migration adding learning_captures
- Column rename/add on learning_sessions with data-preserving step

### `src/domain/types.ts`
- Add `LearningCaptureId`, `LearningCapture`
- Update `LearningSession` to use `captureIds`
- Evolve `Concept` to include Learning Structure id arrays, single `strength`

### `src/domain/prompts.ts`
- Template extraction prompt per `<extraction_rules>`
- Keep coding-first vocabulary
- Do not embed hardcoded `code`/`programming` strings that belong in a future `src/domain/config.ts`

### `src/features/learning/application/prompts.ts`
- Capture-extraction prompt helper
- Related-link hint prompt helper (for retrieval-driven secondary suggestions)

</file_by_file_plan>

---

## <execution_machine>

```xml
<rule>
  IF a type, prompt, UI label, DB row, or state variable assumes save produces concepts first,
  THEN replace with capture-first semantics.
</rule>

<rule>
  IF a save-path function cannot persist a learning moment without concept creation,
  THEN the implementation is incorrect.
</rule>

<rule>
  IF retrieval suggests an existing concept,
  THEN surface as a secondary hint, never as a required action.
</rule>

<rule>
  IF a repeated save touches an existing concept,
  THEN treat as recurrence signal. Do not increment strength.
</rule>

<rule>
  IF a change renames concepts to captures without changing storage or commit semantics,
  THEN reject the change.
</rule>

<rule>
  IF the save modal gains required taps or fields,
  THEN simplify first-save path and move optional structure behind progressive disclosure.
</rule>

<rule>
  IF a capture cluster meets the promotion trigger conditions,
  THEN surface suggestion via toast and Learning Hub — never auto-create.
</rule>

<rule>
  IF the extractor attempts to populate prerequisiteConceptIds / relatedConceptIds / contrastConceptIds,
  THEN remove those fields from extractor output — they are graph-level only.
</rule>

<rule>
  IF behavior and architecture contract conflict,
  THEN stop and flag before implementing.
</rule>

<rule>
  IF embedding work drifts toward a remote provider,
  THEN flag as architectural drift and stop.
</rule>
```

</execution_machine>

---

## <non_goals>

Do not, as part of this redesign:
- fully redesign the knowledge graph
- build a domain-plugin framework
- migrate into a generic knowledge platform
- ship familiarity/importance score split (planned v2)
- build the Dot Connector (planned post-v1)
- build promotion wizards or multi-step concept editors
- add taxonomy-editor UI
- require users to manage abstraction trees
- rewrite the chat stack
- touch the backup/restore system

Only scope creep tolerated: the minimum orphan surface (Recent Captures) because the system breaks without it.

</non_goals>

---

## <acceptance_criteria>

The redesign is correct if and only if:

1. Primary saved record is a `LearningCapture`.
2. A save succeeds with no concept creation and no concept link.
3. Save modal no longer uses concept-first language or CTAs.
4. Extraction returns 1–3 captures with `whatClicked` + `whyItMattered`.
5. Retrieval suggestions are secondary, labeled as hints.
6. `LearningSession` groups `captureIds`, not `conceptIds`.
7. DB persists unresolved captures.
8. Language stays coding-first; tone stays user-register, not textbook-register.
9. Repeated saves do not inflate `strength`.
10. Concept Learning Structure fields are never populated by extraction.
11. `rawSnippet` text is not user-editable. Boundaries are.
12. Captures and concepts both live in the local embedding store.
13. Promotion mechanism exists: 3+ captures, 0.75 similarity, keyword overlap, ≥2 distinct sessions, explicit confirmation.
14. Recent Captures section exists in Learning Hub with state tags.
15. Graph remains concept-level. Captures are not graph nodes.
16. Transactions wrap the commit path. No silent failures.
17. All DB helpers touched accept `DbOrTx`.
18. No new `as any` in data layer.
19. No hardcoded query keys added.
20. Behavior actually changed. Naming-only refactors are rejected.

</acceptance_criteria>

---

## <self_verification>

Before finalizing each PR:

```xml
<check>Does a save complete with no concept creation and no link?</check>
<check>Have I removed concept-first copy from modal and CTAs?</check>
<check>Does extraction return 1–3 captures with whatClicked + whyItMattered only?</check>
<check>Does extraction avoid prerequisite/related/contrast fields?</check>
<check>Is there a concrete DB representation for captures?</check>
<check>Do sessions group captureIds?</check>
<check>Are retrieval results labeled as hints, never merge actions?</check>
<check>Does the commit path run in a transaction?</check>
<check>Are data helpers accepting DbOrTx?</check>
<check>Is strength written only by explicit review, never by save?</check>
<check>Does the promotion mechanism meet all four trigger conditions including session-diversity?</check>
<check>Does Recent Captures render in Learning Hub with state tags?</check>
<check>Is rawSnippet text non-editable (boundary-only)?</check>
<check>Are captures + concepts both embedded locally?</check>
<check>No new `any` or `as any` in data layer?</check>
<check>No hardcoded query keys?</check>
<check>tsc --noEmit passes?</check>
<check>Targeted Vitest tests added for capture commit, promotion trigger, retrieval dual-source?</check>
<check>Does the resulting UX feel like "saving what clicked," not "managing ontology"?</check>
```

</self_verification>

---

## <implementation_style>

<typescript_rules>
  <rule>Use branded IDs. No raw string ids in domain types.</rule>
  <rule>Prefer explicit domain types over object literals.</rule>
  <rule>Avoid `any` and `as any`. Use `unknown` + narrowing.</rule>
  <rule>Codecs at the DB boundary. No raw JSON spread into domain types.</rule>
  <rule>Additive type evolution. No broad breaking refactors.</rule>
</typescript_rules>

<react_native_rules>
  <rule>Thin route screens. Orchestration in hooks/use-cases.</rule>
  <rule>Optimize first save interaction for speed.</rule>
  <rule>Keep candidate cards mobile-readable.</rule>
  <rule>Progressive disclosure for optional structure.</rule>
  <rule>Stable FlatList keys. Identity-safe.</rule>
</react_native_rules>

<architecture_rules>
  <rule>Feature barrel discipline. Import from `@/src/features/learning` outside the feature.</rule>
  <rule>Query key factories only. No hardcoded key arrays.</rule>
  <rule>Transaction discipline on multi-table writes.</rule>
  <rule>Local-first embeddings. No silent remote reroute.</rule>
  <rule>No silent failures on persist paths. Throw with context.</rule>
</architecture_rules>

</implementation_style>

---

## <final_instruction>

Build this redesign so that Save as Learning finally means what the product actually intends:

> **save the learning moment first**
>
> **organize it into concepts second**

Every file touched should reflect this truth. Capture-first in types, in prompts, in state, in storage, in UI copy, in commit behavior. Concepts stay real, functional, and supported — but they are no longer the primary saved object.

When in doubt, re-read `<core_truth>`. That is the standard.

</final_instruction>
