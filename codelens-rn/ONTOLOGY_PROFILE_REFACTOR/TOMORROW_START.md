# Tomorrow Start

Use this when starting the next orchestrator session.

## Startup Prompt

```text
Read ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md first.
Then read ONTOLOGY_PROFILE_REFACTOR/07_KORTEX_CORE_AND_CHILD_CORES.md, ONTOLOGY_PROFILE_REFACTOR/08_KORTEX_LANGUAGE_LAYER_AND_ADAPTERS.md, ONTOLOGY_PROFILE_REFACTOR/09_KORTEX_OVER_EXISTING_SYSTEMS.md, ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md, and ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md.

We are continuing as orchestrator.
Do not implement until we confirm the next slice.

Summarize:
- current state
- current uncommitted files
- current verification status
- next recommended bounded implementation slice
```

## Expected Next Slice

```text
Decision gate after profile composition helpers and the first active-profile overlay seam: choose branch/overlay persistence, real overlay activation source, or correction/checker persistence.
```

Strict boundaries:

- no DB
- no UI
- no persistence
- no export UI
- no checker execution
- no profile patch storage
- no automatic profile mutation

## Product Direction To Preserve

Kortex Core is the ontology/graph/versioned reasoning system. CodeLens/coding is the first serious
child core/wrapper around it, not the boundary of the whole system.

Kortex profile branching model:

```text
Kortex Core
  -> coding child core / wrapper
      -> base profile for this lineage
          -> profile branch
              -> project / learning / personal overlay
                  -> correction evidence / patch suggestions
```

Important nuance:

```text
"Core" means immutable inside one profile lineage.
It does not mean globally fixed forever.
A fork/user can later create a different ground-zero base profile.
```

Runtime precedence:

```text
personal corrections > active project/learning overlay > base profile
```

Branches are branch-only by default. Merge back into a parent profile requires explicit user approval.

Relationship-semantics caution:

```text
Current compatibility shape: prerequisite / related / contrast.
Newer product direction: is / is not boundary anchors plus dynamic profile/user/LLM-created relationship labels.
Do not hardcode a global final relationship taxonomy in the next slice.
```

Language-layer caution:

```text
TypeScript remains the current implementation path.
Racket is a plausible future language/DSL layer, not a rewrite target for this branch.
Design pure helpers as steps toward serializable, validated core operations that adapters can call later.
```

Overlay caution:

```text
Kortex can later sit over existing systems through read/write/sync adapters.
The default is non-destructive: understand first, write back only by explicit approval/policy.
Do not build adapters, source sync, static analysis, file watchers, MCP, or write-back in the next slice.
```

Agent/subagent execution-ontology caution:

```text
Kortex can later wrap agents/subagents with ontology-backed execution policy.
Tags/subtags can define behavior and Ausfuehrung/execution constraints.
is / is not can define hard boundaries.
extends can inherit agent policy from parent cores.
Allowed/forbidden operations and approval gates should be structured policy, not only prompt text.
Do not build orchestration, permission enforcement, MCP policy tools, or subagent runtime in the next slice.
```

Self-building-app framework caution:

```text
Kortex can later be the ontology/coherence framework behind self-building apps.
User intent becomes a project app core.
Domain entities, workflows, screens, schema/API/UI/test responsibilities become ontology and child/subagent cores.
Generated code should stay tied to correctable graph state.
Do not build app-builder runtime, code-generation orchestration, generated-app persistence, or source write-back in the next slice.
```

## Worker Recommendation

If delegating through Pi:

- Prefer Qwen 3.6 Plus for TypeScript API/composition shape work.
- Kimi K2.6 is also acceptable for strict bounded profile/refactor slices.
- Use a strict bounded ticket.
- Do not spawn/delegate unless explicitly approved by the user.

After reviewing a worker result, update `C:\pi-stuff`:

- `model_hr_db.json`
- `hr_findings_viewer.html`
- `HR_DATABASE.md` if trust summary changes
- `hrworkflow.md` if model notes change
- `FUTURE_PI_PROMPTING.md` if there is a reusable prompt lesson

Validate both JSON sources:

```powershell
node -e "JSON.parse(require('fs').readFileSync('model_hr_db.json','utf8')); console.log('model_hr_db.json valid')"
```

```powershell
@'
const fs = require('fs');
const html = fs.readFileSync('hr_findings_viewer.html', 'utf8');
const marker = '<script type="application/json" id="hr-data">';
const start = html.indexOf(marker);
const end = html.indexOf('</script>', start);
if (start < 0 || end < 0) throw new Error('embedded db marker missing');
const db = JSON.parse(html.slice(start + marker.length, end).trim());
console.log('viewer db valid', db.evaluations.length, db.evaluations.at(-1)?.id, db.evaluations.at(-1)?.score);
'@ | node -
```

## Current Human Decision

Do not continue directly into correction UI or persistence.

Core/child/profile branch composition with pure helpers and tests is now proven. The first explicit active-profile overlay seam is also proven: `getActiveDomainProfile(overlays?)` composes supplied overlays while no-arg and empty-list calls still return `codingProfile` directly.

Keep the next decision focused on one of these paths:

- persist branch/overlay state
- add a real UI/runtime activation source for overlays
- move to correction/checker persistence
- write a decision brief for agent/subagent execution ontology before any implementation
- write a decision brief for Kortex as self-building-app framework before any implementation
