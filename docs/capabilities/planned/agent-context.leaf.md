---
schemaVersion: 1
inspectedOn: "2026-11-09"
id: agent-context
domain: integrations
summary: Supply scoped evidence and current decisions to agents through explicit contracts
state: planned
owners: []
evidence:
  - path: docs/progress/2026-11-09-core-roadmap.md
    kind: design
    covers: Read-only MCP retrieval of accepted knowledge with source, scope and revision after the headless lifecycle proof
gaps:
  - No read-only MCP endpoint backed by the standalone accepted-knowledge store exists.
reason: Core lifecycle and persistence proof precede agent delivery; a repository leaf reader is insufficient.
revisit: After the CLI lifecycle passes, query accepted knowledge through MCP and prove pending,
  replaced and other-scope records cannot appear as current accepted rules.
---

# Supply scoped evidence and current decisions to agents through explicit contracts

This records a direction, not a promise that all domains fit the existing profile
model. Do not invent runtime dependency edges or an implementation address.

First scenario: an agent asks for the accepted stale-apply convention in repository
scope `kordex`, and receives the current accepted rule with its evidence source
and revision. The endpoint is read-only and shares the core's store/selection
rules. It is not a second memory system or an Apply authority.
