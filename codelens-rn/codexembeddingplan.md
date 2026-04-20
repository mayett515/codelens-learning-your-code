# Codex Embedding Plan

## Goal
Resolve all six review findings for the local ExecuTorch embedding work while preserving CodeLens architecture constraints:
- TypeScript strictness (no compile-time API drift)
- explicit failure propagation (no silent corruption)
- clean composition routing (provider/model semantics respected)
- reproducible scripts
- tests that validate real contracts

## Finding-Driven Plan

### 1) [P0] ExecuTorch API usage does not typecheck
- Replace invalid `ExecuTorch.loadModel(...)` usage in `src/adapters/local-embedder.ts`.
- Switch to the library's typed API surface (`TextEmbeddingsModule` + `ALL_MINILM_L6_V2`).
- Add strict runtime guards (embedding type + dimension checks).

### 2) [P0] Silent zero-vector fallback corrupts embedding layer
- Remove all zero-vector fallback behavior in `src/adapters/local-embedder.ts`.
- On load/inference failure, throw typed errors with clear context so upstream sync/retry handles failures correctly.

### 3) [P1] Exported model shape mismatch risk
- Update `scripts/export_to_pte.py` export to support dynamic sequence lengths (`torch.export.Dim` + `dynamic_shapes`) instead of fixed `(1,128)` only.
- Keep sample tensors for tracing bootstrap, but export contract becomes variable-length-safe.

### 4) [P1] CWD-dependent PTE output path
- Make script output path deterministic relative to script location using `pathlib.Path(__file__)`.
- Ensure target `assets/` directory exists before write.

### 5) [P1] Embedding config semantics bypassed
- Update `src/composition.ts` so embedding routing is no longer always local.
- Default path: provider-selected client (`openrouter` / `siliconflow`).
- Local path: explicit opt-in by model id (`local/all-minilm-l6-v2`) routed to local embedder.

### 6) [P2] Test validates a mocked non-existent API
- Rewrite `src/adapters/__tests__/local-embedder.test.ts` to mock real API shape (`TextEmbeddingsModule.fromModelName`, `ALL_MINILM_L6_V2`).
- Add coverage for:
  - success path (384-dim Float32Array)
  - load failure propagation
  - invalid-dimension rejection
  - explicit local model id predicate

## Validation Steps
1. `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`
2. `npm test -- src/adapters/__tests__/local-embedder.test.ts` (best effort in this environment)
3. Manual grep/inspection to confirm:
- no `ExecuTorch.loadModel` usage remains
- no zero-vector fallback remains
- composition embed route honors provider unless local model id is explicitly selected

## Deliverables
- `codexembeddingplan.md` (this file)
- code updates implementing all six fixes
- `codexembeddingexecuted.md` with exact changes + validation output summary
