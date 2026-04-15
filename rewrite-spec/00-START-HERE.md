# CodeLens RN Rewrite — Start Here

You are about to rewrite a Capacitor Android app (vanilla JS + WebView + Java bridges) as a React Native + Expo + TypeScript app. The current app exists at `c:/CodeLens-v2/codelens-full/` — read it for behavior reference, do not port files line-by-line.

## Read Order

1. `01-INTENT.md` — what this app is and why it exists. Read first; everything else is in service of this.
2. `02-STACK.md` — chosen stack and the rationale for each choice. Do not substitute libraries.
3. `03-ARCHITECTURE.md` — hexagonal layout, folder structure, ports/adapters.
4. `04-STATE-MODEL.md` — TypeScript types for the entire domain.
5. `05-SCREENS.md` — every screen, its route, what state it touches, what actions it dispatches.
6. `06-RAG-PIPELINE.md` — vector store contract, embedding lifecycle, sqlite-vec schema.
7. `07-PRESERVE-THESE-BEHAVIORS.md` — the non-obvious behaviors that must survive the rewrite. These are hard-won; do not lose them.
8. `08-NON-GOALS.md` — explicit list of features to NOT port. Respect this.
9. `09-BUILD-PHASES.md` — implementation order. Build phase 1 fully before phase 2.

## Output Location

New project root: `c:/CodeLens-v2/codelens-rn/` (sibling to `codelens-full/`). Do not modify the existing `codelens-full/` codebase except to read it.

## Operating Principles for This Rewrite

- **Intent over parity.** If the old app does X awkwardly because vanilla JS forced it, do X cleanly the React way. The goal is the *experience*, not the implementation.
- **TypeScript strict mode from day one.** No `any` escapes. Domain types live in `src/domain/types.ts` and are imported everywhere.
- **One source of truth per concept.** No duplicate caches. The previous app had a JS metadata map + JS vector cache + native vector store, and they drifted (see `07-PRESERVE-THESE-BEHAVIORS.md`). The new app has SQLite as the only vector store.
- **No magic.** Reactive auto-updating ORMs (Realm, Watermelon) are explicitly *not* the chosen stack. The reactivity layer is TanStack Query + Zustand — boring, predictable, type-safe.
- **No Java, no Kotlin.** The whole point of the rewrite. If a feature seems to require native code, find an existing JSI library or defer the feature.
- **Offline-first.** No CDNs. No network round-trips for UI. All vendor libs (Cytoscape) are bundled.
- **Ship phase by phase.** Phase 1 must be runnable and useful before phase 2 begins. No half-finished features at any phase boundary.

## When in Doubt

- Read the corresponding file in `codelens-full/www/scripts/` to understand current behavior.
- Read `codelens-full/MAIN.md` for an index of legacy docs.
- Prefer the simpler/typed implementation over the clever one.
- If a behavior is not specified in this folder, assume it is a non-goal.

## Suggested Opening Prompt for the Opus Session

> Read every file in `c:/CodeLens-v2/rewrite-spec/` in order. Then scaffold phase 1 from `09-BUILD-PHASES.md`. Do not start phase 2 until phase 1 runs end-to-end on a real device or simulator. Ask before substituting any library listed in `02-STACK.md`.
