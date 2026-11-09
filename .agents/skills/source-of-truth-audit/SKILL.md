---
name: source-of-truth-audit
description: Find competing definitions or drift between types, schemas, registries, generated output and agent rules. Use when a concept must be edited in several places or ownership is unclear.
---

# Source-of-truth audit

Paths below are repository-relative. Locate each definition and consumer with
symbol/text search. Classify each as authoritative definition, derived projection,
intentional boundary translation or independent duplicate.

Same shape does not imply same meaning. DTO/domain separation may be deliberate;
a long derivation over an unused runtime value may be worse than a clear union.
Find actual disagreement before proposing consolidation.

When consolidating or renaming, search the retired names across source, strings,
comments, Markdown and configuration, including spelling/case variants. Preserve
explicit historical records. Repair the meaning of stale claims; do not blindly
replace words or require a successor name where the claim no longer belongs.
For names that must stay retired, add a scoped regression check with explicit
historical exceptions and a failing fixture. A passing typecheck misses prose.

For Kordex rule/leaf drift run `npm --prefix tools run check`. Skill sources live
in `agent-kit/skills`; `.agents/skills` and `.claude/skills` are generated copies.
The leaf shape is owned by `tools/leaf-schema.ts`, not the prose schema example.

For other definitions, use the language/parser or targeted search appropriate to
the source. No generic scanner is claimed installed. Report correctness defects,
drift risks, intentional separation and the smallest justified derivation/check.
