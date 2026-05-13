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
  it('initializes and updates conceptualize correction drafts per candidate', () => {
    useSaveLearningStore.getState().reset();
    useSaveLearningStore.getState().setCandidates([
      {
        ...candidate,
        conceptHint: {
          proposedName: 'Closure',
          proposedNormalizedKey: 'closure',
          proposedConceptType: 'mechanism',
          extractionConfidence: 0.8,
          linkedConceptId: null,
          linkedConceptName: null,
          linkedConceptLanguages: null,
          isNewLanguageForExistingConcept: false,
        },
      },
    ]);

    expect(useSaveLearningStore.getState().correctionDrafts['candidate-0']).toMatchObject({
      correctedTypeNodeId: 'mechanism',
      reason: '',
      newTypeLabel: '',
    });

    useSaveLearningStore
      .getState()
      .setCandidateCorrection('candidate-0', { correctedTypeNodeId: 'pattern', reason: 'Reusable shape' });

    expect(useSaveLearningStore.getState().correctionDrafts['candidate-0']).toMatchObject({
      correctedTypeNodeId: 'pattern',
      reason: 'Reusable shape',
      newTypeLabel: '',
    });
  });

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
