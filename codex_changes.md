# Codex Changes (2026-04-14)

## Summary
Implemented three user-facing upgrades:
1. Knowledge graph now supports Cytoscape + cxtmenu integration (with fallback).
2. Knowledge graph has a top-right **Bigger/Smaller** toggle.
3. Android back behavior now tracks and returns to the latest visited screen more reliably.

## Files changed

### Web runtime (source of truth)
- `C:\CodeLens-v2\codelens-full\www\index.html`
  - Added Cytoscape and cxtmenu CDN includes.

- `C:\CodeLens-v2\codelens-full\www\styles\app.css`
  - Added graph right-controls and size-toggle styles.
  - Added expanded graph shell styles.
  - Added Cytoscape canvas container styles.
  - Added cxtmenu font/style hook.

- `C:\CodeLens-v2\codelens-full\www\scripts\01-state.js`
  - Added `state.learningHub.graphExpanded`.
  - Added state-shape normalization for `graphExpanded`.

- `C:\CodeLens-v2\codelens-full\www\scripts\02-init.js`
  - Added `initializeNavigationBackHandling()` during setup.
  - Added delegated action `toggle-learning-graph-size`.

- `C:\CodeLens-v2\codelens-full\www\scripts\03-navigation.js`
  - Added browser history sync helpers for screen transitions.
  - Added `initializeNavigationBackHandling()` with:
    - `popstate` handling
    - Capacitor `App` back listener
    - duplicate back-event guard
  - `showScreen()` now syncs browser history state for each forward transition.
  - Added Cytoscape cleanup when leaving learning screen.

- `C:\CodeLens-v2\codelens-full\www\scripts\16-learning.js`
  - Added `graphExpanded` helpers:
    - `isLearningGraphExpanded`
    - `setLearningGraphExpanded`
    - `toggleLearningGraphExpanded`
  - Added Cytoscape renderer path:
    - extension registration (`cytoscape-cxtmenu`)
    - Cytoscape element generation from existing graph data
    - tap handlers for session/concept open
    - cxtmenu commands
    - zoom persistence to state
  - Kept SVG renderer as fallback.
  - Updated shared graph controls (includes top-right Bigger/Smaller button).
  - Updated learning screen graph render call to pass `expanded`.

### Android asset mirror (copied from www)
- `C:\CodeLens-v2\codelens-full\android\app\src\main\assets\public\index.html`
- `C:\CodeLens-v2\codelens-full\android\app\src\main\assets\public\styles\app.css`
- `C:\CodeLens-v2\codelens-full\android\app\src\main\assets\public\scripts\01-state.js`
- `C:\CodeLens-v2\codelens-full\android\app\src\main\assets\public\scripts\02-init.js`
- `C:\CodeLens-v2\codelens-full\android\app\src\main\assets\public\scripts\03-navigation.js`
- `C:\CodeLens-v2\codelens-full\android\app\src\main\assets\public\scripts\16-learning.js`

## Validation run
- `node --check` passed for:
  - `www/scripts/01-state.js`
  - `www/scripts/02-init.js`
  - `www/scripts/03-navigation.js`
  - `www/scripts/16-learning.js`

## Notes for next LLM
- Current Cytoscape integration uses CDN scripts. For production/offline Android reliability, vendoring these files locally is the next hardening step.
- Existing custom SVG graph remains and is still used as fallback + home preview graph.
