# Modules Architecture For Humans

This is the plain-English version of `modules_architecture.md`.

## Why This Exists

After the profile/ontology refactor, future work needs a clear answer to:

```text
Where does this new thing go?
Who owns this logic?
Which module should not know about which other module?
How do I add a new profile without copying the whole app?
```

## The Simple Rule

The app should have a reusable engine and profile-owned meaning.

```text
Engine = save, retrieve, review, promote, graph
Profile = what the saved things mean
```

For coding, the profile says what a concept is, what categories exist, how extractor prompts talk, and how graph nodes look.

For math or photography later, a different profile says different things without rewriting the engine.

## Where Things Should Live

`app/` is only for routes. It should be thin.

`src/features/ontology/` should own profiles, ontology nodes, category descriptions, correction evidence, and the ontology checker.

`src/features/learning/` or future `src/features/knowledge/` should own the save/review/retrieval/promotion product flow.

`src/features/chat/` should own chat prompt composition and chat UX.

`src/features/graph/` should own graph data, layout, rendering, and interaction.

`src/features/backup/` should own export/import/clear data and must keep up with profile/ontology storage.

`src/db/` owns schema and migrations.

`src/ui/` owns only shared UI pieces.

## Adding A New Profile

A new profile should mostly be configuration plus tested extension points:

- labels
- category tree
- category descriptions
- metadata fields
- extraction prompt rules
- retrieval formatting
- promotion rules
- graph colors/visual rules

It should not require copying the save flow, review flow, retrieval engine, or graph engine.

## Adding A New Feature

A new feature gets its own folder under `src/features/`.

It should have a public barrel, keep database work in `data/`, keep UI in `ui/`, keep orchestration out of route files, and use query key factories.

## What This Prevents

This prevents random files from becoming junk drawers.

It also prevents profile-specific ideas like "photography aperture" or "coding runtime" from becoming permanent global schema assumptions.

## Final Location

This file is a draft while the refactor is active.

When the architecture stabilizes, this content should either become part of root `ARCHITECTURE.md` or become a root `modules_architecture.md` linked from `MAIN.md`.

