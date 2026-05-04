# Tomorrow Start

Use this when starting the next orchestrator session.

## Startup Prompt

```text
Read ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md first.
Then read ONTOLOGY_PROFILE_REFACTOR/06_PROFILE_BRANCHING_AND_MERGE.md and ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md.

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
Internal-only Kortex profile branch composition helpers and tests.
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

Kortex profile branching model:

```text
base profile for a lineage
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

First prove profile branch composition with pure helpers and tests:

- base + overlay composes into a runtime profile
- overlay can add an ontology node
- conflict precedence is deterministic
- personal layer wins over project/learning overlay
- base profile object is not mutated
