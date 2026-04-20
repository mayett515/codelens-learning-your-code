# Codex Embedding Executed

## Status
Implemented and validated the embedding fix set requested in `codexembeddingplan.md`.

## Files Updated
- `codexembeddingplan.md`
- `src/adapters/local-embedder.ts`
- `src/composition.ts`
- `src/adapters/__tests__/local-embedder.test.ts`
- `scripts/export_to_pte.py`

## Finding Closure

### Finding 1 — [P0] ExecuTorch API usage does not typecheck
**Fixed.**
- Replaced invalid `ExecuTorch.loadModel(...)` flow with typed API imports:
  - `TextEmbeddingsModule`
  - `ALL_MINILM_L6_V2`
- Added singleton loader (`getOrCreateModel`) and removed invalid symbol usage.

### Finding 2 — [P0] Silent zero-vector fallback corrupts embedding layer
**Fixed.**
- Removed all zero-vector fallback returns.
- Local embedding now throws on:
  - wrong model id
  - model init failure
  - inference failure
  - non-Float32Array output
  - dimension mismatch (must be 384)

### Finding 3 — [P1] Export shape mismatch risk
**Fixed.**
- `scripts/export_to_pte.py` now exports with dynamic shapes via `torch.export.Dim` + `dynamic_shapes`.
- Sequence axis supports variable lengths (`1..512`) instead of fixed `(1,128)` contract only.

### Finding 4 — [P1] CWD-dependent output path
**Fixed.**
- Script output path now resolves from file location:
  - `Path(__file__).resolve().parents[1] / "assets" / "all-minilm-l6-v2.pte"`
- Ensures `assets/` exists before write.

### Finding 5 — [P1] Embedding config semantics bypassed
**Fixed.**
- `src/composition.ts` no longer forces local embeddings.
- Routing behavior now:
  - if model id is explicit local id (`local/all-minilm-l6-v2`) -> local embedder
  - otherwise -> provider client embed (`openrouter` / `siliconflow`)

### Finding 6 — [P2] Test validates mocked non-existent API
**Fixed.**
- Rewrote local embedder unit test to mock real API shape:
  - `TextEmbeddingsModule.fromModelName`
  - `ALL_MINILM_L6_V2`
- Added assertions for:
  - success path + 384 dim
  - load failure propagation
  - invalid model id rejection
  - invalid dimension rejection
  - local model id predicate semantics

## Verification Run

### 1) Type check
Command:
`node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`

Result:
- Pass (exit code 0)

### 2) Targeted unit tests
Command:
`npm test -- src/adapters/__tests__/local-embedder.test.ts`

Result:
- Pass
- 1 file passed, 5 tests passed

## Architecture Notes
- Local embedding is now an explicit opt-in model path (`local/all-minilm-l6-v2`) instead of implicit global override.
- Remote embedding path remains the default and honors existing provider/model config semantics.
- Failure behavior is explicit and observable (no silent vector poisoning).

## Operational Note
- Local ExecuTorch model loading requires proper resource fetcher initialization at app runtime (`initExecutorch({ resourceFetcher: ... })`).
- Current behavior intentionally fails loudly with context if that runtime precondition is missing.
