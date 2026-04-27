import { describe, expect, it } from 'vitest';
import { useSaveLearningStore } from '../save-learning';
import type { SaveModalCandidateData } from '../../types/saveModal';

const candidate: SaveModalCandidateData = {
  title: 'Closure keeps state',
  whatClicked: 'The inner function reads outer state.',
  whyItMattered: null,
  rawSnippet: 'const value = 1',
  snippetLang: 'typescript',
  snippetSourcePath: null,
  snippetStartLine: null,
  snippetEndLine: null,
  chatMessageId: null,
  sessionId: null,
  derivedFromCaptureId: null,
  isNewLanguageForExistingConcept: false,
  linkedConceptName: null,
  linkedConceptLanguages: null,
  linkedConceptId: null,
  extractionConfidence: null,
  matchSimilarity: null,
  conceptHint: null,
  keywords: ['closure'],
};

describe('save learning store', () => {
  it('clears candidate save errors on retry', () => {
    useSaveLearningStore.getState().reset();
    useSaveLearningStore.getState().setCandidates([candidate]);
    useSaveLearningStore
      .getState()
      .setCandidateSaveState('candidate-0', { state: 'failed', error: 'db failed' });

    useSaveLearningStore
      .getState()
      .setCandidateSaveState('candidate-0', { state: 'saving', error: null });

    expect(useSaveLearningStore.getState().saveStates['candidate-0']).toMatchObject({
      state: 'saving',
      error: null,
    });
  });
});
