# Prompt For Kimi: Sandbox Chat Engine Next Slice

You are working in the CodeLens sandbox worktree:

`C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn`

Your job is to continue the sandbox chat engine work safely and narrowly. This is a React Native / Expo web sandbox for testing structured chat rendering. The goal is to make the current Contract v1.0.0 migration compile and render correctly, not to build new unrelated systems.

<absolute_constraints>
- Do NOT run `git commit`, `git add`, `git reset`, `git checkout`, `git clean`, branch operations, or any other git history/staging operation.
- Do NOT touch the main worktree or any path outside `C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn`.
- Do NOT build Track 2 / Under-The-Hood Canvas Engine in this slice.
- Do NOT implement decorator expansion, syntax deconstruction canvases, animated node graphs, call-flow visualizers, or abstraction-layer canvas UI.
- Do NOT do broad filesystem scans from `C:\Users\muell` or other parent directories.
- Do NOT refactor unrelated app code.
- Do NOT change provider/model settings, app secrets, native project config, package manager config, or dependency versions unless explicitly asked.
</absolute_constraints>

<current_user_intent>
The user wants this sandbox to stay focused. They specifically do not want the "under the syntax / under abstraction layers / code under the hood canvas" idea implemented here yet.

The valid current slice is:
- Finish the Contract v1.0.0 migration.
- Align the existing sandbox UI with the new contract shape.
- Update tests for the new parser/validator behavior.
- Keep the sample review content only as a demo for the structured review renderer.
</current_user_intent>

<important_files>
- `SANDBOX_ENGINE_CONTRACT_SPEC.md` is the contract source of truth.
- `SANDBOX_ENGINE_BUILD_SESSION.md` explains the previous migration work and what remains.
- `src/features/sandbox-chat-engine/types.ts`
- `src/features/sandbox-chat-engine/engine.ts`
- `src/features/sandbox-chat-engine/sampleData.ts`
- `src/features/sandbox-chat-engine/modelAdapter.ts`
- `src/features/sandbox-chat-engine/ui/SandboxChatEngineScreen.tsx`
- `src/features/sandbox-chat-engine/__tests__/engine.test.ts`
- `src/ui/theme.ts`
</important_files>

<known_current_state>
The previous migration changed the data layer to Contract v1.0.0:
- Added `version`.
- Added term `spans`.
- Added first-class `findings`.
- Changed calculations from `label/expression/result/explanation` to `title/kind/steps/conclusion`.
- Added orange and teal theme colors.

However, the work is mid-migration. TypeScript currently fails because:
- `engine.ts` returns optional properties as explicit `undefined`, which breaks `exactOptionalPropertyTypes`.
- `SandboxChatEngineScreen.tsx` still renders old calculation fields.
- `InspectorContent` still narrows old calculation/layer shapes incorrectly and does not properly handle findings.
- Tests still use old contract objects without `version`, `spans`, and `findings`.
</known_current_state>

<first_command_to_run>
Run this from the sandbox worktree before making assumptions:

```powershell
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

Expected current failure areas:
- `src/features/sandbox-chat-engine/engine.ts`
- `src/features/sandbox-chat-engine/ui/SandboxChatEngineScreen.tsx`
</first_command_to_run>

<required_work_order>
1. Fix TypeScript compile errors first.
2. Update `SandboxChatEngineScreen.tsx` to render Contract v1.0.0.
3. Update `engine.test.ts` so tests use valid v1.0.0 contracts.
4. Add focused validator tests for the new rules.
5. Run TypeScript and the sandbox engine test file.
</required_work_order>

<implementation_constraints>
- Keep edits scoped to the sandbox chat engine files listed above unless a compile error proves another file must change.
- Preserve the existing three-pane UI structure: chat pane, code pane, inspector pane.
- Preserve Local / Model mode behavior.
- Preserve `Open review` / `Active review` behavior.
- Use term `spans` for inline keyword highlighting. Do not regex-match labels as the source of truth.
- Sort spans by `proseOffset`, ignore invalid/overlapping spans, and render the exact prose substrings.
- Category colors should follow the contract:
  - `risk` = red
  - `concept` = blue
  - `api` = green
  - `data` = purple
  - `performance` = orange
  - `test` = teal
- Render calculations as `title`, `kind`, `steps[]`, and `conclusion`.
- Render findings as review issues with severity, category, title, description, optional suggestedFix, and optional line range.
- Let clicking a finding set inspector target `{ type: 'finding', id }`.
- In the inspector, distinguish term, layer, calculation, and finding with robust type guards.
- Do not add a canvas view.
- Do not add new abstractions unless they reduce repeated rendering logic in this file.
</implementation_constraints>

<validator_guidance>
The current validator direction is good, but tighten it where practical:
- With `exactOptionalPropertyTypes`, omit optional fields instead of setting them to `undefined`.
- Validate span offsets as finite non-negative integers.
- Validate span length as a finite positive integer.
- Validate `proseOffset + length <= prose.length`.
- Validate the prose slice exactly equals the term label.
- Validate finding and layer line ranges as finite positive integers.
- Duplicate IDs should either be actually dropped or the diagnostic text should not claim they are dropped.
- Do not make old invalid model output crash the UI. Prefer diagnostics plus fallback where appropriate.
</validator_guidance>

<tests_to_add_or_update>
Update existing tests so normal valid contracts include:
- `"version": 1`
- `"findings": []`
- term `category`
- term `spans`
- new calculation shape if calculations are present

Add focused tests for:
- Span substring mismatch emits `xr-006`.
- Span out of bounds emits `xr-005`.
- Broken `relatedTermIds` emits `xr-001`.
- Broken `findings.termId` emits `xr-002`.
- Broken `findings.artifactId` emits `xr-003`.
- Finding line range beyond artifact emits `xr-004`.
- Layer line range beyond artifact emits `xr-007`.
- Duplicate IDs emit `xr-008`.
- Findings resolve through `resolveInspectorTarget`.
</tests_to_add_or_update>

<verification_commands>
Run these from the sandbox worktree:

```powershell
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

```powershell
npx vitest run src/features/sandbox-chat-engine/__tests__/engine.test.ts
```

If Vitest cannot run because of environment/process spawning restrictions, report the exact error and still provide the TypeScript result.
</verification_commands>

<definition_of_done>
The slice is done only when:
- TypeScript passes, or any remaining failure is clearly unrelated and documented.
- The sandbox UI no longer references old calculation fields.
- The UI can inspect terms, layers, calculations, and findings.
- Inline keyword rendering uses spans rather than regex matching.
- Tests are updated for Contract v1.0.0.
- No Track 2 canvas/syntax-deconstruction work was added.
- No git commit/staging/history operation was performed.
</definition_of_done>

<response_format>
When finished, report:
1. Files changed.
2. What was fixed.
3. Verification commands run and their results.
4. Any remaining risks or TODOs.
5. Confirm explicitly that no git commit/staging/history operation was performed.
</response_format>
