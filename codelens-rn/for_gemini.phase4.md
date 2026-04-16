# Phase 4 — Learning Hub Core

## Overview

Phase 4 implements the full learning pipeline: save a chat bubble as learning, extract concepts via AI + Zod validation, embed and store vectors for semantic retrieval, show a preview modal with merge suggestions, browse sessions/concepts in the Learning Hub, and review concepts in a chat with related-concept context injection.

**tsc --noEmit**: Clean. Zero errors. Strict mode + exactOptionalPropertyTypes enforced throughout.

---

## File Inventory (22 files)

### New Files (7)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/hash.ts` | 9 | FNV-1a hash for concept signature (staleness detection) |
| `src/lib/l2.ts` | 9 | L2 normalization for embedding vectors before vec0 storage |
| `src/lib/embedding-input.ts` | 15 | Structured text builder for embedding model input (name + summary + taxonomy) |
| `src/stores/save-learning.ts` | 102 | Zustand store for Save-As-Learning modal state machine (idle → extracting → reviewing → saving) |
| `src/learning/commit.ts` | 60 | Commits a learning session: inserts concepts, strengthens merged concepts, creates session, fires background embedding |
| `src/ui/components/ConceptChip.tsx` | 62 | Memoized pill component with selected/merge variant styling |
| `src/ui/components/SaveAsLearningModal.tsx` | 275 | Phase-driven bottom-sheet modal: extraction → review → save. Orchestrates extractConcepts + findMergeCandidates + commitLearningSession |

### Stub Replacements (4)

| File | Lines | Purpose |
|------|-------|---------|
| `src/ai/embed.ts` | 118 | Serialized embed queue: own processing state, cooldowns, 3 retries with exp backoff, setEmbedImpl injection |
| `src/learning/extract.ts` | 74 | Zod-validated concept extraction via AI: builds prompt → enqueue(learning) → strip fences → parse → validate |
| `src/learning/sync.ts` | 51 | ensureEmbedded: signature staleness check → embed → L2 normalize → vectorStore.upsert. reEmbedAll: batch re-embed all concepts |
| `src/learning/retrieve.ts` | 90 | retrieveRelatedConcepts: embed query → topMatches → hydrate. findMergeCandidates: embed → topMatches filtered to cosine > 0.85 |

### Modified Files (11)

| File | Changes |
|------|---------|
| `src/ai/scopes.ts` | Added EmbedConfig type + KV persistence + getEmbedConfig/updateEmbedProvider/updateEmbedModel. Default: SiliconFlow BAAI/bge-small-en-v1.5 (384-dim) |
| `src/composition.ts` | Added routedEmbed(input) routing by input.api + setEmbedImpl(routedEmbed) wiring |
| `src/adapters/sqlite-vector-store.ts` | Upgraded topMatches to hybrid scoring: cosine×0.7 + recency×0.2 + strength×0.1. Two-step: vec0 query → fetch concept data → JS scoring/filtering |
| `src/domain/prompts.ts` | Added buildLearningSystemPrompt(name, summary, relatedConcepts) — tutor role with concept connections |
| `src/db/queries/chats.ts` | Added getChatByConceptId(conceptId) for learning chat find-or-create pattern |
| `app/chat/[id].tsx` | Wired onSaveAsLearning → useSaveLearningStore.open + added SaveAsLearningModal |
| `app/general-chat/[id].tsx` | Identical wiring as chat/[id].tsx |
| `app/learning/index.tsx` | Full Learning Hub: Sessions/Concepts tabs, search with useDeferredValue, session cards, concept cards with strength bar + tags |
| `app/learning/chat/[id].tsx` | Full review chat: load concept → retrieve related → find-or-create chat → concept banner with related chips → inverted FlatList + BubbleMenu |
| `app/settings.tsx` | Added Embedding section: provider toggle, model input, "Re-embed All" button with toast feedback + 384-dim warning |
| `app/index.tsx` | Added purple "Learn" button in header + fixed learning chat routing (conceptId → /learning/chat/[id]) |

---

## Architecture Decisions

### Embed Queue (separate from completion queue)
Embedding and completion use different API endpoints with different rate limits. The embed queue has its own processing state, cooldowns, and retry logic. No model fallback — embedding dimension must match vec0 (384).

### Hybrid Vector Scoring
vec0 returns L2 distance-based results. We convert to cosine similarity, then compute a hybrid score:
- `score = cosine × 0.7 + recency × 0.2 + strength × 0.1`
- Recency: `1 / (1 + daysSinceUpdate / 30)` — smooth decay over 30 days
- Two-step query: vec0 MATCH → raw SQL fetch from concepts table → JS scoring
- candidateIds filtering in JS (vec0 result set capped at 100)

### Concept Staleness Detection
`conceptSignature(name, summary)` produces an FNV-1a hash. `ensureEmbedded` checks if the stored signature + model + provider matches. Only re-embeds on mismatch. This means editing a concept's name or summary triggers re-embedding automatically.

### Save-As-Learning Flow
1. User long-presses bubble → BubbleMenu "Save as Learning"
2. Zustand store transitions to `extracting`
3. useEffect in modal: `extractConcepts(snippet)` via AI + Zod → `findMergeCandidates` per concept
4. Transitions to `reviewing`: editable title/snippet, selectable concept chips, merge suggestions
5. "Save" → `commitLearningSession`: insert concepts → strengthen merged → insert session → background embed
6. Invalidate TanStack Query keys → close modal

### Merge Suggestions
When a newly extracted concept has cosine > 0.85 with an existing concept, it's shown as a merge candidate. Accepting a merge: the existing concept's strength is bumped (+0.1, capped at 1.0), and the session is linked to it instead of creating a new concept.

### Learning Chat Find-or-Create
Navigating to `/learning/chat/[conceptId]` queries for an existing chat with that conceptId. If none exists, creates one with scope `'learning'`. Conversation persists across visits.

### Related Concept Context Injection
When sending a message in a learning chat, `buildLearningSystemPrompt` injects the concept name, summary, and up to 3 related concepts (retrieved via vector similarity) into the system prompt. The AI acts as a tutor that draws connections.

### Fire-and-Forget Embedding
`commitLearningSession` calls `ensureEmbedded` for each concept in a non-blocking `.catch(() => undefined)` pattern. Concepts are immediately queryable in SQLite; vector search becomes available after the embed queue processes them.

---

## Data Flow

```
BubbleMenu → useSaveLearningStore.open(msg, chatId)
  → SaveAsLearningModal (extracting phase)
    → extractConcepts(snippet) [AI + Zod validation]
    → findMergeCandidates(name, summary) per concept [embed + vec0]
  → Reviewing phase (user edits title/snippet, toggles concepts, accepts merges)
  → commitLearningSession
    → insertConcept × N (new concepts, strength 0.5)
    → updateConcept × M (merged concepts, strength +0.1)
    → insertSession (links all concept IDs)
    → ensureEmbedded × (N+M) [fire-and-forget background]
  → invalidateQueries(['learning-sessions'], ['concepts'])
  → close modal

Learning Hub → getAllSessions / getAllConcepts
  → Tap concept → /learning/chat/[conceptId]
    → getConceptById → getChatByConceptId (find-or-create)
    → retrieveRelatedConcepts (embed query → vec0 → hydrate)
    → Chat with buildLearningSystemPrompt context injection
```

---

## Verification Checklist
- [x] `tsc --noEmit` clean (TypeScript 5.9.2 strict + exactOptionalPropertyTypes)
- [x] All 7 batches implemented per plan
- [x] Embed queue separate from completion queue (different rate limits)
- [x] Zod validation on AI extraction output
- [x] Hybrid scoring: cosine×0.7 + recency×0.2 + strength×0.1
- [x] L2 normalization before vec0 storage
- [x] FNV-1a signature for staleness detection
- [x] Merge suggestions at cosine > 0.85 threshold
- [x] BubbleMenu wired in section chat + general chat
- [x] Learning Hub with tabs, search, empty states
- [x] Learning review chat with concept banner + related chips
- [x] Settings: Embedding provider/model + Re-embed All
- [x] Home: Learn button + learning chat routing fix
- [x] Fire-and-forget embedding on commit
- [x] No `as any` except drizzle JSON column boundary (concepts.ts:42, learning-sessions.ts:52)
