# Stage 8.5 Follow-Ups - Bookmarks Polish and Organization

You are working in:

```text
C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
```

Stage 8 Slice 4 is implementation-complete. Stage 8.5 is a follow-up bucket for bookmark organization features that were deliberately left out of Slice 4.

Do not treat this file as permission to start work automatically. Pick one small slice, confirm scope, then implement only that slice.

## Required Reading Order

Read these before changing code:

1. `MAIN.md`
2. `whatwe_agreedonthearchitecture.md`
3. `whatwe_agreedonthearchitecture_humans.md`
4. `ARCHITECTURE.md`
5. `current_state.md`
6. `PERSISTENCE.md`
7. `STAGE_8_CURRENT_PROGRESS_2026-04-29.md`
8. `..\comparision java vs react native\CODELENS_PROJECT_STATUS.md`
9. `..\comparision java vs react native\CODELENS_REGRESSION_GUARD.md`
10. `..\comparision java vs react native\CODELENS_COMPLETENESS_GUARD.md`
11. `..\comparision java vs react native\STAGE_8_PERSONAS_AND_CHAT_UX.md`

If any of the parent-path constraint files are unavailable, say so explicitly and continue using the local architecture files as the binding contract.

## Current Baseline

Stage 8 Slice 4 landed reader bookmarks across two unpushed commits:

```text
f97db0c chore(stage8): tighten bookmark slice after review
d6438bf feat(stage8): add reader bookmarks for code lines
```

Slice 4 shipped:

- `bookmarks` and `bookmark_palettes` schema through migration `010-stage8-reader-bookmarks`.
- `src/features/bookmarks/` with types, codecs, repos, query keys, hooks, UI, and feature barrel.
- File-viewer line bookmark create/edit/delete through `BookmarkSheet`.
- Gutter bookmark dots in `CodeViewer` through `bookmarkIndicators`, separate from legacy marks/ranges.
- Edit-mode `Save capture from here` handoff without automatic `linked_capture_id` writes.
- Palette read is side-effect free; default palette seeding happens during first bookmark creation.
- Repo invariants around duplicate locations, palette removal, delete safety, update color validation, and transactional palette update.

## Stage 8.5 Goal

Make bookmarks easier to organize and revisit while preserving the Stage 8 architecture rule:

```text
Bookmarks are organization/navigation tools unless a future spec explicitly makes them learning signals.
```

Stage 8.5 should not change retrieval, embeddings, extractor behavior, concepts, review scoring, Dot Connector, or Learning Hub ordering.

## Candidate Slices

### Slice 8.5A - BookmarkListScreen

Purpose:
- Give users a project-level view of saved reader bookmarks.

Suggested scope:
- Add a screen or route for listing bookmarks by project.
- Show file path, line/range, color, optional note, and created/updated time.
- Tap a bookmark to navigate back to the project viewer and target file/line if the existing navigation surface supports it cleanly.
- Filter by color if it fits the existing UI without adding palette editing.
- Reuse `useBookmarks` / `useBookmarksByFile` and `bookmarkKeys`.

Do not:
- Add concept links.
- Add capture creation.
- Add Learning Hub sections.
- Add global search unless it is already trivial from existing hooks.

### Slice 8.5B - PaletteEditorScreen

Purpose:
- Let users customize per-project bookmark colors.

Suggested scope:
- Build a palette editor around `useBookmarkPalette` and `useUpdateBookmarkPalette`.
- Preserve the existing min 1 / max 10 palette codec rules.
- Validate `key`, `label`, and `hex` through existing codecs or equivalent UI constraints.
- Surface repo errors when removing colors that are still in use.
- Keep palette edits project-scoped.

Do not:
- Merge reader bookmark palettes with chat/message palettes.
- Auto-reassign bookmarks when a color is removed unless explicitly requested in a later spec.
- Add remote sync.

### Slice 8.5C - Bookmark-To-Capture Provenance

Purpose:
- Persist that a saved learning capture came from a bookmark location.

Suggested scope:
- Replace the existing `TODO(stage8-followup): persist bookmark provenance on captures.` with an explicit data path.
- Decide whether provenance belongs in `learning_captures` metadata, a join table, or a nullable bookmark link update.
- Preserve current behavior until the user explicitly saves a capture.
- Add migration/tests if schema changes.

Do not:
- Auto-create captures when bookmarks are created.
- Treat bookmarks as concepts.
- Change familiarity, importance, review events, promotion, retrieval, or Dot Connector scoring.
- Backfill provenance unless the spec explicitly asks for it.

### Slice 8.5D - Multi-Bookmark-Per-Line UI

Purpose:
- Support multiple visible bookmark markers for the same line/range if the product direction changes.

Current constraint:
- Migration has `idx_bookmarks_location` unique on `(project_id, file_path, start_line, end_line)`, so multiple bookmarks at the exact same single-line location are not currently allowed.

Suggested scope:
- First decide whether to relax the DB uniqueness model.
- If relaxing, write a migration and update repo duplicate behavior.
- Render multiple dots or a compact stacked indicator in `CodeViewer`.

Do not:
- Change this casually. This is a schema decision, not just UI polish.

### Slice 8.5E - Chat Message Markers

Purpose:
- Let users visually organize chat messages without creating learning data.

Suggested scope:
- Message-level bookmark/color marker UI.
- Separate palette domain from reader bookmarks.
- Persist message markers in a small, explicit table if needed.
- Keep markers as chat organization only.

Do not:
- Create captures, concepts, review events, or Learning Hub entries.
- Inject message markers into prompts unless a later spec explicitly asks for it.
- Reuse reader bookmark palette tables unless the product decision says palettes should merge.

## Locked Guardrails

- Keep route screens in `app/` thin. Put bookmark behavior in `src/features/bookmarks/`.
- Use feature barrels for cross-feature imports.
- Use query key factories only. Do not add hardcoded `queryKey: [...]` arrays.
- Parse JSON columns through Zod codecs.
- Preserve branded IDs and strict TypeScript behavior.
- Prefer transactions for multi-step writes that must stay consistent.
- Do not add `as any` or `@ts-expect-error`.
- Do not hide persistence errors with fake success values.
- Do not touch `src/features/learning/extractor/**` for bookmark organization work.
- Do not introduce remote embedding fallback or embedding behavior changes.
- Do not make bookmarks learning signals without a written product decision.

## Out Of Scope For Stage 8.5 Unless Explicitly Chosen

- Stage 9.
- Cross-device sync.
- Multi-user collaboration.
- Search indexing across all bookmarks.
- Auto-linking bookmarks to concepts.
- Auto-creating captures from bookmarks.
- Review/quiz flows from bookmarks.
- Dot Connector memory injection changes.
- Persona or model picker changes.
- Learning Hub ordering changes.

## Verification Gates

Run before reporting completion:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm.cmd test -- --run
git diff --check
```

Also run targeted guard scans:

```powershell
git grep -n "bookmarkId" src/features/learning
git grep -n "queryKey: \[" app src
git grep -n "as any" app src
git grep -n "@ts-expect-error" app src
```

Expected:
- No bookmark implementation leaks into learning save-source internals unless Slice 8.5C explicitly changes provenance.
- No new hardcoded query key arrays.
- No new unsafe casts or TypeScript suppression.

## Manual Smoke Checklist

For any UI slice, smoke on Android or simulator:

1. Existing Slice 4 create/edit/delete bookmark flow still works.
2. Existing gutter dots still appear/disappear correctly.
3. Existing mini-chat still does not overlap the bookmark sheet.
4. Existing `Save capture from here` still opens the save modal with correct path and line numbers.
5. New Stage 8.5 UI closes cleanly with hardware back, backdrop, and route navigation.
6. Clean DB launch still applies migration 010.

## Suggested First Slice

If no product decision is made, start with:

```text
Slice 8.5A - BookmarkListScreen
```

Reason:
- It builds on existing repo/hooks.
- It does not require schema changes.
- It improves bookmark usefulness without changing learning behavior.

Second choice:

```text
Slice 8.5B - PaletteEditorScreen
```

Reason:
- The data path is already scaffolded.
- The repo already guards removing colors that are still in use.

## Copy-Paste Prompt For Another LLM

```text
You are working in:
C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn

Read first:
1. MAIN.md
2. whatwe_agreedonthearchitecture.md
3. whatwe_agreedonthearchitecture_humans.md
4. ARCHITECTURE.md
5. current_state.md
6. PERSISTENCE.md
7. STAGE_8_5_FOLLOWUPS.md
8. ..\comparision java vs react native\CODELENS_PROJECT_STATUS.md
9. ..\comparision java vs react native\CODELENS_REGRESSION_GUARD.md
10. ..\comparision java vs react native\CODELENS_COMPLETENESS_GUARD.md

Task:
Start Stage 8.5 only after confirming the working tree is clean and Stage 8 Slice 4 is already complete.

Pick exactly one Stage 8.5 slice from STAGE_8_5_FOLLOWUPS.md and implement only that slice.
Recommended first slice: Slice 8.5A - BookmarkListScreen.

Hard rules:
- Do not push.
- Do not amend existing commits.
- Do not touch parent .claude/settings.local.json.
- Keep bookmark work under src/features/bookmarks where practical.
- Keep app routes thin.
- Do not touch extractor/retrieval/scoring/concepts/review/Dot Connector unless the chosen slice explicitly requires it.
- Do not make bookmarks learning signals.
- No new as any, no new @ts-expect-error, no hardcoded queryKey arrays.

Before editing:
Run git status --short and inspect the existing bookmark feature.

Before final response:
Run:
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm.cmd test -- --run
git diff --check

Return:
1. Findings/blockers first.
2. Files changed.
3. Verification results.
4. Any deferred TODOs and why.
```

## Do Not Overthink This

Stage 8.5 is not emergency cleanup. Slice 4 is shippable.

Use Stage 8.5 only when the next product step is bookmark organization polish.
