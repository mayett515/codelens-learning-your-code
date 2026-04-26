import { unsafeConceptId } from '../types/ids';
import { buildExtractorSystemPrompt } from '../extractor/extractorPrompt';
import { runExtractor, type ExtractorComplete } from '../extractor/runExtractor';
import { conceptMatchPreCheck, type ConceptMatch } from './conceptMatchPreCheck';
import type { ConceptId, LearningCaptureId } from '../types/ids';
import type { SaveModalCandidateData } from '../types/saveModal';

const MAX_SNIPPET_LENGTH = 800;

export interface SaveCandidateSource {
  selectedText: string;
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
  },
): Promise<SaveModalCandidateData[]> {
  const selectedText = source.selectedText.trim().slice(0, MAX_SNIPPET_LENGTH);
  if (!selectedText) throw new Error('Cannot extract a capture from empty source text');

  const relevantConcepts = await (options?.preCheck ?? conceptMatchPreCheck)(selectedText);
  const prompt = buildExtractorSystemPrompt(relevantConcepts);
  const output = await runExtractor(prompt, selectedText, {
    signal: options?.signal,
    complete: options?.complete,
  });

  return output.candidates.map((candidate) => {
    const linkedConceptId = candidate.conceptHint?.linkedConceptId
      ? unsafeConceptId(candidate.conceptHint.linkedConceptId)
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
        candidate.conceptHint?.isNewLanguageForExistingConcept ?? false,
      linkedConceptName: candidate.conceptHint?.linkedConceptName ?? null,
      linkedConceptLanguages: candidate.conceptHint?.linkedConceptLanguages ?? null,
      linkedConceptId,
      extractionConfidence: candidate.conceptHint?.extractionConfidence ?? null,
      matchSimilarity,
      conceptHint: candidate.conceptHint,
    };
  });
}

function findSimilarityForConcept(matches: ConceptMatch[], id: ConceptId): number | null {
  return matches.find((match) => match.concept.id === id)?.similarity ?? null;
}
