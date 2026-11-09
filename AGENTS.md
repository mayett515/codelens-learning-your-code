# Kordex — repository instructions

## Product and scope

Kordex is a local-first core for durable, inspectable and correctable meaning.
Design Kordex independently for multiple applications: software understanding,
agent collaboration, evolving applications, knowledge/learning and game semantics.
CodeLens is existing implementation material, not a required product, delivery
vehicle or target architecture. Do not derive the future core's boundaries from
its existing folders. Future integrations remain proposals until implemented.

`codelens-rn/` contains the implementation available to inspect and reuse.
Coding and photography are existing examples, not mandatory future domains.
Treat `codelens-full/`, `rewrite-spec/` and comparison material as historical
references unless targeted. Check the branch and working tree; preserve others' changes.

## Read the relevant sources

Read [product and invariants](docs/agents/product-and-invariants.md) when learning
the project or changing meaning, scope, persistence or model behavior.
Before editing under `codelens-rn/`, read its [AGENTS.md](codelens-rn/AGENTS.md),
even when the session started at the repository root.

| Task | Additional source |
| --- | --- |
| Business logic, module ownership, imports, extraction | [Module map](docs/agents/module-map.md) |
| TypeScript types, errors, validation, async code | [Shared engineering rules](docs/engineering/README.md) and the relevant topic |
| Capability ownership, business rules, implementation state | [Capability root](docs/capabilities/ROOT.md), domain parent and code-adjacent leaf; [generated map](docs/capabilities/generated-map.md) locates them |
| Refactor or architecture change | [Refactor workflow](docs/agents/refactor-workflow.md) and [dated baseline](docs/agents/baseline.md) |
| Tests, migrations, integration claims | [Verification](docs/agents/verification.md) |
| Maintaining these instructions or host integration | [Rule system](docs/agents/README.md) |

Read only the relevant decision documents and implementation paths after this
orientation. Do not reload the complete historical document collection for
every small edit. Links are explicit reading instructions, not automatic imports.

Claude and Codex use the same engineering rules. Workflows are authored in
`agent-kit/skills/` and installed as checked identical copies in `.agents/skills/`
and `.claude/skills/`. Do not edit generated skill copies. For tooling, leaves,
rules or skills run `npm --prefix tools run check` after `npm --prefix tools ci --ignore-scripts`.
See [tooling commands](tools/README.md). Application changes also need their own checks.

## Working rules

- Separate intended behavior, observed implementation and proposed changes.
  Code establishes current behavior; it does not silently overrule product intent.
  Date status claims and name the evidence. Old chats and generated maps are context.
- Preserve one owner for each business decision and each transaction boundary.
  Name the capability and its callers before moving code; file size alone does
  not justify a split. A decision to keep cohesive code is a valid result.
- Prefer plain TypeScript, explicit dependencies and existing repository contracts.
  Add a layer or dependency only for a concrete responsibility or demonstrated need.
- A model may suggest semantic changes. It may not bypass deterministic
  validation, proposal review and guarded apply to mutate ontology/profile state.
  This product rule is not an approval requirement for ordinary repository edits.
- Work in bounded, reviewable changes. Preserve behavior during structural
  refactors; identify intentional behavior fixes separately. Continue authorized
  work without ritual approval phrases. Clarify only material unresolved choices.
- Match verification to the claim. Static guards and mocked transactions do not
  establish database rollback, UI behavior or production wiring. Report what ran,
  what failed and what could not run. Keep the owning docs current with changes.

## Code Review Rules

Check the originating requirement as well as implementation correctness. Flag
lost profile identity, cross-profile data mixing, stale proposal apply, incomplete
transactions, model-origin direct mutations and duplicated domain policy.
Review new dependencies in both directions, including runtime imports through
barrels. Distinguish a newly introduced regression from an existing baseline gap.
