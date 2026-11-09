# Shared engineering rules

One maintained rule set for Claude and Codex, adapted from the user's Pragmatic
TypeScript packs. This is an engineering vocabulary, not a prescribed product
architecture. Use the smallest structure that gives a real rule or lifecycle an owner.

Name the policy, keep the procedure, and choose the smallest honest boundary.
These rules pay off when policy is hidden in control flow; leave tiny pure helpers,
framework wiring and generated code alone unless a concrete problem warrants a change.

| Work | Read |
| --- | --- |
| Types, schemas, contracts, parsing | [Types and validation](types-and-validation.md) |
| Business decisions, modules, extraction, dependencies | [Core and boundaries](core-and-boundaries.md) |
| Failures, cancellation, concurrency, external calls | [Errors and async](errors-and-async.md) |
| Queries, transactions, migrations, codecs | [Persistence](persistence.md) |
| React surfaces, hooks, query state | [React and query](react-and-query.md) |
| Verification, comments, documentation claims | [Tests and docs](tests-and-docs.md) |
| Provenance, differences and updates | [Transfer ledger](TRANSFER.md) |

Type strategy → functional core → explicit execution → a boundary with a clear owner.
Before adding an abstraction, identify the invalid state it removes, dependency
it isolates, lifecycle it owns or repeated policy it centralizes. Otherwise keep
the code cohesive. Existing contracts migrate deliberately, not for a checklist.

Root/nested AGENTS files route both hosts here. Claude also has a path-scoped
pointer for TypeScript. No `.agents/rules` loader or machine-specific path is assumed.
