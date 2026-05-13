import { getActiveDomainProfile, type DomainProfile } from '../../ontology';
import { unsafeConceptId } from '../types/ids';
import { buildExtractorSystemPrompt } from '../extractor/extractorPrompt';
import { runExtractor, type ExtractorComplete } from '../extractor/runExtractor';
import type { CaptureHint } from '../extractor/extractorSchema';
import { conceptMatchPreCheck, type ConceptMatch } from './conceptMatchPreCheck';
import type { ConceptId, LearningCaptureId } from '../types/ids';
import type { SaveModalCandidateData } from '../types/saveModal';

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
    preCheck?: ((text: string) => Promise<ConceptMatch[]>) | undefined;
    profile?: DomainProfile | undefined;
  },
): Promise<SaveModalCandidateData[]> {
  const selectedText = source.selectedText.trim().slice(0, MAX_SNIPPET_LENGTH);
  if (!selectedText) throw new Error('Cannot extract a capture from empty source text');

  const relevantConcepts = await (options?.preCheck ?? conceptMatchPreCheck)(selectedText);
  const profile = options?.profile ?? getActiveDomainProfile();
  const prompt = buildExtractorSystemPrompt({
    profile,
    relevantConcepts,
  });
  const output = await runExtractor(prompt, selectedText, {
    signal: options?.signal,
    complete: options?.complete,
  });

  return output.candidates.map((candidate) => {
    const conceptHint = normalizeConceptHintForProfile(candidate.conceptHint, profile);
    const rawProposedTypeNodeId = rawProposedTypeNodeIdForEvidence(
      candidate.conceptHint,
      conceptHint,
    );
    const linkedConceptId = conceptHint?.linkedConceptId
      ? unsafeConceptId(conceptHint.linkedConceptId)
      : null;
    const matchSimilarity = linkedConceptId
      ? findSimilarityForConcept(relevantConcepts, linkedConceptId)
      : null;

    return {
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
      linkedConceptName: conceptHint?.linkedConceptName ?? null,
      linkedConceptLanguages: conceptHint?.linkedConceptLanguages ?? null,
      linkedConceptId,
      extractionConfidence: conceptHint?.extractionConfidence ?? null,
      matchSimilarity,
      conceptHint,
      rawProposedTypeNodeId,
      keywords: candidate.keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean),
    };
  });
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

function rawProposedTypeNodeIdForEvidence(
  rawHint: CaptureHint | null,
  normalizedHint: CaptureHint | null,
): string | null {
  const rawTypeNodeId = rawHint?.proposedConceptType ?? null;
  if (!rawTypeNodeId || rawTypeNodeId === normalizedHint?.proposedConceptType) return null;
  return rawTypeNodeId;
}

function findSimilarityForConcept(matches: ConceptMatch[], id: ConceptId): number | null {
  return matches.find((match) => match.concept.id === id)?.similarity ?? null;
}
