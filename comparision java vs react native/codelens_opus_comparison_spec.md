# CodeLens — Comparison & Philosophy Spec for Opus

> **Purpose**
>
> This document briefs an AI reasoning agent (Opus) on the strategic and philosophical work
> behind CodeLens's Save as Learning redesign.
>
> This is a thinking-partner spec, not an implementation brief.
>
> Do not write code. Do not produce file diffs.
> Reason through architectural decisions, product philosophy, and feature tradeoffs.
> When answering, cite which reference doc your reasoning draws from.

---

## <context>

**What CodeLens is:**

CodeLens is a mobile-first React Native app for learning code on your phone.

The core loop:
1. Import a GitHub repo
2. Read code in a dark-mode viewer with line-level marking
3. Chat with an AI about the code (section chats, per-file or per-selection)
4. Save the learning moment → AI extracts concepts → saved to a personal knowledge graph
5. Review saved concepts later via a learning chat with Socratic dialogue

**The stack:**
- Expo SDK 54, React Native 0.81.5, TypeScript 5.9.2 strict + exactOptionalPropertyTypes
- op-sqlite + Drizzle ORM + sqlite-vec (Hot/Cold vector tier for embeddings)
- ExecuTorch local embeddings (all-minilm-l6-v2.pte, 384-dim, fully offline)
- FTS5 hybrid search + JIT rehydration
- TanStack Query, Zustand, Expo Router
- Hexagonal architecture: ports/adapters, feature co-location (Bluesky-style)

**Current phase:** Phase 6 — post-architecture hardening, pre-UX redesign.

**What the app does well today:**
- Local-first, offline embedding pipeline (no API calls to save concepts)
- Robust fallback engine for chat (rate limit / outage routing)
- Drizzle transaction safety, Zod codec boundaries, branded IDs
- Hot/Cold vector tier GC (mathematically bounded RAM for vectors at scale)
- FTS5 + sqlite-vec hybrid search with JIT rehydration
- Per-chat model override

**What the app is missing compared to its Java predecessor:**
→ See `legacy_prompt_gaps.md` for full analysis.

</context>

---

## <reference_documents>

Read these documents before reasoning. Do not guess at their contents.

| Document | Path | What it covers |
|----------|------|----------------|
| Legacy feature gaps | `legacy_prompt_gaps.md` | 14 features Java had that RN lost; prioritized backlog |
| Save as Learning philosophy | `save_as_learning_philosophy.md` | Core tension, fields, card design, save flow, open questions, domain-agnostic architecture |
| Version comparison | `version_comparison.md` | Side-by-side Java vs RN comparison with notes from product review session |
| LLM architecture contract | `codelens-rn/whatwe_agreedonthearchitecture.md` | 10 hard constraints for all code changes |
| Human architecture guide | `codelens-rn/whatwe_agreedonthearchitecture_humans.md` | Plain-English explanation of the same contracts |
| Codex implementation spec | `codelens_save_as_learning_codex_spec.md` | Full implementation brief for the Save as Learning redesign (for Codex) |

</reference_documents>

---

## <architecture_contract>

Everything reasoned about here must stay compatible with the existing repo contracts.

**Authoritative file:** `codelens-rn/whatwe_agreedonthearchitecture.md`

The architecture decisions that are already locked in and should not be argued away:

```xml
<locked_decisions>
  <decision>Feature co-location (Bluesky style). Learning code stays in src/features/learning/. Barrel discipline enforced.</decision>
  <decision>Drizzle transaction discipline. Multi-table writes atomic via db.transaction(). DbOrTx threading in data helpers.</decision>
  <decision>TypeScript strict + exactOptionalPropertyTypes. Branded IDs. No as any in data layer.</decision>
  <decision>Zod codecs at JSON DB boundaries. No raw spread of DB columns into domain types.</decision>
  <decision>Local-first embeddings. ExecuTorch pipeline. No silent reroute to remote providers.</decision>
  <decision>Loud failures on critical paths. No fake-success fallbacks for embeddings, persistence, restore.</decision>
  <decision>TanStack query key factories. No hardcoded queryKey arrays.</decision>
  <decision>Thin route screens. Orchestration in application layer, not in app/ files.</decision>
</locked_decisions>
```

When reasoning about potential changes or new features, check each suggestion against these constraints.

</architecture_contract>

---

## <primary_question>

The central strategic question Opus should reason through:

> **The Save as Learning moment is the foundation of everything.
> If the concepts saved here are shallow, the entire learning system is shallow.
> If they are rich, the whole system becomes genuinely intelligent.
>
> What should the optimal Save as Learning flow look like — given the product constraints,
> the mobile UX requirements, the existing architecture, and the user's learning goals?**

</primary_question>

---

## <key_tensions>

These are the tensions to reason through, not resolve by picking one side:

### 1. Structure vs friction

Rich structured concepts (core_concept, architectural_pattern, programming_paradigm, snippets) make the knowledge graph genuinely useful later.

But adding more fields = more friction at save time. Friction kills the habit.

GPT architectural insight: the right move is **LearningCapture as primary object** — save fast, structure later. The Codex spec implements this. But does this tension fully resolve? Or does it push the problem to "how do we surface under-structured captures later"?

### 2. Familiarity score vs importance score

Java used a multi-signal strength score (review count 58%, user questions 26%, repetition signals 18%).

RN has a `strength` field in the DB but it is:
- Not split into familiarity vs importance
- Not visually surfaced anywhere in the UI

The Codex spec proposes `familiarityScore` + `importanceScore` split.

Is this the right split? What signals would drive each? What does "importance" even mean for a code concept — complexity? how often it appears in production code? how often the user encounters it? How do you measure it without making the user do extra work?

### 3. Dot Connector in section chats — timing question

The legacy Java version injected the 3 most relevant concepts from the user's memory vault into every section chat system prompt. This is why responses felt personalized — the AI knew what the user already understood.

The RN version has the full embedding + vector search infrastructure to do this. It is just not wired up.

But there's a timing question: when a user asks a question in a section chat, do you:
- (A) Run vector search first, inject memory, then send to AI? (adds latency)
- (B) Pre-load memory context when the chat opens? (stale but fast)
- (C) Run memory injection async and show a "context loaded" indicator? (UX complexity)

Which approach is most compatible with the current fallback engine and request queue architecture?

### 4. Domain-agnostic architecture — when to abstract?

The philosophy doc argues the app should be buildable as a learning engine for any domain (math, economics, law).

The Codex spec says: do NOT over-generalize now, stay coding-first.

But several design decisions in the Codex spec (domain-extensible taxonomy, `concept_type` enum) are already abstractions that go slightly beyond pure coding-first.

Where exactly is the right line? What level of domain abstraction is "free" to build now because it costs nothing vs what is premature over-engineering?

### 5. LearningCapture vs Concept — long-term knowledge graph implications

If captures are the primary object and concepts are downstream organization:
- How does the knowledge graph work? Are nodes concepts, captures, or both?
- When does a capture get "promoted" to a concept? Automatically? On user action?
- Can you have a rich graph without the concept layer being well-structured?
- Does saving as a capture without resolving concept identity make the graph weaker?

The Java version had a rich graph because everything was concept-first. Is there a way to have capture-first saves without degrading graph quality?

</key_tensions>

---

## <open_questions>

These questions from the philosophy doc are still unresolved. Reason through them:

1. **How granular should `core_concept` be?**
   Should "closure" and "lexical scope" be the same core concept or different?
   The AI makes judgment calls — do we need a user-editable taxonomy tree, or trust AI abstractions?

2. **Should snippets be editable?**
   The AI picks what to quote. Sometimes it picks the wrong line.
   Should users be able to swap the snippet for a different part of the chat before saving?

3. **Concept merging vs concept linking?**
   When two captures look similar, should we merge them (simpler) or link them (richer graph)?
   Currently the code merges. Is that always right?

4. **What happens when the same concept gets saved from 5 different sessions?**
   Does the canonical summary update? Do snippets accumulate? Does strength go up?
   What is the correct merge strategy for the data model?

5. **Language-agnostic vs language-specific?**
   Should "closures in JavaScript" and "closures in Python" be the same concept or different ones?
   `core_concept = 'closure'` for both, but `language_or_runtime` differs.
   Should the graph link them as the same abstract concept with different language implementations?

6. **How many snippets per concept?**
   If the same concept appears in 10 sessions, do you accumulate 10 snippets?
   Or keep the 3 most recent/distinct?

</open_questions>

---

## <legacy_features_to_reason_about>

From `legacy_prompt_gaps.md`, these features had the most product impact in Java.
Reason through the right approach for each:

### Dot Connector (memory injection in section chats)

**Java approach:** 3 most relevant concepts injected as JSON into every section chat system prompt.
The AI was explicitly instructed to bridge what the user is reading now to what they already know.
Format: `{"title": "...", "core_concept": "...", "architectural_pattern": "...", ...}`

**Current RN state:** Section chats start cold. No memory injection. Concepts exist only in learning chat.

**Key question:** With the new LearningCapture model, do we inject captures or concepts into section chats?
What is the right prompt shape now?

---

### Personas (Gems system)

**Java approach:** 5 built-in personas per chat. Quick Helper / Debug Bot / Senior Dev / Teacher / Code Reviewer.
Users could create custom personas.

**Current RN state:** Single static system prompt per chat type. No persona selection.

**Key question:** Is a per-chat persona toggle the right UX, or should the app auto-detect what kind of help is needed from the message content?

---

### Rich learning review prompts (Socratic + code snippets)

**Java approach:** Learning chat prompt included 5 related concepts with full taxonomy + 3 actual code snippets from past sessions where the concept appeared + explicit Socratic dialogue pattern.

**Current RN state:** Learning prompt has concept name + summary + related names only. No snippets, no Socratic structure.

**Key question:** With the new LearningCapture model, what should the learning chat inject?
Captures now carry `whatClicked` + `whyItMattered` + `rawSnippet` — these are richer than before.
How do you compose a learning review prompt that uses them well?

---

### Concept strength visualization

**Java approach:** Multi-signal strength score with dynamic color gradient rendered on concept cards.

**Current RN state:** `strength` field exists in DB but is not surfaced in the UI anywhere.

**Key question:** With the `familiarityScore` / `importanceScore` split — what visual design makes both scores comprehensible at a glance on a mobile concept card?

</legacy_features_to_reason_about>

---

## <product_philosophy_constraints>

These are non-negotiable product principles from `save_as_learning_philosophy.md`:

1. **The sweet spot is AI does the heavy lifting, user reviews and confirms.**
   Saving should feel like curating a collection, not filling a form.

2. **What you preview is what you get.**
   The concept card in the Save as Learning modal should look IDENTICAL to the card in the Learning Hub.

3. **The save flow should feel like curating a collection, not filling a form.**
   Step 1: long-press → Step 2: 2-second spinner → Step 3: review cards → Step 4: tap Save.
   Maximum 4 steps from intent to saved.

4. **The domain-agnostic architecture principle:**
   If a piece of code contains "code", "programming", or "software" as a hardcoded string
   that a math student would never see — it belongs in domain config, not in the source.

5. **Coding-first product, domain-extensible engine.**
   Build it for code now. But don't bake the coding assumption into the places where a math fork
   would need to swap things out.

</product_philosophy_constraints>

---

## <what_this_spec_is_not>

- This is **not** an implementation spec. Do not write code.
- This is **not** a spec for Codex. The Codex spec is at `codelens_save_as_learning_codex_spec.md`.
- This is **not** a product requirements doc. It is a reasoning brief.

Use this document to:
- Think through the key tensions and open questions
- Propose architectural directions with tradeoffs
- Identify what the Codex spec may have missed or underspecified
- Stress-test the LearningCapture model against edge cases
- Reason about the Dot Connector timing problem
- Propose a visual design logic for the concept card strength indicators
- Identify what features from the legacy Java version are worth restoring and in what order

</what_this_spec_is_not>

---

## <final_instruction>

Your job in this conversation is to be the strategic reasoning partner for the CodeLens product.

You have full context on:
- What the app is and what it is trying to achieve
- What the legacy Java version had that was lost
- What the current RN architecture looks like and what constraints it enforces
- What the Codex implementation spec proposes
- What the open philosophical questions are

Think clearly. Cite your sources. Flag contradictions between docs.
Call out anything the Codex spec has underspecified before implementation begins.

</final_instruction>
