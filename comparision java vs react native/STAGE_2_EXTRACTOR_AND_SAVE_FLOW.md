# Stage 2 — Extractor & Save Flow

> Builds on Stage 1 schemas. Covers the AI extraction pipeline, cross-language match logic,
> save modal data contract, and save transaction wiring.
> Codex-implementable. UI component internals are Stage 3, but this file defines what data the UI receives and what behavior the save flow must preserve.

---

## Required Reading

Before implementing this stage, read:

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. `CODELENS_MASTER_PLAN.md`
4. `STAGE_1_DATA_FOUNDATION.md`
5. This file

If there is a conflict:
- Regression Guard wins for product safety.
- Stage 1 wins for schema/source-of-truth fields.
- This file wins for extractor/save-flow implementation details.

---

## Scope

### In scope

- Extractor prompt composition
- Extractor output Zod schema
- Retry-on-invalid-JSON behavior
- Concept match pre-check before extraction
- Cross-language match hinting
- Save modal data contract
- Multi-save behavior
- Save transaction wiring
- Background embedding enqueue
- Error handling for extraction, provider failure, DB failure, and embedding failure

### Out of scope

- Card component internals (Stage 3)
- Learning Hub surfaces (Stage 4)
- Promotion suggestion logic (Stage 5)
- Retrieval / Dot Connector / personas (Stage 6+)
- Review Mode internals (Stage 7+)

---

## Core Purpose

<stage_2_purpose>
Stage 2 turns selected code/text/chat context into one or more saved Captures.

It must preserve the product truth:

Capture = moment of understanding.
Concept = optional organization after or during save.

The save flow must feel lightweight. It is a decision surface, not a concept-management form.
</stage_2_purpose>

---

## Hard Constraints

<negative_constraints>
- DO NOT generate more than 3 capture candidates under any circumstances.
- DO NOT generate 0 candidates if extraction succeeds.
- DO NOT paraphrase or rewrite `rawSnippet`; it must be quoted exactly from the source text.
- DO NOT include language suffixes in concept names. "Closure (JS)" is forbidden.
- DO NOT invent concepts not grounded in the selected source.
- DO NOT merge multiple insights into a single capture.
- DO NOT output prose from the extractor; JSON only.
- DO NOT auto-create a concept.
- DO NOT block save on concept linking.
- DO NOT block save on embedding success.
- DO NOT show classification questions in the UI.
- DO NOT make concept resolution required before saving.
</negative_constraints>

<required_behavior>
- Each capture MUST represent exactly one learning moment.
- `whatClicked` MUST reflect the user's understanding, not a generic textbook explanation.
- `conceptHint` MUST pick exactly one `concept_type`; no multi-type concepts.
- If uncertain, produce the best valid candidate rather than returning empty output.
- Save MUST succeed as long as the DB write succeeds.
- Capture correctness ALWAYS overrides concept correctness.
- If concept linking is uncertain, save unresolved.
</required_behavior>

<forbidden_patterns>
- No domain abstraction layer.
- No concept-first save flow.
- No automatic concept creation.
- No UI showing `concept_type` classification questions.
- No snippet text rewriting; boundaries only.
- No blocking save on concept state.
- No "Save All" primary action unless explicitly added in a later decision.
</forbidden_patterns>

---

## End-to-End Flow

```
User selects snippet / chat context → taps Save
  → normalize source text and cap selected extraction text at 800 chars
  → concept match pre-check: vec search top 3 existing concepts above 0.60 similarity
  → extractor receives source text + relevant concept context
  → extractor returns 1–3 capture candidates
  → Zod validates JSON
  → confidence/linking gate applies
  → save modal shows candidate capture cards
  → user optionally adjusts snippet boundaries, still capped at 800 chars
  → user taps Save on individual candidate card(s)
  → each saved candidate writes in its own DB transaction
  → UI confirms the individual card as saved
  → embedding job enqueued outside transaction
  → user may save another candidate or close modal
```

<flow_rules>
- The modal is candidate-first.
- The user can save one candidate without saving others.
- Saving one candidate does not mutate, remove, or auto-save the rest.
- Capture persistence is independent per candidate.
</flow_rules>

---

## Step 1 — Source Preparation

### Input sources

The selected source may come from:

- selected code snippet
- selected chat message
- selected range of a chat thread
- line-level mini chat context
- continue-from-capture chat context

### Source text rules

<source_rules>
- Extraction input text should be capped at 800 chars when passed as `selectedText`.
- `rawSnippet` stored on the capture must also be capped at 800 chars.
- If source content is larger than 800 chars, extractor should quote the smallest relevant fragment.
- Full source context may be inspectable later, but candidate card and stored snippet stay bounded.
- Large chat saves summarize the learning moment; they do not store the whole chat as the candidate snippet.
</source_rules>

### Boundary adjustment rules

<boundary_rules>
- User may adjust snippet boundaries in the save modal.
- Boundary adjustment changes the selected range, not the text contents.
- After adjustment, `rawSnippet` must still be ≤ 800 chars.
- Snippet text is immutable after save except through boundary adjustment before save.
</boundary_rules>

---

## Step 2 — Concept Match Pre-Check

Before calling the extractor, run a vector similarity search against existing concepts.

**Input:** selected text, trimmed to 800 chars.

```ts
const relevantConcepts = await conceptRepo.similaritySearch({
  text: selectedText,
  threshold: 0.60,   // loose; extractor and confidence gate make final linking decision
  limit: 3,
});
```

**Output:** 0–3 `Concept` objects plus similarity scores. These are passed to the extractor as context and preserved for the confidence gate.

<concept_match_rules>
- Pre-check only suggests possible links.
- Pre-check does not create concepts.
- Pre-check does not force linking.
- Passing a concept to the extractor does not mean the candidate must link to it.
</concept_match_rules>

<logic_gate>
IF extracted idea matches an existing concept semantically
THEN set `linkedConceptId` to that concept.

IF same concept appears in a new language/runtime/framework
THEN set `isNewLanguageForExistingConcept = true`.

IF match similarity < 0.65 AND extractionConfidence < 0.70
THEN DO NOT link; leave capture unresolved.

IF no strong match exists
THEN set `linkedConceptId = null` and keep capture unresolved.

NEVER create a new concept automatically.
</logic_gate>

The 0.65 / 0.70 guard means linking is allowed when either:
- vector match is strong enough, OR
- extractor confidence is strong enough.

Both weak → unresolved. False unresolved is cheaper than polluting the concept graph.

---

## Step 3 — Extractor Prompt Composition

### Prompt structure

```ts
const systemPrompt = [
  BASE_APP_SYSTEM_PROMPT,
  EXTRACTOR_INSTRUCTIONS,
  buildConceptContext(relevantConcepts),
].filter(Boolean).join('\n\n---\n\n');
```

<composition_rules>
- Keep prompt composition modular.
- Dot Connector/persona layers may compose into app prompts later, but they must not change extractor output schema.
- Extractor must remain deterministic in shape even if provider changes.
</composition_rules>

### BASE_APP_SYSTEM_PROMPT

```text
You are the AI assistant inside CodeLens — a mobile app for learning code by reading real repositories on your phone.
The user is in the middle of reading code and has selected a passage they want to remember.
Your job is to capture what just clicked for them.
Keep answers structured. Follow the output format exactly.
```

### EXTRACTOR_INSTRUCTIONS

```text
The user selected the following code or text while reading a repository.
Your job: extract 1 to 3 distinct capture candidates from this selection.

A capture = one moment of understanding. One thing that clicked.
Do not generate multiple captures for the same insight with different wording.
Only generate multiple captures if the selection genuinely contains multiple distinct insights.

For each capture, extract:
- title: short label (5–10 words)
- whatClicked: the insight in the user's own language — what they understood
- whyItMattered: why this is useful or important (null if not clear from the text)
- rawSnippet: the most relevant fragment quoted directly — never paraphrase
- conceptHint: the concept this maps to (reasoning stays internal — see rules below)

Internal concept_type reasoning (NEVER shown in UI — classification is for system use only):
  Ask yourself:
  - What kind of understanding is this?
    mechanism / mental_model / pattern / architecture_principle / language_feature /
    api_idiom / data_structure / algorithmic_idea / performance_principle /
    debugging_heuristic / failure_mode / testing_principle
  - What is the abstract coding idea at the core, independent of language?
  - Does this match one of the existing concepts provided?
    If yes: set linkedConceptId.
    If this is a new language/runtime/framework for the existing concept: set isNewLanguageForExistingConcept = true.
    If no match: set linkedConceptId = null.
  - Concept name must never include language suffix. "Closure" not "Closure (JS)".
  - Pick exactly ONE concept_type. No compound types.

Output valid JSON only. No prose before or after the JSON.
```

### Concept context injection

```ts
const buildConceptContext = (
  concepts: Array<{ concept: Concept; similarity: number }>
): string => {
  if (concepts.length === 0) return '';

  const list = concepts.map(({ concept, similarity }) =>
    [
      `id: ${concept.id}`,
      `name: ${concept.name}`,
      `core: ${concept.coreConcept ?? '—'}`,
      `type: ${concept.conceptType}`,
      `languages: ${concept.languageOrRuntime.join(', ') || 'none yet'}`,
      `similarity: ${similarity.toFixed(3)}`,
    ].join(' | ')
  ).join('\n');

  return [
    'Existing concepts the user has already saved that may be related:',
    list,
    'If this capture is a new encounter of one of these, use its id as linkedConceptId.',
    'Do not create language-suffixed concept names.',
  ].join('\n');
};
```

---

## Step 4 — Extractor Output Schema

### Concept type enum

Use the locked Stage 1 enum exactly. No extra values. No fallback `other`.

```ts
export const ConceptTypeEnum = z.enum([
  'mechanism',
  'mental_model',
  'pattern',
  'architecture_principle',
  'language_feature',
  'api_idiom',
  'data_structure',
  'algorithmic_idea',
  'performance_principle',
  'debugging_heuristic',
  'failure_mode',
  'testing_principle',
]);
```

### Capture hint schema

```ts
export const CaptureHintSchema = z.object({
  proposedName: z.string().min(1),
  proposedNormalizedKey: z.string().min(1),
  proposedConceptType: ConceptTypeEnum,
  extractionConfidence: z.number().min(0).max(1),
  linkedConceptId: z.string().nullable(),
  linkedConceptName: z.string().nullable(),
  linkedConceptLanguages: z.array(z.string()).nullable(),
  isNewLanguageForExistingConcept: z.boolean(),
});
```

### Candidate schema

```ts
export const CaptureExtractorCandidateSchema = z.object({
  title: z.string().min(1).max(120),
  whatClicked: z.string().min(1).max(500),
  whyItMattered: z.string().max(700).nullable(),
  rawSnippet: z.string().min(1).max(800),
  conceptHint: CaptureHintSchema.nullable(),
});
```

### Extractor output schema

```ts
export const ExtractorOutputSchema = z.object({
  candidates: z.array(CaptureExtractorCandidateSchema).min(1).max(3),
});
```

<schema_rules>
- Zod validation is mandatory at the AI JSON boundary.
- Invalid JSON is not partially accepted.
- Partial or empty captures are forbidden.
- `rawSnippet` over 800 chars is invalid.
</schema_rules>

---

## Step 5 — Retry on Invalid JSON

```ts
const runExtractor = async (prompt: string, input: string): Promise<ExtractorOutput> => {
  let currentInput = input;

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await aiProvider.complete(prompt, currentInput);
    const parsed = safeParseJSON(raw);
    const result = ExtractorOutputSchema.safeParse(parsed);

    if (result.success) return result.data;

    currentInput += [
      '',
      'Your previous response was not valid JSON matching the required schema.',
      'Output valid JSON only.',
      'Do not include markdown fences.',
      'Do not include prose.',
    ].join('\n');
  }

  throw new ExtractionFailedError('Extractor returned invalid output after 2 attempts');
};
```

<error_rules>
- Invalid extractor output MUST trigger exactly one retry.
- Second failure MUST surface error to user: "Couldn't extract your capture. Try again."
- NEVER silently create a fallback capture.
- NEVER save a partial or empty capture.
- Provider fallback may occur through the existing fallback engine, but exhausted providers must surface an error.
</error_rules>

---

## Step 6 — Save Modal Data Contract

Stage 3 owns component internals. This stage defines the data passed into candidate cards.

```ts
export interface SaveModalCandidateData {
  // Primary capture fields
  title: string;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang: string | null;
  snippetSourcePath: string | null;
  snippetStartLine: number | null;
  snippetEndLine: number | null;

  // Source linkage
  chatMessageId: string | null;
  sessionId: string | null;

  // Continue-from-capture chain
  derivedFromCaptureId: LearningCaptureId | null;

  // Cross-language reference line
  isNewLanguageForExistingConcept: boolean;
  linkedConceptName: string | null;
  linkedConceptLanguages: string[] | null;

  // Secondary concept surface
  linkedConceptId: ConceptId | null;
  extractionConfidence: number | null;

  // For confidence guard in save transaction
  matchSimilarity: number | null;

  // Full concept proposal metadata; persisted in concept_hint_json
  conceptHint: z.infer<typeof CaptureHintSchema> | null;
}
```

<ui_constraints>
- Save button MUST be visible and clickable immediately.
- Concept UI is secondary and visually subordinate.
- Cross-language hint is one line only.
- Cross-language hint format: "You also saved [concept name] in [language] [relative time]."
- `whatClicked` and `whyItMattered` are NOT editable in the save modal.
- `title` may be editable before save.
- `rawSnippet` text content is NOT editable.
- `rawSnippet` boundaries may be adjusted before save.
- `rawSnippet` MUST NOT exceed 800 chars after boundary adjustment.
</ui_constraints>

### Secondary concept surface rules

```ts
const shouldShowRelatedConceptChip = candidate.linkedConceptId !== null;

const shouldShowMakeConceptAction =
  candidate.linkedConceptId === null &&
  (candidate.extractionConfidence ?? 0) >= 0.70;
```

<secondary_surface_rules>
- If `linkedConceptId` is set, show subtle chip: "Related: [concept name]".
- If no link but extractionConfidence ≥ 0.70, show secondary ghost action: "Make this a concept".
- If no link and low confidence, show nothing concept-related.
- "Make this a concept" may prepare manual promotion, but MUST NOT auto-create a concept without explicit user confirmation.
</secondary_surface_rules>

---

## Step 7 — Multi-Save UX Rules

<multi_save_ui_rules>
- Each candidate card MUST have its own Save button.
- Saving one candidate MUST NOT save other candidates.
- Saving one candidate MUST NOT remove other candidates.
- Saving one candidate MUST NOT mutate other candidates.
- Saved candidates should confirm independently, for example with a checkmark, subtle fade, or "Saved" state.
- The modal MUST remain open after saving one candidate until the user closes it manually or saves all desired candidates.
- Do NOT add a primary "Save All" action unless explicitly requested later.
- Individual save is the default.
</multi_save_ui_rules>

### Save state per candidate

```ts
type CandidateSaveState =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'failed';
```

<save_state_rules>
- Candidate-level loading state is independent.
- A failed save on one candidate must not affect other candidates.
- User can retry a failed candidate.
- Already-saved candidate should not be saved twice.
</save_state_rules>

---

## Step 8 — Save Transaction

<hard_constraint>
- Saving a capture MUST NEVER fail due to AI, embedding, or concept logic.
- A capture MUST be persisted as long as DB write succeeds.
- Capture correctness ALWAYS overrides concept correctness.
- If concept linking is uncertain, prefer leaving capture unresolved.
</hard_constraint>

```ts
export const saveCapture = async (
  candidate: SaveModalCandidateData
): Promise<LearningCaptureId> => {
  const captureId = newLearningCaptureId();
  const now = Date.now();

  await db.transaction(async (tx) => {
    const confidence = candidate.extractionConfidence ?? 0;
    const similarity = candidate.matchSimilarity ?? 0;
    const linkingAllowed = similarity >= 0.65 || confidence >= 0.70;

    let state: CaptureState = 'unresolved';
    let linkedConceptId: ConceptId | null = null;

    if (candidate.linkedConceptId && linkingAllowed) {
      linkedConceptId = candidate.linkedConceptId;
      state = 'linked';

      if (candidate.isNewLanguageForExistingConcept && candidate.snippetLang) {
        await conceptRepo.appendLanguage(tx, linkedConceptId, candidate.snippetLang);
      }
    }

    await captureRepo.insert(tx, {
      id: captureId,
      title: candidate.title,
      whatClicked: candidate.whatClicked,
      whyItMattered: candidate.whyItMattered,
      rawSnippet: candidate.rawSnippet,
      snippetLang: candidate.snippetLang,
      snippetSourcePath: candidate.snippetSourcePath,
      snippetStartLine: candidate.snippetStartLine,
      snippetEndLine: candidate.snippetEndLine,
      chatMessageId: candidate.chatMessageId,
      sessionId: candidate.sessionId,
      derivedFromCaptureId: candidate.derivedFromCaptureId,
      state,
      linkedConceptId,
      editableUntil: now + 24 * 60 * 60 * 1000,
      embeddingStatus: 'pending',
      embeddingRetryCount: 0,
      extractionConfidence: candidate.extractionConfidence,
      conceptHintJson: JSON.stringify(candidate.conceptHint ?? null),
      keywordsJson: JSON.stringify([]),
      createdAt: now,
      updatedAt: now,
    });
  });

  embeddingQueue.enqueue({
    captureId,
    text: buildCaptureEmbeddingText(candidate),
    onSuccess: () => captureRepo.setEmbeddingStatus(captureId, 'ready'),
    onFailure: () => captureRepo.incrementEmbeddingRetry(captureId),
  });

  return captureId;
};
```

<transaction_rules>
- DB write MUST be atomic.
- Embedding MUST happen outside the transaction.
- Embedding failure MUST NOT rollback capture.
- Concept update MUST only happen if linkedConceptId is confirmed and confidence guard passes.
- Concept auto-creation MUST NOT happen in `saveCapture`.
- DB write failure means capture is not saved and embedding is not enqueued.
</transaction_rules>

---

## Step 9 — Background Embedding

<embedding_enqueue_rules>
- Enqueue one embedding job per saved capture.
- Embedding starts after DB transaction succeeds.
- Embedding failure sets/increments failed status but does not hide the capture.
- Retry failed embeddings on next app foreground.
- Embedding status may be visible in diagnostics, not in normal Hub UI unless needed.
</embedding_enqueue_rules>

```ts
export const buildCaptureEmbeddingText = (candidate: SaveModalCandidateData): string =>
  [
    candidate.title,
    candidate.whatClicked,
    candidate.whyItMattered ?? '',
    candidate.rawSnippet.slice(0, 800),
  ].filter(Boolean).join('\n\n');
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Extractor invalid JSON attempt 1 | Append correction and retry once |
| Extractor invalid JSON attempt 2 | Throw `ExtractionFailedError`, surface "Couldn't extract your capture. Try again." |
| AI provider outage | Existing fallback engine routes to next provider; exhausted providers surface error |
| User cancels modal | No write, no embedding enqueue, no side effects |
| DB write fails | Throw loudly; capture not saved; no partial state; no embedding enqueue |
| Confidence guard blocks link | Capture saved as unresolved; conceptHint stored; no user-facing error |
| Embedding fails | Capture stays saved; `embedding_status = failed`; retry later |
| Multi-save candidate A fails | Candidate B/C unaffected |
| User retries failed candidate | Only that candidate retries |

---

## Architecture Contract Checks

| Constraint | How Stage 2 satisfies it |
|---|---|
| Feature co-location | Extractor under `src/features/learning/extractor/`; save service under `src/features/learning/services/`. |
| Drizzle transactions | Save is atomic. Embedding enqueue is outside transaction. |
| Strict TS + branded IDs | `LearningCaptureId`, `ConceptId` throughout. No raw string crossing service boundary. |
| Zod at JSON boundaries | `ExtractorOutputSchema` validates AI response. |
| Loud failures | Extractor and DB failures throw; no silent blank-capture fallback. |
| Multi-part prompt composition | Base + extractor instructions + concept context. |
| No silent reroute | Provider fallback exhausts loudly. |
| Thin route screens | Save modal calls hooks/services; no business logic in route files. |
| Query key discipline | Any save-state queries use feature key factories only. |

---

## Deliverables

1. `src/features/learning/extractor/extractorPrompt.ts`
   - `BASE_APP_SYSTEM_PROMPT`
   - `EXTRACTOR_INSTRUCTIONS`
   - `buildConceptContext()`

2. `src/features/learning/extractor/extractorSchema.ts`
   - `ConceptTypeEnum`
   - `CaptureHintSchema`
   - `CaptureExtractorCandidateSchema`
   - `ExtractorOutputSchema`

3. `src/features/learning/extractor/runExtractor.ts`
   - AI call
   - JSON parsing
   - retry logic
   - `ExtractionFailedError`

4. `src/features/learning/extractor/buildCaptureEmbeddingText.ts`

5. `src/features/learning/services/conceptMatchPreCheck.ts`
   - vector search top-3
   - returns concepts + similarity

6. `src/features/learning/services/prepareSaveCandidates.ts`
   - source prep
   - pre-check
   - extractor call
   - maps output into `SaveModalCandidateData[]`

7. `src/features/learning/services/saveCapture.ts`
   - confidence guard
   - transaction
   - embedding enqueue

8. `src/features/learning/types/saveModal.ts`
   - `SaveModalCandidateData`
   - `CandidateSaveState`

9. Tests:
   - extractor schema accepts valid output
   - extractor schema rejects prose output
   - extractor schema rejects more than 3 candidates
   - extractor schema rejects rawSnippet > 800 chars
   - extractor retry fires once on invalid JSON
   - extractor throws after second invalid response
   - concept pre-check returns at most 3 concepts
   - no link when similarity < 0.65 and confidence < 0.70
   - link allowed when similarity ≥ 0.65
   - link allowed when confidence ≥ 0.70
   - cross-language capture appends language to existing concept
   - save persists unresolved when no match
   - save writes `derivedFromCaptureId`
   - save writes `editableUntil`
   - DB write failure does not enqueue embedding
   - embedding failure does not remove capture
   - multi-save candidates are independent
   - saving candidate A does not mutate candidate B/C

---

## Acceptance Criteria

<acceptance_criteria>
- Extractor returns 1–3 valid capture candidates.
- Every candidate has exactly one insight.
- Save modal can save candidates independently.
- Save does not require a concept.
- Save does not require embedding.
- Cross-language matches attach to existing concepts without language-suffixed names.
- Low-confidence matches save unresolved.
- No fallback blank captures are silently created.
- No `Save All` primary action exists.
- Stage 2 does not implement card layout internals.
</acceptance_criteria>

---

## Open Questions

🟢 Multi-save = independent transactions — LOCKED.  
🟢 Snippet size cap = 800 chars — LOCKED.  
🟡 Spinner UX timing — implementation polish, not blocking.  
🟡 Snippet boundary context source — file viewer integration detail, not a spec blocker.
