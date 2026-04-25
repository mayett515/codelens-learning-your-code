# Stage 4 — Learning Hub Surfaces

> Builds on Stage 1 data, Stage 2 save flow, and Stage 3 card components.
> Defines the Learning Hub as a navigation + awareness surface.

---

## Scope

### In scope
- Learning Hub screen purpose and layout
- Recent Captures section
- Concept List section
- Session Cards section
- Concept detail entry behavior
- Read-only session flashback surface
- Knowledge Health entry and screen rules
- Ordering, grouping, visibility, and primary actions for every list

### Out of scope
- Promotion clustering implementation (Stage 5)
- Retrieval / Dot Connector (Stage 6)
- Review Mode internals (Stage 7)
- Native graph rewrite (Stage 9)

---

## Core Purpose

<hub_purpose>
The Learning Hub is for navigation and awareness.

It helps the user answer:
- What did I recently capture?
- What concepts do I have?
- Which ideas look weak or stale?
- Where do I want to go next?

The Hub is NOT a deep reading surface.
</hub_purpose>

<hub_constraints>
- Hub lists MUST use compact cards only.
- Hub MUST NOT show full snippets.
- Hub MUST NOT show full explanations.
- Hub MUST NOT inline-expand compact cards.
- Full understanding happens in `CaptureCardFull` and `ConceptCardFull`.
</hub_constraints>

---

## Hub Layout

Default vertical order:

1. Recent Captures
2. Concept List
3. Session Cards
4. Knowledge Health entry

<visibility_rules>
- Recent Captures appears if at least one capture exists.
- Concept List appears if at least one concept exists.
- Session Cards appear if at least one session exists.
- Knowledge Health appears if at least one concept exists.
- Empty states must be short and action-oriented, not instructional essays.
</visibility_rules>

---

## Section 1 — Recent Captures

### Purpose

Show what the user recently saved, especially captures that are not yet organized.

### Primary user action

Open a capture detail view.

### Component

Use `CaptureCardCompact` only.

### Ordering

<recent_captures_ordering>
- Sort by `created_at DESC`.
- Tie-breaker: `id ASC` for deterministic rendering.
- Do NOT reorder unresolved captures above linked captures.
- Unresolved captures get visual emphasis, not sorting priority.
</recent_captures_ordering>

### Grouping

<recent_captures_grouping>
- No grouping initially.
- Keep the list simple.
- Future grouping by Today / This Week is allowed later, but not required here.
</recent_captures_grouping>

### Visibility

<recent_captures_visibility>
- Show newest 10 captures by default.
- Provide "See all" if more than 10 exist.
- Include unresolved, linked, and proposed_new states.
- Do NOT hide linked captures; captures never disappear.
</recent_captures_visibility>

### Actions

<recent_captures_actions>
- Tap card → open `CaptureCardFull`.
- If state is unresolved, show subtle state chip.
- If linked, show linked concept name.
- Do NOT show full snippet in the list.
</recent_captures_actions>

---

## Section 2 — Concept List

### Purpose

Let the user scan and open existing concepts.

### Primary user action

Open a concept detail view.

### Component

Use `ConceptCardCompact` only.

### Ordering

<concept_list_ordering>
- Default sort: `computeStrength(familiarity_score, importance_score) ASC` so weaker concepts surface first.
- Tie-breaker 1: `updated_at DESC`.
- Tie-breaker 2: `name ASC`.
- Allow later toggle to sort by strongest / newest / alphabetical, but default stays weakest-first.
</concept_list_ordering>

### Grouping

<concept_list_grouping>
- No grouping by default.
- Filtering by concept_type is allowed.
- Do NOT create a taxonomy tree in this stage.
</concept_list_grouping>

### Visibility

<concept_list_visibility>
- Show all concepts in a scrollable list/grid depending on screen size.
- Compact cards show name, type chip, strength, language chips, and short summary only.
- Do NOT show evidence snippets here.
</concept_list_visibility>

### Actions

<concept_list_actions>
- Tap card → open `ConceptCardFull`.
- Strength indicator is visible but not editable.
- Concept type label is allowed as a chip; classification questions are forbidden.
</concept_list_actions>

---

## Section 3 — Session Cards

### Purpose

Sessions are secondary grouping metadata. They help the user revisit a work period, but they are not the primary knowledge model.

### Primary user action

Revisit a session.

### Component

Use a dedicated `SessionCardCompact` in this stage if needed. Do NOT misuse Capture or Concept cards for sessions.

### Required fields

<session_card_fields>
- session title or fallback date label
- message count
- capture count
- concept count
- duration, if available
- project/file origin, if available
- aggregate strength of linked concepts, if available
</session_card_fields>

### Ordering

<session_ordering>
- Sort by session `updated_at DESC` or last activity timestamp.
- Tie-breaker: `created_at DESC`.
</session_ordering>

### Grouping

<session_grouping>
- Group by Today, This Week, Earlier.
- Keep grouping shallow.
</session_grouping>

### Visibility

<session_visibility>
- Show recent 5 sessions in Hub.
- Provide "See all sessions" if more exist.
- Sessions are secondary; they should not dominate the Hub.
</session_visibility>

### Actions

<session_actions>
- Tap → open the shared read-only session flashback surface.
- Optional action: "Revisit session".
- Revisit session is not a quiz and not Anki.
</session_actions>

---

## Section 4 — Concept Detail Entry

`ConceptCardFull` is the primary full concept surface and may open as a modal or route.

<concept_detail_rules>
- It is the deep understanding surface for one concept.
- It shows all language_or_runtime values.
- It groups linked captures by session and/or language.
- It includes a concise "Where you learned this" provenance section when source sessions exist.
- Learning Structure and Evidence are collapsible by default.
- Every related/prerequisite/contrast concept is tappable.
- Tapping a source-session row opens the shared read-only session flashback surface.
- Actions: Start Review, View in Graph, Navigate to related concepts.
</concept_detail_rules>

---

## Section 5 — Session Flashback Surface

### Purpose

Revisit a past learning session as memory, not as a live chat.

This surface answers:
- Where did this click before?
- What did that earlier conversation actually look like?
- Which captures or concepts came out of that moment?

### Entry points

<flashback_entry_rules>
- Tapping a Session Card opens this surface.
- Tapping a "Where you learned this" session row inside `ConceptCardFull` opens this surface.
- Stage 8 session reference markers inside chat messages open this same surface.
- All three entry paths MUST resolve to one shared read-only session surface, not three separate implementations.
</flashback_entry_rules>

### Visual treatment

<flashback_visual_rules>
- The surface should feel dreamlike and clearly past-tense.
- Use a slightly desaturated version of the normal palette; do NOT switch to grayscale.
- Add a subtle vignette or soft edge fade.
- A faint grain/noise texture is allowed if it remains very subtle and does not harm readability.
- Show a soft top banner such as: `Viewing past session — [date]`.
- Message bubbles use slightly faded versions of their normal colors.
- The normal input bar is removed entirely.
- If entered from an active chat, show a soft `Return to chat` action instead of an input.
- Any background motion must be extremely subtle, optional, and disabled by reduced-motion accessibility settings.
- The visual treatment must communicate remembering, not disabled/error state.
</flashback_visual_rules>

### Content

<flashback_content_rules>
- Header shows session title or fallback date label.
- Header also shows project/file origin, message count, capture count, concept count, and duration when available.
- Main body is a read-only transcript of the session.
- Secondary blocks may show captures saved from the session and concepts that emerged from it.
- Tapping a capture opens the existing capture detail surface.
- Tapping a concept opens the existing concept detail surface.
- Do NOT inline-render a full concept graph here.
</flashback_content_rules>

### Behavior

<flashback_behavior_rules>
- This surface is strictly read-only.
- No message sending, editing, deleting, retrying, or review submission is allowed here.
- No persona picker, model picker, retrieval indicator, or live Dot Connector state appears here.
- If entered from the Hub or concept detail, normal back navigation is enough.
- If entered from an active chat, the primary affordance is `Return to chat`.
- Passive flashback viewing MUST NOT update `familiarity_score`.
- Passive flashback viewing MUST NOT update `last_accessed_at`.
</flashback_behavior_rules>

### Intent

<flashback_intent>
The dreamlike treatment is not decorative.

It exists to make the product meaning obvious:
this session already happened, the user is revisiting a memory, and the screen is for understanding provenance rather than continuing a conversation.
</flashback_intent>

---

## Section 6 — Knowledge Health

### Purpose

Visualize knowledge state. It is an awareness surface, not an editing surface.

### Primary user action

Tap a weak/stale concept to open concept detail.

### Ordering

<knowledge_health_ordering>
- Default: concepts sorted by strength ASC.
- Tie-breaker: last reviewed / updated oldest first when available.
- Final tie-breaker: name ASC.
</knowledge_health_ordering>

### Display

<knowledge_health_display>
- Phase 1: 1D strength gradient using computed strength.
- Phase 2: 2D matrix using familiarity × importance.
- Do NOT add flashcard due queues.
- Do NOT add streaks.
- Do NOT say "items due".
</knowledge_health_display>

### Visibility

<knowledge_health_visibility>
- Show if at least one concept exists.
- Empty state: "Save a few captures to see your knowledge map."
</knowledge_health_visibility>

### Actions

<knowledge_health_actions>
- Tap concept → open `ConceptCardFull`.
- No inline editing.
- No quiz flow.
</knowledge_health_actions>

---

## Data Queries

<data_query_rules>
- Use TanStack query key factories only.
- No hardcoded query keys.
- UI reads through feature-owned repositories/hooks only.
- No direct DB calls from route components.
</data_query_rules>

Required query hooks:

- `useRecentCaptures({ limit })`
- `useConceptList({ sort, filters })`
- `useRecentSessions({ limit })`
- `useSessionFlashback(sessionId)`
- `useKnowledgeHealthConcepts()`

---

## Empty States

<empty_state_rules>
- Empty states must be short.
- Empty states must point to the next natural action.
- Do NOT explain the whole system.
</empty_state_rules>

Examples:

- No captures: "Save something that clicked while reading code."
- No concepts: "Concepts appear after related captures are grouped."
- No sessions: "Your saved work sessions will appear here."

---

## Anti-Regression Rules

<anti_regression_rules>
- Hub must not become a notes app.
- Hub must not become a full reading surface.
- Hub must not hide unresolved captures.
- Hub must not force promotion.
- Hub must not show classification questions.
- Hub must not add flashcard or streak language.
- The flashback surface must never behave like a live chat.
- Flashback viewing must never mutate session, capture, or familiarity data.
</anti_regression_rules>

---

## Deliverables

1. `src/features/learning/ui/LearningHubScreen.tsx`
2. `src/features/learning/ui/RecentCapturesSection.tsx`
3. `src/features/learning/ui/ConceptListSection.tsx`
4. `src/features/learning/ui/SessionCardsSection.tsx`
5. `src/features/learning/ui/SessionFlashbackScreen.tsx`
6. `src/features/learning/ui/KnowledgeHealthEntry.tsx`
7. `src/features/learning/ui/KnowledgeHealthScreen.tsx`
8. `src/features/learning/data/queryKeys.ts` additions
9. `src/features/learning/hooks/useRecentCaptures.ts`
10. `src/features/learning/hooks/useConceptList.ts`
11. `src/features/learning/hooks/useRecentSessions.ts`
12. `src/features/learning/hooks/useSessionFlashback.ts`
13. Tests for ordering, visibility, empty states, and flashback read-only behavior

---

## Acceptance Criteria

<acceptance_criteria>
- Recent Captures shows unresolved and linked captures.
- Linked captures do not disappear.
- Recent Captures is sorted by created_at DESC.
- Concept List defaults to weakest-first using computed strength.
- Compact cards never inline-expand.
- Tapping compact cards opens full views.
- Session Cards, concept provenance rows, and Stage 8 session reference markers all open the same flashback surface.
- The flashback surface is visually distinct from a live chat and has no input bar.
- Viewing a flashback does not update `familiarity_score` or `last_accessed_at`.
- Knowledge Health has no quiz/streak/due language.
- No route component performs direct DB access.
</acceptance_criteria>
