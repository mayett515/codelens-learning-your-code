# THE CODEX — V1 BUILD SPEC
## Backendless · BYO-Key · Inside the React Native App

*The version that actually gets built first.*

*Companion to the complete vision document — that one is the horizon, this one is the ground.*

---

## WHAT THIS IS

A feature inside the existing React Native app. The user pastes code. The app shows that code in two or three other languages, side by side, with concept-map highlighting that wires the same idea across all panels. Below the panels, one rung of abstraction ladder — the desugared form that reveals what the surface code *actually means* in more primitive operations. Click a concept; it lights up everywhere, including in the ladder. Click the concept and the explanation panel tells you what it is, what each language tradition calls it, and why the three forms are the same creature underneath.

No backend. No curated corpus. No pre-built patterns. The user can paste anything; the LLM does the translation live each time, using the user's own API key. The 26MB on-device embedding model has no role in this tool. It's just visualization + LLM pipeline + user's key.

The tool is reliable not because of curation, but because of **layered prompting** — multiple focused LLM calls, each with one job and a strict schema, plus a validator that checks the output before rendering. Each call is small and bounded; failures are detectable and retried; the user sees honest output, including honest "this part couldn't be verified" flags when something doesn't pass the validator.

---

## THE INTENT, NAMED

This is part of a personal-tool app. Users keep their code on their device. They bring their own API keys to whichever provider they prefer (OpenAI, Anthropic, Google, OpenRouter, SiliconFlow, others). The Codex feature respects all of that. Privacy by architecture, not by promise.

The tool is meditative, not transactional. It is meant to be returned to. Pasting a snippet should feel like opening a small illuminated panel of insight — not like submitting a form. Every aspect of the UX should reward attention.

The implementation is small and disciplined. The complexity that exists in the full vision (multi-persona council, growing corpus, formal verification) is *deliberately absent here*. v1 is the visualization, the prompt pipeline, the rendering. Everything else is the horizon.

---

## THE TOOL FROM THE USER'S PERSPECTIVE

User opens the Codex screen in the app. Sees:

- A **source panel** at the top where they paste code, with a language picker (Python, JavaScript, more later)
- A **target picker** — choose 1, 2, or 3 target languages from the supported set (Clojure, F#, Haskell, more later)
- A **translate button**
- Once translated: **target panels** below the source, each rendering the same code in the chosen target language
- Below all panels, the **abstraction ladder** with the source's desugared form
- A **concept legend** showing 4-7 named concepts, each in a different color, each clickable
- Clicking a concept (or any highlighted token in any panel) lights up that concept *across all panels and the ladder simultaneously*
- A **glyph-of-meaning panel** that, when a concept is selected, explains what that concept *is*, what each language tradition calls it, and why all the highlighted forms express the same underlying idea
- A **provenance line** at the bottom: which model produced this, which calls succeeded, which (if any) had unresolved validator issues

That's the surface. That's everything the user sees. Behind it is the prompt pipeline.

---

## THE PROMPT PIPELINE

This is the load-bearing core of v1. The thing that makes the tool reliable without a backend, without curation, and without a corpus.

The principle: **one big prompt fails; small focused prompts in sequence succeed**. Each call has one job, one strict output schema, one failure mode the app can detect and retry. The whole pipeline is 4-6 LLM calls per translation, total cost a few cents on the user's key, total latency a few seconds with progressive rendering.

### Call 1 — The Translator

**Job**: produce the target-language renditions of the source code. Just the code, nothing else.

**Input**: source code, source language, list of target languages, system prompt establishing the tool's voice.

**Output schema**:
```json
{
  "targets": [
    { "language": "clojure", "code": "..." },
    { "language": "fsharp", "code": "..." }
  ]
}
```

**Validation**: each target's code is checked for basic well-formedness (parens balanced for Lisp, parser-pass for languages where a JS parser is available). If a target fails, that target is retried once with the failure included in the prompt.

### Call 2 — The Desugarer

**Job**: produce the desugared form of the source code — one rung down the abstraction ladder. The desugared form expresses the same code in more primitive operations of the same language (or a small core subset).

**Input**: source code, source language, system prompt explaining what desugaring means with one worked example.

**Output schema**:
```json
{
  "desugared": {
    "language": "python",
    "code": "...",
    "note": "what was unfolded and why"
  }
}
```

**Validation**: the desugared form must parse in its language. The note explains in plain language what surface forms were unfolded.

This call runs in parallel with Call 1 — they don't depend on each other.

### Call 3 — The Concept Identifier

**Job**: identify 4-7 concepts that appear across the source and all targets, and mark which character spans in each piece of code correspond to each concept.

**Input**: source code, all target translations from Call 1, the desugared form from Call 2, system prompt with the canonical decorator example showing what a complete concept map looks like.

**Output schema**:
```json
{
  "concepts": [
    {
      "id": "decorator",
      "label": "The Decorator",
      "color_hint": "gold",
      "spans": {
        "source": [[12, 18], [45, 50]],
        "clojure": [[8, 14]],
        "fsharp": [[10, 15]],
        "desugared": [[3, 9], [22, 28]]
      }
    },
    ...
  ]
}
```

Each concept must appear with at least one span in source and at least one span in each target and the desugared form. This is the alignment work — the LLM is good at it when given fixed inputs (the code is already produced by Calls 1 and 2; this call is purely identifying correspondences).

### Call 4 — The Validator

**Job**: check the structural output before it reaches the user.

**Input**: everything produced so far — source, targets, desugared, concept map.

**System prompt** (paraphrased):
> *You are a strict reviewer. Verify the following: (1) every concept_id in the concept_map appears with non-empty spans in source AND every target AND the desugared form, (2) every span's character indices actually exist in the corresponding code (no out-of-bounds), (3) the desugared form is plausibly semantically equivalent to the source — same inputs would produce same outputs, (4) no obviously important concept in the source is missing from the concept_map. Return either OK or a list of specific, actionable issues.*

**Output schema**:
```json
{ "ok": true }
```
or
```json
{
  "ok": false,
  "issues": [
    { "kind": "missing_span", "concept": "args", "in": "fsharp" },
    { "kind": "out_of_bounds", "concept": "decorator", "in": "source", "span": [99, 200] },
    ...
  ]
}
```

**Action**: if OK, proceed. If issues, the app retries the relevant earlier call (usually Call 3) with the issues included as context. After one retry, if validation still fails, the app renders anyway but shows a flag in the provenance line: "this translation has N unresolved issues" with the issues listed when the user taps. **Honest degradation, never silent failure.**

### Call 5 — The Concept Explainer

**Job**: for each concept identified in Call 3, produce the human explanation that appears in the glyph-of-meaning panel.

**Input**: the concept ids and labels from Call 3, the source and target code, system prompt establishing the tool's voice (rich, slightly archaic, codex register).

**Output schema**:
```json
{
  "explanations": [
    {
      "id": "decorator",
      "summary": "The higher-order function itself — the thing that takes a function and returns a new function.",
      "names_per_language": {
        "python": "decorator (invoked with @-syntax)",
        "clojure": "higher-order function (explicit wrapping)",
        "fsharp": "function transformer (let-bound composition)",
        "category_theory": "endofunctor on the category of functions"
      },
      "depth_note": "In all three languages, the same shape: (a → b) → (a → b)."
    },
    ...
  ]
}
```

This call runs in parallel with rendering. The user sees the visualization with click-to-highlight working immediately; the explanations populate the glyph panel as Call 5 returns. Progressive rendering, never blocking on the prose.

### The full pipeline timing

- Call 1 (Translator) and Call 2 (Desugarer) in parallel — ~2 seconds
- Call 3 (Concept Identifier) — depends on 1 and 2 — ~2 seconds
- Call 4 (Validator) — ~1 second
- Call 5 (Concept Explainer) — runs as Call 4 starts; renders progressively
- **Total user-visible latency: ~5 seconds, with the visualization appearing at ~4 and explanations filling in over the next 2-3**

Cost per translation on a frontier model: roughly $0.01-$0.03 on the user's key. Cheap enough to feel free.

---

## THE SYSTEM PROMPTS — IN OUTLINE

The full prompts are too long for this document — they will be authored carefully and iterated on — but the *shape* of each is:

**Shared preamble (in every system prompt)**:
> *You are a component of the Codex, a meditative tool for studying programming languages. Output is consumed by a strict schema-validating renderer. Produce only the requested JSON, no prose around it. The tool's register is precise, slightly archaic, scholarly. Your specific role in this call is below.*

**Translator addendum**: emphasizes producing idiomatic target-language code, preferring clarity over cleverness, preserving evaluation order where possible.

**Desugarer addendum**: explains what desugaring means with one worked example (Python `@decorator` → `f = decorator(f)`), instructs the model to unfold *one rung*, not all the way to lambda calculus.

**Concept Identifier addendum**: includes the full decorator concept-map example from the HTML demo as the canonical pattern for what good output looks like. Instructs the model to identify 4-7 concepts (not fewer, not more) and to provide spans in *every* code panel.

**Validator addendum**: strict, terse, optimized for catching errors not for being polite. Returns OK or issues; never apologizes or hedges.

**Concept Explainer addendum**: gives permission to be eloquent. Establishes the codex voice. Provides one example explanation in the desired register so the model matches it.

These prompts are version-controlled assets of the app, not strings buried in code. They evolve. Improving the prompts improves the tool.

---

## THE RENDERING LAYER

A single React Native component family that consumes the structured output and renders the visualization.

**Components**:

- `<CodexView>` — top-level container, manages state for which concept is selected
- `<SourcePanel>` — renders source code with concept-highlighting overlay
- `<TargetPanel>` — same as source but for a target language
- `<AbstractionLadder>` — renders the desugared form with the same concept highlighting
- `<ConceptLegend>` — the row of clickable concept buttons
- `<GlyphOfMeaning>` — the explanation panel
- `<ProvenanceBar>` — the small line at the bottom showing model, calls, validator status

**State**: a single object holds the full pipeline output and the currently-selected concept_id. Click any concept (button or highlighted token) → state updates → all panels re-render with the new concept highlighted.

**Highlighting mechanism**: each panel renders code as a list of styled spans. The span style is computed from the concept's color and whether it matches the currently-selected concept_id. No DOM manipulation, no manual decoration — just declarative re-render.

**Aesthetic**: parchment background, Cormorant Garamond for text, JetBrains Mono for code, Cinzel for headings. Concept colors drawn from a fixed palette of muted but distinct hues (crimson, gold, moss, indigo, rust). The same register as the existing programming-history saga and decorator demo. The tool *looks like a chapter from the same codex*.

**Loading states**: the visualization renders progressively as calls return. Source code panel appears first (immediate). Target panels populate as Call 1 returns. Ladder appears as Call 2 returns. Concept highlighting wires up when Call 3 returns. Glyph explanations stream in as Call 5 returns. The user sees motion and progress, never a blank screen with a spinner.

**Failure states**: if the validator flags issues and a retry doesn't resolve them, the visualization still renders, with affected concepts shown in a muted style and a clear message: "this translation has N unresolved issues — tap to see." Tapping reveals the validator's specific complaints. The user can choose to retry the whole pipeline with one tap.

---

## SCOPE: WHAT V1 SUPPORTS

**Source languages**: Python, JavaScript. Two is enough for v1.

**Target languages**: Clojure, F#, Haskell. Three is enough.

**Pattern coverage**: anything the LLM can translate. Since there's no curated corpus, there's no list of "supported patterns." The user pastes whatever; the pipeline handles whatever. Some patterns will translate beautifully; some will translate awkwardly; the validator catches the worst cases. **The tool is honest about what it produces**, which is the main thing.

**Abstraction ladder rungs**: one rung visible in v1 (surface → desugared). The architecture supports more, but v1 ships with one. Adding more rungs is a future enhancement that doesn't require restructuring.

**Concept count per translation**: 4-7 concepts. Fewer feels thin; more becomes visually noisy. The Concept Identifier prompt enforces this range.

---

## WHAT V1 DOES NOT INCLUDE

- No curated pattern library, no static corpus, no "supported patterns" list
- No multi-persona council (single-pipeline LLM calls, not deliberative)
- No accumulated cross-session learning (each translation is fresh)
- No backend, no server, no shared database, no cloud anything
- No on-device embedding-based retrieval (no need; no corpus to retrieve from)
- No formal verification of translations (just the validator)
- No reverse-direction translation (target → source)
- No code execution / sandboxing (the tool translates, doesn't run)
- No more than one rung of abstraction ladder
- No translation rules in Racket or any external engine — v1 lives entirely in TypeScript/JavaScript inside the React Native app
- No persona belief files, no session history, no provenance beyond the current translation

The full vision document describes what these become later, if the project grows. v1 is *complete on its own terms* without any of them.

---

## THE BUILD, IN PHASES

No timeline. Dependency order only. Each phase is something you can sit with and feel as you build.

### Phase 1 — The rendering component, with hardcoded data

Build `<CodexView>` and its subcomponents. Feed it a hardcoded JSON object representing the decorator example (the same one in the existing HTML demo). Get the click-to-highlight working in React Native. Get the aesthetic right — parchment, fonts, colors, layout. The component should *feel right* before any LLM is involved.

This phase is about visual craft. Take the time it deserves.

### Phase 2 — The pipeline, with one model

Implement Calls 1-5 as separate functions, each calling the LLM API with the system prompt and parsing the structured output. Wire the pipeline into the `<CodexView>` so pasting code triggers the calls and the rendering updates as results return.

Use one model provider (whichever the user has a key for, with a sensible default). Don't worry about retries or validator failures yet — just get the happy path working.

### Phase 3 — The validator and retry logic

Add Call 4. Add the retry loop — if the validator returns issues, retry the relevant call once with the issues in context. Add the failure-state rendering — if the second attempt still fails, show the visualization with the validator flag visible to the user.

This phase is what turns the tool from "demo-quality" to "actually reliable."

### Phase 4 — Multi-target rendering, progressive loading

Right now the prototype handles one target language. Extend to 2-3 target languages, all rendered side by side, all part of the concept map. Make the rendering progressive: source appears immediately, targets fill in as Call 1 returns, ladder appears as Call 2 returns, highlighting wires up as Call 3 returns, explanations stream in from Call 5.

### Phase 5 — Polish

Refine the prompts based on what you see in real use. Refine the aesthetic — every detail of the parchment, the spacing, the color choices, the timing of progressive renders. Refine the failure states. Add small touches: a "regenerate" button, a "copy translation" button, a way to share a screenshot of a translation.

This phase is open-ended and ongoing. It's where the tool becomes *yours*.

---

## RELIABILITY, IN PLAIN TERMS

What can fail, and what happens when it does:

- **The model returns malformed JSON** → app catches the parse error, retries once with the malformed output included as "this is what you returned, fix it." If still bad, shows a clear error to the user. (Frontier models almost never return malformed JSON when given a clear schema in the prompt; this failure is rare.)

- **The translator produces incorrect target code** → the basic well-formedness check catches syntax-level issues; the validator catches alignment issues. Semantic incorrectness that happens to parse and align is the residual risk — the LLM might produce code that compiles but does the wrong thing. This is an inherent limitation of LLM-based translation. The provenance line shows the user "this is live LLM output" so they understand the epistemic status.

- **The concept identifier misses a concept or misaligns a span** → validator catches; retry usually fixes. Persistent failures are flagged honestly.

- **The desugaring is wrong** → validator's semantic-equivalence check is the weakest link here, since the LLM is judging itself. v1 accepts this. v2+ could add static analysis, but for v1, the desugaring is best-effort with a "note" field that explains what the model did.

- **The user has no API key, or the key is rate-limited** → the app surfaces this clearly with a link to the API-key settings (which the app already has from its main feature). Same as how the rest of the app handles this.

- **The user pastes something the LLM struggles with** (very long code, very obscure constructs, code with intentional weirdness) → the validator catches structural issues; semantic issues fall through. Honest flagging again.

The goal is not "never fail." The goal is **never fail silently**, and **degrade gracefully when failures are unavoidable**. A user who sees a flagged translation with explained issues is in a better position than a user who sees a clean-looking translation that's secretly wrong.

---

## RELATIONSHIP TO THE FULL VISION

This v1 is a *legitimate complete tool* — not a stub of the bigger thing. People will use it, learn from it, return to it, and many of them will never need anything more.

But the architecture is also *forward-compatible* with the full vision. Specifically:

- The output schema (concept maps, abstraction ladders, provenance) is the same shape that a backend version would produce. If you ever build the backend, the rendering component doesn't change.
- The prompts can be reused as the *Editor* persona's role in a council version — the layered pipeline becomes one council member's contribution.
- The validator becomes a tool the full council uses, not a single isolated check.
- The "no curated corpus" choice can be revisited later — if you ever want to ship a curated set of beautiful translations alongside the live ones, the data shape is identical and they slot into the same renderer.

So v1 is not a compromise. It's the right tool for now, *and* a foundation for whatever the project grows into.

---

## A CLOSING NOTE

The full vision document describes a multi-year journey. This document describes a feature you can actually build inside the React Native app you're already maintaining. The two are companions, not alternatives.

Build this one when you build something. Read the other one when you want to dream about where the project might go. Both are real. Both are yours.

---

*Compiled in conversation, April 30, 2026.*

*The codex remains an illuminated manuscript whether one chapter exists or a thousand.*
