/**
 * Pure-engine barrel export.
 *
 * This re-exports ONLY types.ts and engine.ts — no modelAdapter,
 * no sampleData, no React Native imports. Test files that need
 * pure parsing/validation logic should import from here to
 * avoid React Native parse errors in vitest.
 */
export type {
  SandboxCalcStep,
  SandboxCalculation,
  SandboxCalculationKind,
  SandboxChatMessage,
  SandboxCodeArtifact,
  SandboxCodeLayer,
  SandboxCodeLayerKind,
  SandboxContractDiagnostic,
  SandboxContractDiagnosticLevel,
  SandboxFinding,
  SandboxFindingCategory,
  SandboxFindingSeverity,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxModelTiming,
  SandboxProseSpan,
  SandboxTerm,
  SandboxTermCategory,
  SandboxTermDepth,
  SandboxTermSubcategory,
  SandboxRole,
} from './types';

export {
  buildSandboxPromptContract,
  findLayerForLine,
  getPrimaryInspectorTarget,
  hasBlockingContractDiagnostics,
  parseSandboxModelOutput,
  resolveInspectorTarget,
} from './engine';