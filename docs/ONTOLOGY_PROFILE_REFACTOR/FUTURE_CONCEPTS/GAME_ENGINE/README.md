# Kordex Game-Engine Concept

This folder preserves the game-engine application as future product and architecture inspiration.
It is intentionally stored inside the repository so the idea survives machine changes, while
remaining separate from the numbered ontology/profile decisions.

## Authority

- These documents are exploratory, not implementation requirements.
- Numbered decision documents in `ONTOLOGY_PROFILE_REFACTOR/` remain authoritative for current
  Kordex architecture and implementation.
- Before implementing any game-runtime slice, reconcile these notes with the current numbered
  decisions and write a deliberately scoped decision for the new gate.
- The game runtime must preserve the existing bounded-worker rule: models may produce validated
  observations or proposals, but deterministic code owns simulation and durable mutation.

## Documents

- [dynamic-ontology-game-engine-notes.md](dynamic-ontology-game-engine-notes.md) preserves the full
  original game concept and its later Kordex Core reinterpretation.
- [kordex-technical-explainer.md](kordex-technical-explainer.md) explains Kordex technically and
  connects the game engine to the codebase-overlay, agent-team, self-building-app, and photography
  directions.

## Current Boundary

The current CodeLens repository implements the ontology/profile/proposal/checker foundation. It
does not yet implement game physics, combat resolution, character creation, game-specific typed
operations, or a game runtime.

The intended future split is:

```text
Kordex game profile
  owns semantic ability contracts, boundaries, evidence, branches, and proposals

deterministic game engine
  owns physics, combat math, resources, state transitions, and event replay
```
