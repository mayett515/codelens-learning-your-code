# Stage 7 — Dot Connector & Review Mode

> Builds on Stage 1 schemas, Stage 2 save flow, Stage 3 cards, Stage 4 Hub, Stage 5 promotion, Stage 6 retrieval engine.
> Defines the chat memory injection UX (Dot Connector) and the explicit review/revisit flow (Review Mode).
> Codex-implementable. Stage 7 is the FIRST stage that updates `familiarity_score`; the rules are locked here.

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
8. `STAGE_5_PROMOTION_SYSTEM.md`
9. `STAGE_6_RETRIEVAL.md`
10. This file

If there is a conflict:
- Regression Guard wins for product safety (especially "CodeLens is NOT Anki").
- Stage 1 wins for schema/source-of-truth fields and the familiarity-update lifecycle invariants.
- Stage 6 wins for retrieval engine semantics and the `RetrieveResult` contract.
- This file wins for chat injection UX, Review Mode internals, and the locked familiarity-update rules.

---

## Scope

### In scope

- Dot Connector chat composer indicator ("N memories loaded")
- Typing-time retrieval, debouncing, cancellation
- Per-turn inject toggle
- Memory preview sheet
- Final retrieval + injection at send time
- Diagnostics surfacing (partial/unavailable)
- Review Mode entry from `ConceptCardFull`
- Review Threshold surface (passive list of concepts that may need review)
- Single-concept Review Session flow (reflect → reveal → self-rate)
- Self-rating → `familiarity_score` update with locked deltas
- `review_events` audit log table and codecs
- Settings: `enableDotConnector`, `injectionMode`, `weakConceptThreshold`, `enableReviewMode`
- TanStack hooks, query keys, mutations, cache invalidation
- Tests, acceptance criteria, error handling

### Out of scope

- Personas / Gems / system prompt composition (Stage 8)
- Cancel button / line-level mini chat / bookmarks (Stage 8)
- Native graph rewrite (Stage 9)
- Importance score updates (deferred per Master Plan Decision 4)
- Cross-device sync of review history
- LLM grading of recall (forbidden — see hard constraints)

---

## Core Purpose

<stage_7_purpose>
Stage 7 turns the user's saved knowledge into context that helps them code, and provides a single explicit place to refresh that knowledge.

It must preserve the product truth:

- Capture = moment of understanding. Evidence.
- Concept = pattern across captures. Organization.
- Review = explicit revisit, not testing.
- Memory injection = passive context, not a quiz.

Dot Connector quietly assists during chat. Review Mode is opt-in and user-paced. Neither system pressures the user. Familiarity updates only when the user explicitly self-rates a review session.
</stage_7_purpose>

---

## Hard Constraints

<negative_constraints>
- DO NOT introduce flashcards.
- DO NOT introduce streaks, daily goals, or "missed reviews" counters.
- DO NOT introduce a "due queue" of any kind.
- DO NOT auto-grade recall with an LLM or any heuristic; the user self-rates.
- DO NOT push notifications about reviews, suggestions, or weak concepts.
- DO NOT inject memory into a chat without an explicit token budget (default 1500 from Stage 6).
- DO NOT inject memory when `enableDotConnector === false`.
- DO NOT inject memory when the per-turn toggle is off.
- DO NOT auto-promote captures based on retrieval, injection, or review activity.
- DO NOT mutate capture `rawSnippet`, `whatClicked`, `whyItMattered`, or `concept_hint_json` in any Stage 7 flow.
- DO NOT update `importance_score` in Stage 7.
- DO NOT update `familiarity_score` outside of an explicit user self-rating event.
- DO NOT show numeric `familiarity_score`, `importance_score`, `extraction_confidence`, or retrieval `score` to the user as raw numbers; primitives like `StrengthIndicator` already handle the visual representation.
- DO NOT block chat send on retrieval; if retrieval fails, send the message without injection.
- DO NOT silently mask retrieval `diagnostics.status !== 'ok'`; the user MUST be able to see degradation.
- DO NOT include language-suffixed concept names anywhere in the injection format or review surfaces.
</negative_constraints>

<required_behavior>
- Memory injection MUST be additive: a chat send always works; injection is best-effort context.
- "N memories loaded" indicator MUST reflect what would be injected at send time given current settings and toggle state.
- Review Mode MUST require explicit user entry and explicit user self-rating.
- Familiarity updates MUST be deterministic given the rating and current score.
- Every familiarity update MUST be accompanied by a `review_events` row in the same transaction.
- Self-rating UI MUST present neutral framings ("I got it", "Partial", "Need to revisit", "Skip"), never "correct/wrong".
- The Weak Concepts surface MUST be opt-in browsing, never a pushed list.
- All Stage 7 surfaces MUST honor the Regression Guard UI language rules.
</required_behavior>

<forbidden_patterns>
- "X concepts due today" or "Review streak: N days".
- Notification on weak concept reaching threshold.
- Modal popup recommending review on app open.
- Any "score" or "%" shown to the user as a number on review surfaces.
- LLM evaluating the user's recall and assigning a rating.
- Familiarity update on save, on chat send, on retrieval, on injection, on promotion (Stage 5 sets baseline, never updates).
- Cards with `variant`, `density`, or `mode` props (carry forward Stage 3 prohibition).
</forbidden_patterns>

---

## End-to-End Flow

### Chat memory injection

```
chat composer mounts
  → user starts typing
  → debounced (450ms) typing → call retrieveRelevantMemories({ query: textSoFar, limit: injectionLimit, filters: defaultFilters })
  → result { memories, diagnostics } populates DotConnectorIndicator
  → indicator shows "N memories" or "0 memories" or "search degraded"
  → user may tap indicator to open MemoryPreviewSheet (read-only preview of items that would inject)
  → user may toggle off injection for this turn (per-turn toggle)
  → user taps Send
      → if last retrieval result is fresher than freshnessWindow (5s) AND query unchanged → reuse
      → else → run retrieval once more synchronously (with timeout 1500ms; fallback: send without injection)
      → format memories via formatMemoriesForInjection (Stage 6)
      → prepend formatted block to outbound prompt as a system-style memory section
      → send to LLM
  → LLM responds; UI may render referenced memory IDs as CaptureChips/links
```

### Review Mode

```
user opens "Start Review" on ConceptCardFull (entry A)
  OR user opens Review Mode from Hub overflow / Settings entry (entry B)
    → if entry B: ReviewThresholdScreen renders Weak Concepts list
    → user taps a concept → ReviewSessionScreen opens
  → ReviewSessionScreen prompts: "What still makes sense to you about [name]?"
  → user types free-text reflection (optional; can submit empty)
  → user can tap "Show what I had saved" at any point to reveal linked captures + canonical_summary
  → user submits → SelfRatingPrompt appears with 4 options (I got it / Partial / Need to revisit / Skip)
  → user taps a rating
      → if Skip: no event written, no familiarity change, navigate back
      → else: applyReviewRating runs in a transaction:
          read current familiarity_score (familiarityBefore)
          compute familiarityAfter = clamp(familiarityBefore + delta, 0, 1)
          UPDATE concepts SET familiarity_score = familiarityAfter, updated_at = now WHERE id = ?
          INSERT INTO review_events (...)
        → on success: invalidate Hub queries (concept list, knowledge health), Stage 6 retrieval keys
  → result screen shows linked captures (CaptureCardCompact), concept summary, and continuation actions:
      - Done → close
      - Continue in chat → open chat seeded with concept context (Stage 8 surface)
      - Open this concept → ConceptCardFull
```

---

## Step 1 — Dot Connector Indicator

### Purpose

Show the user, in real time, how much of their saved knowledge will accompany their next chat message.

### Primary user action

Tap to preview / toggle injection for this turn.

### Component

`DotConnectorIndicator` — a Stage-7-owned compact component placed adjacent to the send button in the chat composer. It is NOT a card; it does not violate Stage 3 card rules.

```ts
interface DotConnectorIndicatorProps {
  status: 'idle' | 'loading' | 'ok' | 'partial' | 'unavailable' | 'disabled';
  count: number;
  maxItems: number;
  onTapPreview: () => void;
  onTogglePerTurn: (next: boolean) => void;
  perTurnEnabled: boolean;
}
```

### Visual states

<indicator_states>
- `idle` — no query yet (composer empty). Show: "0 memories" muted.
- `loading` — debounced retrieval in flight. Show: subtle spinner glyph + last-known count.
- `ok` — retrieval `status === 'ok'`. Show: "{count} memories loaded".
- `partial` — retrieval `status === 'partial'`. Show: "{count} memories loaded" + small warning glyph; tooltip surfaces `partialReason`.
- `unavailable` — retrieval threw or both backends down. Show: "Retrieval unavailable" muted, tappable to retry.
- `disabled` — `enableDotConnector === false` OR per-turn toggle off. Show: "Memories off" muted with restore action.
</indicator_states>

### Behavior rules

<indicator_behavior_rules>
- Indicator MUST show counts that reflect the post-budget injection list, not the pre-budget retrieval list. Items dropped by `tokenBudget` or `maxItems` are NOT counted.
- Indicator MUST update on every successful retrieval result; stale counts MUST NOT persist beyond the next retrieval result.
- Tap → open `MemoryPreviewSheet`.
- Long-press / overflow → toggle per-turn injection off/on without leaving composer.
- Indicator MUST NOT obscure the send button or compose input on any supported screen size.
- Indicator MUST respect `prefers-reduced-motion`; no unsolicited animations.
- Indicator state MUST never block typing or send.
</indicator_behavior_rules>

---

## Step 2 — Memory Preview Sheet

### Purpose

Let the user see exactly which memories will be injected before sending.

### Primary user action

Confirm or remove individual memories from this turn's injection.

### Component

`MemoryPreviewSheet` — a Stage-7-owned bottom sheet (or modal on tablet/desktop layouts).

### Required content

<preview_content_rules>
- Header: "Memories for this turn — {count} of {maxItems}".
- Each memory rendered as `CaptureChip` (capture) or `ConceptCardCompact` (concept). NEVER `CaptureCardFull` (Hub/full-detail rule).
- Per-memory action: remove from this turn's injection (does NOT delete the underlying capture or concept).
- Footer: "Inject {count} • {tokensApprox} tokens" + primary action "Use these" + secondary "Don't inject this turn".
- If `diagnostics.status === 'partial'`, show a single, concise notice at the top with `partialReason`.
</preview_content_rules>

### Forbidden content

<preview_forbidden>
- rawSnippet text rendered inline beyond a 1-line excerpt (snippet stays in `CaptureCardFull` per Hub rules).
- Numeric retrieval scores.
- Numeric familiarity / importance / extraction_confidence.
- Editing capture content.
- Auto-promote, auto-link, or any concept mutation actions.
</preview_forbidden>

### Ordering of preview rows

<preview_ordering>
- Sort by `RetrievedMemory.score DESC`.
- Tie-breaker 1: kind (concept before capture, mirroring Stage 6 Step 6).
- Tie-breaker 2: `id ASC`.
</preview_ordering>

### Visibility

<preview_visibility>
- Reachable only by tapping the `DotConnectorIndicator`.
- Closed by swipe down, backdrop tap, or "Use these" / "Don't inject this turn".
- Closing without action MUST NOT mutate any state.
- The sheet MUST NOT auto-open on retrieval; it is opt-in.
</preview_visibility>

---

## Step 3 — Per-Turn Inject Toggle

<per_turn_toggle_rules>
- Default state per chat turn: ON when `enableDotConnector === true`, OFF when disabled.
- Toggle is reset to default at the start of every new turn (i.e., after a successful send or compose clear).
- Toggling OFF for the current turn:
  - Indicator transitions to `disabled` visual state.
  - Send proceeds without injection.
  - Per-turn toggle OFF MUST NOT change global `enableDotConnector`.
- Toggling ON during a turn re-runs typing-time retrieval if there is text in the composer; otherwise the indicator stays at `idle`.
- The toggle state MUST be observable by the send pipeline so it can short-circuit injection.
</per_turn_toggle_rules>

---

## Step 4 — Retrieval & Injection Pipeline (Chat Side)

### Typing-time retrieval

<typing_retrieval_rules>
- Debounce: 450ms after last keystroke.
- Cancel in-flight retrieval if a newer keystroke fires before the previous result resolves.
- Minimum query length: 3 trimmed characters; below this, indicator stays `idle` and no retrieval runs.
- Retrieval calls MUST pass `enableJitRehydration: true` and `bumpLastAccessed: false` (typing-time should not bump access timestamps; that's reserved for send).
- Retrieval `limit` is derived from `injectionMode`:
  - `'conservative'` → limit 3, `tokenBudget` 800
  - `'standard'` → limit 5, `tokenBudget` 1500
  - `'aggressive'` → limit 8, `tokenBudget` 2000
- Filter set defaults to `kinds = ['capture', 'concept']`, no state/session/language restrictions; the user may add filters via Stage 8 chat-mode UI.
</typing_retrieval_rules>

### Send-time retrieval

<send_retrieval_rules>
- If a typing-time `RetrieveResult` is fresher than `5_000 ms` AND the query string is byte-identical → reuse it.
- Else → run retrieval synchronously with timeout `1_500 ms`. On timeout: send the message without injection; indicator briefly flashes `unavailable` for ≤ 2s.
- Send-time retrieval MUST pass `bumpLastAccessed: true`.
- Format memories with `formatMemoriesForInjection` from Stage 6; injection block is prepended to the outbound prompt as a system-style memory section.
- The injection block delimiter is stable and parseable so the server (or local LLM adapter) can recognize it; UI MUST NOT render the raw delimiter to the user.
- If the per-turn toggle is OFF or `enableDotConnector === false`: skip retrieval entirely; send the message verbatim.
</send_retrieval_rules>

### Diagnostics surfacing

<diagnostics_surface_rules>
- `diagnostics.status === 'partial'` MUST update the indicator visual to `partial` with a tooltip carrying `partialReason`.
- `diagnostics.status === 'unavailable'` (or thrown `RetrievalUnavailableError`) MUST set indicator to `unavailable` and disable the preview tap.
- A persistent partial state across the last 3 retrieval calls MUST surface a one-time toast suggesting the user open Diagnostics (if a diagnostics surface exists in the app); never suggest "rebuild your data" or any destructive action.
- Diagnostics MUST NOT be shown as raw JSON in user-facing UI.
</diagnostics_surface_rules>

---

## Step 5 — Review Mode Entry Points

<review_entry_rules>
- Entry A: "Start Review" action on `ConceptCardFull` (per Stage 3 actions). Opens `ReviewSessionScreen` directly with that concept.
- Entry B: Hub overflow → "Review Mode" → `ReviewThresholdScreen`. User picks a concept from the Weak Concepts list.
- Entry C: Settings → "Review Mode" toggle/section MAY include a shortcut to entry B.
- There MUST NOT be a fourth entry that surfaces unsolicited (no homepage banner, no notification).
- Entries A and B MUST be reachable in two taps or fewer from their respective parent surfaces.
</review_entry_rules>

---

## Step 6 — Review Threshold Surface (Weak Concepts)

### Purpose

Let the user browse concepts that may need a refresh, in their own time.

### Primary user action

Pick a concept to review.

### Component

`ReviewThresholdScreen` containing a list of `ConceptCardCompact` rows.

### Ordering

<weak_concepts_ordering>
- Filter: `computeStrength(familiarity_score, importance_score) < weakConceptThreshold`.
- Default sort: `computeStrength ASC` (weakest first).
- Tie-breaker 1: `last_accessed_at ASC NULLS FIRST` (least-recently-accessed first; never-accessed surfaces first).
- Tie-breaker 2: `updated_at ASC`.
- Tie-breaker 3: `name ASC`.
</weak_concepts_ordering>

### Grouping

<weak_concepts_grouping>
- No grouping by default.
- Filtering by `concept_type` is allowed.
- Do NOT group by "due today" / "due this week".
</weak_concepts_grouping>

### Visibility

<weak_concepts_visibility>
- Surface visible only when the user explicitly enters Review Mode.
- If the filtered list is empty, show a short message: "No concepts under your refresh threshold." Do NOT push the user to lower the threshold; threshold is a setting, not a goal.
- The list MUST cap at 50 entries by default (with "See all" affordance) to keep it scannable.
- The list MUST NOT auto-refresh during display; pull-to-refresh re-queries.
</weak_concepts_visibility>

### Settings

<threshold_setting_rules>
- `weakConceptThreshold` is a user setting in `[0.0, 1.0]`. Default `0.4`.
- Lowering the threshold reduces the number of concepts surfaced; raising it increases.
- Threshold change MUST be applied to the next render of the surface; no destructive side effects.
- The setting copy MUST be neutral ("Show concepts with strength below"), never "Set difficulty" or "Set goal".
</threshold_setting_rules>

### Forbidden

<weak_concepts_forbidden>
- No "due" language.
- No streak counter.
- No daily target.
- No "X concepts to review" badge on the Hub or app icon.
- No automatic enrolment on app open.
</weak_concepts_forbidden>

---

## Step 7 — Single-Concept Review Session

### Purpose

Provide one explicit, user-paced revisit of a single concept. The user reflects, optionally peeks at evidence, and self-rates. This is reflection, not testing — framing in copy and behavior MUST stay on the "revisit" side of the line.

### Primary user action

Submit reflection and pick a self-rating.

### Component

`ReviewSessionScreen`.

### Layout

<review_session_layout>
- Header: concept name + `ConceptTypeChip`.
- Body section A: prompt — "What still makes sense to you about [name]?"
- Body section B: free-text reflection input. Multi-line. Empty submission allowed. Placeholder copy is neutral (e.g., "Jot down what you remember, in your own words — or skip and just peek at what you saved.").
- Body section C: secondary affordance "Show what I had saved" (collapsed by default). Expanding reveals:
  - `canonical_summary` (if present)
  - linked captures rendered as `CaptureCardCompact`, ordered by `created_at DESC` with `id ASC` tie-breaker, capped at 10
- Footer: primary action "Submit" → moves to `SelfRatingPrompt`.
</review_session_layout>

### Behavior

<review_session_behavior>
- Reveal toggle does NOT count against rating; the user is free to peek before, during, or after reflection.
- Submitting MUST NOT auto-grade the reflection text against the captures.
- The reflection text MAY be persisted on the `review_events` row (`user_recall_text`), capped at 2000 chars, ONLY when the user has opted in via `recordRecallText: true`. Default is OFF.
- Closing the screen before rating MUST NOT mutate any concept state.
- If the user closes after reflection but before rating, no `review_events` row is written.
- Copy in this surface MUST NOT use exam-shaped language ("test", "quiz", "score", "right/wrong", "correct/incorrect"). Reflection / revisit framing only.
</review_session_behavior>

---

## Step 8 — Self-Rating & Familiarity Update

### Self-rating options

<rating_options>
- "I got it" — user reports the concept still makes sense to them.
- "Partial" — user reports the concept makes partial sense.
- "Need to revisit" — user reports the concept feels vague or unclear.
- "Skip" — user declines to rate (no event written, no update).
</rating_options>

### Familiarity update mapping (LOCKED)

<familiarity_update_rules>
- `'strong'` ("I got it") → `delta = +0.10`
- `'partial'` ("Partial") → `delta = +0.05`
- `'weak'` ("Need to revisit") → `delta = -0.05`
- `'skip'` → no event written, no `familiarity_score` change
- New value: `clamp(currentFamiliarity + delta, 0, 1)`
- `importance_score` MUST NOT change in Stage 7.
- `updated_at` on the concept row MUST be set to `now` only when a non-skip rating runs.
- Mappings are LOCKED. Any future tuning is a Stage 7 patch with explicit migration of the audit log interpretation; coefficients here are stable references.
</familiarity_update_rules>

### Transaction shape

```ts
export const applyReviewRating = async (input: ApplyReviewRatingInput): Promise<void> => {
  if (input.rating === 'skip') return;

  const delta = REVIEW_RATING_DELTAS[input.rating]; // strong:0.10, partial:0.05, weak:-0.05
  const now = Date.now();

  await db.transaction(async (tx) => {
    const concept = await conceptRepo.requireById(tx, input.conceptId);
    const familiarityBefore = concept.familiarityScore;
    const familiarityAfter = Math.max(0, Math.min(1, familiarityBefore + delta));

    await conceptRepo.updateFamiliarity(tx, input.conceptId, familiarityAfter, now);

    await reviewEventsRepo.insert(tx, {
      id: newReviewEventId(),
      conceptId: input.conceptId,
      rating: input.rating,
      delta,
      familiarityBefore,
      familiarityAfter,
      userRecallText: input.recordRecallText ? truncate(input.recallText, 2000) : null,
      createdAt: now,
    });
  });
};
```

<rating_transaction_rules>
- The familiarity update and the audit log insert MUST be in the same transaction.
- A failed audit log insert MUST roll back the familiarity update.
- The transaction MUST be the ONLY path that writes to `concepts.familiarity_score` in Stage 7.
- Promotion (Stage 5) sets baselines; Stage 7 is the only stage that changes the score thereafter.
- Other stages MUST NOT call this transaction; they MUST NOT bypass it.
</rating_transaction_rules>

---

## Step 9 — review_events Audit Log

### Schema

```sql
CREATE TABLE review_events (
  id                  TEXT PRIMARY KEY,
  concept_id          TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  rating              TEXT NOT NULL CHECK (rating IN ('strong', 'partial', 'weak')),
  delta               REAL NOT NULL,
  familiarity_before  REAL NOT NULL,
  familiarity_after   REAL NOT NULL,
  user_recall_text    TEXT,
  created_at          INTEGER NOT NULL
);

CREATE INDEX idx_review_events_concept ON review_events(concept_id);
CREATE INDEX idx_review_events_created ON review_events(created_at DESC);
```

### Branded ID

```ts
export type ReviewEventId = string & { readonly __brand: 'ReviewEventId' };
export const newReviewEventId = (): ReviewEventId => makeId<ReviewEventId>('rev');
export const isReviewEventId = (v: unknown): v is ReviewEventId =>
  typeof v === 'string' && v.startsWith('rev_');
```

### Codecs

```ts
export const ReviewRatingCodec = z.enum(['strong', 'partial', 'weak']);
export const ReviewEventRowCodec = z.object({
  id: z.string().refine(isReviewEventId),
  conceptId: z.string().refine(isConceptId),
  rating: ReviewRatingCodec,
  delta: z.number(),
  familiarityBefore: z.number().min(0).max(1),
  familiarityAfter: z.number().min(0).max(1),
  userRecallText: z.string().max(2000).nullable(),
  createdAt: z.number().int().positive(),
});
```

<audit_log_rules>
- Audit rows are append-only. Updates to existing rows are forbidden.
- Cascading delete on concept removal is acceptable (history follows the concept). The user may export audit data via diagnostics if they want to retain it.
- Every non-skip rating MUST produce exactly one row.
- Skip ratings MUST NOT produce rows.
- Audit rows MUST round-trip through `ReviewEventRowCodec`; loud failure on parse.
- The audit log is NOT a leaderboard or streak source. It is a history record only.
</audit_log_rules>

---

## Step 10 — Settings & User Preferences

<settings_keys>
- `enableDotConnector: boolean` — default `true`. Master switch for chat memory injection.
- `injectionMode: 'conservative' | 'standard' | 'aggressive'` — default `'standard'`.
- `weakConceptThreshold: number` — default `0.4`. Used by `ReviewThresholdScreen`.
- `enableReviewMode: boolean` — default `true`. Hides Review Mode entries when disabled.
- `recordRecallText: boolean` — default `false`. Whether to persist the user's reflection text on `review_events`. Off by default for privacy: reflection input may contain personal notes; users opt in explicitly. Setting copy MUST be clear (e.g., "Save my reflection notes with each review (off by default)").
- `dotConnectorPerTurnDefault: 'on' | 'off'` — default `'on'`. Per-turn toggle initial state.
</settings_keys>

<settings_storage_rules>
- Settings live in the existing app settings store (do NOT introduce a new persistence layer).
- Settings changes apply immediately; they MUST NOT trigger destructive side effects.
- Settings reads MUST be inexpensive; cached in memory with invalidation on write.
- Settings MUST be observable by hooks so the indicator and Review surfaces re-render on change.
</settings_storage_rules>

---

## Anti-Regression Rules

<anti_regression_rules>
- Stage 7 MUST NOT introduce flashcards, streaks, due queues, daily goals, or quiz-first review surfaces (Regression Guard `<review_rules>`).
- Stage 7 MUST NOT auto-grade the user's recall.
- Stage 7 MUST NOT push reviews via OS notifications, banners, or modals.
- Stage 7 MUST NOT update `familiarity_score` outside `applyReviewRating`.
- Stage 7 MUST NOT update `importance_score` (deferred per Master Plan Decision 4).
- Stage 7 MUST NOT mutate capture content fields anywhere.
- Stage 7 MUST NOT hide retrieval degradation; `diagnostics.status !== 'ok'` is always surfaced visually.
- Stage 7 MUST NOT reuse `CaptureCardFull` inside `MemoryPreviewSheet` (preview surface is scanning, not deep reading).
- Stage 7 MUST NOT introduce `variant`, `density`, `mode`, `isCompact`, or `isFull` props on any new component.
- Stage 7 MUST NOT inject memory blocks larger than the configured `tokenBudget`; truncation is forbidden, drop-and-skip is mandatory (inherits from Stage 6).
- Stage 7 MUST NOT show numeric scores or classification questions to the user.
</anti_regression_rules>

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Typing-time retrieval throws | Indicator → `unavailable` for ≤ 2s, then back to `idle`; logs to diagnostics. |
| Typing-time retrieval `partial` | Indicator → `partial` with tooltip; preview sheet still works. |
| Send-time retrieval timeout | Send proceeds without injection; indicator briefly flashes `unavailable`. |
| Send-time retrieval `unavailable` | Send proceeds without injection; user sees a non-blocking notice. |
| Per-turn toggle OFF + send | Skip retrieval; send verbatim. |
| User submits review with empty reflection | Allowed. SelfRatingPrompt still appears. |
| User taps Skip | No event written. No familiarity change. Navigate back. |
| Audit log insert fails | Transaction rolls back; familiarity unchanged; user sees retry affordance. |
| Concept deleted during review session | Detect on submit; surface "This concept was deleted" notice; no event written. |
| Familiarity clamp boundary hit | Score clamps to [0, 1]; audit row records the clamped values. |
| Multiple rapid rating taps | Mutation is debounced and idempotent on the same `(conceptId, sessionStart)`; only the first commits. |
| `ReviewThresholdScreen` opened with empty list | Show neutral empty message; do NOT recommend lowering threshold. |
| Settings write fails | Surface error toast; UI reverts to last known value. |

---

## Architecture Contract Checks

| Constraint | How Stage 7 satisfies it |
|---|---|
| Feature co-location | All Stage 7 code under `src/features/learning/dot-connector/` and `src/features/learning/review/`. Barrel exports per architecture contract. |
| Drizzle transactions | `applyReviewRating` is atomic: familiarity update + audit log insert in one `db.transaction`. |
| Embedding outside transaction | No embeddings written by Stage 7; retrieval reads via Stage 6. |
| Strict TS + branded IDs | `ConceptId`, `LearningCaptureId`, `ReviewEventId` throughout. |
| Zod at JSON boundaries | `ReviewEventRowCodec`, `ReviewRatingCodec` validate audit rows. Settings reads validated where they cross persistence. |
| Loud failures | Codec parse errors throw. Mutation failures roll back. No silent fake-success on retrieval errors. |
| TanStack query keys | `dotConnectorKeys`, `reviewKeys` factories. No hardcoded arrays. |
| No silent reroute | Retrieval `diagnostics.status` is surfaced visually. |
| Thin route screens | Screens call hooks/services; no business logic in route files. |
| Card boundaries | New components are NOT capture/concept cards; preview uses `CaptureChip` / `ConceptCardCompact` only. `CaptureCardFull` is reserved for full detail per Stage 3. |
| Capture immutability | rawSnippet and other capture fields are never written by Stage 7. |
| Async embedding contract | Stage 7 does not write embeddings; reads tolerate cold and partial states via Stage 6 contract. |

### Query keys

```ts
export const dotConnectorKeys = {
  all: () => ['learning', 'dotConnector'] as const,
  retrieve: (queryHash: string, modeHash: string) =>
    [...dotConnectorKeys.all(), 'retrieve', queryHash, modeHash] as const,
};

export const reviewKeys = {
  all: () => ['learning', 'review'] as const,
  weakConcepts: (threshold: number) =>
    [...reviewKeys.all(), 'weakConcepts', threshold] as const,
  session: (conceptId: ConceptId) =>
    [...reviewKeys.all(), 'session', conceptId] as const,
  events: (conceptId: ConceptId) =>
    [...reviewKeys.all(), 'events', conceptId] as const,
};
```

### Hooks

- `useDotConnectorRetrieve(queryText, settings)` — debounced typing-time retrieval; returns `{ result, isLoading, isFetching }`.
- `useSendWithInjection()` — mutation; runs send-time retrieval (or reuses fresh result), formats, calls underlying chat send.
- `useDotConnectorSettings()` / `useUpdateDotConnectorSettings()`.
- `useWeakConcepts(threshold)` — list query for `ReviewThresholdScreen`.
- `useReviewSession(conceptId)` — concept payload + linked captures for `ReviewSessionScreen`.
- `useApplyReviewRating()` — mutation; on success invalidates `conceptKeys.byId`, `conceptKeys.list`, `retrievalKeys.all()`, `reviewKeys.weakConcepts(*)`, `reviewKeys.events(conceptId)`.

---

## Deliverables

### Dot Connector

1. `src/features/learning/dot-connector/ui/DotConnectorIndicator.tsx`
2. `src/features/learning/dot-connector/ui/MemoryPreviewSheet.tsx`
3. `src/features/learning/dot-connector/ui/PerTurnToggle.tsx`
4. `src/features/learning/dot-connector/services/runTypingRetrieval.ts`
5. `src/features/learning/dot-connector/services/runSendInjection.ts`
6. `src/features/learning/dot-connector/services/dotConnectorSettings.ts`
7. `src/features/learning/dot-connector/hooks/useDotConnectorRetrieve.ts`
8. `src/features/learning/dot-connector/hooks/useSendWithInjection.ts`
9. `src/features/learning/dot-connector/hooks/useDotConnectorSettings.ts`
10. `src/features/learning/dot-connector/data/queryKeys.ts` (`dotConnectorKeys`)
11. `src/features/learning/dot-connector/types/dotConnector.ts`

### Review Mode

12. `src/features/learning/review/data/schema.ts` (`review_events` table)
13. `src/features/learning/review/data/migrations/NNNN_review_events.sql`
14. `src/features/learning/review/data/reviewEventsRepo.ts`
15. `src/features/learning/review/data/queryKeys.ts` (`reviewKeys`)
16. `src/features/learning/review/codecs/reviewEvent.ts` (`ReviewRatingCodec`, `ReviewEventRowCodec`, mappers)
17. `src/features/learning/review/types/review.ts` (`ReviewEventId`, branded ID + constructors + guards)
18. `src/features/learning/review/services/applyReviewRating.ts`
19. `src/features/learning/review/services/reviewSettings.ts`
20. `src/features/learning/review/hooks/useWeakConcepts.ts`
21. `src/features/learning/review/hooks/useReviewSession.ts`
22. `src/features/learning/review/hooks/useApplyReviewRating.ts`
23. `src/features/learning/review/ui/ReviewThresholdScreen.tsx`
24. `src/features/learning/review/ui/ReviewSessionScreen.tsx`
25. `src/features/learning/review/ui/ReflectionInput.tsx`
26. `src/features/learning/review/ui/ShowSavedReveal.tsx` — collapsible reveal block
27. `src/features/learning/review/ui/SelfRatingPrompt.tsx`
28. `src/features/learning/review/ui/ReviewResultScreen.tsx` — post-rating result + continuation actions

### Tests

29. Tests:
    - typing-time retrieval debounces at 450ms and cancels in-flight on new keystrokes
    - minimum query length (3 chars) gates retrieval
    - injection mode maps to limit and tokenBudget exactly per Step 4
    - per-turn toggle OFF skips retrieval at send time
    - send-time retrieval reuses fresh typing result within 5s and identical query
    - send-time retrieval timeout (1500ms) sends without injection
    - indicator visual states map to diagnostics.status correctly
    - preview sheet renders CaptureChip/ConceptCardCompact, never CaptureCardFull
    - preview sheet "remove from this turn" excludes the memory from injection without deleting source
    - injection block is deterministic for the same memory list (delegates to Stage 6 format)
    - `applyReviewRating('strong')` increments familiarity by 0.10, clamped to [0,1]
    - `applyReviewRating('partial')` increments familiarity by 0.05
    - `applyReviewRating('weak')` decrements familiarity by 0.05, floored at 0
    - `applyReviewRating('skip')` writes no event and does not change familiarity
    - audit row written in same transaction as familiarity update
    - audit insert failure rolls back familiarity update
    - audit row carries familiarityBefore and familiarityAfter exactly
    - `recordRecallText: false` (default) omits `user_recall_text` from the row even when reflection input is non-empty
    - `recordRecallText: true` (opt-in) persists the reflection text up to 2000 chars
    - changing `recordRecallText` from `true` to `false` MUST NOT retroactively delete existing rows
    - weak concepts list filters by computed strength below threshold
    - weak concepts ordering: strength ASC, last_accessed_at ASC NULLS FIRST, updated_at ASC, name ASC
    - empty weak concepts list shows neutral message; never recommends lowering threshold
    - Review Mode never updates importance_score
    - Review Mode never modifies capture content fields
    - Review Mode never auto-grades recall
    - Review Mode never auto-promotes captures
    - settings changes apply on next render with no destructive side effects
    - retrieval `partial` surfaces in indicator and preview sheet header
    - retrieval `unavailable` disables preview tap; send proceeds without injection
    - per-turn toggle resets to setting default after a successful send

---

## Acceptance Criteria

<acceptance_criteria>
- A `DotConnectorIndicator` adjacent to the chat send button reflects retrieval status and the post-budget memory count.
- The indicator updates in real time on typing (debounced 450ms) and never blocks send.
- The Memory Preview Sheet shows what would be injected, allows per-memory removal for the current turn only, and never renders `CaptureCardFull`.
- A per-turn inject toggle exists, defaults to ON when `enableDotConnector === true`, and resets after each send.
- Send-time injection reuses a fresh typing result (≤ 5s, identical query) or runs synchronously with a 1500ms timeout; on timeout, the message is sent without injection.
- Retrieval `diagnostics.status === 'partial'` is surfaced visually; `unavailable` disables preview tap and skips injection.
- Review Mode is reachable from `ConceptCardFull` ("Start Review") and from the Hub overflow / Settings entry.
- The Weak Concepts surface filters by `computeStrength < weakConceptThreshold`, sorts weakest-first with locked tie-breakers, and is opt-in browsing only — never pushed.
- `ReviewSessionScreen` allows free-text reflection and an optional reveal of saved evidence; submission moves to the self-rating prompt.
- Self-rating options are "I got it", "Partial", "Need to revisit", and "Skip". Skip writes no event and changes nothing.
- Familiarity update deltas are LOCKED at +0.10 / +0.05 / -0.05 with `clamp(value, 0, 1)`.
- Every non-skip rating writes a `review_events` row in the same transaction as the familiarity update.
- `importance_score` is never modified in Stage 7.
- Capture content fields are never modified in Stage 7.
- The audit log is append-only and round-trips through `ReviewEventRowCodec`.
- Stage 7 ships under `src/features/learning/dot-connector/` and `src/features/learning/review/` with feature-owned types, codecs, repos, hooks, and UI.
- All TanStack queries use `dotConnectorKeys` and `reviewKeys` factories.
- No new component accepts `variant`, `density`, `mode`, `isCompact`, or `isFull` props.
- No flashcards, streaks, due queues, daily goals, or quiz framings appear anywhere in Stage 7 UI.
- Numeric familiarity, importance, extraction confidence, and retrieval scores never appear as raw numbers in Stage 7 UI.
</acceptance_criteria>

---

## Open Questions

🟢 Familiarity deltas = +0.10 / +0.05 / -0.05 with [0,1] clamp — LOCKED.
🟢 Self-rating options = "I got it" / "Partial" / "Need to revisit" / "Skip" — LOCKED.
🟢 Indicator placement = adjacent to send button — LOCKED.
🟢 Typing debounce = 450ms; minimum query length = 3 chars — LOCKED.
🟢 Send-time freshness window = 5s; send-time timeout = 1500ms — LOCKED.
🟢 Injection mode mapping (limit + tokenBudget) — LOCKED.
🟢 Weak concepts ordering — LOCKED.
🟢 Audit log append-only with cascade-on-concept-delete — LOCKED.
🟡 Continuation-in-chat (post-review) integration with personas — Stage 8 owns persona composition; Stage 7 only opens the chat surface seeded with concept context.
🟡 Diagnostics surface presentation (toast vs dedicated screen) — UX polish, not blocking.
🟢 `recordRecallText` default `false` (opt-in) — LOCKED for privacy. Reflection text may contain personal notes; users must explicitly enable persistence.
🟡 Numerical coefficients (deltas, debounce, freshness, timeout) — relock after Stage 7 produces real review-volume signal.
