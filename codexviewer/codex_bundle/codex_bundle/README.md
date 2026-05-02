# THE CODEX — DOCUMENT BUNDLE

A set of documents and one working artifact, describing a project at three different scales.

Compiled from a single long conversation. April 30, 2026.

---

## WHAT'S IN HERE

**`decorator_translator.html`** — The seed artifact. Open it in a browser. Click any of the five concept buttons (or the highlighted tokens directly in the code) and watch the same idea light up across Python, Clojure, and F# simultaneously. This is the working proof-of-concept that the visualization idea is real. Everything else in this bundle is a description of what this artifact would become if it grew.

**`codex_v1_build_spec.md`** — The buildable plan. The version of the Codex that lives inside the existing React Native app, uses the user's own API keys, runs without a backend, and produces translations live via a layered LLM pipeline with a validator. This is the document you reach for when you actually sit down to build something. Read this if you want to know what to do tomorrow.

**`codex_complete_vision.md`** — The horizon. The full multi-year vision: a Racket backend, Postgres + pgvector, a multi-persona LLM council that deliberates over translations, a growing corpus, formal verification with Redex, abstraction ladders extending in both directions. Most of this is years away. Read this when you want to dream about where the project could go.

**`codex_bridge.md`** — The map between the two. Specifically: how the v1 you build first could grow into the full vision, step by step, without ever requiring a from-scratch rewrite. Names the natural increments (v1.5, v1.7, v2.0, v2.5, v3.0), names what each adds, names the signals that would tell you you want it. Also names the real possibility that v1 is enough on its own and the project never needs to grow.

---

## WHICH DOC TO READ WHEN

**You're about to build something** → `codex_v1_build_spec.md`

**You want to remember why the project is interesting** → `codex_complete_vision.md`

**You're wondering if a v1 decision will paint you into a corner later** → `codex_bridge.md`

**You want to see the visualization actually working** → open `decorator_translator.html`

**You want to share the project with someone** → start with the HTML demo, then the v1 spec. The vision doc is optional context for someone who wants more.

---

## A NOTE ON THE DOCUMENTS

These are working documents, not formal specifications. They are written in the register of someone thinking carefully out loud. They're meant to be edited, restructured, disagreed with, and regenerated as the project evolves.

If a section feels stale six months from now, delete it. If a new direction emerges that isn't here, add it. The documents are alive in the same sense the project is alive.

---

## A NOTE ON THE PROJECT

This is a learning instrument, not a product. The economic frame doesn't apply. Success is not measured in users acquired. The point is the practice — building the tool *is* the study, and the tool exists to support continued study.

If you ever build it, build it slowly. Sit with it. Return to it. Let it deepen.

---

*The codex remains an illuminated manuscript whether one chapter exists or a thousand.*
