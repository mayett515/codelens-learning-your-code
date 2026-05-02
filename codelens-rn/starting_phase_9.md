# Starting Phase 9

You are starting Stage 9 from a completed Stage 8 + Stage 8.5A checkpoint.

Repo:

```text
C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn
```

## Before Editing

Read first:

1. `MAIN.md`
2. `whatwe_agreedonthearchitecture.md`
3. `whatwe_agreedonthearchitecture_humans.md`
4. `ARCHITECTURE.md`
5. `current_state.md`
6. `PERSISTENCE.md`

Then run:

```powershell
git status --short --untracked-files=all
git log --oneline -8
```

## Current Assumption

Stage 8 and Stage 8.5A are complete.

Expected recent commits should include:

```text
feat(stage8.5): add bookmark list screen
docs(stage8): add stage 8.5 follow-up plan
chore(stage8): tighten bookmark slice after review
feat(stage8): add reader bookmarks for code lines
feat(stage8): line-level mini chat with cancel and save handoff
feat(stage8): add cancel and selected code chat UX
feat(stage8): wire persona and model picker send flow
```

If the log does not show the Stage 8.5A commit, stop and ask for clarification before coding.

## Hard Rules

- Do not touch `.claude/settings.json` or `.claude/settings.local.json`.
- Do not rewrite Stage 8 history.
- Treat Stage 8 and Stage 8.5A as complete.
- Start only the explicitly requested Stage 9 slice.
- Keep route screens thin.
- Keep feature code feature-owned.
- Use query key factories.
- Do not add hardcoded `queryKey: [...]` arrays.
- Do not add `as any`.
- Do not add `@ts-expect-error`.
- Do not alter embeddings, retrieval, extractor, scoring, concepts, review events, or Dot Connector unless Stage 9 specifically requires it.
- Do not make bookmarks learning signals unless a written Stage 9 spec explicitly says so.

## First Task For The Next Agent

Do not code immediately.

First:

1. Read the required docs.
2. Inspect the recent commits and working tree.
3. Report what Stage 9 appears to be from the docs.
4. Identify which files/features Stage 9 likely touches.
5. Propose the smallest first Stage 9 slice.
6. Wait for explicit approval before editing files.

## Verification Gates

Before finalizing any Stage 9 slice, run:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
npm.cmd test -- --run
git diff --check
```

Also run guard scans:

```powershell
git grep -n "queryKey: \[" app src
git grep -n "as any" app src
git grep -n "@ts-expect-error" app src
```

If a command cannot run because of the local environment, report the exact failure and what remains unverified.

## Copy-Paste Prompt

```text
We are starting Stage 9 from a completed Stage 8 + Stage 8.5A checkpoint.

Repo:
C:\Projects\CodeLensApp\CodeLens-v2\codelens-rn

Before editing:
1. Read MAIN.md
2. Read whatwe_agreedonthearchitecture.md
3. Read whatwe_agreedonthearchitecture_humans.md
4. Read ARCHITECTURE.md
5. Read current_state.md
6. Read PERSISTENCE.md
7. Run git status --short --untracked-files=all
8. Run git log --oneline -8

Important:
- Do not touch .claude/settings.json or .claude/settings.local.json.
- Do not rewrite Stage 8 history.
- Treat Stage 8 and Stage 8.5A as complete.
- Start only the explicitly requested Stage 9 slice.
- Keep route screens thin.
- Keep feature code feature-owned.
- Use query key factories.
- No new as any, no @ts-expect-error, no hardcoded queryKey arrays.
- Do not alter embeddings/retrieval/extractor/scoring unless Stage 9 specifically requires it.

First task:
Read the docs and report what Stage 9 should be, what files/features it likely touches, and propose the smallest first Stage 9 slice. Do not code until I approve the slice.
```
