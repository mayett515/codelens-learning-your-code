import { enqueue } from '../../../ai/queue';
import {
  scopedNodeRefKey,
  type ContextPack,
  type ScopedNodeRef,
} from '../../ontology';
import { normalizeConceptKey } from '../codecs/concept';
import type { CaptureHint } from '../extractor/extractorSchema';
import type { SaveModalCandidateData } from '../types/saveModal';
import { buildConceptualizeContextPackShadow } from './conceptualizeContextPack';
import type { ConceptualizeProfileContext } from './conceptualizeProfileContext';
import {
  buildConceptualizePrompt,
  getConceptualizePublicClassification,
  validateConceptualizePromptOutput,
  type ConceptualizePromptBuildResult,
  type ConceptualizePromptClassification,
  type ConceptualizePromptOutput,
} from './conceptualizePromptBuilder';

export class ConceptualizeClassificationFailedError extends Error {
  constructor(message = 'Conceptualize classifier returned invalid output after 2 attempts') {
    super(message);
    this.name = 'ConceptualizeClassificationFailedError';
  }
}

export type ConceptualizeClassificationComplete = (
  prompt: string,
  input: string,
  signal?: AbortSignal,
) => Promise<string>;

export interface ConceptualizeClassificationResult {
  output: ConceptualizePromptOutput;
  pack: ContextPack;
  prompt: ConceptualizePromptBuildResult;
}

export interface RunConceptualizeClassificationInput {
  candidateId: string;
  candidate: SaveModalCandidateData;
  context: ConceptualizeProfileContext;
}

const RETRY_INSTRUCTION = [
  '',
  'Your previous response was not valid JSON matching ConceptualizePromptOutputSchema.',
  'Output valid JSON only.',
  'Use only scoped refs from ontology.allowedNodeRefKeys in the supplied KORDEX_CONTEXT_PAYLOAD_JSON.',
  'Do not include markdown fences.',
  'Do not include prose.',
].join('\n');

const defaultComplete: ConceptualizeClassificationComplete = async (prompt, input, signal) =>
  enqueue(
    'learning',
    [
      { role: 'system', content: prompt },
      { role: 'user', content: input },
    ],
    signal,
  );

export async function runConceptualizeClassification(
  input: RunConceptualizeClassificationInput,
  options?: {
    signal?: AbortSignal | undefined;
    complete?: ConceptualizeClassificationComplete | undefined;
  },
): Promise<ConceptualizeClassificationResult> {
  const shadow = buildConceptualizeContextPackShadow(input);
  if (!shadow.validation.valid) {
    const message = shadow.validation.errors
      .map((error) => `${error.path}: ${error.message}`)
      .join('; ');
    throw new ConceptualizeClassificationFailedError(`Invalid Conceptualize ContextPack: ${message}`);
  }

  const prompt = buildConceptualizePrompt({ pack: shadow.pack });
  const complete = options?.complete ?? defaultComplete;
  let currentInput = [
    'KORDEX_CONTEXT_PAYLOAD_JSON:',
    prompt.dataPayloadJson,
  ].join('\n\n');
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await complete(prompt.instructionShell, currentInput, options?.signal);

    try {
      const validation = validateConceptualizePromptOutput(parseJson(raw), shadow.pack);
      if (validation.valid && validation.output) {
        return {
          output: validation.output,
          pack: shadow.pack,
          prompt,
        };
      }
      throw new Error(formatValidationErrors(validation.errors));
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        currentInput += `${RETRY_INSTRUCTION}\n\nValidation error:\n${formatUnknownError(error)}`;
        continue;
      }
    }
  }

  throw new ConceptualizeClassificationFailedError(
    `Conceptualize classifier returned invalid output after 2 attempts: ${formatUnknownError(lastError)}`,
  );
}

export async function classifySaveCandidateWithConceptualize(
  input: RunConceptualizeClassificationInput,
  options?: {
    signal?: AbortSignal | undefined;
    complete?: ConceptualizeClassificationComplete | undefined;
  },
): Promise<SaveModalCandidateData> {
  const result = await runConceptualizeClassification(input, options);
  return applyConceptualizeClassificationToCandidate({
    candidate: input.candidate,
    context: input.context,
    pack: result.pack,
    classification: getConceptualizePublicClassification(result.output),
  });
}

export function applyConceptualizeClassificationToCandidate(input: {
  candidate: SaveModalCandidateData;
  context: ConceptualizeProfileContext;
  pack: ContextPack;
  classification: ConceptualizePromptClassification;
}): SaveModalCandidateData {
  const { candidate, context, pack, classification } = input;

  if (classification.noStrongMatch || !classification.primaryNodeRef) {
    return {
      ...candidate,
      linkedConceptId: null,
      linkedConceptName: null,
      linkedConceptLanguages: null,
      matchSimilarity: null,
      isNewLanguageForExistingConcept: false,
      extractionConfidence: classification.confidence,
      conceptHint: null,
      rawProposedTypeNodeId: null,
    };
  }

  const refKey = scopedNodeRefKey(classification.primaryNodeRef);
  const node = pack.ontology.nodes.find((entry) =>
    scopedNodeRefKey(entry.ref) === refKey);
  if (!node) {
    throw new ConceptualizeClassificationFailedError(
      `Conceptualize classifier selected ${refKey}, but that ref is not in the ContextPack.`,
    );
  }

  const typeNodeId = classification.primaryNodeRef.nodeId;
  if (!context.profile.ontology.itemTypeNodeIds.includes(typeNodeId)) {
    throw new ConceptualizeClassificationFailedError(
      `Conceptualize classifier selected ${refKey}, but ${typeNodeId} is not an item type in the active profile.`,
    );
  }

  const previousTypeNodeId = candidate.conceptHint?.proposedConceptType ?? null;
  const clearLink = previousTypeNodeId !== typeNodeId;
  const conceptHint = withConceptualizeType(candidate, typeNodeId, classification.confidence, clearLink);

  return {
    ...candidate,
    linkedConceptId: clearLink ? null : candidate.linkedConceptId,
    linkedConceptName: clearLink ? null : candidate.linkedConceptName,
    linkedConceptLanguages: clearLink ? null : candidate.linkedConceptLanguages,
    matchSimilarity: clearLink ? null : candidate.matchSimilarity,
    isNewLanguageForExistingConcept: clearLink ? false : candidate.isNewLanguageForExistingConcept,
    extractionConfidence: classification.confidence,
    conceptHint,
    rawProposedTypeNodeId: fullScopedRawTypeNodeId(classification.primaryNodeRef),
  };
}

function withConceptualizeType(
  candidate: SaveModalCandidateData,
  typeNodeId: string,
  confidence: number,
  clearLink: boolean,
): CaptureHint {
  const hint = candidate.conceptHint;
  return {
    proposedName: hint?.proposedName ?? candidate.title,
    proposedNormalizedKey: hint?.proposedNormalizedKey ?? normalizeConceptKey(candidate.title),
    proposedConceptType: typeNodeId,
    extractionConfidence: confidence,
    linkedConceptId: clearLink ? null : hint?.linkedConceptId ?? candidate.linkedConceptId,
    linkedConceptName: clearLink ? null : hint?.linkedConceptName ?? candidate.linkedConceptName,
    linkedConceptLanguages: clearLink ? null : hint?.linkedConceptLanguages ?? candidate.linkedConceptLanguages,
    isNewLanguageForExistingConcept: clearLink
      ? false
      : hint?.isNewLanguageForExistingConcept ?? candidate.isNewLanguageForExistingConcept,
  };
}

function fullScopedRawTypeNodeId(ref: ScopedNodeRef): string {
  return scopedNodeRefKey(ref);
}

function parseJson(raw: string): unknown {
  return JSON.parse(raw.trim());
}

function formatValidationErrors(
  errors: readonly { path: string; message: string }[],
): string {
  return errors.map((error) => `${error.path}: ${error.message}`).join('; ');
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
