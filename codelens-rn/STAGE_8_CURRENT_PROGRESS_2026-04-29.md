# Stage 8 Current Progress - 2026-04-29

## Where We Stand

Stage 8 is progressing in slices.

Slice 3 is already committed and pushed:

```text
3b2cf68 feat(stage8): line-level mini chat with cancel and save handoff
```

Slice 4, reader bookmarks for code lines, is currently uncommitted and commit-ready after review fixes.

Verified for Slice 4:

- TypeScript passes: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
- Tests pass: `npm.cmd test -- --run` => `36` files / `179` tests
- `git diff --check` passes, with CRLF warnings only
- `git grep -n "bookmarkId" src/features/learning` returns zero results
- `git grep -n "ensureBookmarkPalette" src/features/bookmarks/hooks` returns zero results
- Guard scans are clean for new `as any`, new `@ts-expect-error`, forbidden extractor imports, hardcoded query key arrays, and memory-context leakage

Known local drift outside the slice:

- `../.claude/settings.local.json` is modified and should not be included in the app commit.

## Slice 4 Summary

Reader bookmarks now have a real Stage 8 data path and file-viewer UI:

- Adds `bookmarks` and `bookmark_palettes` tables through migration `010-stage8-reader-bookmarks`.
- Adds the `src/features/bookmarks/` feature folder with IDs, Zod codecs, repositories, query keys, hooks, default palette, `BookmarkSheet`, and `GutterBookmarkDot`.
- Wires the project viewer gutter chip to create and edit bookmarks on code lines.
- Shows bookmark dots in `CodeViewer` without mixing bookmark state into legacy file marks/ranges.
- Changes `GutterActionChip` so bookmarked lines show a color dot and use `Edit bookmark`.
- Supports edit-mode `Save capture from here` from a bookmark location, without automatically writing `linked_capture_id`.
- Keeps palette reads side-effect free; default palette rows are only seeded when the first bookmark is created.
- Adds pending/error UX for bookmark save/delete operations so duplicate/double-tap failures surface in the sheet.
- Closes mini-chat before opening the bookmark sheet, avoiding overlapping overlays.
- Adds repo-level behavior tests for duplicate bookmark rejection, palette removal protection, and delete preserving linked capture rows.

## Review Fixes Applied

Opus findings fixed:

- Removed the dead `bookmarkId` field from the learning save source path.
- Removed the misleading `bookmarkId: bookmark.id` handoff from bookmark save-capture.
- Added `TODO(stage8-followup): persist bookmark provenance on captures.` above bookmark save-capture handling.
- Added `isSaving`, `isDeleting`, and `errorMessage` props to `BookmarkSheet`.
- Disabled save/delete buttons while mutations are pending.
- Rendered bookmark mutation errors in the sheet instead of silently swallowing them.
- Reset bookmark errors on sheet close and target-line changes.
- Changed `useBookmarkPalette` back to read-only `getBookmarkPalette`.
- Added the schema comment for migration `DESC` index documentation drift.
- Added the range-bookmark rendering scope comment.

## Suggested Commit Message

```text
feat(stage8): add reader bookmarks for code lines
```

## Copy-Paste Commit Summary

```text
feat(stage8): add reader bookmarks for code lines

- Add bookmark and bookmark palette schema, migration, codecs, repos, hooks, and query keys.
- Wire the project viewer gutter chip to create/edit single-line reader bookmarks.
- Render bookmark gutter dots in CodeViewer without mutating existing mark/range storage.
- Add BookmarkSheet with palette swatches, note editing, delete confirmation, pending guards, and visible error state.
- Support edit-mode "Save capture from here" using the bookmark's code location, without automatic linked_capture_id writes.
- Keep palette reads side-effect free; seed the default palette only during first bookmark creation.
- Add Stage 8 bookmark tests for schema/codecs/wiring and repo behavior around duplicates, palette removal, and delete safety.
```

## Suggested Stage 8 Next Steps

- Commit Slice 4 after final local review.
- Then decide the next slice explicitly:
  - BookmarkListScreen
  - PaletteEditorScreen
  - multi-bookmark-per-line UI
  - bookmark-to-capture provenance persistence
  - chat message markers

Out of scope for the current Slice 4 commit:

- BookmarkListScreen
- PaletteEditorScreen
- multi-bookmark-per-line UI
- save-from-bookmark outside edit mode
- manual `linked_capture_id` update flow
- Stage 9
