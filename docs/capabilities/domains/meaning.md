# Meaning

This domain owns scoped identity, vocabulary and composition: what a thing means
within a particular domain or selection. Existing profile code is one implementation
of this responsibility; a universal Kordex model has not been finalized.

- **D1 (P1/G1):** cross-scope identity comparisons include their scope.
- **D2 (P1/G1):** a branch belongs to its parent; selection must not silently mix
  foreign parents. The existing selection leaf records the enforcement gap.
- **D3 (P2/P4):** declared sources and composed views have distinct ownership;
  runtime composition does not become a second canonical stored definition.
- **D4 (P3/G3):** composition order is meaningful and deterministic under its
  explicit contract. Changing it is a behavior change.

Existing owners: profile composition, selection and registry bootstrap leaves.
The source/bootstrap gap remains explicit; a registry description is not proof
that default production editing and reload work end to end.
