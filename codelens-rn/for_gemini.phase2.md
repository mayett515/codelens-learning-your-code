# Phase 2 Implementation — Project Viewer + Mark System

This document describes everything built in Phase 2, file by file, with key code decisions explained. Phase 1 (domain + persistence + RAG smoke test) was already complete before this work began.

## Files Created / Modified

### 1. `src/domain/marker.ts` — Pure Mark Logic (NEW)

The core marking engine. Pure functions, no React/IO imports — respects the hexagonal boundary.

**Key functions:**

- `applyMark(marks, line, color)` → If a mark with the same color exists at that line, increment its `depth`. Otherwise add a new mark at `depth: 0`.
- `eraseMark(marks, line, color)` → If depth > 0, decrement depth and return `{ hadDepth: true }` (signals the UI to show erase confirmation). At depth 0, remove the mark entirely.
- `applyRangeMark(ranges, startLine, endLine, color)` → Same depth-increment logic for ranges. Normalizes line order (always stores lo→hi).
- `eraseRangeMark(ranges, startLine, endLine, color)` → Same depth-decrement-then-remove pattern.
- `getLineMarkColor(marks, ranges, line)` → Checks line marks first, then range marks. Returns `{ color, depth }` or null. Used by the code viewer to render backgrounds.
- `hasMarksAtLine(marks, ranges, line)` → Boolean helper.

**Design decisions:**
- Depth starts at 0 (first mark). Re-marking same color increments to 1, 2, etc.
- `eraseMark` returns `hadDepth` boolean so the UI layer can decide whether to show confirmation — the domain doesn't know about UI.
- Range marks normalize start/end so `(28, 12)` and `(12, 28)` produce the same range.

---

### 2. `src/lib/github.ts` — GitHub Raw Content Fetcher (NEW)

Fetches all text files from a public GitHub repo using the GitHub API (no auth needed).

**Flow:**
1. `parseGitHubUrl(url)` extracts `owner/repo/branch` from various GitHub URL formats (handles `.git` suffix, `/tree/branch` paths).
2. `fetchGitHubRepo(url, projectId)` calls the GitHub Trees API (`GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`) to get the full file tree.
3. Filters to text files only using an extension whitelist (`TEXT_EXTENSIONS` Set — .ts, .js, .py, .go, .rs, .json, .md, etc.).
4. Downloads file content from `raw.githubusercontent.com` in batches of 10 concurrent requests using `Promise.allSettled` for resilience.
5. If the branch returns 404, auto-retries with `master` ↔ `main` fallback.

**Exports:**
- `fetchGitHubRepo(url, projectId)` → `GitHubFile[]`
- `extractRepoName(url)` → `string | null` (for project naming)

---

### 3. `app/index.tsx` — Home Screen (REWRITTEN)

Was a placeholder ("Phase 1 complete. Projects will appear here in Phase 2."). Now a full home screen.

**Features:**
- Project cards in a `FlatList`, sorted by `createdAt` descending
- Each card shows: source badge (GH = blue, P = green), project name, creation date
- FAB (floating action button) in bottom-right opens new project modal
- Empty state: "No projects yet — Import a GitHub repo or paste some code"
- TanStack Query (`useQuery({ queryKey: ['projects'], queryFn: getAllProjects })`) for reactive data
- Dev and Settings buttons in header (small, unobtrusive)

**Navigation:**
- Tap project card → `router.push(/project/${id})`
- FAB → opens `NewProjectModal`
- On project created → invalidates query, navigates to project viewer

---

### 4. `src/ui/components/NewProjectModal.tsx` — New Project Modal (NEW)

Bottom-sheet style modal with two tabs: **GitHub** and **Paste Code**.

**GitHub tab:**
- URL text input
- "Import" button → calls `fetchGitHubRepo`, then `insertProject` + `insertFile` for each file
- Shows loading spinner during fetch
- Error display if import fails

**Paste Code tab:**
- Project name input (required)
- File name input (optional, defaults to `main.txt`)
- Code textarea (multiline, monospace)
- "Create" button → creates project + single file in DB

**Shared behavior:**
- `KeyboardAvoidingView` wrapping for iOS
- `onCreated(projectId)` callback triggers navigation
- Reset all state on close

---

### 5. `app/project/[id].tsx` — Project Viewer Screen (REWRITTEN)

Was a stub with just "Project ID: {id}". Now the main Phase 2 screen.

**Layout (top to bottom):**
1. **Header** — back button, project name, View/Mark mode toggle
2. **Recent files bar** — horizontal scroll of up to 8 recently opened files (per project, most-recent-first per spec `07-PRESERVE`)
3. **File path button** — shows current file path, taps to open file picker
4. **Range select bar** — shown only during range selection ("from line X — tap end line")
5. **Code viewer** — the main content area (see CodeViewer component)
6. **Color picker** — 5-color bar, shown only in mark mode
7. **Erase confirmation bar** — animated, shown when erasing a mark with depth > 0

**State management:**
- `useInteractionModeStore` (zustand) — view/mark mode
- `useSelectionStore` (zustand) — range select state
- `useMarkColorStore` (zustand) — active mark color
- TanStack Query for project, files, and current file data
- Local state for file picker visibility and erase confirmation

**Mark flow (in mark mode):**
- **Tap unmarked line** → `applyMark` → save to DB via `updateFileMarks`
- **Tap same-color marked line** → `eraseMark` → if `hadDepth`, show erase confirmation bar instead of immediately erasing
- **Long-press line** → enters range select mode, sets start line
- **Tap second line in range mode** → `applyRangeMark` from start to tapped line → save → reset selection

**Recent files:**
- Selecting a file moves it to position 0 of `project.recentFileIds` (max 8)
- `updateProject` persists this to DB
- The recent bar maps `recentFileIds` to actual file objects for display

---

### 6. `src/ui/components/CodeViewer.tsx` — Code Renderer (NEW)

Renders file content as numbered lines with mark highlighting.

**Rendering:**
- Splits content by `\n`, renders each line as a `Pressable`
- Line number (right-aligned, muted) + code text (monospace font)
- Nested `ScrollView`: vertical for lines, horizontal for long lines

**Mark visualization:**
- `getLineMarkColor` checks each line against marks and ranges
- Background color uses the mark color with alpha based on depth: `alpha = min(0.15 + depth * 0.12, 0.55)` — deeper marks = darker shade
- Depth > 0 shows a 3px colored bar on the left edge (`depthIndicator`)

**Touch:**
- `onPress` → `onLinePress(lineNum)` — handled by project viewer for mark/erase
- `onLongPress` → `onLineLongPress(lineNum)` — handled for range select

---

### 7. `src/ui/components/FilePickerModal.tsx` — File Picker (NEW)

Bottom-sheet modal for selecting files within a project.

**Search modes (per spec `07-PRESERVE § File Picker Search Modes`):**
- **path+content** (default) — substring match on file path AND file content
- **filename only** — substring match on basename only
- Toggle buttons to switch mode

**Display:**
- Files sorted alphabetically by path
- Directory path shown in muted color, filename highlighted
- File count displayed
- `FlatList` with `keyboardShouldPersistTaps="handled"`

---

### 8. `src/ui/components/ColorPicker.tsx` — Mark Color Selector (NEW)

Horizontal row of 5 circular color swatches (red, green, yellow, blue, purple) matching the theme colors.

- Active color has full opacity + white border
- Inactive colors at 50% opacity
- Calls `onSelect(color)` which updates the zustand store

---

### 9. `src/ui/components/EraseConfirmBar.tsx` — Erase Confirmation (NEW)

Per spec `07-PRESERVE § Erase Confirmation`: "When the user attempts to erase a mark of depth > 0, show a small confirm bar."

- Animated opacity transition (200ms)
- Text: "Erase mark? Tap again to confirm"
- Two buttons: "Erase" (red) and "Cancel" (muted)
- Positioned absolute at bottom of screen

---

### 10. `src/stores/mark-color.ts` — Active Color Store (NEW)

Simple zustand store:
```ts
{ activeColor: MarkColor, setColor: (color) => void }
```
Default color: `'yellow'`. Used by the project viewer and color picker.

---

## Architecture Notes

- **Hexagonal boundary preserved**: `domain/marker.ts` imports only from `domain/types.ts`. No React, no DB, no IO.
- **Existing query helpers reused**: `projects.ts` (getAllProjects, getProjectById, insertProject, updateProject), `files.ts` (getFilesByProject, getFileById, insertFile, updateFileMarks). No new query helpers were needed.
- **Existing stores extended**: `interaction-mode.ts` and `selection.ts` (from Phase 1) used directly. Only `mark-color.ts` was added.
- **TanStack Query** used for all data fetching in screens. Mutations invalidate relevant query keys.
- **No Phase 3+ features**: No chat buttons, no learning hub references, no AI integration. The project viewer is purely for reading code and marking lines.

## TypeScript Status

`tsc --noEmit` passes with zero errors. All files use strict mode with `exactOptionalPropertyTypes`.

## What to Test on Device

1. Home screen → FAB → New Project → GitHub tab → paste a public repo URL → Import
2. Should navigate to project viewer with files loaded
3. Open file picker → search by path+content and filename-only modes
4. Toggle to Mark mode → tap lines → see colored marks
5. Tap same-color line again → depth increments (darker shade, left bar appears)
6. Tap marked line → erase confirmation bar if depth > 0
7. Long-press → range select → tap end line → range marked
8. Recent files bar updates as you switch files
9. Home screen → Paste Code tab → create project with pasted code
10. Back button returns to home, project card visible
