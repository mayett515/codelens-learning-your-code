# Architecture Guide For Profile Refactor Humans

This is the human version of the profile/ontology architecture agreement.

## Short Version

The app should stay excellent for coding, but the engine should not be trapped inside one hardcoded coding ontology.

We are not trying to build every future profile first. We are making the current coding app profile-driven so future profiles can exist later.

## How This Relates To The Existing Architecture

The existing architecture is still valid:

- feature-based modules
- clean boundaries
- thin route screens
- query key factories
- Zod codecs at DB boundaries
- transaction threading
- local-first persistence and embeddings

The new direction adds one more idea:

```text
Domain-specific meaning belongs in a profile.
```

That means coding-specific categories, labels, prompts, metadata fields, review wording, promotion rules, and graph visual encoding should gradually move into the default coding profile.

## What Not To Do

Do not rename everything first.

Do not pause the personal coding product to build math, photography, and notes profiles immediately.

Do not create a generic app that makes the coding profile worse.

Do not let the model silently change the user's ontology.

## What To Do

1. Make a real `DomainProfile` / `OntologyProfile` seam.
2. Put the existing coding taxonomy and wording into the default coding profile.
3. Keep current coding behavior working.
4. Continue building the coding tool seriously.
5. Later, create small demo profiles to prove forkability.

## Why This Matters

Different users may want different ontologies.

One programmer may organize knowledge by architecture, state, API boundaries, and runtime risks.

Another may organize by React, SQLite, migrations, prompts, and mobile UI.

A math fork may use theorem, proof technique, formula, misconception, and prerequisite.

The engine should support that by swapping profile definitions, not by rewriting save flow, retrieval, promotion, review, and graph code.

