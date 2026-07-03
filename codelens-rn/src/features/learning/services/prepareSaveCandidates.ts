import { getActiveDomainProfile, type DomainProfile } from '../../ontology';
import { unsafeConceptId } from '../types/ids';
import { buildExtractorSystemPrompt } from '../extractor/extractorPrompt';
import { runExtractor, type ExtractorComplete } from '../extractor/runExtractor';
import type { CaptureHint } from '../extractor/extractorSchema';
import { conceptMatchPreCheck, type ConceptMatch } from './conceptMatchPreCheck';
import type { LearningCaptureId } from '../types/ids';
import type { SaveModalCandidateData } from '../types/saveModal';
import {
  createUnresolvedRawProposedTypeIdentity,
  rawProposedTypeIdentityToLegacyString,
  type RawProposedTypeIdentity,
} from '../types/rawProposedTypeIdentity';
import {
  classifySaveCandidateWithConceptualize,
  type ConceptualizeClassificationComplete,
} from './conceptualizeClassification';
import type { ConceptualizeProfileContext } from './conceptualizeProfileContext';

const MAX_SNIPPET_LENGTH = 800;

export interface SaveCandidateSource {
  selectedText: string;
  projectId?: string | null | undefined;
  snippetLang?: string | null | undefined;
  snippetSourcePath?: string | null | undefined;
  snippetStartLine?: number | null | undefined;
  snippetEndLine?: number | null | undefined;
  chatMessageId?: string | null | undefined;
  sessionId?: string | null | undefined;
  derivedFromCaptureId?: LearningCaptureId | null | undefined;
}

export async function prepareSaveCandidates(
  source: SaveCandidateSource,
  options?: {
    signal?: AbortSignal | undefined;
    complete?: ExtractorComplete | undefined;
    conceptualizeComplete?: ConceptualizeClassificationComplete | undefined;
    conceptualizeContext?: ConceptualizeProfileContext | undefined;
    preCheck?: ((text: string) => Promise<ConceptMatch[]>) | undefined;
    profile?: DomainProfile | undefined;
  },
): Promise<SaveModalCandidateData[]> {
  const selectedText = source.selectedText.trim().slice(0, MAX_SNIPPET_LENGTH);
  if (!selectedText) throw new Error('Cannot extract a capture from empty source text');

  const conceptualizeContext = options?.conceptualizeContext;
  const profile = options?.profile ?? conceptualizeContext?.profile ?? getActiveDomainProfile();
  const relevantConcepts = (await (options?.preCheck ?? conceptMatchPreCheck)(selectedText))
    .filter((match) => match.concept.profileId === profile.id);
  const prompt = buildExtractorSystemPrompt({
    profile,
    relevantConcepts,
  });
  const output = await runExtractor(prompt, selectedText, {
    signal: options?.signal,
    complete: options?.complete,
  });

  const candidates = output.candidates.map((candidate) => {
    const conceptHint = normalizeConceptHintForProfile(candidate.conceptHint, profile);
    const rawProposedTypeIdentity = rawProposedTypeIdentityForEvidence(
      candidate.conceptHint,
      conceptHint,
      profile.id,
    );
    const rawProposedTypeNodeId =
      rawProposedTypeIdentityToLegacyString(rawProposedTypeIdentity);
    const linkedConceptMatch = conceptHint?.linkedConceptId
      ? relevantConcepts.find((match) => match.concept.id === conceptHint.linkedConceptId)
      : undefined;
    const linkedConceptId = linkedConceptMatch
      ? unsafeConceptId(linkedConceptMatch.concept.id)
      : null;
    const matchSimilarity = linkedConceptMatch?.similarity ?? null;

    return {
      profileId: profile.id,
      title: candidate.title,
      whatClicked: candidate.whatClicked,
      whyItMattered: candidate.whyItMattered,
      rawSnippet: candidate.rawSnippet.slice(0, MAX_SNIPPET_LENGTH),
      snippetLang: source.snippetLang ?? null,
      snippetSourcePath: source.snippetSourcePath ?? null,
      snippetStartLine: source.snippetStartLine ?? null,
      snippetEndLine: source.snippetEndLine ?? null,
      chatMessageId: source.chatMessageId ?? null,
      sessionId: source.sessionId ?? null,
      derivedFromCaptureId: source.derivedFromCaptureId ?? null,
      isNewLanguageForExistingConcept:
        conceptHint?.isNewLanguageForExistingConcept ?? false,
      linkedConceptName: linkedConceptId ? conceptHint?.linkedConceptName ?? null : null,
      linkedConceptLanguages: linkedConceptId ? conceptHint?.linkedConceptLanguages ?? null : null,
      linkedConceptId,
      extractionConfidence: conceptHint?.extractionConfidence ?? null,
      matchSimilarity,
      conceptHint,
      rawProposedTypeIdentity,
      rawProposedTypeNodeId,
      keywords: candidate.keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean),
    };
  });

  if (!conceptualizeContext) return candidates;

  return Promise.all(candidates.map(async (candidate, index) => {
    try {
      return await classifySaveCandidateWithConceptualize(
        {
          candidateId: `candidate-${index}`,
          candidate,
          context: conceptualizeContext,
        },
        {
          signal: options?.signal,
          complete: options?.conceptualizeComplete,
        },
      );
    } catch (error) {
      if (isAbortError(error)) throw error;
      console.warn('[learning] Conceptualize classification failed; keeping extractor placement', error);
      return candidate;
    }
  }));
}

function normalizeConceptHintForProfile(
  hint: CaptureHint | null,
  profile: DomainProfile,
): CaptureHint | null {
  if (!hint) return null;
  if (profile.ontology.itemTypeNodeIds.includes(hint.proposedConceptType)) return hint;

  return {
    ...hint,
    proposedConceptType: profile.promotion.defaultTypeNodeId,
  };
}

function rawProposedTypeIdentityForEvidence(
  rawHint: CaptureHint | null,
  normalizedHint: CaptureHint | null,
  activeScopeId: string | null,
): RawProposedTypeIdentity | null {
  const rawTypeNodeId = rawHint?.proposedConceptType ?? null;
  if (!rawTypeNodeId || rawTypeNodeId === normalizedHint?.proposedConceptType) return null;
  return createUnresolvedRawProposedTypeIdentity({
    rawNodeId: rawTypeNodeId,
    activeScopeId,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
    || error instanceof Error && error.name === 'AbortError';
}
