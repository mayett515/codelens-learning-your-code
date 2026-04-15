# Preserve These Behaviors

These are non-obvious behaviors that exist in the legacy app because of real bugs or hard-won UX decisions. **Do not lose them in the rewrite.** Each is paired with the *why* so you can adapt it to the new architecture rather than mechanically copy.

## Marker Depth (Nested Same-Color Marks)

When a line is marked the same color twice (or a range overlaps another range of the same color), the depth is incremented and rendered with a visual distinction (darker shade or thicker bar). Erasing decrements depth before fully removing.

**Why:** Users use the same color twice to express "I've reviewed this twice / extra-confident." Without depth, re-marking is a no-op and feels broken.

**How:** In `domain/marker.ts`, `applyMark(marks, line, color)` returns marks with depth incremented if a mark with the same color already exists at that line. `eraseMark` decrements; only at depth 0 is it removed.

## Erase Confirmation

When the user attempts to erase a mark of depth > 0, show a small confirm bar / toast: "Erase mark? — Tap again to confirm". Single accidental tap should never wipe nested work.

**Why:** Phone touches misfire constantly.

## Range Mark Anchoring

A range mark from line 12 to line 28 must survive file content edits gracefully. In the legacy app, file content is immutable per import — re-importing a file starts fresh marks. **Preserve this:** marks are tied to `(fileId, lineNumber)`, not to text content. If a user re-imports the same path, treat as a new file row.

## Recent Files Order

Each project has a `recentFileIds: FileId[]`, **most recent first**, max 8. Opening a file moves it to position 0. This list is per-project, not global.

## File Picker Search Modes

Two modes:
- `path+content` (default) — substring match on file path *and* file content
- `filename only` — substring match on basename only

Toggle persists per-project.

## Chat Scope Independence

Three scopes — `section`, `general`, `learning` — each have **independent** provider+model selections. Changing the section model must not change the general model. The settings UI must show all three scopes side by side.

**Why:** Users want a cheap fast model for general chat and a stronger model for section discussion or learning extraction.

## AI Queue Serialization

There is exactly one in-flight AI request at a time, globally. New requests queue. Each provider has a minimum delay between calls (cooldown). On retriable failure (HTTP 429, 5xx), exponential backoff up to N retries. On model-unavailable (404 model id), fall back to the scope's default model and surface a toast.

**Why:** Free-tier rate limits. Without serialization the app gets banned.

**Port from:** `codelens-full/www/scripts/12-ai-api.js`.

## Save-As-Learning Preview Modal

After tapping "Save as Learning" but **before** committing, show a preview of:
- The text being saved
- The extracted concept names (after a quick AI extraction call)
- A merge suggestion if any extracted concept matches an existing concept by semantic similarity > 0.85

User can edit the snippet, deselect concepts, or cancel.

**Why:** Without preview, users save trash and the knowledge graph fills with noise.

## Reference View (Read-Only Old Chat)

Tapping a session in the learning hub opens the *original chat that produced it* in read-only mode, with a "Back to Learning" button that restores the prior navigation context.

**Why:** Users want to remember "where did I learn this?" and read the original conversation.

## Import Sync Reset (THE BUG TO NOT REINTRODUCE)

In the legacy app, importing a backup re-hydrated `state.learningHub.embeddings` with metadata records that had `nativeSyncedAt` set. The sync function then thought everything was already synced and skipped the upsert — leaving the native store empty while JS believed it was populated. The fix was `resetLearningEmbeddingSyncFlags()` which wiped `nativeSyncedAt` / `nativeSignature` on every imported record.

**In the new architecture this class of bug cannot exist** because vectors live in SQLite as a single source of truth. But: backups are JSON and may include vectors. On import:
- If the backup contains vectors and signatures match → restore directly.
- If signatures mismatch (different model) → drop vectors, re-embed all concepts in background.
- Never trust a flag like `synced: true` from a backup.

## Hardware Back On Android

Hardware back must:
1. Close any open modal (modal-by-modal, not all at once).
2. Otherwise pop the navigation stack.
3. Otherwise exit the app.

The legacy app had double-pop bugs from both `popstate` and `App.backButton` firing. The RN equivalent: only listen via `BackHandler.addEventListener` once, in `app/_layout.tsx`. Do not also wire `useFocusEffect` back-handlers per screen — that's how double-pops happen.

## Cytoscape Lifecycle

The graph WebView must be torn down on screen unmount. Long-running WebView with a live Cytoscape canvas leaks memory across navigation cycles. In the legacy app this is `destroyLearningGraphCytoscape()` called on screen leave.

**RN equivalent:** the `WebViewGraph` component sends `{ type: 'destroy' }` via `postMessage` in its cleanup, *and* unmounts the WebView itself on screen exit.

## Cytoscape Touch Tuning (Already Solved — Port The Settings)

The cxtmenu config that works on phone:
```ts
{
  selector: 'node',
  openMenuEvents: 'cxttap taphold',
  menuRadius: viewportAdaptive,    // ~32% of min edge, clamp 100..160
  outsideMenuCancel: 40,
  atMouse: false,
  fillColor: 'rgba(28, 36, 54, 0.96)',
  activeFillColor: 'rgba(96, 139, 219, 0.98)',
  itemColor: '#f4f7ff',
  spotlightPadding: 8,
  indicatorSize: 22,
  separatorWidth: 3,
}
```

Plus CSS on the WebView container: `touch-action: none; user-select: none; -webkit-touch-callout: none;` to prevent the OS text-selection UI from hijacking taphold.

Node sizes: session 42px, concept 32px (finger-sized).

## Provider Cooldowns

- OpenRouter: 1100ms minimum between calls.
- SiliconFlow: 1500ms minimum between calls.
- Embedding calls share the same cooldown as completions for that provider.

These are tuned to the free-tier limits as of early 2026.
