export type SandboxRole = 'user' | 'assistant' | 'system';

export type SandboxCodeLayerKind =
  | 'surface'
  | 'imports'
  | 'state'
  | 'api'
  | 'render'
  | 'calculation';

export type SandboxCodeLayer = {
  id: string;
  kind: SandboxCodeLayerKind;
  title: string;
  summary: string;
  detail: string;
  lineStart: number;
  lineEnd: number;
};

export type SandboxCodeArtifact = {
  id: string;
  title: string;
  language: string;
  code: string;
  layers: SandboxCodeLayer[];
};

export type SandboxTerm = {
  id: string;
  label: string;
  category: SandboxTermCategory;
  summary: string;
  detail: string;
  promptHook: string;
  relatedTermIds: string[];
};

export type SandboxTermCategory =
  | 'risk'
  | 'concept'
  | 'api'
  | 'data'
  | 'performance'
  | 'test';

export type SandboxCalculation = {
  id: string;
  label: string;
  expression: string;
  result: string;
  explanation: string;
};

export type SandboxContractDiagnosticLevel = 'info' | 'warning' | 'error';

export type SandboxContractDiagnostic = {
  id: string;
  level: SandboxContractDiagnosticLevel;
  title: string;
  detail: string;
};

export type SandboxModelOutput = {
  prose: string;
  codeArtifacts: SandboxCodeArtifact[];
  terms: SandboxTerm[];
  calculations: SandboxCalculation[];
  diagnostics: SandboxContractDiagnostic[];
};

export type SandboxModelTiming = {
  mode: 'local-contract' | 'configured-model';
  totalMs: number;
  firstCallMs?: number | undefined;
  repairCallMs?: number | undefined;
  repaired: boolean;
};

export type SandboxChatMessage = {
  id: string;
  role: SandboxRole;
  content: string;
  parsed?: SandboxModelOutput;
  timing?: SandboxModelTiming;
};

export type SandboxInspectorTarget =
  | { type: 'term'; id: string }
  | { type: 'layer'; artifactId: string; layerId: string }
  | { type: 'calculation'; id: string };
