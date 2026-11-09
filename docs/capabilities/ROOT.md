# Kordex capability root

Kordex is intended to preserve inspectable, correctable meaning across different
applications. Its target is independent of CodeLens. The existing implementation
is evidence to inspect and potentially reuse, not a prescribed architecture.

## Product constraints

### P1 — Multiple domains without accidental inheritance

Software, agent work, application models, personal knowledge and game semantics
can have distinct vocabularies and rules. Reuse mechanisms where semantics agree;
do not force every application into one ontology or lifecycle.

### P2 — Meaning remains accountable

Distinguish source observations, interpretation, hypotheses, user decisions and
current accepted state. A confident model answer or a human approval does not
establish empirical truth. Keep the source and reason inspectable.

### P3 — Changes have a visible scope

Preserve identity, provenance and scope through corrections and changes. Identify
known downstream effects and explicitly unknown ones. A semantic description
does not itself implement a constraint or permission boundary.

### P4 — External systems keep explicit ownership

Connecting a repository or source system does not silently transfer authority to
Kordex. Define who owns source data, interpretation and executable state. Source
write-back is a separate capability from reading and explaining.

## Technical direction

- **G1 (P1/P3):** carry scope with identity; keep pure domain decisions independent
  from delivery frameworks. The leaf guard checks runtime imports only for
  declared decision owners, not universal purity.
- **G2 (P2):** retain evidence/provenance and separate proposals from accepted
  changes. Existing profile evolution uses review and deterministic apply; future
  domains require their own explicit authority contract.
- **G3 (P3):** recheck mutable state at the boundary that commits an effect.
  Parsing and preview do not establish current freshness or concurrency safety.
- **G4 (P2/P4):** report what a check actually establishes. A source symbol exists,
  a handler is registered and a behavior succeeds are distinct claims.

These rules are policy unless a concrete mechanism is named. This root does not
claim universal enforcement or a completed headless runtime.

## Domain parents and navigation

| Domain | Responsibility |
| --- | --- |
| [Meaning](domains/meaning.md) | Profiles, identities and composition |
| [Evolution](domains/evolution.md) | Correction/proposal lifecycle and controlled changes |
| [Context](domains/context.md) | Bounded context and derived interpretation signals |
| [Integrations](domains/integrations.md) | Future external adapters and agent access |
| [Applications](domains/applications.md) | Future cross-domain applications and executable semantics |

[Generated map](generated-map.md) lists discovered leaves and source bindings.
[Schema](SCHEMA.md) states exactly what is checked.
[Module map](../agents/module-map.md) helps navigate existing code; it does not
decide the future domain decomposition. The above parents are the initial inventory
organization and can evolve with explicit product decisions.
