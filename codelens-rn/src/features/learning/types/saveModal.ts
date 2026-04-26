import type { z } from 'zod';
import type { CaptureHintSchema } from '../extractor/extractorSchema';
import type { ConceptId, LearningCaptureId } from './ids';

export interface SaveModalCandidateData {
  title: string;
  whatClicked: string;
  whyItMattered: string | null;
  rawSnippet: string;
  snippetLang: string | null;
  snippetSourcePath: string | null;
  snippetStartLine: number | null;
  snippetEndLine: number | null;
  chatMessageId: string | null;
  sessionId: string | null;
  derivedFromCaptureId: LearningCaptureId | null;
  isNewLanguageForExistingConcept: boolean;
  linkedConceptName: string | null;
  linkedConceptLanguages: string[] | null;
  linkedConceptId: ConceptId | null;
  extractionConfidence: number | null;
  matchSimilarity: number | null;
  conceptHint: z.infer<typeof CaptureHintSchema> | null;
}

export type CandidateSaveState = 'idle' | 'saving' | 'saved' | 'failed';
