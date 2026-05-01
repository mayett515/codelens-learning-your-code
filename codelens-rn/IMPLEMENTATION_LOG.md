# Sandbox Chat Engine Implementation Log

This file describes the current implementation after the post-refactor cleanup.
It is the handoff source for future model work on the sandbox chat engine.

## Current Direction

<implementation_constraints>
- Preserve Contract v1 JSON as the source of truth.
- Preserve explicit `term.spans`; do not guess visible highlights from labels.
- Keep categorization metadata useful but conservative.
- Do not add fake routing, hidden model calls, or pretend model status.
- Do not stage, commit, push, reset, or checkout without explicit user approval.
</implementation_constraints>

## Kept From The Refactor

- `useSandboxChat.ts` keeps chat state, model status, timeout handling, and message submission outside the screen component.
- `ChatMessageBubble.tsx`, `CodeArtifactCard.tsx`, `InspectorContent.tsx`, and `ModelStatusPanel.tsx` keep the screen smaller and easier to test.
- `categorizationEngine.ts` provides conservative subcategory/depth suggestions for terms.
- `engine-index.ts` gives tests a pure import path that avoids React Native module loading.
- `SandboxTerm.subcategory` and `SandboxTerm.depth` are part of the normalized contract.

## Rejected From The Refactor

- Heuristic span rendering was removed. Highlighting must come from validated spans in model output.
- The Deep Dive button was removed. There is no real separate shallow/deep routing path yet.
- `shallowPrompts.ts` was removed because it was disconnected from the real model adapter flow.
- Docs claiming hidden or two-step model routing were rewritten because the feature is not implemented.

## Categorization Behavior

The model can provide:

- `category`: required top-level color group.
- `subcategory`: optional finer label.
- `depth`: optional display hint.
- `promptHook`: optional text shown in the inspector.

If `subcategory` or `depth` is missing, the validator may infer a conservative value from the term label and prose context. It does not override a valid model-provided category.

## Verification

Last known local checks:

```powershell
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
npm.cmd test -- --run
```

Result:

- TypeScript passed.
- Vitest passed: 31 files, 170 tests.

## Next Safe Slice

<next_slice>
- Test the sandbox in Expo web with a real model key configured.
- Make failed provider calls visible in the UI with exact error/status text.
- If deeper term follow-ups are needed, design a real adapter path before adding UI buttons.
- Add one focused integration test around model status transitions if the test environment can cover it.
</next_slice>
