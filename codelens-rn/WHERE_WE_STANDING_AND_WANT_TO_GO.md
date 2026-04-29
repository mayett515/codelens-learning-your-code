# Where We Are Standing And Where We Want To Go

This document is the current handoff for the `sandboxtexttesting-worktree` branch.

## Worktree Purpose

This worktree is a sandbox for experimenting with CodeLens chat rendering, structured model output, and future code-under-the-hood visualizations without touching the main worktree.

Current route:

`/sandboxtexttesting`

Current branch:

`sandboxtexttesting-worktree`

## What Exists Now

The sandbox currently has a prototype called the Review Contract Engine.

The core idea:

- A model can answer in normal prose.
- The model also appends one fenced `codelens-chat-engine` JSON block.
- The app parses that block into structured UI data.
- The UI renders clickable review concepts, code line layers, calculations, diagnostics, and an inspector.

Current main mechanics:

- `Local` mode generates deterministic no-network sandbox output.
- `Model` mode calls the configured app chat model.
- Model mode uses the real CodeLens base chat prompt plus selected-code context for `skeleton.js`.
- Model mode adds the sandbox renderer contract on top.
- If model output is malformed, the parser reports diagnostics.
- If model output and repair both fail, the sandbox now falls back to a stable deterministic review contract instead of rendering garbage.

## Current Review Sample

The current sample is an MCP schema-compressor-style `skeleton.js` snippet.

It is meant to test realistic review concepts:

- `schema cache`
- `cache key`
- `stale data`
- `tool schema`
- `token budget`
- `malformed schemas`

The review focus is:

- cache identity
- schema fetch error boundaries
- stale data
- lossy compression
- wrong tool invocation risk

## Current UI Behavior

The sandbox UI has three panes:

- Left: chat messages and prompt input.
- Middle: code artifact, line layers, and calculations.
- Right: inspector, diagnostics, and prompt contract.

The chat has:

- `Local` / `Model` mode buttons.
- `Visualize keywords` toggle.
- Yellow keyword blocks with categories.
- Dark editor-style rendering for fenced code blocks.
- `Open review` / `Active review` buttons for assistant answers.

Important current improvement:

Older assistant answers can be reopened during the current session. Clicking `Open review` restores that answer's code artifact, terms, calculations, and inspector state.

## Contract Shape

The contract currently expects:

```json
{
  "prose": "visible assistant answer",
  "codeArtifacts": [
    {
      "id": "stable-id",
      "title": "file name",
      "language": "js",
      "code": "source code",
      "layers": [
        {
          "id": "layer-id",
          "kind": "state",
          "title": "Layer title",
          "summary": "Short summary",
          "detail": "Detailed explanation",
          "lineStart": 1,
          "lineEnd": 4
        }
      ]
    }
  ],
  "terms": [
    {
      "id": "schema-cache",
      "label": "schema cache",
      "category": "risk",
      "summary": "Short summary",
      "detail": "Detailed explanation",
      "promptHook": "Follow-up prompt guidance",
      "relatedTermIds": ["cache-key"]
    }
  ],
  "calculations": []
}
```

Term categories:

- `risk`
- `concept`
- `api`
- `data`
- `performance`
- `test`

Layer kinds:

- `surface`
- `imports`
- `state`
- `api`
- `render`
- `calculation`

## What We Learned

The model often understands the code review question but fails the UI contract.

Observed failures:

- wrong fence name
- bare JSON instead of fenced contract
- corrupted field names
- malformed JSON
- too few keywords
- generic keyword labels like `risk`
- huge invalid code-like output

Current mitigation:

- diagnostics
- one repair attempt
- fail-closed fallback contract

## Where We Want To Go Next

Track 1: Review Contract Engine

- Make keyword categorization consistent.
- Make model output more reliable.
- Add better contract repair or structured generation strategy.
- Improve code review findings so they feel like real CodeLens review findings.
- Add finding severity and categories.
- Add richer diagnostics for model compliance.
- Keep old answers temporarily selectable.

Track 1.2: Chat Output Rendering

- Improve dark code block rendering inside chat.
- Make normal text and code visually distinct.
- Make `Visualize keywords` feel intentional and polished.
- Add better keyword block styling by category.
- Let clicked keywords open a more dynamic right-side explanation window.

Track 2: Under-The-Hood Canvas Engine

- Later, build a visual deconstruction engine.
- Example: click a Python decorator and show how it expands under the hood.
- Use nodes, flows, call steps, wrappers, returned functions, and runtime order.
- Drive the visual canvas from the same structured contract when possible.

## How To Run

From the sandbox worktree:

```powershell
cd C:\Projects\CodeLensApp\CodeLens-v2-sandboxtexttesting\codelens-rn
npm.cmd run web -- --port 8092 --clear
```

Open:

`http://localhost:8092/sandboxtexttesting`

## Suggested Test Prompts

Use `Local` first to test UI behavior.

Use `Model` to test whether the configured model follows the contract.

Prompts:

```text
What can go wrong if two MCP servers expose a tool with the same name?
```

```text
Which line is most likely to create stale data?
```

```text
Does this cache ever get invalidated?
```

```text
Is description.slice(0, 180) a safe compression strategy?
```

```text
What keyword concepts should I understand before fixing this function?
```

## Important Note

This worktree intentionally contains web shims for sandbox testing:

- `kv-mmkv.web.ts`
- `secure-store-expo.web.ts`
- `local-embedder.web.ts`
- `db/client.web.ts`
- `composition.web.ts`

These exist to keep `/sandboxtexttesting` runnable in Expo web even though the main app uses native storage, SQLite, and local embedding dependencies.
