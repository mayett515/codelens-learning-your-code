# CodeLens Main Markdown Index

This is the master map of all project markdown docs and exactly when to use each one in prompts.

## Use This File First

If another coding agent asks for "which docs should I read?", start here, then include only the docs relevant to the task.

## Root Docs (Canonical)

1. `codelens-full/APP_STRUCTURE.md`
   - Purpose: Full architecture + function map across JS and Android bridge layers.
   - Include when: changing app behavior, wiring, module ownership, or tracing a function.

2. `codelens-full/LEARNING_NATIVE_BRIDGE.md`
   - Purpose: Learning embedding contract for native bridge (`getTopMatches`, `upsertEmbedding`, `deleteEmbedding`).
   - Include when: learning memory, embeddings, semantic retrieval, ObjectBox migration.

3. `codelens-full/ANDROID_BUILD_SETUP.md`
   - Purpose: Local Java/Gradle build setup using wrapper scripts.
   - Include when: build environment setup, Gradle lock issues, compile/assemble failures.

4. `codelens-full/BUILD_INSTRUCTIONS.md`
   - Purpose: Practical build and first-run workflow.
   - Include when: onboarding, running the app, producing APKs.

5. `codelens-full/MAIN.md`
   - Purpose: This doc index.
   - Include when: deciding doc context for prompts.

6. `C:\CodeLens-v2\whatclaudechanged.md` (session note, outside `codelens-full/`)
   - Purpose: Temporary migration log from the Claude refactor session.
   - Include when: reviewing exactly what changed during the 2026-04-14 refactor pass.
   - Note: this is a handoff note, not a canonical architecture source.

## Web Runtime Docs (`www/`)

7. `codelens-full/www/ARCHITECTURE.md`
   - Purpose: Entry point to runtime UI/code architecture docs.
   - Include when: choosing between UI-structure and runtime-flow docs.

8. `codelens-full/www/HTML_UI_ARCHITECTURE.md`
   - Purpose: Screen map, modal map, UI interaction model, script order.
   - Include when: changing `index.html`, CSS, screen navigation, or UI interactions.

9. `codelens-full/www/CODE_RUNTIME_ARCHITECTURE.md`
   - Purpose: Runtime boot flow, action routing, state persistence, AI queue, learning flow.
   - Include when: changing JS runtime behavior or cross-module wiring.

## Android Runtime Mirror Docs (`android/app/src/main/assets/public/`)

10. `codelens-full/android/app/src/main/assets/public/ARCHITECTURE.md`
11. `codelens-full/android/app/src/main/assets/public/HTML_UI_ARCHITECTURE.md`
12. `codelens-full/android/app/src/main/assets/public/CODE_RUNTIME_ARCHITECTURE.md`

- Purpose: Same architecture content as `www/`, colocated with Android-shipped runtime assets.
- Include when: working directly in `android/.../assets/public` and wanting nearby docs.

## Prompt Bundles (Copy/Paste)

Use these minimal bundles to reduce prompt bloat:

1. UI task bundle
   - `MAIN.md`
   - `www/HTML_UI_ARCHITECTURE.md`
   - `APP_STRUCTURE.md`

2. Runtime behavior bundle
   - `MAIN.md`
   - `www/CODE_RUNTIME_ARCHITECTURE.md`
   - `APP_STRUCTURE.md`

3. Learning/brain bundle
   - `MAIN.md`
   - `LEARNING_NATIVE_BRIDGE.md`
   - `APP_STRUCTURE.md`
   - `www/CODE_RUNTIME_ARCHITECTURE.md`
   - `whatclaudechanged.md` (optional, for migration context)

4. Build/debug bundle
   - `MAIN.md`
   - `ANDROID_BUILD_SETUP.md`
   - `BUILD_INSTRUCTIONS.md`

## Maintenance Rule

When architecture behavior changes, update both mirrors:

- `www/*.md`
- `android/app/src/main/assets/public/*.md`

Keep them semantically identical.

## Asset Sync (canonical → Android)

`www/` is canonical. The Android APK ships a mirror at
`android/app/src/main/assets/public/`. Do **not** copy files by hand —
drift has already bitten this project.

- `npm run sync` — mirror `www/` into the Android public tree (copies
  changed files, removes orphans).
- `npm run sync:check` — exit non-zero if the trees differ. Useful as a
  pre-build / pre-commit gate.

The script is plain Node with no deps (`codelens-full/scripts/sync-assets.js`).
Architecture markdown files in `www/` are mirrored alongside the scripts.
