# Sandbox Engine Build Session — 2025-05-01

> Worktree: `C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn`  
> Branch: `sandboxtexttesting-worktree`

## What I Did

I read the full contract specification (`SANDBOX_ENGINE_CONTRACT_SPEC.md`) and the three handoff docs (`INTENT`, `PLAN`, `WHERE_WE_STANDING`), then aligned the sandbox chat engine codebase to **Contract v1.0.0**.

### Files Changed

| File | What Changed |
|------|--------------|
| `src/features/sandbox-chat-engine/types.ts` | Rewrote types to match v1.0.0 spec. Added `version`, `spans`, `findings`, rewrote `Calculation` to `steps + conclusion`, expanded `LayerKind`s, added inspector target for `finding`. |
| `src/features/sandbox-chat-engine/engine.ts` | Complete parser/validator rewrite. Added version checking, span validation, findings normalization, cross-reference integrity rules (XR-001 → XR-008), id-format regex (`^[a-z0-9][a-z0-9\-]*[a-z0-9]$`), fallback contract with valid spans, duplicate-id detection. |
| `src/features/sandbox-chat-engine/sampleData.ts` | Updated the default sample to v1.0.0. Added exact `spans` offsets for all 6 terms, rewrote the calculation to the new step-based shape, added 3 sample `findings` with severity/category/line ranges/suggestedFix. |
| `src/features/sandbox-chat-engine/modelAdapter.ts` | Updated local contract builder, system prompt, repair prompt, and model fallback to emit v1.0.0 contracts. Local mode now computes spans dynamically. System prompt now instructs the model about `version`, `spans`, `findings`, and the new calculation schema. |
| `src/ui/theme.ts` | Added `orange: '#d19a66'` and `teal: '#56b6c2'` so the UI can render category-colored term bricks per the spec. |

### Key Architectural Decisions

1. **Version is a warning, not blocking (for now)** — `invalid-version` emits a `warning` diagnostic rather than `error`. This prevents every old test and unre-prompted model response from instantly falling back. Once the model reliably emits `version: 1`, we can escalate to `error`.

2. **Spans are the source of truth for highlighting** — The spec requires terms to declare exact `{ proseOffset, length }` positions. The engine now validates XR-005/XR-006 (span bounds and substring equality). The old regex-based highlight path in the UI still exists but is slated for replacement.

3. **Findings are first-class** — `SandboxFinding` links to `termId` and `artifactId` with optional line ranges. The validator checks all cross-references so broken links surface as diagnostics instead of crashes.

4. **Layer kinds expanded** — Added `expansion`, `callflow`, `closure`, `runtime-order`, `abstraction`, and `x-*` custom prefixes. This prepares the contract for Track 2 (Under-The-Hood Canvas Engine) without changing the parser later.

5. **Local contract uses dynamic span computation** — `buildLocalContractResponse` calls `prose.indexOf(label)` to generate valid offsets automatically, so the local prose can evolve without manual offset recalculation.

## What Is Still Open / Next Steps

### 1. UI Screen Update (`SandboxChatEngineScreen.tsx`) — NOT DONE YET
The UI still uses the old shapes and rendering logic. These are the concrete remaining tasks:

- **Span-based keyword highlighting** — Replace `renderTextWithTerms` regex splitting with span-aware rendering. Collect all term spans, sort them, remove overlaps, and emit `<Text>` nodes with category-colored backgrounds.
- **Category-colored bricks** — The spec assigns colors per category (`risk` = red, `concept` = blue, `api` = green, `data` = purple, `performance` = orange, `test` = teal). The theme colors exist; the UI still renders all bricks yellow.
- **Findings rendering** — Add a "Findings" section to the code pane (middle) with severity-colored gutter markers. Add `finding` to the inspector pane (right) so clicking a finding shows severity badge, category, description, and suggestedFix.
- **Calculations UI rewrite** — The old UI renders `label / expression / result`. The new contract has `title / kind / steps[] / conclusion`. The UI needs to render a step-by-step breakdown.
- **Inspector target expansion** — `resolveInspectorTarget` and `InspectorContent` now support `finding` in the engine, but the UI screen never emits `{ type: 'finding', id }` targets yet.

### 2. Tests Update (`engine.test.ts`) — NOT DONE YET
The existing tests mostly still pass because the parser is backward-lenient, but they need to be upgraded:

- Update inline test contracts to include `"version": 1` and `"spans": [...]` so they run cleanly without extra diagnostics.
- Add tests for the new validator rules: span substring mismatch, duplicate ids, broken `relatedTermIds`, broken `findings.termId`, layer line ranges exceeding artifacts, etc.
- Add tests for findings normalization and the new calculation shape.

### 3. Model Compliance Hardening — PARTIALLY DONE
The system prompt and repair prompt now mention v1.0.0 fields, but we still need:

- **Retry/repair when spans are missing or wrong** — The repair prompt includes a `spans` example, but the repair logic does not yet specifically detect span violations and ask for a targeted fix.
- **Structured output strategy** — If the configured model supports JSON mode / constrained decoding, we should eventually move from "prompt + pray" to a real schema-enforced output. That is future work.

### 4. Track 2: Under-The-Hood Canvas Engine — FUTURE
The contract now includes layer kinds like `expansion`, `callflow`, `closure`, and `runtime-order`. The UI does not render them differently yet. Track 2 work should:

- Read these layer kinds from the contract.
- Open a canvas/visual deconstruction view when the user clicks a code concept that has an `expansion` or `callflow` layer.

## Why I Did It This Way

The spec (`SANDBOX_ENGINE_CONTRACT_SPEC.md`) was written as the "single source of truth" for a reason: the previous sandbox worked, but the model output was unreliable and the UI had to guess too much. The v1.0.0 contract solves this by:

1. **Anchoring every clickable term to an exact prose offset** (`spans`) so the UI never has to regex-match and get false positives.
2. **Adding `findings`** so code-review answers feel like real review surfaces (severity, category, suggested fix) instead of loose keyword bricks.
3. **Adding `version`** so we can evolve the contract later without breaking the parser.
4. **Cross-reference integrity rules** so the model (and local builders) are forced to produce coherent, linkable data. Broken links become visible diagnostics instead of silent UI bugs.
5. **Preparing layer kinds for Track 2** now so the contract format does not need another breaking change when we build the visual deconstruction canvas.

I started with the data layer (types → engine → sample data → model adapter) because everything downstream (UI, tests, model behavior) depends on the schema being solid first. The UI and tests are the natural next slice.

## How To Run

```powershell
cd C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn
npm.cmd run web -- --port 8092 --clear
```

Open: `http://localhost:8092/sandboxtexttesting`

## Verification

TypeScript compile check (run from the worktree):

```powershell
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

Vitest (from the worktree):

```powershell
npx vitest run src/features/sandbox-chat-engine/__tests__/engine.test.ts
```

> Note: The UI file and tests still need updates for a fully clean TypeScript build and green test suite.
