# Stage 5 — Promotion System

> Builds on Stage 1 schemas, Stage 2 save flow, Stage 3 cards, Stage 4 Hub surfaces.
> Defines the manual concept-creation pipeline driven by cluster suggestions and explicit single-capture promotion.
> Codex-implementable. UI internals follow Stage 3/4 component boundaries; this stage does not redefine card semantics.

---

## Required Reading

Before implementing this stage, read:

1. `CODELENS_REGRESSION_GUARD.md`
2. `CODELENS_COMPLETENESS_GUARD.md`
3. `CODELENS_MASTER_PLAN.md`
4. `STAGE_1_DATA_FOUNDATION.md`
5. `STAGE_2_EXTRACTOR_AND_SAVE_FLOW.md`
6. `STAGE_3_CARD_COMPONENTS.md`
7. `STAGE_4_LEARNING_HUB_SURFACES.md`
8. This file

If there is a conflict:
- Regression Guard wins for product safety.
- Stage 1 wins for schema/source-of-truth fields.
- Stage 2 wins for save-flow data contract.
- Stage 3 wins for card boundaries.
- Stage 4 wins for Hub layout intent.
- This file wins for promotion pipeline implementation details.

---

## Scope

### In scope

- Cluster computation over unresolved and proposed_new captures
- Cluster eligibility, similarity, keyword, and session-span filters
- Cluster fingerprint construction and dedup
- Promotion Suggestions surface in the Learning Hub
- Promotion Review screen (cluster-based and single-capture)
- normalized_key conflict detection and link-to-existing fallback
- Concept creation transaction wiring (atomic insert + capture relink)
- Progressive enrichment of concept fields from cluster captures
- `representative_capture_ids_json` population rule
- Dismiss / reject / resurface lifecycle for clusters
- Recomputation triggers (Hub-open, pull-to-refresh, post-save, post-promote, post-dismiss)
- Schema additions: `promotion_dismissals`, `promotion_suggestions_cache`
- TanStack query keys, hooks, and cache invalidation
- Tests, acceptance criteria, error handling

### Out of scope

- Retrieval / Dot Connector / personas (Stage 6+)
- Review Mode internals (Stage 7+)
- Native graph rewrite (Stage 9)
- Auto-merging concepts (forbidden by Regression Guard)
- Auto-creating concepts (forbidden by Regression Guard)
- Concept relationship inference beyond empty defaults (deferred)

---

## Core Purpose

<stage_5_purpose>
Stage 5 turns groups of related unresolved or proposed_new captures into one user-confirmed concept.

It must preserve the product truth:

Capture = moment of understanding.
Concept = pattern across captures, organized after the fact, only with explicit user intent.

Promotion is the single place where new concepts are created. Promotion is always:
- explicit (user confirms)
- evidence-grounded (every concept references real captures)
- non-blocking (captures remain valid whether promoted or not)
- reversible-leaning (dismissal is soft; rejection is the only permanent action and is explicit)
</stage_5_purpose>

---

## Hard Constraints

<negative_constraints>
- DO NOT auto-create concepts under any condition.
- DO NOT auto-merge captures into concepts without user confirmation.
- DO NOT auto-merge concepts with each other.
- DO NOT push notify the user about pending promotion suggestions.
- DO NOT include language suffixes in proposed concept names.
- DO NOT block any save flow on promotion state.
- DO NOT mutate familiarity_score or importance_score during promotion.
- DO NOT rewrite or paraphrase capture rawSnippet at any point in the promotion pipeline.
- DO NOT delete captures on dismiss or reject.
- DO NOT delete capture concept_hint_json on promotion (audit trail must remain).
- DO NOT force the user to promote anything; suggestions are passive.
- DO NOT introduce quiz, streak, due-queue, or pressure UI in the suggestion or review surfaces.
- DO NOT introduce variant props on suggestion or review components.
- DO NOT reuse `CaptureCardFull` as the primary suggestion-list component.
- DO NOT compute clusters synchronously during a save transaction.
- DO NOT include linked captures in clustering input.
- DO NOT include captures with `embedding_status != 'ready'` in clustering input.
</negative_constraints>

<required_behavior>
- Promotion MUST require explicit user confirmation before any concept row is inserted.
- Concept creation MUST be atomic: concept insert + all linked-capture state updates in one transaction.
- Embedding for the new concept MUST be enqueued OUTSIDE the transaction.
- Conflict on `normalized_key` MUST surface a link-to-existing-concept option; never silently rename, never silently merge.
- Dismissal MUST be soft and reversible by cluster growth.
- Rejection MUST be explicit, permanent for that exact fingerprint, and never block a future cluster that contains different captures.
- Suggestions MUST appear in the Hub only — never as system notifications.
- Cluster recomputation MUST be debounced and respect a cooldown window.
</required_behavior>

<forbidden_patterns>
- No concept-first save flow regression.
- No automatic concept creation on save, on cluster threshold, or on idle timer.
- No "promote all" bulk action.
- No silent re-linking of captures into existing concepts without confirmation.
- No background promotion executed without user input.
- No suggestion that includes captures the user already manually linked.
- No clustering that ignores keyword overlap or session span.
</forbidden_patterns>

---

## End-to-End Flow

```
User opens Learning Hub
  → trigger fires: maybeRecomputeSuggestions()
  → cooldown check passes → enqueue async cluster job (else use cached suggestions)
  → cluster job:
      load eligible captures (unresolved | proposed_new, embedding_status = 'ready')
      build similarity graph (≥ 0.75 cosine)
      derive connected components
      apply filters (size ≥ 3, ≥1 shared keyword, ≥2 distinct sessions, mean similarity ≥ 0.75)
      drop fingerprints in promotion_dismissals (subject to resurface rules)
      score and rank surviving clusters
      write promotion_suggestions_cache
  → Hub renders Promotion Suggestions section using cached rows
  → user taps a suggestion → Promotion Review screen opens
  → user adjusts proposed name / type / capture inclusion
  → user taps Confirm
  → normalized_key conflict check
      → conflict: offer link-to-existing concept (skip insert) or rename
      → no conflict: proceed
  → atomic transaction:
      insert concept (progressive enrichment fields populated from cluster)
      update each included capture: state = 'linked', linked_concept_id = newConcept.id
      remove cluster fingerprint from suggestions cache
  → enqueue concept embedding (outside transaction)
  → invalidate Hub queries; recompute suggestions (excluding now-linked captures)
  → user lands on ConceptCardFull for the new concept
```

```
User taps "Make this a concept" inside save modal or CaptureCardFull
  → if from save modal candidate: candidate is saved first with state = 'proposed_new'
  → Promotion Review screen opens with a one-capture cluster
  → same confirmation, conflict, and transaction path as above
```

<flow_rules>
- Cluster computation is asynchronous and never on the save hot path.
- The Promotion Review screen is the single place a concept is created.
- Single-capture promotion uses the same review screen and same transaction.
- Suggestions are passive: visible in Hub, never injected, never popped over.
- After a promotion succeeds, the next Hub render must not show the just-promoted cluster.
</flow_rules>

---

## Step 1 — Trigger Rules

<trigger_rules>
- Hub-open is the primary trigger. When the Learning Hub mounts, call `maybeRecomputeSuggestions()`.
- Pull-to-refresh on the Hub forces an immediate recompute, bypassing the cooldown.
- After a successful capture save, schedule a debounced recompute (debounce 30s; coalesce multi-saves into one job).
- After a successful promotion, recompute immediately (synchronous invalidation; async refill).
- After a dismissal or rejection, recompute immediately to remove the cluster from the surface.
- Cooldown: do NOT recompute more than once every 15 minutes outside of explicit triggers above.
- Promotion suggestions MUST NOT be surfaced as OS push notifications, in-app banners, or modals.
- Promotion suggestions MUST appear only inside the Hub's Promotion Suggestions section.
</trigger_rules>

```ts
const RECOMPUTE_COOLDOWN_MS = 15 * 60 * 1000;
const POST_SAVE_DEBOUNCE_MS = 30 * 1000;

export const maybeRecomputeSuggestions = async (
  reason: 'hub_open' | 'pull_refresh' | 'post_save' | 'post_promote' | 'post_dismiss'
): Promise<void> => {
  const lastRunAt = await suggestionsCacheRepo.lastComputedAt();
  const now = Date.now();

  const force = reason === 'pull_refresh' || reason === 'post_promote' || reason === 'post_dismiss';
  if (!force && lastRunAt !== null && now - lastRunAt < RECOMPUTE_COOLDOWN_MS) return;

  await clusterJobQueue.enqueue({ reason, scheduledAt: now });
};
```

---

## Step 2 — Cluster Eligibility

<eligibility_rules>
- A capture is eligible if ALL of:
  - `state === 'unresolved'` OR `state === 'proposed_new'`
  - `linked_concept_id IS NULL`
  - `embedding_status === 'ready'`
  - capture is not soft-deleted (if a soft-delete column exists in the future)
- Captures with `embedding_status` of `pending` or `failed` are skipped silently. They become eligible when embedding completes.
- Captures already linked are excluded; promotion does not modify existing concept memberships.
- Captures with empty `keywords_json` are eligible but contribute nothing to the keyword-overlap filter; a cluster of only empty-keyword captures CANNOT pass the filter.
</eligibility_rules>

---

## Step 3 — Clustering Algorithm

<clustering_rules>
- Similarity metric: cosine similarity over capture embeddings as stored in the existing vector store.
- Edge threshold: pairwise similarity ≥ 0.75.
- Component construction: connected components on the thresholded similarity graph.
- Cluster filters (ALL must pass):
  1. `captures.length >= 3`
  2. `distinctSessionIds(cluster).length >= 2`
  3. `sharedKeywords(cluster).length >= 1`, where shared keyword = keyword present in ≥ 2 captures of the cluster
  4. `meanPairwiseSimilarity(cluster) >= 0.75`
- If a cluster exceeds 12 captures, split by removing the weakest edges until each subcomponent has ≤ 12 captures and still passes filters; otherwise drop the surplus captures with the lowest mean similarity to the centroid.
- A capture MUST belong to at most one suggested cluster per recomputation. If multiple components claim it, assign it to the cluster with the highest mean centroid similarity. Tie-breaker: cluster with more captures; final tie-breaker: cluster with the smaller fingerprint string lexicographically.
</clustering_rules>

```ts
export interface ClusterCandidate {
  fingerprint: string;
  captureIds: LearningCaptureId[];
  meanSimilarity: number;
  sessionCount: number;
  sharedKeywords: string[];
  avgExtractionConfidence: number;
  proposedName: string;
  proposedNormalizedKey: string;
  proposedConceptType: ConceptType;
  clusterScore: number;
}

export const computeClusters = async (): Promise<ClusterCandidate[]> => {
  const eligible = await captureRepo.findEligibleForClustering();
  if (eligible.length < 3) return [];

  const graph = await buildSimilarityGraph(eligible, { threshold: 0.75 });
  const components = connectedComponents(graph);

  const filtered = components
    .map(splitIfOversized)
    .flat()
    .filter(passesFilters);

  return filtered.map(buildClusterCandidate);
};
```

---

## Step 4 — Cluster Fingerprint & Persistence

<fingerprint_rules>
- Fingerprint = SHA-256 hex of `captureIds.slice().sort().join('|')` over the final cluster member list.
- Fingerprint is the stable identity of a cluster across recomputations.
- Adding or removing a single capture changes the fingerprint.
- Fingerprint is used to dedup cache rows, look up dismissals, and provide a deterministic final ordering tie-breaker.
</fingerprint_rules>

### Schema additions

```sql
CREATE TABLE promotion_suggestions_cache (
  cluster_fingerprint        TEXT PRIMARY KEY,
  capture_ids_json           TEXT NOT NULL,
  proposed_name              TEXT NOT NULL,
  proposed_normalized_key    TEXT NOT NULL,
  proposed_concept_type      TEXT NOT NULL,
  shared_keywords_json       TEXT NOT NULL,
  session_count              INTEGER NOT NULL,
  capture_count              INTEGER NOT NULL,
  mean_similarity            REAL NOT NULL,
  avg_extraction_confidence  REAL NOT NULL,
  cluster_score              REAL NOT NULL,
  computed_at                INTEGER NOT NULL
);
CREATE INDEX idx_promotion_cache_score ON promotion_suggestions_cache(cluster_score DESC);

CREATE TABLE promotion_dismissals (
  cluster_fingerprint        TEXT PRIMARY KEY,
  dismissed_at               INTEGER NOT NULL,
  capture_ids_json           TEXT NOT NULL,
  capture_count              INTEGER NOT NULL,
  is_permanent               INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_promotion_dismissals_at ON promotion_dismissals(dismissed_at DESC);
```

### Codecs

```ts
export const ClusterCaptureIdsCodec = z.array(z.string().refine(isLearningCaptureId)).min(1);
export const SharedKeywordsCodec    = z.array(z.string()).default([]);
```

<persistence_rules>
- `promotion_suggestions_cache` is fully overwritten on each recomputation; never partially merged.
- `promotion_dismissals` rows are persistent until explicitly cleared by a user action ("Show dismissed suggestions") or by resurface logic.
- Both tables MUST round-trip through Zod codecs at every read; loud failure on malformed JSON.
- Write paths use `DbOrTx` threading consistent with existing repo conventions.
</persistence_rules>

---

## Step 5 — Suggestion Surface (Hub Integration)

### Purpose

Show the user which clusters of unresolved/proposed_new captures are ready to be turned into a concept.

### Primary user action

Open a single suggestion's Promotion Review screen.

### Hub placement

<hub_placement_rules>
- The Promotion Suggestions section sits between Recent Captures and Concept List in the Hub vertical order.
- The section is a Stage 5 addition to the Stage 4 Hub layout; it does not replace any Stage 4 section.
- The section MUST NOT outrank Recent Captures by default; the user's most recent context wins the top position.
</hub_placement_rules>

### Component

Use `PromotionSuggestionCard`, a Stage-5-owned compact component. It is NOT a capture or concept card; it does not violate the six-card rule because it represents a cluster, not a capture or concept.

```ts
interface PromotionSuggestionCardProps {
  fingerprint: string;
  proposedName: string;
  proposedConceptType: ConceptType;
  captureCount: number;
  sessionCount: number;
  sharedKeywords: string[];
  sampleCaptureTitles: string[]; // up to 3
  avgExtractionConfidence: number;
  onOpenReview: (fingerprint: string) => void;
  onDismiss: (fingerprint: string) => void;
}
```

### Field rules

Show:
- proposed concept name
- subtle `ConceptTypeChip` for proposed type
- "From N captures across M sessions"
- up to 2 shared keyword chips plus `+N`
- up to 3 sample capture titles, plain text, no snippets
- primary action: Review
- secondary action: Dismiss

Do NOT show:
- rawSnippet of any capture
- whyItMattered text
- full whatClicked text (sample titles only)
- pressure language ("ready", "act now")
- numeric confidence scores in raw form

### Ordering

<suggestion_ordering>
- Primary sort: `cluster_score DESC`.
- Tie-breaker 1: `capture_count DESC`.
- Tie-breaker 2: max `created_at DESC` of cluster captures.
- Tie-breaker 3: `cluster_fingerprint ASC` (deterministic final tie-breaker).
- `cluster_score` is `avg_extraction_confidence * log(1 + capture_count)`. Coefficients are placeholders; lock after Stage 5 produces real signal.
</suggestion_ordering>

### Grouping

<suggestion_grouping>
- No grouping by default.
- Filtering by proposed concept_type is allowed.
- Do NOT group by session, language, or fingerprint prefix.
</suggestion_grouping>

### Visibility

<suggestion_visibility>
- Section is visible only when `promotion_suggestions_cache` contains at least 1 row that is not in `promotion_dismissals` (subject to resurface rules in Step 13).
- Show top 5 suggestions by default.
- Provide "See all suggestions" if more than 5 exist.
- Empty state: hide the section entirely. Do NOT render a placeholder; absence of suggestions is not a problem the user must resolve.
- The section MUST NOT appear if `promotion_suggestions_cache` is empty for any reason (no eligible captures, all clusters dismissed, embeddings still pending).
</suggestion_visibility>

### Actions

<suggestion_actions>
- Tap card → open Promotion Review screen for that fingerprint.
- Dismiss action → soft dismissal (Step 13).
- Long-press / overflow → optional "Reject permanently" action (Step 13).
- Card is read-only; no inline editing of proposed name/type from the Hub.
</suggestion_actions>

---

## Step 6 — Promotion Review Screen

### Purpose

Single place where a user finalizes concept creation — for both cluster suggestions and single-capture promotion.

### Primary user action

Confirm concept creation.

### Surface

Modal or route. Behavior must remain consistent within a screen per Stage 3 navigation rules.

### Primary visible fields (editable, expanded by default)

<review_primary_fields>
- name (text input, prefilled with `proposedName`)
- concept_type (picker over the 12 locked enum values, prefilled with `proposedConceptType`)
- included captures (selectable list — see Required surfaces below)
</review_primary_fields>

### Advanced fields (collapsed by default, editable on expand)

<review_advanced_fields>
- canonical_summary (multi-line, optional, default empty unless extractor enrichment ran — see Step 10)
- core_concept (single line, optional)
- architectural_pattern (single line, optional)
- programming_paradigm (single line, optional)
</review_advanced_fields>

<review_field_visibility_rules>
- Advanced fields MUST be hidden behind a single "Advanced" disclosure that is collapsed by default.
- Expanding Advanced MUST NOT block the Confirm action; primary fields alone are sufficient to confirm.
- If extractor enrichment pre-filled an Advanced field, the disclosure MAY auto-expand on first open of the review screen for that fingerprint, then respect user state on subsequent opens.
- Promotion MUST NOT feel like form-filling. Primary fields are the contract; advanced fields are opt-in metadata.
</review_field_visibility_rules>

### Required surfaces (read-only or selectable)

<review_surfaces>
- list of cluster captures rendered as `CaptureCardCompact`
  - each row has an "Include" checkbox; default checked
  - unchecking removes capture from the eventual concept link list
  - unchecking does NOT delete the capture
  - minimum 1 included capture required to confirm; warning if fewer than 2 included for a cluster-source promotion
- shared keywords surfaced as read-only `LanguageChip`/keyword chips for context
- proposed `language_or_runtime` chips derived from cluster (Step 10)
- proposed `surface_features` chips derived from cluster (Step 10)
</review_surfaces>

### Forbidden surfaces

<review_forbidden>
- Inline rawSnippet text from any capture (use CaptureCardCompact only).
- Inline whyItMattered.
- Auto-suggested prerequisites/related/contrast concepts (deferred to Stage 6+).
- Quiz, due, streak, or "memorize" language.
- Any UI that mutates capture content.
</review_forbidden>

### Ordering of capture rows

<review_capture_ordering>
- Sort by `extraction_confidence DESC NULLS LAST`.
- Tie-breaker 1: `created_at DESC`.
- Tie-breaker 2: `id ASC` (deterministic).
</review_capture_ordering>

### Visibility

<review_visibility>
- Reachable from: Promotion Suggestion Card; "Make this a concept" action on `CandidateCaptureCard` post-save; "Make this a concept" / Link Concept flow on `CaptureCardFull` for unresolved or proposed_new captures.
- Reachable only for captures the user owns and that meet eligibility (or are explicitly being promoted as a single-capture flow).
- Closing the screen without confirming MUST NOT delete the cluster cache row, MUST NOT mutate any capture, and MUST NOT silently dismiss the cluster.
</review_visibility>

---

## Step 7 — Conflict Detection (normalized_key)

<conflict_rules>
- On user confirm, compute `proposedNormalizedKey` from the final `name` (lowercased, whitespace-collapsed).
- Query `concepts WHERE normalized_key = ?` BEFORE the transaction.
- If a concept already exists:
  - Block the insert.
  - Show a conflict dialog with two options:
    - "Link captures to '[existing name]' instead" — runs the link-only path (Step 8 link-existing variant).
    - "Edit name" — returns user to the review screen with focus on the name input.
  - Optional secondary action: "Open existing concept" (read-only navigation) — does not exit the review.
- The conflict dialog MUST NOT auto-merge, MUST NOT auto-rename, MUST NOT proceed without explicit user choice.
- The conflict check is repeated inside the transaction; if a race produces a duplicate, the transaction is rolled back and the conflict dialog is shown post-hoc.
</conflict_rules>

---

## Step 8 — User Confirmation Flow

<confirmation_rules>
- Confirm button is enabled only when:
  - `name.trim().length >= 1`
  - `concept_type` is one of the 12 locked enum values
  - at least 1 capture is included
- Confirm action goes through one of two paths:
  - **Create-new path**: no normalized_key conflict → run the concept creation transaction (Step 9).
  - **Link-existing path** (chosen explicitly in the conflict dialog): no concept insert; run a transaction that only updates included captures to `state = 'linked'` and `linked_concept_id = existingConcept.id`. Append unique `snippet_lang` values to the existing concept's `language_or_runtime_json`. Append unique cluster keywords to existing concept's `surface_features_json`. Recompute concept embedding (since source text may change because language list changed, summary unchanged).
- Cancel returns the user to the entry surface (Hub or save modal) with no side effects.
- After successful confirmation:
  - Navigate to `ConceptCardFull` for the resulting concept (new or existing).
  - Trigger `maybeRecomputeSuggestions('post_promote')`.
  - Invalidate the relevant TanStack queries (Step 14).
</confirmation_rules>

---

## Step 9 — Concept Creation Transaction

<transaction_rules>
- DB write MUST be atomic: concept insert + all included capture updates in one Drizzle transaction.
- Embedding enqueue MUST happen AFTER the transaction commits.
- Cluster cache row MUST be removed inside the transaction.
- `representative_capture_ids_json` MUST be populated inside the transaction (Step 11).
- Concept embedding failure MUST NOT roll back; the concept stays valid with `concept_embedding_status` tracked by the existing concept-embedding pipeline.
- Capture `concept_hint_json` MUST be preserved unchanged (audit trail).
- Capture `state` flips from `unresolved` or `proposed_new` to `linked` for every included capture; non-included captures are untouched.
- `familiarity_score` and `importance_score` MUST be set to creation baselines (`familiarity_score = 0.3`, `importance_score = 0.5`) on concept creation. The baseline is a starting point, NOT a reward — promotion MUST NOT raise these values above baseline. The link-existing path MUST NOT modify either field. Subsequent updates are reserved for explicit review/revisit flows (Stage 7+).
</transaction_rules>

```ts
export const promoteToConcept = async (
  input: PromotionConfirmInput
): Promise<ConceptId> => {
  const conceptId = newConceptId();
  const now = Date.now();

  const concept = buildConceptFromCluster(input, conceptId, now);

  await db.transaction(async (tx) => {
    const conflict = await conceptRepo.findByNormalizedKey(tx, concept.normalizedKey);
    if (conflict) throw new NormalizedKeyConflictError(conflict.id);

    await conceptRepo.insert(tx, concept);

    for (const captureId of input.includedCaptureIds) {
      await captureRepo.linkToConcept(tx, captureId, conceptId);
    }

    if (input.fingerprint) {
      await suggestionsCacheRepo.removeByFingerprint(tx, input.fingerprint);
    }
  });

  embeddingQueue.enqueue({
    conceptId,
    text: buildConceptEmbeddingText(concept),
  });

  return conceptId;
};
```

```ts
export const linkCapturesToExistingConcept = async (
  input: LinkExistingInput
): Promise<ConceptId> => {
  const now = Date.now();

  await db.transaction(async (tx) => {
    const target = await conceptRepo.requireById(tx, input.targetConceptId);

    for (const captureId of input.includedCaptureIds) {
      await captureRepo.linkToConcept(tx, captureId, target.id);
    }

    const newLanguages = uniqueAppend(target.languageOrRuntime, input.clusterLanguages);
    const newSurface   = uniqueAppend(target.surfaceFeatures, input.clusterKeywords);

    await conceptRepo.updateMetadata(tx, target.id, {
      languageOrRuntime: newLanguages,
      surfaceFeatures: newSurface,
      updatedAt: now,
    });

    if (input.fingerprint) {
      await suggestionsCacheRepo.removeByFingerprint(tx, input.fingerprint);
    }
  });

  embeddingQueue.enqueue({
    conceptId: input.targetConceptId,
    text: buildConceptEmbeddingTextForId(input.targetConceptId),
  });

  return input.targetConceptId;
};
```

---

## Step 10 — Progressive Enrichment

<enrichment_rules>
- Concept fields are filled deterministically from the included captures at promotion time. No fields are inferred by AI as part of the transaction itself.
- Optional pre-confirm extractor enrichment MAY populate `canonical_summary`, `core_concept`, `architectural_pattern`, `programming_paradigm` for the user to accept/edit; this MUST NOT block confirmation, MUST NOT auto-fill if the user starts editing, and MUST NOT mutate any capture.
- Subsequent captures linking to this concept (via Stage 2 cross-language match or future promotions) extend `language_or_runtime_json` and may extend `surface_features_json`. They MUST NOT overwrite existing concept fields.
</enrichment_rules>

### Field-by-field derivation rules

| Field | Source | Rule |
|---|---|---|
| `id` | generated | `newConceptId()` |
| `name` | user input | required; defaults to `proposedName` (most common `concept_hint.proposedName` across cluster, tie-break by highest extractionConfidence). MUST NOT include language suffix. |
| `normalized_key` | derived | lowercased, whitespace-collapsed `name`. Conflict-checked per Step 7. |
| `canonical_summary` | user input or extractor | optional. Default null. If extractor enrichment ran and user accepted, store result. |
| `concept_type` | user input | required; defaults to most common `concept_hint.proposedConceptType` (tie-break by highest avg confidence for that type). One of the 12 locked enum values. |
| `core_concept` | user input or extractor | optional. Default null. |
| `architectural_pattern` | user input or extractor | optional. Default null. |
| `programming_paradigm` | user input or extractor | optional. Default null. |
| `language_or_runtime_json` | cluster | union of `snippet_lang` across included captures (deduped, normalized via Stage 1 token rules). Empty array if all captures lack `snippet_lang`. |
| `surface_features_json` | cluster | union of cluster keywords NOT in `LANGUAGE_OR_RUNTIME_TOKENS`. Deduped. |
| `prerequisites_json` | constant | `[]` |
| `related_concepts_json` | constant | `[]` |
| `contrast_concepts_json` | constant | `[]` |
| `representative_capture_ids_json` | cluster | top 3 by Step 11. |
| `familiarity_score` | creation baseline | `0.3`. Initial baseline for newly-promoted concepts (the user has captured it; it is not zero knowledge). MUST NOT be inferred from cluster size. MUST NOT be raised by promotion beyond baseline. The link-existing path MUST NOT modify this field. |
| `importance_score` | creation baseline | `0.5`. Initial baseline for newly-promoted concepts. MUST NOT be inferred from cluster size. MUST NOT be raised by promotion beyond baseline. The link-existing path MUST NOT modify this field. |
| `created_at` | system | `Date.now()` |
| `updated_at` | system | `Date.now()` |

```ts
const buildConceptFromCluster = (
  input: PromotionConfirmInput,
  conceptId: ConceptId,
  now: number
): Concept => ({
  id: conceptId,
  name: input.name,
  normalizedKey: normalizeKey(input.name),
  canonicalSummary: input.canonicalSummary ?? null,
  conceptType: input.conceptType,
  coreConcept: input.coreConcept ?? null,
  architecturalPattern: input.architecturalPattern ?? null,
  programmingParadigm: input.programmingParadigm ?? null,
  languageOrRuntime: deriveLanguageOrRuntime(input.cluster),
  surfaceFeatures: deriveSurfaceFeatures(input.cluster),
  prerequisites: [],
  relatedConcepts: [],
  contrastConcepts: [],
  representativeCaptureIds: pickRepresentativeCaptureIds(input.cluster),
  familiarityScore: 0.3,
  importanceScore: 0.5,
  createdAt: now,
  updatedAt: now,
});
```

---

## Step 11 — `representative_capture_ids_json` Population

<representative_rules>
- Take the included captures of the cluster.
- Sort by `extraction_confidence DESC NULLS LAST`.
- Tie-breaker 1: `created_at DESC`.
- Tie-breaker 2: `id ASC` (deterministic).
- Take the top 3.
- Store the resulting array in `representative_capture_ids_json` exactly.
- The array MUST contain only `LearningCaptureId` values that exist in the captures table at transaction time.
- The array MUST be re-validated by `RepresentativeCaptureIdsCodec` before write.
- This list is initial-only at promotion time; later flows that grow `representative_capture_ids_json` are out of scope for Stage 5.
</representative_rules>

```ts
const pickRepresentativeCaptureIds = (
  cluster: ClusterForPromotion
): LearningCaptureId[] =>
  cluster.captures
    .slice()
    .sort((a, b) => {
      const ac = a.extractionConfidence ?? -1;
      const bc = b.extractionConfidence ?? -1;
      if (ac !== bc) return bc - ac;
      if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, 3)
    .map((c) => c.id);
```

---

## Step 12 — Single-Capture Promotion Path

<single_capture_promotion_rules>
- Entry points:
  - "Make this a concept" action on `CandidateCaptureCard` (only when `linkedConceptId === null` and `extractionConfidence >= 0.70`, per Stage 2).
  - "Make this a concept" / Link Concept action on `CaptureCardFull` when capture state is `unresolved` or `proposed_new`.
- From save modal: tapping the action saves the candidate first with `state = 'proposed_new'` (atomic Stage 2 save), THEN opens the Promotion Review screen prefilled with that one capture.
- From CaptureCardFull: opens the Promotion Review screen prefilled with that one capture; no save flow involved.
- The review screen, conflict detection, and transaction path are identical to the cluster path.
- The cluster size warning ("fewer than 2 included") MUST appear when the user is on the cluster-source path; on the single-capture path the warning is suppressed because intent is explicit.
- Single-capture promotion MUST NOT auto-promote the capture; the Confirm button is required.
- Single-capture promotion MUST NOT bypass Step 7 conflict detection.
</single_capture_promotion_rules>

---

## Step 13 — Dismiss & Reject Behavior

<dismissal_rules>
- Dismiss = soft. Insert (or upsert) a row in `promotion_dismissals` with `is_permanent = 0` and the current cluster's capture IDs snapshot.
- Reject = hard. Insert (or upsert) a row in `promotion_dismissals` with `is_permanent = 1`.
- Dismiss is the default user action on a suggestion card; reject is reachable only via overflow / long-press to prevent accidental permanent rejection.
- Dismissed clusters MUST NOT appear in suggestions until they resurface.
</dismissal_rules>

### Resurface rules

<resurface_rules>
- Soft dismissal resurfaces when the new cluster has the same proposed normalized_key but EITHER:
  - gained ≥ 2 captures vs. the dismissed snapshot, OR
  - lost ≥ 2 captures and gained ≥ 2 different captures (i.e., cluster composition shifted by ≥ 2 captures), OR
  - 30 days have passed since `dismissed_at`.
- A new cluster fingerprint is treated as "same proposed concept" only if `proposed_normalized_key` matches; otherwise it is a different cluster and the dismissal does not apply.
- Hard rejection (`is_permanent = 1`) NEVER resurfaces. A future cluster with a different fingerprint and different `proposed_normalized_key` is unaffected.
- The resurface check happens at recomputation time; the cluster job uses dismissal rows to filter the candidate set before writing the cache.
</resurface_rules>

### "Show dismissed suggestions" surface

<dismissed_surface_rules>
- The Hub MUST NOT show dismissed suggestions in the primary section.
- A dismissed-suggestions recovery surface SHOULD exist (Hub overflow / Settings entry), OR dismissal rows MUST be clearable from a diagnostics/settings affordance. Either path satisfies this stage; a polished recovery UI is not a Stage 5 blocker.
- Unhiding a soft dismissal removes the dismissal row; the cluster will reappear on the next recomputation if it still passes filters.
- Unhiding a permanent rejection requires explicit user confirmation ("Restore this rejected suggestion?"); on confirm, the row is removed.
</dismissed_surface_rules>

---

## Step 14 — Recomputation Triggers, Cache Invalidation, and Query Keys

<recompute_rules>
- After a successful capture save: `maybeRecomputeSuggestions('post_save')` (debounced 30s).
- After a successful promotion (create-new or link-existing): immediate cache row removal inside the transaction; recompute outside the transaction.
- After a dismissal or rejection: cache row removal in the same write; recompute on next Hub render or pull-to-refresh.
- After a capture deletion: invalidate any cache row whose `capture_ids_json` contains the deleted id; recompute on next trigger.
- After a capture's `embedding_status` flips to `ready`: schedule a debounced recompute (the new capture may now be eligible).
</recompute_rules>

### Query key factories

```ts
export const promotionKeys = {
  all: () => ['learning', 'promotion'] as const,
  suggestions: () => [...promotionKeys.all(), 'suggestions'] as const,
  suggestionByFingerprint: (fp: string) =>
    [...promotionKeys.suggestions(), fp] as const,
  dismissed: () => [...promotionKeys.all(), 'dismissed'] as const,
};
```

### Hooks

- `usePromotionSuggestions({ limit })` — reads `promotion_suggestions_cache`, applies dismissal filter, returns ordered list.
- `usePromotionSuggestion(fingerprint)` — single suggestion + materialized cluster captures for review screen.
- `useDismissedSuggestions()` — reads `promotion_dismissals` for the dismissed surface.
- `usePromoteConcept()` — mutation; on success invalidates `promotionKeys.suggestions()`, `conceptKeys.list()`, `captureKeys.recent()`.
- `useLinkClusterToExisting()` — mutation; same invalidations as above plus `conceptKeys.byId(targetId)`.
- `useDismissCluster()` / `useRejectCluster()` / `useRestoreDismissal()` — mutations on `promotion_dismissals`.

<query_rules>
- TanStack query key factories only. No hardcoded arrays anywhere in the promotion module.
- All hooks read through feature-owned repositories. No direct DB calls from route components.
- Cache invalidation MUST cover Hub-level queries that depend on capture state (Recent Captures shows linked-concept badges; Concept List shows new concept).
</query_rules>

---

## Anti-Regression Rules

<anti_regression_rules>
- Promotion MUST NOT become a notification system.
- Promotion MUST NOT become a quiz, due-list, or pressure system.
- Promotion MUST NOT auto-create concepts under any condition, including "high confidence" thresholds.
- Promotion MUST NOT auto-merge concepts even when names are similar; conflict surfaces a user choice instead.
- Promotion MUST set `familiarity_score` to 0.3 and `importance_score` to 0.5 ONLY at concept-creation time as a starting baseline. Promotion MUST NOT raise these values above baseline. The link-existing path MUST NOT modify either field. Future increases occur only through explicit review/revisit flows.
- Promotion MUST NOT delete captures on dismissal or rejection.
- Promotion MUST NOT reuse `CaptureCardFull` as the primary suggestion list element.
- Promotion MUST NOT introduce variant props on `PromotionSuggestionCard` or capture/concept cards.
- Promotion MUST NOT bypass Stage 1 schema constraints (e.g., language suffix in concept names is forbidden).
- Promotion MUST NOT block on AI enrichment; enrichment is a non-blocking pre-fill.
</anti_regression_rules>

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Cluster job throws | Log loudly. Cache is NOT cleared. Existing cache rows remain visible. Retry on next trigger. |
| Embedding store unavailable during clustering | Job aborts; existing cache rows remain. Retry on next trigger. |
| User confirms with empty included captures | Confirm button disabled; reachable only by direct invocation, which throws `EmptyPromotionError`. |
| Normalized_key conflict at confirm time | Show conflict dialog; allow link-existing or rename. Never auto-rename. |
| Race: another transaction inserts the same normalized_key | Transaction rolls back. Show conflict dialog post-hoc. |
| Race: included capture deleted between review and confirm | Transaction skips deleted capture; if no captures remain, transaction rolls back and surfaces "Captures changed; please review again." |
| Race: included capture linked elsewhere between review and confirm | Transaction skips already-linked capture; user is shown a "Some captures were already linked elsewhere" notice with the actual final list. |
| DB write fails during transaction | Rollback. No concept inserted. No captures updated. Embedding NOT enqueued. Surface error. |
| Concept embedding fails after transaction commits | Concept stays valid. Embedding pipeline retries per Stage 1 rules. Promotion is considered successful. |
| Dismissal write fails | Surface non-blocking error toast. Cluster remains in cache; user may retry. |
| `maybeRecomputeSuggestions` runs concurrently | Second call is coalesced; only one job executes per cooldown window. |

---

## Architecture Contract Checks

| Constraint | How Stage 5 satisfies it |
|---|---|
| Feature co-location | All Stage 5 code under `src/features/learning/promotion/`. Barrel exports per architecture contract. |
| Drizzle transactions | Concept creation and link-existing flows are atomic; cache row removal is inside the transaction. |
| Embedding outside transaction | Both `promoteToConcept` and `linkCapturesToExistingConcept` enqueue embeddings post-commit. |
| Strict TS + branded IDs | `LearningCaptureId`, `ConceptId` throughout. No raw strings cross the service boundary. |
| Zod at JSON boundaries | `ClusterCaptureIdsCodec`, `SharedKeywordsCodec` validate on every read of cache and dismissals. |
| Loud failures | Cluster job logs and exits on error; transaction rolls back on conflict; no silent fake success. |
| TanStack query keys | `promotionKeys` factory only; no hardcoded arrays. |
| No silent reroute | Conflict surfaces a user choice; auto-merge is forbidden. |
| Thin route screens | Review screen calls hooks/services; no business logic in route files. |
| Capture immutability | rawSnippet is never read or written by the promotion pipeline beyond display in `CaptureCardCompact` rows; concept_hint_json is preserved as-is. |
| Async embedding contract | Captures with `embedding_status != 'ready'` are excluded from clustering input but never deleted, hidden, or re-saved. |

---

## Deliverables

1. `src/features/learning/promotion/data/schema.ts`
   - `promotion_suggestions_cache` table
   - `promotion_dismissals` table
2. `src/features/learning/promotion/data/migrations/NNNN_promotion_system.sql`
3. `src/features/learning/promotion/data/suggestionsCacheRepo.ts`
4. `src/features/learning/promotion/data/dismissalsRepo.ts`
5. `src/features/learning/promotion/data/queryKeys.ts` (`promotionKeys`)
6. `src/features/learning/promotion/codecs/cluster.ts`
   - `ClusterCaptureIdsCodec`, `SharedKeywordsCodec`, mappers
7. `src/features/learning/promotion/clustering/computeClusters.ts`
   - eligibility, similarity graph, components, filters
8. `src/features/learning/promotion/clustering/fingerprint.ts`
9. `src/features/learning/promotion/clustering/clusterJob.ts`
   - cooldown, debounce, queue
10. `src/features/learning/promotion/services/maybeRecomputeSuggestions.ts`
11. `src/features/learning/promotion/services/promoteToConcept.ts`
12. `src/features/learning/promotion/services/linkCapturesToExistingConcept.ts`
13. `src/features/learning/promotion/services/buildConceptFromCluster.ts`
14. `src/features/learning/promotion/services/representativeCaptureIds.ts`
15. `src/features/learning/promotion/hooks/usePromotionSuggestions.ts`
16. `src/features/learning/promotion/hooks/usePromotionSuggestion.ts`
17. `src/features/learning/promotion/hooks/useDismissedSuggestions.ts`
18. `src/features/learning/promotion/hooks/usePromoteConcept.ts`
19. `src/features/learning/promotion/hooks/useLinkClusterToExisting.ts`
20. `src/features/learning/promotion/hooks/useDismissCluster.ts`
21. `src/features/learning/promotion/hooks/useRejectCluster.ts`
22. `src/features/learning/promotion/hooks/useRestoreDismissal.ts`
23. `src/features/learning/promotion/ui/PromotionSuggestionsSection.tsx`
24. `src/features/learning/promotion/ui/PromotionSuggestionCard.tsx`
25. `src/features/learning/promotion/ui/PromotionReviewScreen.tsx`
26. `src/features/learning/promotion/ui/NormalizedKeyConflictDialog.tsx`
27. `src/features/learning/promotion/ui/DismissedSuggestionsScreen.tsx`
28. `src/features/learning/promotion/types/promotion.ts`
    - `ClusterCandidate`, `PromotionConfirmInput`, `LinkExistingInput`, errors
29. Update `LearningHubScreen.tsx` to render `PromotionSuggestionsSection` between Recent Captures and Concept List.
30. Tests:
    - eligibility filters out linked, pending-embedding, failed-embedding captures
    - clustering requires size ≥ 3, sessions ≥ 2, ≥ 1 shared keyword, mean similarity ≥ 0.75
    - oversized cluster (>12) is split correctly
    - capture in two components is assigned by mean similarity
    - fingerprint is deterministic across recomputations with the same captures
    - cooldown prevents recomputation under 15 minutes
    - pull-to-refresh forces recomputation
    - post_promote forces immediate recomputation
    - suggestion ordering: cluster_score DESC, capture_count DESC, max created_at DESC, fingerprint ASC
    - suggestion section is hidden when cache is empty
    - review confirm requires ≥ 1 included capture
    - normalized_key conflict surfaces dialog and does not insert
    - link-existing path appends languages and surface features without overwriting
    - promotion sets familiarity_score = 0.3 and importance_score = 0.5 on concept creation; link-existing path does not modify either
    - representative_capture_ids picks top 3 by extraction_confidence DESC, then created_at DESC, then id ASC
    - dismissal hides cluster until growth ≥ 2 captures, composition shift ≥ 2, or 30 days pass
    - rejection is permanent and unaffected by capture growth
    - embedding failure does not roll back concept insert
    - capture deleted mid-flow rolls back if no captures remain
    - capture linked elsewhere mid-flow surfaces partial-link notice
    - single-capture promotion bypasses cluster size warning but enforces conflict detection
    - rawSnippet is never modified by promotion code paths
    - concept_hint_json on captures is preserved across promotion
    - advanced fields (canonical_summary, core_concept, architectural_pattern, programming_paradigm) are collapsed by default
    - Confirm is enabled with only the primary fields filled (advanced fields untouched)
    - new concept is inserted with familiarity_score = 0.3 and importance_score = 0.5
    - link-existing path leaves familiarity_score and importance_score on the target concept unchanged

---

## Acceptance Criteria

<acceptance_criteria>
- A new concept is created ONLY through the Promotion Review screen, after explicit user confirmation.
- Suggestions appear ONLY in the Hub Promotion Suggestions section.
- Suggestions are NEVER pushed as OS notifications, banners, or modals.
- Clusters require ≥ 3 eligible captures, ≥ 2 distinct sessions, ≥ 1 shared keyword, and mean similarity ≥ 0.75.
- Captures with `embedding_status != 'ready'` are excluded from clustering and never modified by the promotion pipeline.
- Linked captures are excluded from clustering.
- Suggestion ordering follows cluster_score DESC → capture_count DESC → max created_at DESC → fingerprint ASC.
- Promotion confirmation runs an atomic transaction: concept insert + capture relinks + cache row removal.
- Embedding for the new concept is enqueued OUTSIDE the transaction.
- normalized_key conflicts surface a user choice; auto-merge is impossible.
- Link-to-existing path appends to `language_or_runtime_json` and `surface_features_json` without overwriting other fields.
- `representative_capture_ids_json` is populated to the top 3 captures using the locked ordering rule.
- Dismiss is reversible by cluster growth, composition shift, or 30-day timeout; reject is permanent for that fingerprint.
- Single-capture promotion uses the same review screen and the same transaction path.
- Promotion sets `familiarity_score` to 0.3 and `importance_score` to 0.5 on concept creation; the link-existing path never modifies either field. Promotion never modifies capture `rawSnippet`, capture `whatClicked`, capture `whyItMattered`, or capture `concept_hint_json`.
- The Hub Promotion Suggestions section is hidden when no eligible suggestions exist; no empty-state placeholder is rendered.
- The promotion module ships under `src/features/learning/promotion/` with feature-owned types, codecs, repos, hooks, and UI.
- No card component in the promotion UI accepts `variant`, `density`, `mode`, `isCompact`, or `isFull`.
- All TanStack queries use `promotionKeys` factories.
- All JSON columns introduced by Stage 5 round-trip through Zod codecs.
</acceptance_criteria>

---

## Open Questions

🟢 Trigger model = Hub-open + cooldown (15 min) + force triggers — LOCKED.
🟢 Cluster filters = size ≥ 3, sessions ≥ 2, ≥ 1 shared keyword, mean similarity ≥ 0.75 — LOCKED.
🟢 Fingerprint = SHA-256 over sorted included capture IDs — LOCKED.
🟢 Single-capture promotion path = same review screen, same transaction — LOCKED.
🟢 Dismissal lifecycle = soft (resurface on growth/composition/30d) vs hard (permanent) — LOCKED.
🟢 representative_capture_ids ordering = extraction_confidence DESC, created_at DESC, id ASC, top 3 — LOCKED.
🟡 cluster_score formula coefficients — placeholder; relock after Stage 5 produces real signal.
🟡 Pre-confirm extractor enrichment for canonical_summary / core_concept / paradigm — non-blocking implementation polish, not a spec blocker.
🟡 "Show dismissed suggestions" surface placement (Hub overflow vs Settings) — UX polish, not a spec blocker.
🟡 Maximum cluster size cap (currently 12) — placeholder; revisit after real usage data.
