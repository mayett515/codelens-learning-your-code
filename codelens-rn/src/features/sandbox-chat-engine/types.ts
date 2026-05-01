export type SandboxRole = 'user' | 'assistant' | 'system';

export type SandboxCodeLayerKind =
  | 'surface'
  | 'imports'
  | 'state'
  | 'api'
  | 'render'
  | 'calculation'
  | 'expansion'
  | 'callflow'
  | 'closure'
  | 'runtime-order'
  | 'abstraction'
  | `x-${string}`;

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

export type SandboxTermCategory =
  | 'risk'
  | 'concept'
  | 'api'
  | 'data'
  | 'performance'
  | 'test';

export type SandboxTermSubcategory =
  | 'auth' | 'data-loss' | 'stale' | 'malformed'
  | 'pattern' | 'deprecation' | 'versioning'
  | 'endpoint' | 'contract' | 'lifecycle'
  | 'schema' | 'payload' | 'cache-state'
  | 'latency' | 'quota' | 'tokens'
  | 'unit' | 'integration' | 'regression'
  | `x-${string}`;

export type SandboxTermDepth = 'surface' | 'moderate' | 'deep';

export type SandboxProseSpan = {
  proseOffset: number;
  length: number;
};

export type SandboxTerm = {
  id: string;
  label: string;
  category: SandboxTermCategory;
  subcategory?: SandboxTermSubcategory;
  depth?: SandboxTermDepth;
  spans: SandboxProseSpan[];
  summary: string;
  detail: string;
  promptHook?: string;
  relatedTermIds: string[];
};

export type SandboxCalcStep = {
  label: string;
  value: number;
  unit: string;
  note?: string;
};

export type SandboxCalculationKind = 'reasoning' | 'tradeoff' | 'risk-trace';

export type SandboxCalculation = {
  id: string;
  title: string;
  kind: SandboxCalculationKind;
  steps: SandboxCalcStep[];
  conclusion: string;
};

export type SandboxFindingSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export type SandboxFindingCategory =
  | 'bug'
  | 'security'
  | 'reliability'
  | 'performance'
  | 'maintainability'
  | 'accessibility'
  | 'design';

export type SandboxFinding = {
  id: string;
  severity: SandboxFindingSeverity;
  category: SandboxFindingCategory;
  termId?: string;
  title: string;
  description: string;
  artifactId?: string;
  lineStart?: number;
  lineEnd?: number;
  suggestedFix?: string;
};

export type SandboxContractDiagnosticLevel = 'info' | 'warning' | 'error';

export type SandboxContractDiagnostic = {
  id: string;
  level: SandboxContractDiagnosticLevel;
  title: string;
  detail: string;
};

export type SandboxModelOutput = {
  version: number;
  prose: string;
  codeArtifacts: SandboxCodeArtifact[];
  terms: SandboxTerm[];
  calculations: SandboxCalculation[];
  findings: SandboxFinding[];
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
  | { type: 'calculation'; id: string }
  | { type: 'finding'; id: string };
