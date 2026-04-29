import type {
  SandboxCalculation,
  SandboxChatMessage,
  SandboxCodeArtifact,
  SandboxCodeLayer,
  SandboxCodeLayerKind,
  SandboxContractDiagnostic,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxTerm,
  SandboxTermCategory,
} from './types';

const CONTRACT_FENCE = 'codelens-chat-engine';
const LAYER_KINDS: SandboxCodeLayerKind[] = [
  'surface',
  'imports',
  'state',
  'api',
  'render',
  'calculation',
];
const TERM_CATEGORIES: SandboxTermCategory[] = [
  'risk',
  'concept',
  'api',
  'data',
  'performance',
  'test',
];

export function buildSandboxPromptContract(): string {
  return [
    `When a response contains code that should be visualized by CodeLens, append one fenced ${CONTRACT_FENCE} JSON block.`,
    'The JSON shape is: { "prose": string, "codeArtifacts": [], "terms": [], "calculations": [] }.',
    'Every code artifact layer must include lineStart and lineEnd so the UI can open the right abstraction layer from a code click.',
    `Layer kind must be one of: ${LAYER_KINDS.join(', ')}.`,
    `Every term must include category, one of: ${TERM_CATEGORIES.join(', ')}.`,
    'Use terms for clickable explanation bricks. Choose terms from user-facing prose and add relatedTermIds when terms connect.',
    'Prefer 3-6 terms. Include at least one risk term for code-review answers.',
    'Use calculations for deterministic reasoning steps.',
    'If this contract is malformed, CodeLens will show diagnostics instead of silently accepting it.',
  ].join('\n');
}

export function parseSandboxModelOutput(raw: string): SandboxModelOutput {
  const extraction = extractContractJson(raw);
  if (!extraction) {
    return fallbackOutput(raw, [
      diagnostic(
        'missing-contract',
        'warning',
        'Missing contract block',
        `No fenced ${CONTRACT_FENCE} JSON block was found. Rendering plain prose only.`,
      ),
    ]);
  }

  try {
    const parsed = JSON.parse(extraction.json) as Partial<SandboxModelOutput>;
    const output = normalizeOutput(parsed, raw);
    if (extraction.source === 'bare-json') {
      output.diagnostics.unshift(diagnostic(
        'bare-json-contract',
        'warning',
        'Contract was not fenced',
        `A JSON object was found, but it was not wrapped in a fenced ${CONTRACT_FENCE} block. The repair prompt should prevent this.`,
      ));
    }
    return output;
  } catch (error) {
    return fallbackOutput(raw.replace(/```[\s\S]*?```/g, '').trim() || raw, [
      diagnostic(
        'invalid-json',
        'error',
        'Invalid contract JSON',
        error instanceof Error ? error.message : String(error),
      ),
    ]);
  }
}

export function hasBlockingContractDiagnostics(output: SandboxModelOutput): boolean {
  if (output.codeArtifacts.length === 0 && output.terms.length === 0) {
    return true;
  }

  return output.diagnostics.some(
    (item) =>
      item.level === 'error' ||
      item.id === 'missing-contract' ||
      item.id === 'bare-json-contract' ||
      item.id === 'empty-contract',
  );
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

function extractContractJson(
  raw: string,
): { json: string; source: 'fenced' | 'bare-json' } | null {
  const fence = new RegExp(
    '```(?:' + CONTRACT_FENCE + '|json)\\s*([\\s\\S]*?)```',
    'i',
  );
  const match = raw.match(fence);
  const fenced = match?.[1]?.trim();
  if (fenced) {
    return { json: fenced, source: 'fenced' };
  }

  const bareJson = extractTrailingJsonObject(raw);
  return bareJson ? { json: bareJson, source: 'bare-json' } : null;
}

function extractTrailingJsonObject(raw: string): string | null {
  const start = raw.lastIndexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }

  const candidate = raw.slice(start, end + 1).trim();
  if (!candidate.includes('"prose"')) {
    return null;
  }

  return candidate;
}

function normalizeOutput(
  parsed: Partial<SandboxModelOutput>,
  raw: string,
): SandboxModelOutput {
  const diagnostics: SandboxContractDiagnostic[] = [];
  const prose = typeof parsed.prose === 'string'
    ? parsed.prose
    : raw.replace(/```[\s\S]*?```/g, '').trim();

  if (typeof parsed.prose !== 'string') {
    diagnostics.push(diagnostic(
      'missing-prose',
      'warning',
      'Missing prose',
      'Contract did not provide a string prose field; visible text was inferred from the raw assistant response.',
    ));
  }

  const codeArtifacts = Array.isArray(parsed.codeArtifacts)
    ? parsed.codeArtifacts.map((artifact, index) =>
        normalizeArtifact(artifact as SandboxCodeArtifact, index, diagnostics),
      ).filter(isPresent)
    : [];
  if (!Array.isArray(parsed.codeArtifacts)) {
    diagnostics.push(diagnostic(
      'missing-code-artifacts',
      'warning',
      'Missing codeArtifacts array',
      'Contract should include codeArtifacts even if it is empty.',
    ));
  }

  const terms = Array.isArray(parsed.terms)
    ? parsed.terms.map((term, index) =>
        normalizeTerm(term as SandboxTerm, index, diagnostics),
      ).filter(isPresent)
    : [];
  if (!Array.isArray(parsed.terms)) {
    diagnostics.push(diagnostic(
      'missing-terms',
      'warning',
      'Missing terms array',
      'Contract should include terms even if it is empty.',
    ));
  }

  const calculations = Array.isArray(parsed.calculations)
    ? parsed.calculations.map((calculation, index) =>
        normalizeCalculation(
          calculation as SandboxCalculation,
          index,
          diagnostics,
        ),
      ).filter(isPresent)
    : [];
  if (!Array.isArray(parsed.calculations)) {
    diagnostics.push(diagnostic(
      'missing-calculations',
      'warning',
      'Missing calculations array',
      'Contract should include calculations even if it is empty.',
    ));
  }

  if (codeArtifacts.length === 0 && terms.length === 0 && calculations.length === 0) {
    diagnostics.push(diagnostic(
      'empty-contract',
      'warning',
      'No inspectable surfaces',
      'The contract parsed, but it produced no code artifacts, terms, or calculations for the UI.',
    ));
  }

  return {
    prose,
    codeArtifacts,
    terms,
    calculations,
    diagnostics,
  };
}

function normalizeArtifact(
  artifact: SandboxCodeArtifact,
  index: number,
  diagnostics: SandboxContractDiagnostic[],
): SandboxCodeArtifact | null {
  if (
    !artifact ||
    typeof artifact.id !== 'string' ||
    typeof artifact.title !== 'string' ||
    typeof artifact.language !== 'string' ||
    typeof artifact.code !== 'string'
  ) {
    diagnostics.push(diagnostic(
      `invalid-artifact-${index}`,
      'error',
      'Dropped invalid code artifact',
      `codeArtifacts[${index}] must include string id, title, language, and code fields.`,
    ));
    return null;
  }

  const lines = artifact.code.split('\n').length;
  return {
    id: artifact.id,
    title: artifact.title,
    language: artifact.language,
    code: artifact.code,
    layers: Array.isArray(artifact.layers)
      ? artifact.layers.map((layer, layerIndex) =>
          normalizeLayer(
            layer as SandboxCodeLayer,
            layerIndex,
            artifact.id,
            lines,
            diagnostics,
          ),
        ).filter(isPresent)
      : [],
  };
}

function normalizeLayer(
  layer: SandboxCodeLayer,
  index: number,
  artifactId: string,
  maxLine: number,
  diagnostics: SandboxContractDiagnostic[],
): SandboxCodeLayer | null {
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
    diagnostics.push(diagnostic(
      `invalid-layer-${artifactId}-${index}`,
      'error',
      'Dropped invalid code layer',
      `Layer ${index} in artifact "${artifactId}" must include id, kind, title, summary, detail, lineStart, and lineEnd.`,
    ));
    return null;
  }

  if (!LAYER_KINDS.includes(layer.kind as SandboxCodeLayerKind)) {
    diagnostics.push(diagnostic(
      `invalid-layer-kind-${artifactId}-${layer.id}`,
      'error',
      'Dropped layer with invalid kind',
      `Layer "${layer.id}" used kind "${layer.kind}". Expected one of: ${LAYER_KINDS.join(', ')}.`,
    ));
    return null;
  }

  const lineStart = Math.max(1, Math.floor(layer.lineStart));
  const lineEnd = Math.max(lineStart, Math.floor(layer.lineEnd));
  if (lineStart > maxLine || lineEnd > maxLine) {
    diagnostics.push(diagnostic(
      `layer-range-${artifactId}-${layer.id}`,
      'warning',
      'Layer range exceeds artifact',
      `Layer "${layer.id}" points to lines ${lineStart}-${lineEnd}, but artifact "${artifactId}" has ${maxLine} lines.`,
    ));
  }

  return {
    id: layer.id,
    kind: layer.kind as SandboxCodeLayerKind,
    title: layer.title,
    summary: layer.summary,
    detail: layer.detail,
    lineStart,
    lineEnd,
  };
}

function normalizeTerm(
  term: SandboxTerm,
  index: number,
  diagnostics: SandboxContractDiagnostic[],
): SandboxTerm | null {
  if (
    !term ||
    typeof term.id !== 'string' ||
    typeof term.label !== 'string' ||
    typeof term.summary !== 'string' ||
    typeof term.detail !== 'string' ||
    typeof term.promptHook !== 'string'
  ) {
    diagnostics.push(diagnostic(
      `invalid-term-${index}`,
      'error',
      'Dropped invalid term',
      `terms[${index}] must include string id, label, summary, detail, and promptHook fields.`,
    ));
    return null;
  }

  const category = TERM_CATEGORIES.includes(term.category)
    ? term.category
    : 'concept';
  if (category !== term.category) {
    diagnostics.push(diagnostic(
      `term-category-${term.id}`,
      'warning',
      'Term category defaulted',
      `Term "${term.id}" did not include a valid category. Defaulted to "concept".`,
    ));
  }

  return {
    id: term.id,
    label: term.label,
    category,
    summary: term.summary,
    detail: term.detail,
    promptHook: term.promptHook,
    relatedTermIds: Array.isArray(term.relatedTermIds)
      ? term.relatedTermIds.filter((id): id is string => typeof id === 'string')
      : [],
  };
}

function normalizeCalculation(
  calculation: SandboxCalculation,
  index: number,
  diagnostics: SandboxContractDiagnostic[],
): SandboxCalculation | null {
  if (
    !calculation ||
    typeof calculation.id !== 'string' ||
    typeof calculation.label !== 'string' ||
    typeof calculation.expression !== 'string' ||
    typeof calculation.result !== 'string' ||
    typeof calculation.explanation !== 'string'
  ) {
    diagnostics.push(diagnostic(
      `invalid-calculation-${index}`,
      'error',
      'Dropped invalid calculation',
      `calculations[${index}] must include string id, label, expression, result, and explanation fields.`,
    ));
    return null;
  }

  return calculation;
}

function fallbackOutput(
  raw: string,
  diagnostics: SandboxContractDiagnostic[],
): SandboxModelOutput {
  return {
    prose: raw.trim(),
    codeArtifacts: [],
    terms: [],
    calculations: [],
    diagnostics,
  };
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

function diagnostic(
  id: string,
  level: SandboxContractDiagnostic['level'],
  title: string,
  detail: string,
): SandboxContractDiagnostic {
  return { id, level, title, detail };
}
