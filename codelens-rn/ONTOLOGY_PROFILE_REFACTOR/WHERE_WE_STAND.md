# Where We Stand - 2026-05-06

Repo: `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`
Branch: `refactor/ontology-profile`

This file captures the current state after disabling the local Pi go-to-bed blocker and completing Batch 4 Slice 1.

## Last Status Response

Done.

`go-to-bed` is disabled only in Mitsupi's manifest. Full `npm:mitsupi` still loads, and Pi smoke-tested fine without `--no-extensions`.

Implemented Batch 4 Slice 1 with Pi model: `opencode-go/qwen3.6-plus`, high thinking:

- Added `ActiveDomainProfileSource`
- Added `resolveActiveDomainProfile(source)`
- `getActiveDomainProfile(overlays?)` now delegates through that resolver
- No DB, UI, persistence, global state, setter, or automatic activation
- Qwen scored `8/10`: good implementation, Codex cleaned unused imports and recorded HR lessons

Verification:

- TypeScript clean
- Targeted: `64/64`
- Focused ontology/guard set: `103/103`
- Full suite: `429/429` across 53 files
- Stage10 after doc edits: `39/39`
- HR DB/viewer valid: `31` evaluations

Updated:

- project handoff docs
- `C:\pi-stuff\model_hr_db.json`
- `C:\pi-stuff\hr_findings_viewer.html`
- `C:\pi-stuff\HR_DATABASE.md`
- `C:\pi-stuff\FUTURE_PI_PROMPTING.md`
- new report: `C:\pi-stuff\HR_REPORT_2026-05-06_BATCH4_ACTIVE_PROFILE_SOURCE.md`

Next big decision, not for Pi to invent:

1. first real caller/runtime source that supplies overlays to the resolver
2. branch/overlay persistence
3. correction/checker persistence

Recommendation:

Use Codex/GPT-5 for the decision, then `opencode-go/qwen3.6-plus` with high thinking for a bounded TypeScript slice.

## Current Implementation State

The ontology-profile refactor has moved beyond profile labels and compatibility naming. The current state is:

- `codingProfile` is the current base profile for this app lineage.
- `composeDomainProfile(base, overlays)` composes project, learning, and personal overlays.
- `getActiveDomainProfile(overlays?)` preserves old behavior for no overlays:
  - no argument returns `codingProfile` by reference
  - empty array returns `codingProfile` by reference
  - explicit overlays compose a runtime profile
- `ActiveDomainProfileSource` now gives a structured input shape:
  - `baseProfile`
  - optional/null `overlays`
- `resolveActiveDomainProfile(source)` is the pure resolver:
  - omitted/null/empty overlays return the base by reference
  - supplied overlays compose via `composeDomainProfile`
  - no cache
  - no hidden state
  - no persistence
  - no UI
  - no automatic profile mutation

## New Files In This Slice

```text
src/features/ontology/profileActivation.ts
src/features/ontology/__tests__/profileActivation.test.ts
ONTOLOGY_PROFILE_REFACTOR/WHERE_WE_STAND.md
```

## Important Existing Changed Files

These tracked files are expected to be modified in the current worktree:

```text
ONTOLOGY_PROFILE_REFACTOR/NEXT_LLM_CONTEXT.md
ONTOLOGY_PROFILE_REFACTOR/TOMORROW_START.md
ONTOLOGY_PROFILE_REFACTOR/implementation_handoff.md
src/__tests__/stage10-architecture-guards.test.ts
src/features/ontology/__tests__/activeProfile.test.ts
src/features/ontology/__tests__/corrections.test.ts
src/features/ontology/__tests__/profileComposition.test.ts
src/features/ontology/index.ts
src/features/ontology/types.ts
```

Untracked local tool folder:

```text
.claude/settings.local.json
```

Do not include `.claude/` unless explicitly requested.

## Verification Already Run

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
```

Result: clean.

```powershell
npm test -- --run src/features/ontology/__tests__/profileActivation.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: `64/64` passed across 3 files.

```powershell
npm test -- --run src/features/ontology/__tests__/profileComposition.test.ts src/features/ontology/__tests__/activeProfile.test.ts src/features/ontology/__tests__/corrections.test.ts src/features/ontology/__tests__/profileActivation.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result: `103/103` passed across 5 files.

```powershell
npm test -- --run
```

Result: `429/429` passed across 53 files.

```powershell
npm test -- --run src/__tests__/stage10-architecture-guards.test.ts
```

Result: `39/39` passed after doc edits.

## Pi HR State

Pi HR data is current:

- `C:\pi-stuff\model_hr_db.json`
- `C:\pi-stuff\hr_findings_viewer.html`
- `C:\pi-stuff\HR_DATABASE.md`
- `C:\pi-stuff\FUTURE_PI_PROMPTING.md`
- `C:\pi-stuff\HR_REPORT_2026-05-06_BATCH4_ACTIVE_PROFILE_SOURCE.md`

Current HR count:

```text
31 evaluations
26 generalized lessons
```

Latest accepted worker:

```text
model: Qwen 3.6 Plus
runner: Pi CLI opencode-go/qwen3.6-plus, PI_PERMISSION_LEVEL=high, --thinking high
score: 8/10
slice: explicit active-profile source resolver
```

Reusable HR lessons from this slice:

- new-file worker slices should explicitly require the `edit` tool
- Codex should review unused imports even when TypeScript passes

## Next Decision Gate

Do not let Pi choose this. The next step requires Codex plus human decision.

Options:

1. Add a first real caller/runtime source that supplies overlays to `resolveActiveDomainProfile`.
2. Persist branch/overlay state.
3. Move to correction/checker persistence.

Recommended next move:

Start with option 1. Keep it internal and no-DB. Add a small explicit caller/runtime source that can provide overlays to the resolver without persistence, UI, global state, or automatic activation.

Model recommendation:

- Decision: Codex/GPT-5
- Bounded TypeScript worker after decision: `opencode-go/qwen3.6-plus` with high thinking
- Alternative strict worker: `opencode-go/kimi-k2.6` with high thinking

## Commit Message

```text
Add explicit active profile source resolver
```

## Commit Summary

```text
Adds a pure ActiveDomainProfileSource/resolveActiveDomainProfile seam so callers can provide a base profile plus optional overlays without introducing persistence, UI, global active state, setters, or automatic profile mutation. Refactors getActiveDomainProfile(overlays?) through the resolver while preserving codingProfile reference behavior for no-arg and empty-array calls. Adds focused activation tests and updates durable refactor handoff/HR documentation.
```

## Detailed Commit Body

```text
- Add ActiveDomainProfileSource<TItemTypeNodeId> to ontology types.
- Add profileActivation.ts with resolveActiveDomainProfile(source).
- Preserve getActiveDomainProfile() and getActiveDomainProfile([]) returning codingProfile by reference.
- Compose explicit overlays through the resolver.
- Add profileActivation tests for omitted/null/empty overlays, explicit overlay composition, immutability, no-cache behavior, non-default base profiles, and getActiveDomainProfile compatibility.
- Keep the slice internal-only: no DB, UI, persistence, global state, setters, or automatic activation.
- Update NEXT_LLM_CONTEXT, TOMORROW_START, implementation_handoff, and Pi HR notes/reports.
- Verification: TypeScript clean; 103/103 focused ontology/guard/correction/activation tests; 429/429 full suite.
```

## Commit Caveat

Do not include local tool folders unless explicitly requested:

```text
.claude/
C:\pi-stuff\sessions\
```

The Pi HR files under `C:\pi-stuff` are a separate repo/work area from the app repo. Commit them separately if desired.
