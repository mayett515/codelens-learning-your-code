# Save as Learning — Philosophy & Design Thinking

## What are we actually trying to do?

When a developer reads code on their phone and something clicks — a pattern they hadn't seen before, a concept that finally makes sense, a technique they want to remember — that moment is the entire point of CodeLens. The Save as Learning button is the bridge between "I just understood something" and "I will still know this in 3 months."

The question is: what exactly should we capture in that moment, and how should we organize it so it's actually useful later?

---

## The core tension

**Too little structure** — you save a blob of text with a title. Six months later you have 200 blobs with titles. Useless. This is what note apps give you.

**Too much structure** — you have to fill in 8 fields before saving. Friction kills the habit. If saving a concept feels like writing a wiki entry, nobody does it.

**The sweet spot** — the AI does the heavy lifting on structure. The user just reviews and confirms. The structure has to be rich enough to be useful later but invisible enough that saving feels instant.

---

## What makes a concept actually useful later?

Think about what you actually need when you come back to a concept 3 months later:

1. **What is it abstractly?** — the CS mechanism, language-agnostic. Not "React useEffect" but "side effect management tied to a lifecycle." This is the `core_concept` field. It's what lets the Dot Connector say "hey, this new thing you're looking at is the same mechanism you learned before in a different language."

2. **What does it look like in practice?** — the actual code snippet from the session where you learned it. Not a textbook example — YOUR code, the thing you were actually reading when it clicked.

3. **Where does it fit?** — architectural pattern, paradigm, language. So you can filter and browse. "Show me all my Observer pattern concepts" or "show me everything I know about functional programming."

4. **What else is it connected to?** — related concepts in your graph. This is what makes it a knowledge graph and not just a list.

5. **How well do I know it?** — the strength score. So you know what to review.

---

## The categorization question — what fields matter?

### Fields the AI should extract automatically:

- **`name`** — short, mechanism-focused title. Under 7 words. Not "how useEffect works" but "Effect Scheduling via Dependency Array."
- **`summary`** — 1-2 sentences. Specific and technical, not vague. What it is and why it matters.
- **`core_concept`** — the abstract CS mechanism. Language-agnostic. This is the most important field for the Dot Connector.
- **`architectural_pattern`** — Observer, Repository, Factory, etc. Null if not applicable.
- **`programming_paradigm`** — functional, reactive, OOP, declarative, etc.
- **`language_syntax`** — the concrete syntax features involved. ["async/await", "destructuring", "generics"]
- **`keywords`** — specific terms for search and matching. ["closure", "scope", "hoisting"]
- **`snippets`** — array of { quote, reason }. The actual code/text from the session that triggered the concept + why it matters. This is the proof that the concept is real, not abstract.

### Fields the user controls:

- **`name`** — user can edit the AI-suggested name before saving
- Which concepts to save (select/deselect from the extracted list)
- Which existing concepts to merge into (if the AI finds a similar one already saved)

### Fields the system manages:

- **`strength`** — starts at 0.5 on save, goes up with review, decays with time
- **`sessionIds`** — which sessions this concept appeared in (auto)
- **`createdAt`**, **`updatedAt`** — auto
- **`conceptLinks`** — connections to related concepts (auto from graph)

---

## What should the concept card look like?

The concept card is the visual representation of a concept everywhere in the app — in the Learning Hub list, in the concept preview modal, in the Save as Learning preview, in the Dot Connector injection, everywhere.

It needs to show at a glance:
- Name (large, readable)
- Strength indicator (color — red/yellow/green)
- Core concept label (small, muted)
- Architectural pattern badge (if exists)
- Paradigm badge (if exists)
- Language/syntax chips
- Keyword tags
- Summary (collapsed by default, expand on tap)
- Snippet preview (the saved code quote, monospace, collapsed)

The card in the Save as Learning modal should look IDENTICAL to the card in the Learning Hub. What you preview is what you get. No surprises after saving.

---

## The save flow — how it should feel

1. Long-press a bubble → "Save as Learning"
2. Modal opens → spinner for ~2 seconds while AI extracts
3. You see 1-5 concept cards rendered exactly as they'll look in the Hub
4. Each card is fully expanded showing all fields — you can read everything the AI captured
5. Tap any field to edit it inline
6. Deselect any concept you don't want
7. If there's a merge suggestion (similar concept exists) — tap to preview the existing card side by side
8. Tap "Save X concepts" — done
9. Subtle animation: the cards "fly" up into the Learning Hub (visual confirmation they're being added)

The whole flow should feel like curating a collection, not filling a form.

---

## Open questions to think about

1. **How granular should `core_concept` be?** Should "closure" and "lexical scope" be the same core concept or different? The AI will make judgment calls — do we need a user-editable taxonomy tree, or trust the AI's abstractions?

2. **Should snippets be editable?** The AI picks what to quote. Sometimes it'll pick the wrong line. Should the user be able to swap the snippet for a different part of the chat before saving?

3. **Concept merging vs concept linking** — when two concepts are similar, should we merge them into one (simpler) or keep them separate and link them (richer graph)? Currently we merge. Is that always right?

4. **What happens when the same concept gets saved from 5 different sessions?** Does the summary update? Do the snippets accumulate? Does the strength go up? We need a clear merge strategy for the data model.

5. **Language-agnostic vs language-specific** — should "closures in JavaScript" and "closures in Python" be the same concept or different ones? `core_concept` = "closure" for both, but `language_syntax` differs. The graph should probably link them as the same abstract concept with different language implementations.

6. **How many snippets per concept?** Java saved snippets per session. If you encounter the same concept in 10 sessions, do you accumulate 10 snippets? That's probably too many. Maybe keep the 3 most recent or most distinct?

---

## Domain-agnostic architecture — the app should be a learning engine, not a coding app

This is an architectural principle that should be decided now and baked in from the start, not retrofitted later.

CodeLens today is about learning code. But the core loop — read something, have a conversation about it, save what you understood, build a knowledge graph, review it later — that loop works for any domain. Math. Economics. Law. Biology. History. A medical student reading a textbook. A trader reading market research. A student studying philosophy.

The app is really a **domain-agnostic learning engine** that currently happens to be configured for code. If another developer wanted to fork it and make it work for mathematics, they should be able to do that by changing configuration and content, not by rewriting architecture.

**What this means in practice:**

The domain-specific parts should be clearly isolated and easy to swap:

- **The "source material" viewer** — currently a code viewer with syntax highlighting and line marking. For math it would be a PDF reader or LaTeX renderer. For economics it would be a document viewer. This should be a swappable adapter behind a `ContentViewerPort` interface — not hardcoded as "this is a code viewer."

- **The concept taxonomy** — currently has fields like `architectural_pattern`, `programming_paradigm`, `language_syntax`. For math these would be `theorem_type`, `proof_technique`, `mathematical_domain`. The taxonomy schema should be defined in a domain config file, not hardcoded into the extraction prompt or the DB schema. The AI extraction prompt should be generated from that config.

- **The extraction prompt** — currently instructs the AI to extract CS concepts. This prompt should be templated from a domain config: "You are extracting [domain] concepts from [source type]..." with domain-specific field definitions injected from config.

- **The Dot Connector prompt** — same. The memory bridge tone ("Eyy, this should look familiar...") works for any domain. The field names it references (core_concept, architectural_pattern) should come from domain config.

- **UI labels** — "Code viewer", "Section chat", "Mark code" — these are domain-specific labels. They should come from a domain config, not be hardcoded strings scattered across components.

**What does NOT change across domains:**
- The DB schema core (concepts, sessions, embeddings, chats, links) — universal
- The vector search and FTS5 retrieval — universal
- The Hot/Cold tier memory management — universal
- The backup/restore system — universal
- The chat infrastructure — universal
- The knowledge graph — universal
- The strength scoring — universal

**What the domain config file looks like:**
```ts
// src/domain/config.ts  (or domain-config.json)
export const DOMAIN = {
  name: 'Software Engineering',
  sourceType: 'code',
  viewer: 'code',         // 'code' | 'document' | 'pdf' | 'latex'
  taxonomy: {
    fields: [
      { key: 'core_concept',          label: 'Core Concept',           required: true  },
      { key: 'architectural_pattern', label: 'Architectural Pattern',  required: false },
      { key: 'programming_paradigm',  label: 'Programming Paradigm',   required: false },
      { key: 'language_syntax',       label: 'Language / Syntax',      required: false },
      { key: 'keywords',              label: 'Keywords',               required: false },
    ]
  },
  extractionPromptContext: 'computer science and software engineering',
  ui: {
    sourceLabel: 'Project',
    fileLabel: 'File',
    viewerLabel: 'Code Viewer',
    sectionChatLabel: 'Section Chat',
    markLabel: 'Mark',
  }
};
```

A math fork changes this file and the extraction prompt template adapts automatically. The DB, the vector search, the graph, the backup — all untouched.

**The rule:** if a piece of code contains the word "code", "programming", or "software" as a hardcoded string that a math student would never see — it belongs in domain config, not in the source.

This doesn't mean over-engineering it now. It means being conscious of where domain assumptions live and putting them in one place. The coding done for CodeLens stays 100% focused on the coding use case — but a future developer can look at `domain-config.ts`, change 20 lines, and have a math learning app with the same powerful engine underneath.

## How hard is a domain fork? Three examples

### Fork 1 — Economics / Finance
Someone wants to read market research, earnings reports, economic papers. Save concepts like "price elasticity", "monetary policy transmission", "yield curve inversion." Build a knowledge graph of economic mechanisms.

Taxonomy fields would look like:
- `core_mechanism` — the economic principle (e.g. "supply/demand equilibrium")
- `economic_school` — Keynesian, Austrian, Monetarist, Behavioral
- `market_domain` — equities, fixed income, macro, micro
- `analytical_framework` — DCF, regression, game theory
- `keywords` — same as coding version

Content viewer — PDF reader or web article viewer instead of code viewer. No syntax highlighting needed. Marking still works identically — highlight a paragraph instead of a line.

GitHub import → replaced by PDF upload or URL paste.

**Estimated effort: 2 weeks.** The domain is text-heavy not code-heavy so the viewer swap is simpler than the math case.

---

### Fork 2 — Mathematics
Someone wants to read textbooks, work through proofs, save theorems and techniques. Build a graph of mathematical knowledge.

Taxonomy fields:
- `theorem_type` — existence, uniqueness, construction, equivalence
- `proof_technique` — induction, contradiction, direct, contrapositive
- `mathematical_domain` — topology, linear algebra, calculus, number theory
- `prerequisites` — what you need to know first
- `keywords` — same

Content viewer — LaTeX renderer or PDF viewer. Marking works on equations and paragraphs.

**Estimated effort: 3 weeks.** LaTeX rendering is a real native component challenge. Extraction prompt needs mathematical domain expertise to produce useful concept names.

---

### Fork 3 — "MyBrain" (the simplest fork)
No specific domain. Just a general knowledge capture app. You paste or import anything — an article, a book chapter, a conversation, a video transcript — and save what you learned from it.

Taxonomy collapses to almost nothing:
- `core_idea` — what is this concept in plain language
- `domain` — user-defined free text (math, cooking, history, whatever)
- `keywords` — same

No code viewer, no syntax highlighting, no GitHub import. Just a text paste box and a chat. The entire content viewer complexity disappears.

**Estimated effort: 1 week.** This is the easiest fork because you remove complexity rather than swap it. The learning engine, graph, vector search, backup — all identical.

---

## What a developer needs to fork this

If you want to fork CodeLens for a new domain, here is exactly what to change and what to leave alone:

**Change these (~15-20 files):**
```
src/domain/config.ts          ← domain name, taxonomy fields, UI labels
src/domain/prompts.ts         ← all system prompts (templated from config)
src/features/learning/
  application/extract.ts      ← extraction prompt (templated from config)
src/lib/github.ts             ← swap for your content import method
src/ui/components/
  CodeViewer.tsx              ← swap for your content viewer
  NewProjectModal.tsx         ← swap import flow for your source type
app/project/[id].tsx          ← viewer screen composition
```

**Leave these completely alone:**
```
src/db/                       ← entire DB layer, schema, migrations
src/features/learning/
  application/commit.ts       ← concept saving
  application/retrieve.ts     ← vector + FTS5 search
  application/gc.ts           ← hot/cold tier memory management
src/features/backup/          ← entire backup/restore system
src/adapters/                 ← sqlite-vec, MMKV, secure store
src/ports/                    ← interfaces unchanged
src/composition.ts            ← wiring unchanged
src/graph/                    ← knowledge graph unchanged
src/ai/                       ← queue, fallback engine, embeddings
```

**The rule of thumb:** if it's about storing, retrieving, or connecting knowledge — don't touch it. If it's about what kind of knowledge and how it looks — that's yours to change.

The categorization is the only thing that truly changes between domains. Everything else — the vector search, the graph, the memory management, the backup, the chat infrastructure — is a universal learning engine that doesn't care if you're learning Rust or Renaissance art.

## The bigger picture

The Save as Learning moment is where passive reading becomes active knowledge. Every other feature in the app — the Dot Connector, the Learning Hub, the knowledge graph, the Review Mode, the Knowledge Health screen — they all depend on the quality of what gets saved here.

If the concepts are shallow (just a name and a 2-line summary), the whole learning system is shallow.
If the concepts are rich (core mechanism, pattern, paradigm, real code snippet, keywords), the whole system becomes genuinely intelligent.

This is the foundation. Get this right and everything else builds on it naturally.
