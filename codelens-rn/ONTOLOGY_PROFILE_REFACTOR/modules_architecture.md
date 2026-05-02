# Modules Architecture Draft

This is a draft for a future canonical module/foldering architecture guide.

<status>
This file belongs in the refactor folder while the profile/ontology refactor is active.
After the refactor stabilizes, durable content from this file should be promoted into root `ARCHITECTURE.md` or a root `modules_architecture.md`.
</status>

## Purpose

<purpose>
Define where new code belongs after the app becomes profile/ontology-aware.
Future agents should be able to add modules, profiles, and features without guessing folder ownership.
</purpose>

## Target Module Ownership

```text
app/
  Expo Router routes only.
  Thin composition layer.
  No multi-step business workflows.

src/features/ontology/
  DomainProfile and OntologyProfile definitions.
  Ontology nodes, boundary rules, correction evidence.
  Ontology checker and patch suggestions.
  Profile validation and profile registry.

src/features/learning/ or src/features/knowledge/
  Capture/item save flow.
  Candidate preparation.
  Capture review and correction.
  Promotion from captures to durable items.
  Review mode and familiarity scoring.
  Retrieval-facing memory source contracts.

src/features/chat/
  Chat prompt composition.
  Persona/model UX.
  Chat send/cancel flow integration.
  Must not leak persona/chat prompt layers into extractor internals.

src/features/graph/
  Graph queries, graph engine, layout, rendering, interaction.
  Reads profile visual encoding.
  Does not own ontology definitions.

src/features/backup/
  Export/import/clear data.
  Must track profile/ontology persistence changes.

src/db/
  Drizzle schema, migrations, DB init.
  Persistence primitives only.

src/ai/
  Provider/model routing and embedding queue.

src/ports/ and src/adapters/
  Hexagonal interfaces and implementations.

src/ui/
  Shared UI primitives only.
```

## Dependency Direction

<dependency_direction>
- Routes may depend on feature public barrels.
- Features may depend on shared core modules.
- Feature internals should not be imported from unrelated features.
- Ontology/profile definitions should be consumed by learning/knowledge, graph, retrieval, promotion, and UI.
- Ontology should not depend on learning UI or graph rendering.
- Extractor code should not depend on personas or chat prompt composition.
</dependency_direction>

## Adding A New Feature

<add_feature_rules>
1. Create `src/features/<feature>/`.
2. Add a public `index.ts` barrel.
3. Keep data access under `data/`.
4. Keep Zod codecs at persistence boundaries.
5. Keep orchestration under `services/`, `application/`, or hooks.
6. Keep UI under `ui/`.
7. Add query key factories if using TanStack Query.
8. Keep `app/` route files thin.
9. Add tests for pure logic and failure paths.
</add_feature_rules>

## Adding A New Domain Profile

<add_profile_rules>
1. Add a profile definition under the ontology/profile registry.
2. Define labels.
3. Define ontology nodes.
4. Define metadata fields.
5. Define extraction prompt guidance.
6. Define embedding text builders if needed.
7. Define retrieval formatting.
8. Define promotion rules.
9. Define review wording/rules if different.
10. Define graph visual encoding.
11. Add fixtures and tests.
12. Do not fork the core save/retrieval/review/promotion/graph engine unless the profile exposes a genuine extension point.
</add_profile_rules>

## Adding Ontology Changes

<ontology_change_rules>
- Add durable ontology changes through profile definitions or approved ontology patches.
- Store model-suggested changes as suggestions first.
- Include meaning, examples, useWhen, doNotUseWhen, and parent/relationship context.
- Include evidence for checker suggestions.
- Prefer boundary-rule improvements before creating new categories.
</ontology_change_rules>

## Adding Persistence

<persistence_rules>
- Prefer generic profile/metadata JSON for profile-specific fields.
- Do not add one DB column for every domain-specific idea.
- Add migrations with tests.
- Update backup/import/export expectations.
- Update `PERSISTENCE.md` when storage behavior changes.
</persistence_rules>

## End-State Canonicalization

<canonicalization>
When this draft becomes stable, promote it to either:
- a section in root `ARCHITECTURE.md`, or
- a root `modules_architecture.md` linked from `MAIN.md`.

Do not leave this as a required hidden planning doc forever.
</canonicalization>

