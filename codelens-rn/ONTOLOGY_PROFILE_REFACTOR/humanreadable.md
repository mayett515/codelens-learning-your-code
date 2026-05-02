# Human Readable Plan

## The Simple Point

You do not need to fully build every future profile first.

First, refactor the core so the coding profile is no longer welded into the app engine. Then keep building the personal coding learning tool on top of the new profile system.

<main_sequence>
Refactor the engine enough to make profiles real.
Keep the coding profile as the first and strongest profile.
Build the real personal coding product there.
Create small demo profiles later to prove forkability.
</main_sequence>

## Phase 1: Refactor Architecture

Goal: make the current coding behavior profile-driven without breaking it.

- Add `DomainProfile` / `OntologyProfile`.
- Move coding taxonomy, prompts, labels, and metadata definitions into `codingProfile`.
- Make extractor, cards, retrieval, promotion, review, and graph planning read from the active profile.
- Keep current coding behavior working throughout.

## Phase 2: Build The Coding Tool Seriously

Goal: continue building the actual product for personal coding use.

- Better coding ontology.
- Graph.
- Review flows.
- Personal capture UX.
- Ontology checker.
- User corrections.
- Memory and retrieval polish.

The coding profile should not be a weak generic example. It should be the best profile because it is the real product.

## Phase 3: Show-Off / Demo Profiles

Goal: prove the app is forkable after the profile seam exists.

- Create a small math profile.
- Maybe create a photography or personal notes profile.
- Seed a few example captures.
- Show that the same engine works with a different ontology.

The demo should prove:

```text
Same app.
Different profile.
Different category tree.
Different extractor prompt.
Different metadata fields.
Same capture/retrieval/graph engine.
```

## Why This Order Matters

<why_this_order>
Do not pause the real coding product for months to build every possible future fork.
Make the coding product futureproof first.
Then use lightweight demo profiles later as proof that the architecture worked.
</why_this_order>

## What Success Looks Like

The user can keep building their personal coding learning tool.

Later, before publishing or showing it off, they can create a lightweight math profile to demonstrate forkability without rewriting the engine.

