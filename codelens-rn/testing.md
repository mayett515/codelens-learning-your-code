# Sandbox Chat Engine Testing And Push Checklist

Worktree:

```powershell
C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn
```

Current branch:

```text
sandboxtexttesting-worktree
```

Remote:

```text
codelearningprogram
```

## What Changed

This slice migrates the sandbox chat engine to Contract v1.0.0.

Expected changed files:

```text
src/features/sandbox-chat-engine/types.ts
src/features/sandbox-chat-engine/engine.ts
src/features/sandbox-chat-engine/modelAdapter.ts
src/features/sandbox-chat-engine/sampleData.ts
src/features/sandbox-chat-engine/ui/SandboxChatEngineScreen.tsx
src/features/sandbox-chat-engine/__tests__/engine.test.ts
src/ui/theme.ts
SANDBOX_ENGINE_BUILD_SESSION.md
SANDBOX_ENGINE_CONTRACT_SPEC.md
for_kimi.md
testing.md
```

## Quick Safety Check

From the worktree:

```powershell
cd C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn
git branch --show-current
git status --short
```

Confirm:

```text
sandboxtexttesting-worktree
```

Do not continue if you are on a different branch.

## TypeScript Check

Run:

```powershell
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

Expected result:

```text
No output. Exit code 0.
```

If this fails, fix TypeScript before manual UI testing.

## Unit Test Attempt

Run:

```powershell
npx vitest run src/features/sandbox-chat-engine/__tests__/engine.test.ts
```

Known current issue:

Vitest may fail before running tests with:

```text
RolldownError: Flow is not supported
```

This comes from `node_modules/react-native/index.js` being parsed by the current Vitest/Rolldown setup. If you see that exact startup failure, note it as an environment/test-runner issue, not a sandbox engine TypeScript failure.

## Manual Web Test

Start Expo web:

```powershell
npm.cmd run web -- --port 8092 --clear
```

Open:

```text
http://localhost:8092/sandboxtexttesting
```

Manual checks:

- The page loads without a red error overlay.
- The three panes render: chat, code/calculations/findings, inspector.
- The starter assistant answer appears.
- `Visualize keywords` can be toggled on and off.
- Inline keyword highlights appear in the assistant prose when enabled.
- Keyword colors differ by category, including orange for `performance` and teal for `test` if those categories appear.
- Clicking a highlighted keyword opens the inspector term view.
- Clicking code layer buttons opens the inspector layer view.
- Calculations render as step-based cards with title, kind, step count, and conclusion.
- Clicking a calculation opens the calculation inspector with individual steps.
- Findings render in the middle pane with severity/category/title/description.
- Clicking a finding opens the finding inspector with description and suggested fix.
- `Open review` restores older assistant output state.
- Local mode can send a prompt without requiring an API key.

Suggested Local mode prompts:

```text
Does this cache ever get invalidated?
```

```text
Which line is most likely to create stale data?
```

```text
Is description.slice(0, 180) a safe compression strategy?
```

## Model Mode Smoke Test

Only run this if your configured model/API setup is ready.

In the UI:

1. Switch to `Model`.
2. Send:

```text
What can go wrong if two MCP servers expose a tool with the same name?
```

Check:

- The app does not crash if the model returns malformed JSON.
- Diagnostics appear if the contract is malformed.
- If repair/fallback is used, the UI still renders a stable review contract.

## Before Pushing

Run:

```powershell
git status --short
git diff --stat
node_modules\.bin\tsc.cmd --noEmit --project tsconfig.json
```

Review the diff:

```powershell
git diff -- src/features/sandbox-chat-engine src/ui/theme.ts SANDBOX_ENGINE_BUILD_SESSION.md SANDBOX_ENGINE_CONTRACT_SPEC.md for_kimi.md testing.md
```

Make sure there is no Track 2 canvas implementation, no unrelated app refactor, and no accidental secret/config change.

## How To Push This Branch

Only do this after you are happy with the manual test result.

Stage the intended files:

```powershell
git add -- src/features/sandbox-chat-engine src/ui/theme.ts SANDBOX_ENGINE_BUILD_SESSION.md SANDBOX_ENGINE_CONTRACT_SPEC.md for_kimi.md testing.md
```

Check exactly what is staged:

```powershell
git status --short
git diff --cached --stat
```

Commit:

```powershell
git commit -m "Build sandbox chat engine contract v1"
```

Push the branch:

```powershell
git push -u codelearningprogram sandboxtexttesting-worktree
```

If the upstream already exists, this is also fine:

```powershell
git push codelearningprogram sandboxtexttesting-worktree
```

## If You Need To Stop

If anything looks wrong before committing:

```powershell
git status --short
git diff --stat
```

Do not run reset/checkout/clean unless you are certain which files you want to discard.
