---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: change-impact
domain: integrations
summary: Invalidate downstream results whose recorded input basis changed
state: planned
owners: []
evidence:
  - path: docs/progress/2026-11-09-core-roadmap.md
    kind: design
    covers: Planned acceptance scenario and roadmap order
gaps:
  - No executable owner or runtime proof exists for this scenario.
reason: Owner-approved future direction after the first headless rule lifecycle.
revisit: Implement the bounded scenario after its required history and persistence boundaries exist.
---

# Invalidate downstream results whose recorded input basis changed

K6 seed: accepted inputs A and B, derived result C with recorded dependency on
A at revision 1, and unrelated result D. Accept A revision 2. C becomes due for
revalidation with the changed dependency identified; D and accepted B remain
unchanged. A diagram or guessed relationship does not create a dependency.
