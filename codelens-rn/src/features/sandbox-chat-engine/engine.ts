import type {
  SandboxCalculation,
  SandboxChatMessage,
  SandboxCodeArtifact,
  SandboxCodeLayer,
  SandboxCodeLayerKind,
  SandboxContractDiagnostic,
  SandboxFinding,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxProseSpan,
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
  'expansion',
  'callflow',
  'closure',
  'runtime-order',
  'abstraction',
];
const TERM_CATEGORIES: SandboxTermCategory[] = [
  'risk',
  'concept',
  'api',
  'data',
  'performance',
  'test',
];
const FINDING_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const FINDING_CATEGORIES = [
  'bug',
  'security',
  'reliability',
  'performance',
  'maintainability',
  'accessibility',
  'design',
] as const;
const VALID_ID_RE = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;

export function buildSandboxPromptContract(): string {
  return [
    `When a response contains code that should be visualized by CodeLens, append one fenced ${CONTRACT_FENCE} JSON block.`,
    'The JSON shape is: { "version": 1, "prose": string, "codeArtifacts": [], "terms": [], "calculations": [], "findings": [] }.',
    'Set version to 1.',
    'Every code artifact layer must include lineStart and lineEnd so the UI can open the right abstraction layer from a code click.',
    `Layer kind must be one of: ${LAYER_KINDS.join(', ')}, or a custom value prefixed with x-.`,
    `Every term must include category, one of: ${TERM_CATEGORIES.join(', ')}.`,
    'Every term must include spans: an array of { proseOffset, length } objects that anchor the label exactly in the prose text.',
    'Use terms for clickable explanation bricks. Choose terms from user-facing prose and add relatedTermIds when terms connect.',
    'Prefer 3-6 terms. Include at least one risk term for code-review answers.',
    'Use calculations for deterministic reasoning steps with a steps array and conclusion.',
    'Use findings for concrete code-review issues with severity, category, and optional line ranges.',
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
  | SandboxFinding
  | null {
  if (target.type === 'term') {
    return output.terms.find((term) => term.id === target.id) ?? null;
  }

  if (target.type === 'calculation') {
    return output.calculations.find((calc) => calc.id === target.id) ?? null;
  }

  if (target.type === 'finding') {
    return output.findings.find((f) => f.id === target.id) ?? null;
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

  const finding = output.findings[0];
  if (finding) {
    return { type: 'finding', id: finding.id };
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

  if (parsed.version !== 1) {
    diagnostics.push(diagnostic(
      'invalid-version',
      'warning',
      'Invalid contract version',
      `Contract version must be 1, but received ${typeof parsed.version === 'number' ? parsed.version : String(parsed.version)}.`,
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
        normalizeTerm(term as SandboxTerm, index, prose, diagnostics),
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

  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map((finding, index) =>
        normalizeFinding(finding as SandboxFinding, index, diagnostics),
      ).filter(isPresent)
    : [];
  if (!Array.isArray(parsed.findings)) {
    diagnostics.push(diagnostic(
      'missing-findings',
      'info',
      'Missing findings array',
      'Contract should include findings even if it is empty.',
    ));
  }

  if (codeArtifacts.length === 0 && terms.length === 0 && calculations.length === 0 && findings.length === 0) {
    diagnostics.push(diagnostic(
      'empty-contract',
      'warning',
      'No inspectable surfaces',
      'The contract parsed, but it produced no code artifacts, terms, calculations, or findings for the UI.',
    ));
  }

  const output: SandboxModelOutput = {
    version: 1,
    prose,
    codeArtifacts,
    terms,
    calculations,
    findings,
    diagnostics,
  };

  validateCrossReferences(output, diagnostics);
  return output;
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

  if (!VALID_ID_RE.test(artifact.id)) {
    diagnostics.push(diagnostic(
      `invalid-artifact-id-${index}`,
      'error',
      'Dropped artifact with invalid id',
      `Artifact id "${artifact.id}" must match ${VALID_ID_RE.source}.`,
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
    !Number.isFinite(layer.lineStart) ||
    typeof layer.lineEnd !== 'number' ||
    !Number.isFinite(layer.lineEnd)
  ) {
    diagnostics.push(diagnostic(
      `invalid-layer-${artifactId}-${index}`,
      'error',
      'Dropped invalid code layer',
      `Layer ${index} in artifact "${artifactId}" must include id, kind, title, summary, detail, lineStart, and lineEnd.`,
    ));
    return null;
  }

  if (!VALID_ID_RE.test(layer.id)) {
    diagnostics.push(diagnostic(
      `invalid-layer-id-${artifactId}-${layer.id}`,
      'error',
      'Dropped layer with invalid id',
      `Layer id "${layer.id}" must match ${VALID_ID_RE.source}.`,
    ));
    return null;
  }

  const isWellKnown = LAYER_KINDS.includes(layer.kind as SandboxCodeLayerKind);
  const isCustom = layer.kind.startsWith('x-');
  if (!isWellKnown && !isCustom) {
    diagnostics.push(diagnostic(
      `invalid-layer-kind-${artifactId}-${layer.id}`,
      'error',
      'Dropped layer with invalid kind',
      `Layer "${layer.id}" used kind "${layer.kind}". Expected one of: ${LAYER_KINDS.join(', ')}, or a custom value prefixed with x-.`,
    ));
    return null;
  }

  const lineStart = Math.max(1, Math.floor(layer.lineStart));
  const lineEnd = Math.max(lineStart, Math.floor(layer.lineEnd));

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
  prose: string,
  diagnostics: SandboxContractDiagnostic[],
): SandboxTerm | null {
  if (
    !term ||
    typeof term.id !== 'string' ||
    typeof term.label !== 'string' ||
    typeof term.summary !== 'string' ||
    typeof term.detail !== 'string'
  ) {
    diagnostics.push(diagnostic(
      `invalid-term-${index}`,
      'error',
      'Dropped invalid term',
      `terms[${index}] must include string id, label, summary, and detail fields.`,
    ));
    return null;
  }

  if (!VALID_ID_RE.test(term.id)) {
    diagnostics.push(diagnostic(
      `invalid-term-id-${index}`,
      'error',
      'Dropped term with invalid id',
      `Term id "${term.id}" must match ${VALID_ID_RE.source}.`,
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

  const spans = Array.isArray(term.spans)
    ? term.spans.filter((s): s is SandboxProseSpan =>
        s
        && typeof s.proseOffset === 'number'
        && Number.isFinite(s.proseOffset)
        && Number.isInteger(s.proseOffset)
        && s.proseOffset >= 0
        && typeof s.length === 'number'
        && Number.isFinite(s.length)
        && Number.isInteger(s.length)
        && s.length >= 1,
      )
    : [];

  if (spans.length === 0) {
    diagnostics.push(diagnostic(
      `term-spans-${term.id}`,
      'warning',
      'Term missing spans',
      `Term "${term.id}" did not provide valid spans. Keyword highlighting may be unreliable.`,
    ));
  }

  return {
    id: term.id,
    label: term.label,
    category,
    spans,
    summary: term.summary,
    detail: term.detail,
    relatedTermIds: Array.isArray(term.relatedTermIds)
      ? term.relatedTermIds.filter((id): id is string => typeof id === 'string')
      : [],
    ...(typeof term.promptHook === 'string' ? { promptHook: term.promptHook } : {}),
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
    typeof calculation.title !== 'string' ||
    typeof calculation.kind !== 'string' ||
    typeof calculation.conclusion !== 'string' ||
    !Array.isArray(calculation.steps)
  ) {
    diagnostics.push(diagnostic(
      `invalid-calculation-${index}`,
      'error',
      'Dropped invalid calculation',
      `calculations[${index}] must include string id, title, kind, conclusion, and a steps array.`,
    ));
    return null;
  }

  if (!VALID_ID_RE.test(calculation.id)) {
    diagnostics.push(diagnostic(
      `invalid-calculation-id-${index}`,
      'error',
      'Dropped calculation with invalid id',
      `Calculation id "${calculation.id}" must match ${VALID_ID_RE.source}.`,
    ));
    return null;
  }

  const validKinds = ['reasoning', 'tradeoff', 'risk-trace'] as const;
  const kind = validKinds.includes(calculation.kind as typeof validKinds[number])
    ? (calculation.kind as typeof validKinds[number])
    : 'reasoning';
  if (kind !== calculation.kind) {
    diagnostics.push(diagnostic(
      `calculation-kind-${calculation.id}`,
      'warning',
      'Calculation kind defaulted',
      `Calculation "${calculation.id}" had invalid kind "${calculation.kind}". Defaulted to "reasoning".`,
    ));
  }

  const steps = calculation.steps
    .map((step, stepIndex) => {
      if (
        !step ||
        typeof step.label !== 'string' ||
        typeof step.value !== 'number' ||
        !Number.isFinite(step.value) ||
        typeof step.unit !== 'string'
      ) {
        diagnostics.push(diagnostic(
          `calculation-step-${calculation.id}-${stepIndex}`,
          'warning',
          'Dropped invalid calc step',
          `Step ${stepIndex} in calculation "${calculation.id}" must have label, finite value, and unit.`,
        ));
        return null;
      }
      return {
        label: step.label,
        value: step.value,
        unit: step.unit,
        ...(typeof step.note === 'string' ? { note: step.note } : {}),
      };
    })
    .filter(isPresent);

  if (steps.length < 2) {
    diagnostics.push(diagnostic(
      `calculation-steps-${calculation.id}`,
      'warning',
      'Calculation has too few steps',
      `Calculation "${calculation.id}" should have at least 2 valid steps.`,
    ));
  }

  return {
    id: calculation.id,
    title: calculation.title,
    kind,
    steps,
    conclusion: calculation.conclusion,
  };
}

function normalizeFinding(
  finding: SandboxFinding,
  index: number,
  diagnostics: SandboxContractDiagnostic[],
): SandboxFinding | null {
  if (
    !finding ||
    typeof finding.id !== 'string' ||
    typeof finding.severity !== 'string' ||
    typeof finding.category !== 'string' ||
    typeof finding.title !== 'string' ||
    typeof finding.description !== 'string'
  ) {
    diagnostics.push(diagnostic(
      `invalid-finding-${index}`,
      'error',
      'Dropped invalid finding',
      `findings[${index}] must include string id, severity, category, title, and description.`,
    ));
    return null;
  }

  if (!VALID_ID_RE.test(finding.id)) {
    diagnostics.push(diagnostic(
      `invalid-finding-id-${index}`,
      'error',
      'Dropped finding with invalid id',
      `Finding id "${finding.id}" must match ${VALID_ID_RE.source}.`,
    ));
    return null;
  }

  const severity = FINDING_SEVERITIES.includes(finding.severity as typeof FINDING_SEVERITIES[number])
    ? (finding.severity as typeof FINDING_SEVERITIES[number])
    : 'medium';
  if (severity !== finding.severity) {
    diagnostics.push(diagnostic(
      `finding-severity-${finding.id}`,
      'warning',
      'Finding severity defaulted',
      `Finding "${finding.id}" had invalid severity "${finding.severity}". Defaulted to "medium".`,
    ));
  }

  const category = FINDING_CATEGORIES.includes(finding.category as typeof FINDING_CATEGORIES[number])
    ? (finding.category as typeof FINDING_CATEGORIES[number])
    : 'reliability';
  if (category !== finding.category) {
    diagnostics.push(diagnostic(
      `finding-category-${finding.id}`,
      'warning',
      'Finding category defaulted',
      `Finding "${finding.id}" had invalid category "${finding.category}". Defaulted to "reliability".`,
    ));
  }

  const lineStart = typeof finding.lineStart === 'number' && Number.isFinite(finding.lineStart)
    ? Math.max(1, Math.floor(finding.lineStart))
    : undefined;
  const lineEnd = typeof finding.lineEnd === 'number' && Number.isFinite(finding.lineEnd)
    ? Math.max(lineStart ?? 1, Math.floor(finding.lineEnd))
    : undefined;

  if ((lineStart !== undefined || lineEnd !== undefined) && typeof finding.artifactId !== 'string') {
    diagnostics.push(diagnostic(
      `finding-lines-${finding.id}`,
      'warning',
      'Finding line range ignored',
      `Finding "${finding.id}" includes lineStart/lineEnd but no artifactId. Line range will be ignored.`,
    ));
  }

  return {
    id: finding.id,
    severity,
    category,
    title: finding.title,
    description: finding.description,
    ...(typeof finding.termId === 'string' ? { termId: finding.termId } : {}),
    ...(typeof finding.artifactId === 'string' ? { artifactId: finding.artifactId } : {}),
    ...(lineStart !== undefined && lineEnd !== undefined ? { lineStart, lineEnd } : {}),
    ...(typeof finding.suggestedFix === 'string' ? { suggestedFix: finding.suggestedFix } : {}),
  };
}

function validateCrossReferences(
  output: SandboxModelOutput,
  diagnostics: SandboxContractDiagnostic[],
): void {
  const termIds = new Set(output.terms.map((t) => t.id));
  const artifactIds = new Set(output.codeArtifacts.map((a) => a.id));
  const calcIds = new Set(output.calculations.map((c) => c.id));
  const findingIds = new Set(output.findings.map((f) => f.id));

  // XR-008: Duplicate ids within collections
  checkDuplicates(output.codeArtifacts.map((a) => a.id), 'codeArtifacts', diagnostics);
  checkDuplicates(output.terms.map((t) => t.id), 'terms', diagnostics);
  checkDuplicates(output.calculations.map((c) => c.id), 'calculations', diagnostics);
  checkDuplicates(output.findings.map((f) => f.id), 'findings', diagnostics);

  // XR-001: relatedTermIds must resolve
  for (const term of output.terms) {
    for (const relatedId of term.relatedTermIds) {
      if (!termIds.has(relatedId)) {
        diagnostics.push(diagnostic(
          `xr-001-${term.id}-${relatedId}`,
          'warning',
          'Broken related term link',
          `Term "${term.id}" references related term "${relatedId}" which does not exist.`,
        ));
      }
    }
  }

  // XR-002: findings.termId must resolve
  for (const finding of output.findings) {
    if (finding.termId && !termIds.has(finding.termId)) {
      diagnostics.push(diagnostic(
        `xr-002-${finding.id}`,
        'warning',
        'Broken finding term link',
        `Finding "${finding.id}" references term "${finding.termId}" which does not exist.`,
      ));
    }
  }

  // XR-003: findings.artifactId must resolve
  for (const finding of output.findings) {
    if (finding.artifactId && !artifactIds.has(finding.artifactId)) {
      diagnostics.push(diagnostic(
        `xr-003-${finding.id}`,
        'warning',
        'Broken finding artifact link',
        `Finding "${finding.id}" references artifact "${finding.artifactId}" which does not exist.`,
      ));
    }
  }

  // XR-004: findings line ranges within artifact line count
  for (const finding of output.findings) {
    if (finding.artifactId && finding.lineStart != null && finding.lineEnd != null) {
      const artifact = output.codeArtifacts.find((a) => a.id === finding.artifactId);
      if (artifact) {
        const lines = artifact.code.split('\n').length;
        if (finding.lineStart > lines || finding.lineEnd > lines) {
          diagnostics.push(diagnostic(
            `xr-004-${finding.id}`,
            'warning',
            'Finding line range exceeds artifact',
            `Finding "${finding.id}" points to lines ${finding.lineStart}-${finding.lineEnd}, but artifact "${finding.artifactId}" has ${lines} lines.`,
          ));
        }
      }
    }
  }

  // XR-005, XR-006: term spans must be within prose and match label exactly
  for (const term of output.terms) {
    for (const span of term.spans) {
      const end = span.proseOffset + span.length;
      if (end > output.prose.length) {
        diagnostics.push(diagnostic(
          `xr-005-${term.id}`,
          'warning',
          'Term span exceeds prose length',
          `Term "${term.id}" span offset ${span.proseOffset} + length ${span.length} exceeds prose length ${output.prose.length}.`,
        ));
      } else if (output.prose.slice(span.proseOffset, end) !== term.label) {
        diagnostics.push(diagnostic(
          `xr-006-${term.id}`,
          'warning',
          'Term span does not match label',
          `Term "${term.id}" label "${term.label}" does not match prose slice at offset ${span.proseOffset} length ${span.length} (got "${output.prose.slice(span.proseOffset, end)}").`,
        ));
      }
    }
  }

  // XR-007: layer line ranges within artifact code line count
  for (const artifact of output.codeArtifacts) {
    const lines = artifact.code.split('\n').length;
    for (const layer of artifact.layers) {
      if (layer.lineStart > lines || layer.lineEnd > lines) {
        diagnostics.push(diagnostic(
          `xr-007-${artifact.id}-${layer.id}`,
          'warning',
          'Layer line range exceeds artifact',
          `Layer "${layer.id}" in artifact "${artifact.id}" points to lines ${layer.lineStart}-${layer.lineEnd}, but the artifact has ${lines} lines.`,
        ));
      }
    }
  }
}

function checkDuplicates(
  ids: string[],
  collection: string,
  diagnostics: SandboxContractDiagnostic[],
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      diagnostics.push(diagnostic(
        `xr-008-${collection}-${id}`,
        'error',
        `Duplicate id in ${collection}`,
        `Id "${id}" appears more than once in ${collection}. Each id must be unique within its collection.`,
      ));
    }
    seen.add(id);
  }
}

function fallbackOutput(
  raw: string,
  diagnostics: SandboxContractDiagnostic[],
): SandboxModelOutput {
  const prose = raw.trim() || 'The model did not return a valid review contract. This is a fallback response.';
  const label = 'fallback response';
  const proseOffset = prose.indexOf(label);
  const spans: SandboxProseSpan[] = proseOffset >= 0
    ? [{ proseOffset, length: label.length }]
    : [];

  return {
    version: 1,
    prose,
    codeArtifacts: [],
    terms: [
      {
        id: 'fallback-note',
        label,
        category: 'concept',
        spans,
        summary: 'The model output could not be parsed into a valid contract.',
        detail: 'The model was asked to return a codelens-chat-engine JSON block but the output was malformed or missing. Diagnostics are available in the inspector.',
        promptHook: 'Try sending the prompt again with Local mode to see a working example.',
        relatedTermIds: [],
      },
    ],
    calculations: [],
    findings: [],
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
