# Model Review - Branch-Local Proposal Apply

**Date:** 2026-05-13  
**Scope:** `src/features/ontology/branchLocalProposalApply.ts`, `src/features/ontology/data/branchLocalProposalApplyService.ts`, conditional repo writes, and focused tests/docs.  
**Mode:** Review-only. No reviewer was supposed to edit files.

## Reviewers

Pi reviewers were run through Pi, not the Kimi Code harness:

- `opencode-go/deepseek-v4-pro`
- `opencode-go/glm-5.1`
- `opencode-go/kimi-k2.6`
- `opencode-go/minimax-m2.7`
- `opencode-go/mimo-v2.5-pro`

Additional reviewers:

- Gemini through Pi/OpenRouter: `openrouter/google/gemini-3.1-pro-preview`
- Claude CLI: `opus`

Raw review outputs live under:

```text
C:\pi-stuff\reviews\2026-05-13-branch-local-proposal-apply
C:\pi-stuff\reviews\2026-05-13-branch-local-apply-service
```

## Harness Notes

The first Pi prompt allowed read-only tools. Several OpenCode-Go models emitted tool-call markup instead of receiving tool results, so their first reports were unreliable. The review was rerun with relevant file contents embedded and Pi `--no-tools`.

Kimi through Pi initially returned only `Ready for input`; a retry with the same embedded prompt plus an explicit second message produced a usable review. This was a Pi/Kimi harness behavior issue, not a code finding.

For the service review, Pi sessions were saved under:

```text
C:\pi-stuff\sessions\2026-05-13-branch-local-apply-service
```

Those sessions can be resumed for follow-up reviewer questions. Claude Opus completed the initial service review, but the follow-up Opus call hit the Claude usage limit (`resets 6:50pm Europe/Berlin`) before returning a second review.

## Consensus

Most reviewers agreed:

- The branch-local boundary is correct.
- Rejecting `branch_merge` belongs in this helper.
- The helper should stay pure: no DB, UI, event store, or LLM.
- The compile/apply split is a good seam for the next atomic persistence service.
- The next service must re-load current proposal/branch state and commit branch update plus proposal status atomically.

## Findings Accepted And Fixed

Accepted fixes:

- Added `expectedProposalUpdatedAt` and `expectedBranchUpdatedAt` to the typed operation.
- Added a branch drift guard in `applyBranchLocalProfilePatchOperation`.
- Added an invalid apply-time guard so accepted proposal timestamps cannot move backwards.
- Deep-cloned the patch on the accepted proposal result.
- Rejected duplicate ids inside `overrideOntologyNodes`, item type patch ids, and relationship type patch ids.
- Added focused tests for these paths.

For the persistence-backed service follow-up:

- Added `updateProfileBranchIfUnchanged()` to conditionally update a branch only when the stored `updatedAt` still matches the loaded branch.
- Added `updateProfileChangeProposalIfPending()` to conditionally update a proposal only when the stored status is still `pending` and `updatedAt` still matches the loaded proposal.
- Changed the apply service to use those conditional writes and throw `branch_write_conflict` / `proposal_write_conflict` instead of silently overwriting stale state.
- Added service tests for non-pending proposal propagation, branch write conflict, and proposal write conflict.
- Accepted the follow-up reviewer nit that conditional writes must fail closed when the driver result does not expose affected-row counts.
- Removed unnecessary `createdAt` writes from conditional update statements.

## Finding Rejected As Not Applicable

Several reviewers suggested requiring `addRelationshipTypeNodeIds` to reference existing ontology nodes.

Rejected for this slice: current `codingProfile.ontology.relationshipTypeNodeIds` uses bare relationship ids such as `prerequisite`, `related`, and `contrast` without matching ontology nodes. The helper now documents this explicitly and tests that relationship type ids are treated as opaque strings while still rejecting duplicates and already-present ids.

Follow-up debate prompt with the current code facts made DeepSeek V4 Pro and Kimi K2.6 both agree that relationship type ids should stay opaque for now. Gemini 3.1 Pro Preview was at capacity on the follow-up prompt, but its first review already agreed with the opaque-id interpretation.

This can be revisited later if relationship types become first-class ontology nodes.

## Remaining Useful Follow-Ups

- Add broader merge-path tests for `overrideMetadataFields`, `overrideOntology`, and graph sub-maps before the persistence-backed apply service grows.
- Add a lightweight repo/integration test for conditional write row-count behavior if this service grows beyond the first explicit Apply button.
- Keep `overrideOntology.nodes` documented as additional nodes because `profileComposition.ts` treats that channel as additions; use `overrideOntologyNodes` for existing-node replacement.
- Document in the UI slice that callers should handle both `BranchLocalProposalApplyServiceError` and pure `BranchLocalProposalApplyError` by their shared `code` property.

## Verification After Fixes

```powershell
node node_modules\typescript\bin\tsc -p tsconfig.json --noEmit
npm.cmd test -- --run src/features/ontology/__tests__/branchLocalProposalApply.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/__tests__/stage10-architecture-guards.test.ts
npm.cmd test -- --run src/features/ontology/__tests__/branchLocalProposalApplyService.test.ts src/features/ontology/__tests__/branchLocalProposalApply.test.ts src/features/ontology/__tests__/profileChangeProposalCodec.test.ts src/features/ontology/__tests__/profileBranches.test.ts src/__tests__/stage10-architecture-guards.test.ts
```

Result:

```text
TypeScript clean
5 targeted test files passed
91/91 targeted tests passed
Full suite: 78 test files passed, 739/739 tests passed
git diff --check clean with CRLF warnings only
```
