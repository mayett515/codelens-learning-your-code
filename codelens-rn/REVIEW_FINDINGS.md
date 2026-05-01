# Sandbox Refactor Review Findings

This is the current review record for the post-GLM sandbox chat engine changes.

## Fixed Regressions

<fixed_regressions>
- Model status no longer stays indefinitely in the initial loading state. `useSandboxChat` refreshes provider status on mount.
- Session-limit sends no longer create an abort controller or timeout before returning.
- Term highlighting no longer guesses spans from labels. Only contract spans are rendered.
- Fake Deep Dive routing was removed from the inspector.
- Disconnected shallow prompt helpers were removed from exports and source.
- Categorization inference now fills only missing `subcategory` and `depth`; it does not override a valid model category.
</fixed_regressions>

## Current Risks

<current_risks>
- Browser/manual testing with a real configured model key is still needed.
- Provider error messages may still need better user-facing detail after real-model testing.
- The UI component extraction is larger than the original request, even though TypeScript and tests pass.
- `promptHook` is display-only right now. Any future click action needs a real adapter contract.
</current_risks>

## Non-Negotiables For Next Model

<do_not_reintroduce>
- Do not bring back heuristic keyword highlighting.
- Do not add hidden model calls behind inspector clicks without explicit product design.
- Do not claim cheap/deep model routing exists unless it is actually implemented.
- Do not stage, commit, push, reset, or checkout unless the user explicitly asks.
</do_not_reintroduce>
