# Model Review - 2026-05-13 Profile Proposal Review UI

Repo: `C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn`
Branch: `refactor/ontology-profile`

Reviewed slice: minimal pending profile-change proposal review UI from doc 24.

Review sessions are resumable under:

```text
C:\pi-stuff\sessions\2026-05-13-profile-proposal-review-ui
```

Raw reviewer outputs are stored under:

```text
C:\pi-stuff\reviews\2026-05-13-profile-proposal-review-ui
```

## Reviewers

All reviewers were run through Pi in read-only/no-tools mode with the implementation files attached.

```text
opencode-go/deepseek-v4-pro
opencode-go/glm-5.1
opencode-go/kimi-k2.6
opencode-go/minimax-m2.7
openrouter/google/gemini-3.1-pro-preview
openrouter/anthropic/claude-opus-4.7
```

## Consensus

The reviewer consensus was: accept with small fixes. No model found a violation of the locked architecture boundaries.

Confirmed boundaries:

- Apply stays explicit and branch-local.
- Reject/Postpone do not apply patches.
- Ask why / why not is explanation-only.
- No base/core mutation, upward merge, sibling propagation, old-card backfill, auto-apply, checker runtime, or event/audit store was added.
- The data service remains below runtime/profile resolution; the hook resolves the base profile above the service.

## Accepted Fixes

Applied after review:

- `useApplyProfileChangeProposal` now maps a missing base profile to a clear `base_profile_not_found` hook error instead of relying on a raw registry exception.
- Apply success now invalidates both proposal keys and future branch keys.
- Proposal review messages now carry explicit `notice` / `error` tone instead of styling by substring matching English text.
- Apply no longer immediately closes the modal, so the success state remains visible until the user closes the detail modal.
- Non-branch-target proposals show as not applicable in this first review surface and the Apply button is disabled for them.
- The screen resets reason/message state after actions and disables list switching while a mutation is pending.
- Patch summaries now include ontology-node labels/ids for added or overridden nodes.
- Presentation tests now cover non-branch risk wording, ontology-node summary labels, and every known mapped error code.

Verification after fixes:

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/ontology/__tests__/profileProposalReviewPresentation.test.ts src/features/ontology/__tests__/profileChangeProposalReviewService.test.ts src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts src/features/ontology/__tests__/branchLocalProposalApply.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run
git diff --check
```

Result: TypeScript clean; targeted tests 101/101 passed across 7 files; full suite 749/749 passed across 80 files; `git diff --check` clean with CRLF warnings only.

## Not Accepted

- MiniMax called the ignored `mutateAsync` return value a functional bug. That is not a bug in this slice: the caller of `mutateAsync` already receives the result, and event/audit storage is explicitly a later seam.
- Several reviewers asked for full UI component tests. Useful, but not blocking for this slice because the service, pure helper, presentation logic, and architecture boundaries are already covered. A future seeded end-to-end proposal test is still valuable.
- Some reviewers suggested branch query invalidation only if branch query keys exist. We added a harmless future branch key now so the first branch-query hook has a stable invalidation target.

## Reviewer Quality Notes

- Opus 4.7 gave the best UI-level review: explicit message tone, non-branch Apply behavior, modal-close feedback, and stale UI-state risks.
- DeepSeek V4 Pro and GLM 5.1 were concise and correctly caught the base-profile resolution issue.
- Gemini 3.1 Pro was useful on branch cache invalidation and selected-proposal state bleed.
- Kimi K2.6 was solid on correctness but slightly overcalled the unmount risk.
- MiniMax M2.7 found some useful test concerns but misclassified the discarded mutation result as a functional bug.

## Next Recommendation

Proceed to event/audit storage for proposal decisions and future user-fit learning. The proposal review UI can now produce explicit user actions; the next durable seam is recording those actions as append-only facts instead of trying to infer user preference only from current proposal row status.
