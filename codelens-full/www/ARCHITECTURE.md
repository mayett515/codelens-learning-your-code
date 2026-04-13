# CodeLens Architecture Entry Point

This folder contains the runtime-facing architecture docs used by the shipped app UI.

## Start Here

- `HTML_UI_ARCHITECTURE.md`
  - Screen map, modal map, UI interaction model, and script load order.
- `CODE_RUNTIME_ARCHITECTURE.md`
  - Runtime behavior, state/persistence, action routing, AI queue, learning flow, and native bridges.

## Related Root Docs

Use these from the repository root (`codelens-full/`):

- `APP_STRUCTURE.md`
  - Full project map and function-level reference.
- `LEARNING_NATIVE_BRIDGE.md`
  - Native learning vector bridge contract (`getTopMatches`, `upsertEmbedding`, `deleteEmbedding`).
- `ANDROID_BUILD_SETUP.md`
  - Local Java/Gradle setup and stable build commands.
- `MAIN.md`
  - Master index of all markdown docs and when to include each one in prompts.

## Mirror Note

The docs in `www/` and `android/app/src/main/assets/public/` should stay aligned because Android runs the `assets/public` copy while local web flow commonly references `www/`.
