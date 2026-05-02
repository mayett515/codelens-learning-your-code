# THE CODEX — BRIDGE DOCUMENT
## How v1 Grows Into the Full Vision

*A map between two documents that describe the same project at different scales.*

---

## WHAT THIS DOCUMENT IS

You have two specs:

- **The v1 Build Spec** — backendless, BYO-key, inside the React Native app, no corpus, live LLM pipeline. The thing you actually build first.
- **The Complete Vision** — Racket backend, Postgres + pgvector, multi-persona LLM council, growing corpus, formal verification, abstraction ladders extending in both directions. The horizon.

This document is the third piece. It answers: *if v1 lives and breathes and you ever want it to grow, what are the actual paths from here to there?* Not abstractly. Concretely. Which decisions made in v1 keep options open. Which signals from v1 use indicate you should grow into v1.5 or v2. What the migration paths actually look like, file by file.

The point is not to commit to growing the project. The point is to make sure that if growth ever feels right, the path exists and is cheap to walk. v1 is a *complete tool*. The bridge is *optional*. But the bridge is also *real* — it isn't aspirational hand-waving.

---

## THE CORE INSIGHT THAT MAKES THE BRIDGE POSSIBLE

Both versions produce **the same data shape**. Whether a translation comes from a single LLM pipeline call (v1) or from a six-persona council deliberation with formal verification (full vision), the output schema is identical:

```
{
  source: { language, code, ast_summary? },
  targets: [{ language, code, concept_map }],
  abstraction_ladder: [{ rung, code, note }],
  provenance: { ...origin metadata... }
}
```

This is the load-bearing decision of the whole project. Because the schema is stable across implementations:

- **The rendering component never changes.** v1's React Native visualization renders the v2 backend's output without modification. v3's category-theory rung slots in next to the existing rungs without restructuring.
- **The corpus is the same kind of thing as the cache.** A curated entry from the future canonical-pattern DB looks identical to a successful live translation from v1. They're interchangeable.
- **You can run versions side by side.** During the migration to v2, the React Native app could keep using v1's pipeline as a fallback while the new backend warms up. No big-bang switchover.
- **The user experience evolves smoothly.** Users don't see "v1 features" vs "v2 features" — they see translations getting deeper and richer over time, with the visualization unchanged.

This means **the question is never "rebuild it" — it is always "extend it."** Which is why the bridge is real and not a polite fiction.

---

## THE GROWTH PATHS, IN ORDER

These are the natural increments. Each one is a project of its own. None require you to do the others. They are *available*, not *required*.

### Path 0 — Stay at v1 forever

This is a real option and worth naming first.

v1 — backendless, BYO-key, layered prompting, no corpus — is a *complete and beautiful tool* on its own terms. It respects user privacy. It runs forever without operational cost on your end. It teaches the user about cross-language structure every time they paste code. Many users would be perfectly served by it indefinitely. Many *projects* are perfectly served by their v1 indefinitely.

If you build v1 and it feels right and you don't want to grow it further, that is not a failure mode. That is the project working correctly. The full vision document is a *possibility*, not an *obligation*.

The signals that you might want to stop here: v1 feels complete. You're not finding gaps that bother you. The translations users are seeing are good enough. The aesthetic is right. You return to it, you enjoy it, you don't feel a hole.

### Path 1 — v1.5: The Validator gets smarter

**What changes**: the validator step in the v1 pipeline gets enhanced. Instead of a single LLM call checking the previous outputs, it becomes a small ensemble — two or three different models check the same translation and surface specific disagreements.

**Why this is the natural next step**: it's the smallest possible move toward "council" thinking, and it stays entirely within v1's backendless architecture. The user is already paying for LLM calls; running two validators instead of one roughly doubles validation cost (still pennies) but materially improves reliability for tricky translations.

**What it looks like in code**: the `validate()` function in the pipeline becomes a small fan-out. You call validator-A and validator-B in parallel, compare their output, and:
- Both say OK → render confidently
- Both flag the same issue → very likely a real issue, retry
- One says OK, the other flags → render with a soft warning ("models disagreed about [specific thing]"), let the user decide
- Both flag *different* issues → render with both warnings, the user sees the full picture

**What it gives the user**: a glimpse of the council aesthetic — the experience of seeing dissent, of knowing that judgment was applied, not just generation. This is the smallest dose of the full vision's most distinctive feature.

**Signals that you want this**: users (or future-you) saying "this translation looked right but turned out to be wrong" more than once. The validator catching things sometimes but missing them other times. A desire for transparency about translation quality.

**What you keep from v1**: everything. No backend added, no schema changed, no rendering changes. You're just doubling up one of the existing pipeline steps.

### Path 2 — v1.7: Optional curated examples in prompts

**What changes**: ship a small JSON file with the app — 10-30 hand-crafted "exemplar" translations. Before the LLM pipeline runs, the on-device 26MB embedding model (already in your app) finds the 1-3 most similar exemplars to the user's input and includes them as few-shot examples in the prompt.

**Why this is interesting**: it's the v1 of a corpus, in disguise. The user never sees a "list of supported patterns" — they paste anything, just like before. But the LLM is now *anchored* to your aesthetic and your concept-mapping conventions via examples it sees in the prompt. Quality and consistency go up significantly, especially for the concept identification step.

**Important nuance**: this is *not* a curated corpus the user picks from. It's reference material the LLM consults *internally*, invisibly. The tool still translates anything the user pastes. But the translations follow your taste because the LLM is being shown your taste in real time.

**What it looks like in code**: a new `findExemplars(sourceCode, sourceLanguage)` function that runs before Call 1 and Call 3 of the pipeline. Embeds the input, does cosine similarity against the bundled exemplars, picks top-3, includes them in the prompts as "here are similar translations from our codex — follow their structural conventions." Your existing on-device embedding model handles this with no new dependencies.

**What it gives the user**: noticeably more consistent output. Concept maps that have stable concept names across similar inputs. Translations that all *feel* like they belong to the same tool, not to whichever model the user happened to pick.

**Signals that you want this**: variability in output bothering you. Different runs producing slightly different concept names for the same idea ("the wrapped function" vs "the inner function"). A desire to express your *taste* in the tool more than the layered prompts alone allow.

**What you keep from v1**: still backendless. Still BYO-key. Still no curated corpus the user picks from. Just smarter prompting using assets bundled with the app.

### Path 3 — v2.0: A real backend appears

This is the big jump. Once you cross this line, the project's operational character changes — there's a server, there's a bill, there's something to maintain. Worth being deliberate about when and why.

**What changes**: a Racket backend exists. Postgres + pgvector exists on the same server. Successful translations from the live pipeline can optionally be *promoted* to canonical entries in the backend's pattern database. The React Native app gains a setting: "use the Codex backend for richer translations" — when enabled, the app calls your backend instead of (or in addition to) the user's LLM key directly. When disabled, v1's BYO-key pipeline continues to work exactly as before.

**Why this is the right shape, not a replacement**: you don't *replace* v1's BYO-key flow. You *augment* it. Users who care about privacy keep using v1. Users who want better translations can opt into the backend. The backend acts as a quality multiplier, not a gatekeeper. Both modes use the same rendering and produce the same output schema.

**The minimum the backend needs to be useful**:

- Postgres + pgvector running locally on a small VPS (~€15/month at Hetzner)
- A small Racket web server exposing one endpoint: `POST /translate`
- The same prompt pipeline as v1, but running server-side with stronger models
- An on-server embedding service (Ollama with `nomic-embed-text`)
- Caching: the first time anyone gets a translation for a given pattern, it's stored. The second time anyone gets the same pattern, it's instant retrieval.

That's it. No council yet, no Redex, no formal verification. Just the same v1 pipeline, but server-side, with caching. Even this minimal v2 produces visibly better translations because (a) it can use stronger / more expensive models without billing the user, (b) cached patterns are instant, (c) the embedding-based retrieval has access to *all users' successful patterns*, not just the bundled exemplars.

**What it looks like in code**: a new branch in the React Native app's translation logic. If "use backend" is on and the app can reach it, send the translation request to your server. Otherwise, run the local pipeline. The output schema is identical, so the rendering layer doesn't care which path produced the result.

**Migration of accumulated work from v1**: any exemplars you bundled with the app (Path 2) become seed entries in the backend's pattern database. Any successful translations users have run on-device can be optionally synced (with their permission, of course) to seed the backend's cache. This is genuinely useful — the backend starts with real-world data, not empty.

**Signals that you want this**: v1 is being used heavily, you see the same patterns being translated repeatedly across users, you want to *learn* from the collective use of the tool. Or: you want to use stronger models than your users will pay for. Or: you want the tool to get smarter over time as a single knowledge base rather than as N independent caches.

**What you keep**: every line of v1 code. The backend is additive. v1 remains the fallback (and the privacy mode) forever.

### Path 4 — v2.5: The persona council

**What changes**: replace the single-pipeline backend translation logic with the multi-persona council from the full vision. Category Theorist, Type Theorist, Pragmatist, Systems Realist, Historian, Editor. Round protocol. Vetoes. Recorded dissent. Belief files accumulating across sessions.

**Why this is meaningful**: it's the moment the tool becomes *distinctive*. Most LLM-powered translation tools produce a translation. The council version produces a *deliberation*, with dissent visible to the user. That's the thing nobody else does.

**What it looks like in code**: the backend's `translate()` function gets replaced by `councilDeliberate()`. The output schema gains a `council_session` field with the full discourse. The rendering component on the phone gains a "council drawer" that, when tapped, shows the deliberation. The drawer is a new UI element but uses the same data shape pattern as everything else.

**Cost implications**: each council session costs ~5-10x what a single pipeline call costs (more models, more rounds). This is why the cache matters — only novel patterns trigger the council. Everything else is served from the DB instantly.

**Signals that you want this**: v2's single-pipeline backend is producing translations that are *fine* but not *deep*. You want the tool to teach not just "what's the translation" but "what are the considerations in choosing this translation." You want the artifact to be discourse, not just code.

**What you keep**: v1 fallback. v2's caching. The same rendering. The user can opt into council deliberations or stay with simple translations. Three modes (BYO-key local, backend simple, backend council) coexist.

### Path 5 — v3.0: Formal verification with Redex

**What changes**: the canonical patterns in the DB gain *formal specifications* in Redex. The translation rules are written as reduction relations. Properties like type preservation, referential transparency, and evaluation order are *mechanically checked* for each canonical pattern.

**Why this is the long horizon**: it's where the project becomes *research*, not just engineering. Most code translation tools produce plausible output. A Redex-verified Codex can make actual claims: "this translation provably preserves the source's type structure" or "this translation provably preserves evaluation order under these conditions."

**What it looks like in code**: a new module in the Racket backend that reads canonical pattern entries from the DB and runs Redex verification on them. Failed verifications get flagged in the DB; the council is asked to revise. Successful verifications get a "verified" badge that surfaces in the user's UI as additional confidence.

**Signals that you want this**: you've been working with the tool long enough to notice that some translations are *technically correct in a way you can't prove*, and you want to be able to prove them. You've read Pierce, Wadler, Felleisen on translation correctness and you want the tool to live up to those standards.

**What you keep**: everything. Redex verification is purely additive — it adds a "verified" status to entries, never invalidates the existing flow.

### Path 6 — v3+: The expansions

These are open-ended. Each is its own world.

- **Reverse translation**: target → source. Doubles the corpus work but uses identical infrastructure.
- **Upward abstraction**: the abstraction ladder grows beyond surface and desugared, into category-theoretic forms. The decorator becomes "an endofunctor." A new rung type, same data structure.
- **More languages**: Rust, Scala, OCaml, Erlang, Elixir, Kotlin. Each is a parser, a translation rule set, and corpus growth.
- **Bytecode/IR rung**: descend below lambda calculus to actual machine reality. Parser changes, rule changes, but visualization unchanged.
- **Cross-paradigm translation with explicit effect tracking**: imperative → functional with the effects made visible. This is its own deep research project.
- **User-authored translation rules**: the user teaches the system new patterns by example. The Pragmatist persona reviews and curates. The corpus becomes user-extended.

Each of these is a separate, scoped project. None of them require the others. None of them require restructuring earlier work.

---

## THE MIGRATION DECISIONS, MADE EXPLICIT

If you ever cross from v1 to v2, three concrete questions need answers. Naming them now so they're not surprises later.

### Question 1: What happens to existing v1 users?

**Answer**: nothing changes for them. v1's BYO-key pipeline continues to work, on-device, exactly as before. The backend is opt-in. Users who never want to send their code to your server never have to.

This is the right answer because (a) it respects the privacy contract v1 established, (b) it preserves backward compatibility forever, (c) it lets you grow the backend at your own pace without breaking existing users.

### Question 2: How do v2's canonical patterns get seeded?

**Answer**: in three steps.

1. The exemplars you bundled in Path 2 (if you took that path) become the initial canonical entries.
2. Successful translations from your own use of v1 (which you've presumably been validating) get manually promoted to canonical.
3. Once v2 launches, the council generates new canonical entries for novel inputs, and you (or trusted reviewers) periodically audit them.

The DB starts small (10-50 entries), grows organically. There is no "data migration" in the sense of importing all of v1's history — that history is on individual user devices and is theirs.

### Question 3: How do you avoid the backend becoming a maintenance burden that kills the project?

**Answer**: by building it small and treating it as optional.

A single VPS, Postgres, Racket, no horizontal scaling, no high-availability theater. If the backend is down for an hour, v1's BYO-key flow handles every request seamlessly — users may not even notice. Maintenance windows are not user-facing crises.

Don't add features to the backend that v1 can't gracefully fall back from. This keeps v1 forever-functional and the backend forever-optional. The day you build a feature that *requires* the backend (e.g., the council deliberation, since it's expensive to run on a phone), you make sure v1's UI handles "this requires the backend, which you can opt into" cleanly.

This discipline keeps the project sustainable across years, not weeks.

---

## WHAT v1 SHOULD DO TODAY TO KEEP THE BRIDGE OPEN

Concrete decisions to make in v1 that cost nothing now but preserve future paths:

**One: Use the canonical output schema from day one.** Even though v1 only produces output via the live pipeline, structure the output exactly as the full vision specifies. `concept_map` as a list of objects with `id`, `label`, `spans`. `abstraction_ladder` as a list of `{ rung, code, note }`. `provenance` as an object with `cache_hit`, `model`, `validator_status`. This is the schema the rendering layer reads. Future work changes how the schema is *populated*, never the schema itself.

**Two: Keep the rendering component pure.** It takes the schema as input and renders. It does not know whether the schema came from a local LLM call or a remote backend. This separation makes Path 3 a one-line change in the data-fetching layer.

**Three: Version the prompts as files, not hardcoded strings.** The system prompts for Translator, Desugarer, Concept Identifier, Validator, Concept Explainer should live in their own files (markdown or JSON), versioned in git, easy to edit. When v2 arrives, these prompts become the basis for the Editor persona's role — same prompts, different orchestration.

**Four: Make the LLM-call abstraction provider-agnostic from day one.** Your app already does this since users bring their own keys for various providers. Maintain that abstraction in the Codex feature. When v2 adds server-side calls, it's just a new provider in the same abstraction.

**Five: Don't bake "no corpus" into the architecture.** Just because v1 doesn't have a corpus doesn't mean v1.7 (the exemplars version) shouldn't be possible. Leave a function called `findReferenceExamples(input)` in the pipeline that initially returns an empty list. Path 2 fills in the body of that function. No restructuring needed.

**Six: Save translations the user marked as good (only if they opt in).** Add a small "save this translation to my history" button. Stored locally. If the user ever chooses to seed the v2 backend with their saved translations, the data is there. If they never do, nothing leaves the device. This is forward compatibility *and* a useful v1 feature on its own.

These decisions are essentially free to make in v1. They unlock everything later.

---

## A NOTE ON TIMING

There is no schedule for any of this. The bridge is a *map of possibilities*, not a roadmap with milestones.

A reasonable rhythm, for example: build v1, sit with it for six months, see what you wish were different, decide whether the answer is Path 1, Path 2, or Path 3. Each path is months of work. The bridge tells you what's at the end of each path, not when you should walk down them.

The most likely shape of the project: build v1 carefully, take Path 1 (smarter validator) sometime in the next year because it's small and obvious, take Path 2 (exemplars) when output consistency starts bothering you, and consider Path 3 (backend) only if v1.7 still feels insufficient. Many projects rest comfortably at v1.7 for years. Some never need a backend at all.

The full vision exists as a *possibility space*. The bridge tells you the space is connected and walkable. It does not tell you where to walk.

---

## ON LETTING GO

A real possibility worth naming: you build v1, it's good, you use it, and you decide the project is done.

This is not a failure. It is the right outcome for many projects. The vision document and this bridge document describe a world where the Codex grows into a multi-year research instrument. That world is *available*. It is not *mandatory*.

If v1 is the only thing you ever build, you have built a beautiful tool that respects users, runs privately, teaches across languages, and produces visualizations nobody else has built. That is genuinely enough. The bridge documents are for the future you who *wants more*. If that future doesn't arrive, the bridge stays unwalked, and the v1 you have is whole.

The point of the bridge is not to make you walk it. It is to make sure that if you ever turn around and look at it, it is still there.

---

## SUMMARY TABLE

A compact reference of what each path adds and what it preserves.

| Path | What it adds | What it costs | What it preserves | Backendless? |
|------|--------------|---------------|-------------------|--------------|
| v1 | The whole tool: backendless, BYO-key, layered prompts, click-to-highlight visualization, one ladder rung | The build itself | — | Yes |
| v1.5 | Multi-validator dissent | ~2x validator-step cost | Everything | Yes |
| v1.7 | Bundled exemplars consulted invisibly via on-device embedding | Bundle size +small JSON file | Everything | Yes |
| v2.0 | Server-side pipeline, caching, optional backend mode | One VPS (~€15/mo) | v1 fallback always works | Optional |
| v2.5 | Multi-persona council with dissent | More tokens per novel translation | All previous modes | Optional |
| v3.0 | Redex formal verification of canonical patterns | Significant Racket+Redex work | All previous modes | Optional |
| v3+ | Reverse translation, upward abstraction, more languages, bytecode rung | Each is a separate project | All previous modes | Optional |

---

*Compiled in conversation, April 30, 2026.*

*"A bridge is not an obligation to cross it. It is a promise that the crossing is possible."*
