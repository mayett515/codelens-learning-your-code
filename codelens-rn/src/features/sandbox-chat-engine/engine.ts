import type {
  SandboxCalculation,
  SandboxChatMessage,
  SandboxCodeArtifact,
  SandboxCodeLayer,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxTerm,
} from './types';

const CONTRACT_FENCE = 'codelens-chat-engine';

export function buildSandboxPromptContract(): string {
  return [
    `When a response contains code that should be visualized by CodeLens, append one fenced ${CONTRACT_FENCE} JSON block.`,
    'The JSON shape is: { "prose": string, "codeArtifacts": [], "terms": [], "calculations": [] }.',
    'Every code artifact layer must include lineStart and lineEnd so the UI can open the right abstraction layer from a code click.',
    'Use terms for clickable explanation bricks and calculations for deterministic reasoning steps.',
  ].join('\n');
}

export function parseSandboxModelOutput(raw: string): SandboxModelOutput {
  const fenced = extractContractJson(raw);
  if (!fenced) {
    return fallbackOutput(raw);
  }

  try {
    const parsed = JSON.parse(fenced) as Partial<SandboxModelOutput>;
    return normalizeOutput(parsed, raw);
  } catch {
    return fallbackOutput(raw);
  }
}

export function resolveInspectorTarget(
  output: SandboxModelOutput,
  target: SandboxInspectorTarget,
):
  | SandboxTerm
  | SandboxCodeLayer
  | SandboxCalculation
  | null {
  if (target.type === 'term') {
    return output.terms.find((term) => term.id === target.id) ?? null;
  }

  if (target.type === 'calculation') {
    return output.calculations.find((calc) => calc.id === target.id) ?? null;
  }

  const artifact = output.codeArtifacts.find(
    (item) => item.id === target.artifactId,
  );
  return artifact?.layers.find((layer) => layer.id === target.layerId) ?? null;
}

export function findLayerForLine(
  artifact: SandboxCodeArtifact,
  lineNumber: number,
): SandboxCodeLayer | null {
  return (
    artifact.layers.find(
      (layer) => lineNumber >= layer.lineStart && lineNumber <= layer.lineEnd,
    ) ?? null
  );
}

export function getPrimaryInspectorTarget(
  output: SandboxModelOutput,
): SandboxInspectorTarget | null {
  const artifact = output.codeArtifacts[0];
  const layer = artifact?.layers[0];
  if (artifact && layer) {
    return { type: 'layer', artifactId: artifact.id, layerId: layer.id };
  }

  const term = output.terms[0];
  if (term) {
    return { type: 'term', id: term.id };
  }

  const calculation = output.calculations[0];
  if (calculation) {
    return { type: 'calculation', id: calculation.id };
  }

  return null;
}

function extractContractJson(raw: string): string | null {
  const fence = new RegExp(
    '```(?:' + CONTRACT_FENCE + '|json)\\s*([\\s\\S]*?)```',
    'i',
  );
  const match = raw.match(fence);
  return match?.[1]?.trim() ?? null;
}

function normalizeOutput(
  parsed: Partial<SandboxModelOutput>,
  raw: string,
): SandboxModelOutput {
  const prose = typeof parsed.prose === 'string'
    ? parsed.prose
    : raw.replace(/```[\s\S]*?```/g, '').trim();

  return {
    prose,
    codeArtifacts: Array.isArray(parsed.codeArtifacts)
      ? parsed.codeArtifacts.map(normalizeArtifact).filter(isPresent)
      : [],
    terms: Array.isArray(parsed.terms)
      ? parsed.terms.map(normalizeTerm).filter(isPresent)
      : [],
    calculations: Array.isArray(parsed.calculations)
      ? parsed.calculations.map(normalizeCalculation).filter(isPresent)
      : [],
  };
}

function normalizeArtifact(
  artifact: SandboxCodeArtifact,
): SandboxCodeArtifact | null {
  if (
    !artifact ||
    typeof artifact.id !== 'string' ||
    typeof artifact.title !== 'string' ||
    typeof artifact.language !== 'string' ||
    typeof artifact.code !== 'string'
  ) {
    return null;
  }

  return {
    id: artifact.id,
    title: artifact.title,
    language: artifact.language,
    code: artifact.code,
    layers: Array.isArray(artifact.layers)
      ? artifact.layers.map(normalizeLayer).filter(isPresent)
      : [],
  };
}

function normalizeLayer(layer: SandboxCodeLayer): SandboxCodeLayer | null {
  if (
    !layer ||
    typeof layer.id !== 'string' ||
    typeof layer.kind !== 'string' ||
    typeof layer.title !== 'string' ||
    typeof layer.summary !== 'string' ||
    typeof layer.detail !== 'string' ||
    typeof layer.lineStart !== 'number' ||
    typeof layer.lineEnd !== 'number'
  ) {
    return null;
  }

  return {
    id: layer.id,
    kind: layer.kind,
    title: layer.title,
    summary: layer.summary,
    detail: layer.detail,
    lineStart: Math.max(1, layer.lineStart),
    lineEnd: Math.max(layer.lineStart, layer.lineEnd),
  };
}

function normalizeTerm(term: SandboxTerm): SandboxTerm | null {
  if (
    !term ||
    typeof term.id !== 'string' ||
    typeof term.label !== 'string' ||
    typeof term.summary !== 'string' ||
    typeof term.detail !== 'string' ||
    typeof term.promptHook !== 'string'
  ) {
    return null;
  }

  return term;
}

function normalizeCalculation(
  calculation: SandboxCalculation,
): SandboxCalculation | null {
  if (
    !calculation ||
    typeof calculation.id !== 'string' ||
    typeof calculation.label !== 'string' ||
    typeof calculation.expression !== 'string' ||
    typeof calculation.result !== 'string' ||
    typeof calculation.explanation !== 'string'
  ) {
    return null;
  }

  return calculation;
}

function fallbackOutput(raw: string): SandboxModelOutput {
  return {
    prose: raw.trim(),
    codeArtifacts: [],
    terms: [],
    calculations: [],
  };
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
