# Graph Ideas And Integration Notes

## What we integrated now
- Added **Cytoscape.js** graph rendering support for the Learning screen knowledge graph.
- Added **cytoscape.js-cxtmenu** support (context menu / long-press radial menu) when the extension is available.
- Kept the previous SVG graph path as a fallback so the app still works if Cytoscape scripts are unavailable.

## Runtime behavior
- Learning screen graph (`#learning-graph`) now prefers Cytoscape when:
  - pan/zoom mode is enabled
  - Cytoscape is loaded
- Home preview graph (`#home-knowledge-graph`) stays on the lightweight SVG renderer.

## Context menu behavior (cxtmenu)
- On **session nodes**:
  - `Open Session`
  - `Center Node`
- On **concept nodes**:
  - `Open Concept`
  - `Ask Learner`
  - `Center Node`

## New graph UX controls
- Added a top-right **Bigger / Smaller** control for the graph panel.
- Expanded mode is persisted in state (`learningHub.graphExpanded`) and reused when reopening the Learning screen.
- Zoom label still updates live.
- Cytoscape path supports pinch zoom + pan naturally.

## Back navigation updates
- Strengthened Android/back navigation handling:
  - Browser history state sync on screen transitions
  - `popstate` integration for reliable back-stack behavior
  - Capacitor `App` back button listener support
  - duplicate-event guard for environments that fire multiple back events
- Goal: back should go to the latest visited screen first, instead of unexpectedly jumping.

## CDN dependencies added
- `https://unpkg.com/cytoscape@3.30.2/dist/cytoscape.min.js`
- `https://unpkg.com/cytoscape-cxtmenu@3.5.0/cytoscape-cxtmenu.js`
- `https://unpkg.com/cytoscape-cxtmenu@3.5.0/cytoscape-cxtmenu.css`

## Follow-up ideas
- Bundle Cytoscape + cxtmenu locally (offline-safe, deterministic builds).
- Add custom cxtmenu command icons matching app icon sprite.
- Add graph filter chips (`today`, `file`, `project`, `source`) for faster memory navigation.
