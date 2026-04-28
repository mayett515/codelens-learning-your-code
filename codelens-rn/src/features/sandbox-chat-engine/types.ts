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
  summary: string;
  detail: string;
  promptHook: string;
};

export type SandboxCalculation = {
  id: string;
  label: string;
  expression: string;
  result: string;
  explanation: string;
};

export type SandboxModelOutput = {
  prose: string;
  codeArtifacts: SandboxCodeArtifact[];
  terms: SandboxTerm[];
  calculations: SandboxCalculation[];
};

export type SandboxChatMessage = {
  id: string;
  role: SandboxRole;
  content: string;
  parsed?: SandboxModelOutput;
};

export type SandboxInspectorTarget =
  | { type: 'term'; id: string }
  | { type: 'layer'; artifactId: string; layerId: string }
  | { type: 'calculation'; id: string };
