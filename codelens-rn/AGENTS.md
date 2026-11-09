# Existing implementation material

This subtree is available for inspection and reuse. Its product and framework
choices do not prescribe Kordex's future architecture or require preserving CodeLens.

The repository-root [AGENTS.md](../AGENTS.md) also applies. Read
[TypeScript rules](../docs/engineering/README.md) before TypeScript implementation,
and [verification](../docs/agents/verification.md) before choosing checks.
When changing a documented capability, update its adjacent `.leaf.md` and run
the repository leaf checks. A leaf's implemented status is scoped to its stated
responsibility, not a claim that a complete standalone Kordex product exists.

## Code ownership

- `app/` composes Expo routes and user interactions; `src/features/` owns feature
  capabilities. Use the [module map](../docs/agents/module-map.md) to distinguish
  pure decisions, orchestration, codecs, repositories and UI within a feature.
- `src/features/ontology/` contains both pure semantic code and runtime shells.
  Do not apply a blanket purity rule to its `data/`, `hooks/` or `ui/` directories.
- `src/features/learning/` owns captures, concepts, promotion, retrieval and
  review. It consumes ontology contracts; ontology's pure policies must not
  depend on learning persistence or presentation.
- `src/db/schema.ts` and registered `src/db/migrations/` own durable storage.
  Feature codecs interpret persisted shapes. Keep legacy compatibility and
  backup import/export aligned when a persistent contract changes.
- Reuse existing feature entrypoints. Do not broaden a pure entrypoint with
  native/DB exports or force all callers through a barrel with unwanted effects.
  Inspect existing exceptions before tightening imports.

## Semantic changes

For ontology/profile/checker work, read [product invariants](../docs/agents/product-and-invariants.md),
[00_DOC_SYNC.md](../docs/ONTOLOGY_PROFILE_REFACTOR/00_DOC_SYNC.md),
[NEXT_LLM_CONTEXT.md](../docs/ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md), then the
decision for the touched capability. Cross-check with actual implementation;
older status sections can lag later decisions. See the
[baseline](../docs/agents/baseline.md) for identified integration gaps.

Preserve base-profile identity across route, store, service, persistence and
read-back. A branch selection describes composition context; a capture's
`profileId` does not promise complete branch-local storage isolation.

## Commands

Run app commands from this directory, using its npm lockfile. `npm test -- <path>`
runs a selected Vitest file; `npm run lint` runs Expo ESLint. There is no
`typecheck` script: use the installed local compiler as documented in verification.
Do not report native behavior as tested by a Node-only suite.
