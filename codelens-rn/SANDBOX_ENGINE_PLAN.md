# Sandbox Engine Plan

This worktree is for experimenting with CodeLens chat and code visualization ideas without changing the main worktree.

## Track 1: Review Contract Engine

The current sandbox prototype is the Review Contract Engine.

Goal:

- Make model answers render as structured review UI, not just markdown.
- Keep behavior close to the real CodeLens chat prompt.
- Let the model cite code line ranges, explain risks, define important terms, and provide deterministic reasoning traces.

Current mechanics:

- The assistant response includes normal prose plus one fenced `codelens-chat-engine` JSON block.
- The parser extracts the JSON block and normalizes it into UI data.
- Code artifacts render in the middle pane.
- Code layers attach explanations to exact line ranges.
- Yellow term bricks open focused explanations in the inspector.
- Terms have categories: `risk`, `concept`, `api`, `data`, `performance`, or `test`.
- The chat has a `Visualize keywords` toggle so keyword blocks can be turned on/off separately from the answer text.
- Term metadata includes related term ids so the inspector can show connected concepts.
- Each assistant answer can be reopened with `Open review`, restoring that answer's code artifact, keyword terms, calculations, and inspector state during the current session.
- Calculations show review reasoning, tradeoffs, or risk traces.
- Contract diagnostics show missing blocks, invalid JSON, dropped malformed items, bad layer kinds, and suspicious line ranges.
- Model mode layers the sandbox contract on top of the real CodeLens base chat prompt and selected-code context.
- Local mode generates deterministic no-network review output for UI testing.

Current sample:

- `skeleton.js`, an MCP schema-compressor-style snippet.
- Review topics include cache identity, schema fetch errors, lossy compression, token budget, and malformed schemas.

Next useful steps:

- Add a repair/retry prompt when model-produced contracts fail validation or the model misses the contract.
- Make keyword categorization more consistent across model outputs.
- Add severity and finding categories beyond the current contract diagnostics and term categories.
- Make findings feel more like real CodeLens code-review findings.
- Preserve this contract as the data source for richer visualizations later.

## Track 1.2: Chat Output Rendering

This is the visual polish layer for how model answers appear inside chat.

Goals:

- Code snippets inside chat should render as dark editor-like blocks, closer to VS Code/Gemini-style readable code.
- Normal text should stay readable and not be forced into code styling.
- Keyword visualization should be a separate mode: text can be plain, then the user clicks `Visualize keywords` to reveal light clickable keyword blocks.
- Clicking a keyword opens the right-side dynamic inspector window with category, explanation, prompt hook, and related terms.
- Older assistant answers should remain temporarily selectable so the user can compare multiple model outputs in one sandbox session.

Hidden prompt direction:

- The model should choose keyword terms from text the user can see.
- Each keyword must have a stable id, category, summary, detail, prompt hook, and related term ids.
- The UI should never guess important terms only from raw prose when the model can provide structured term metadata.

## Track 2: Under-The-Hood Canvas Engine

This is the planned visual deconstruction layer.

Goal:

- Let the user click a code concept, line, decorator, function call, abstraction, or review finding.
- Open a cool interactive visual canvas that breaks the code apart under the hood.
- Show how an abstraction works step by step, visually and structurally.

Example direction:

- User clicks a Python decorator.
- Canvas shows the original decorator syntax.
- Then it expands into the equivalent function wrapping behavior.
- Then it shows call flow, closure state, returned wrapper, and runtime execution order.

Possible mechanics:

- HTML canvas or SVG/React Native web layer for diagrams.
- Nodes for source code pieces, runtime values, calls, wrappers, and returned functions.
- Animated transitions from compact syntax to expanded form.
- Clickable nodes that open explanation panels.
- Input can come from the Review Contract Engine, so model output can tell the canvas what to draw.

Relationship between the tracks:

- Review Contract Engine decides what the model says and structures it.
- Under-The-Hood Canvas Engine visualizes selected parts of that structure.
- The contract should eventually include enough metadata for both review findings and visual deconstruction.

Working rule:

- Build Track 1 first until the model-to-UI contract is solid.
- Then use that contract to drive Track 2 instead of hardcoding every visualization by hand.
