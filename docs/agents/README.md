# Shared Kordex rule system

Kordex owns its product direction independently of CodeLens. The existing
implementation is material to inspect and reuse. This rule system connects
product intent, engineering policy, source ownership and explicitly bounded proof.

## Reading routes

| Source | Responsibility |
| --- | --- |
| [Root AGENTS](../../AGENTS.md) | Shared entrypoint, product scope and task-based reading |
| [Existing implementation AGENTS](../../codelens-rn/AGENTS.md) | Local contracts and checks for that subtree |
| [Product and invariants](product-and-invariants.md) | Meaning, scope and authority constraints |
| [Engineering rules](../engineering/README.md) | Shared TypeScript and boundary guidance |
| [Capability root](../capabilities/ROOT.md) | Product constraints and domain parents |
| [Leaf contract](../capabilities/SCHEMA.md) | Source bindings, states and precise check limits |
| [Generated map](../capabilities/generated-map.md) | Derived navigation, not behavioral certification |
| [Module map](module-map.md) | Responsibilities in the existing implementation |
| [Refactor workflow](refactor-workflow.md) | Bounded changes with explicit owners and proof |
| [Verification](verification.md) and [baseline](baseline.md) | Commands, evidence limits and dated findings |
| [Transfer ledger](../engineering/TRANSFER.md) | Source comparison, selected adaptations and refresh procedure |
| [Tools](../../tools/README.md) | Executable checks, generation and skill synchronization |

Keep policy in its owning document. Keep workflow instructions in canonical
`agent-kit/skills/`; generated `.agents/skills/` and `.claude/skills/` copies must
match. Keep leaf shape in `tools/leaf-schema.ts` and maps derived from leaves.
No copy is silently another policy authority.

## Host integration

Root and nested AGENTS files route to shared documents. Their CLAUDE files import
`@AGENTS.md`. The TypeScript-scoped Claude rule points to the same engineering
index. Links are reading instructions, not automatic imports or a fictitious
`.agents/rules` loader.

The selected skill workflows are installed in each host's skill tree. File
shape and mirror checks establish consistency, not that a new Claude/Codex
session discovered or followed them. No host hooks are installed by this change.
The independent repository gate is runnable now; the checked-in CI workflow
requires a real remote run before claiming CI execution.

For a skill change, edit the canonical source, synchronize, then run the gate.
For a capability change, update its owner/leaf/domain as appropriate, regenerate
the map and run fitting application checks as well as the repository gate.

## Historical inputs

The two original TheScheme bundles were inspected at
`69bc30c72f8478b9f0b40ceff99fa60bca5b7df1`:

- [Kordex refactor rules](https://github.com/mayett515/TheScheme/tree/69bc30c72f8478b9f0b40ceff99fa60bca5b7df1/pragmatic_typescript_v3_ai_rules_bundle_complete/kordex-refactor-rules-flat/.kordex-refactor-rules).
- [Categorization planner](https://github.com/mayett515/TheScheme/tree/69bc30c72f8478b9f0b40ceff99fa60bca5b7df1/pragmatic_typescript_v3_ai_rules_bundle_complete/categorization-planner-flat-bundle).

Their useful separation of product, module ownership and logic intent informed
the rules. XML wrappers, invented loader metadata, mandatory approval keywords,
blanket tool installation and proposed universal operation APIs were not adopted.
Review actions can legitimately emit an audit event without mutating ontology.

The current transfer additionally compares the local Claude/Codex packs with
SEO's actual rule and workflow files. See the dated ledger rather than treating
historical bundles as the latest authority. Existing ontology decision documents
remain context for those mechanisms; they do not fix every future Kordex domain.
