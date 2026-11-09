# Meaning

This domain owns scoped identity, vocabulary and composition: what a thing means
within a particular domain or selection. Existing profile code is one implementation
of this responsibility; a universal Kordex model has not been finalized.

The [engineering-rule direction](../../agents/product-and-invariants.md#engineering-rules-owner-direction-2026-11-09)
is now decided: an independent base and repository branches reuse this meaning
model. Rule-kind/provenance/version/reconsideration details remain an interview,
not an implemented third profile or a second rule-record mechanism.

- **D1 (P1/G1):** cross-scope identity comparisons include their scope.
- **D2 (P1/G1):** a branch belongs to its parent; selection must not silently mix
  foreign parents. The selection leaf binds the shared resolver and its
  foreign-parent regression evidence.
- **D3 (P2/P4):** declared sources and composed views have distinct ownership;
  runtime composition does not become a second canonical stored definition.
- **D4 (P3/G3):** composition order is meaningful and deterministic under its
  explicit contract. Changing it is a behavior change.

Existing owners: profile composition, selection and registry bootstrap leaves.
The source/bootstrap gap remains explicit; a registry description is not proof
that default production editing and reload work end to end.

Accepted on 2026-11-09, not yet implemented:
[Doc 44](../../../codelens-rn/ONTOLOGY_PROFILE_REFACTOR/44_BUILT_IN_BASE_MATERIALIZATION_DECISION.md)
owns first-use materialization, the explicit legacy adoption path and the narrow
built-in/local source-ownership rule. Reads remain write-free. Historical unknown
origin must survive later edits and backup; it is distinct from the new accepted
state. The registry/bootstrap leaf remains partial pending runtime proof.
