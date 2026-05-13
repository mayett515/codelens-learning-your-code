import { create } from 'zustand';
import type { ChatId, ChatMessage } from '../../../domain/types';
import type { LearningCaptureId } from '../types/ids';
import type { SaveModalCandidateData, CandidateSaveState } from '../types/saveModal';
import type { SaveCandidateSource } from '../services/prepareSaveCandidates';

type Phase = 'idle' | 'extracting' | 'reviewing' | 'error';

export interface CandidateCorrectionDraft {
  correctedTypeNodeId: string | null;
  reason: string;
  newTypeLabel: string;
}

interface CandidateSaveStatus {
  state: CandidateSaveState;
  captureId: LearningCaptureId | null;
  error: string | null;
}

interface SaveLearningStore {
  visible: boolean;
  snippet: string;
  sourceChatId: ChatId | null;
  sourceMessageId: string | null;
  source: SaveCandidateSource | null;
  phase: Phase;
  candidates: SaveModalCandidateData[];
  correctionDrafts: Record<string, CandidateCorrectionDraft>;
  saveStates: Record<string, CandidateSaveStatus>;
  inspectingCandidateId: string | null;
  error: string | null;

  open: (message: ChatMessage, chatId: ChatId) => void;
  openFromSource: (source: SaveCandidateSource) => void;
  close: () => void;
  setPhase: (phase: Phase) => void;
  setCandidates: (candidates: SaveModalCandidateData[]) => void;
  setCandidateSaveState: (
    candidateId: string,
    status: Partial<CandidateSaveStatus>,
  ) => void;
  setCandidateCorrection: (
    candidateId: string,
    patch: Partial<CandidateCorrectionDraft>,
  ) => void;
  inspectCandidate: (candidateId: string | null) => void;
  editCandidateTitle: (candidateId: string, title: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

function freshState() {
  return {
    visible: false,
    snippet: '',
    sourceChatId: null as ChatId | null,
    sourceMessageId: null as string | null,
    source: null as SaveCandidateSource | null,
    phase: 'idle' as Phase,
    candidates: [] as SaveModalCandidateData[],
    correctionDrafts: {} as Record<string, CandidateCorrectionDraft>,
    saveStates: {} as Record<string, CandidateSaveStatus>,
    inspectingCandidateId: null as string | null,
    error: null as string | null,
  };
}

function candidateId(index: number): string {
  return `candidate-${index}`;
}

export const useSaveLearningStore = create<SaveLearningStore>((set) => ({
  ...freshState(),

  open: (message, chatId) =>
    set({
      visible: true,
      snippet: message.content,
      sourceChatId: chatId,
      sourceMessageId: message.id,
      source: {
        selectedText: message.content,
        chatMessageId: message.id,
        sessionId: chatId,
      },
      phase: 'extracting',
      candidates: [],
      correctionDrafts: {},
      saveStates: {},
      inspectingCandidateId: null,
      error: null,
    }),

  openFromSource: (source) =>
    set({
      visible: true,
      snippet: source.selectedText,
      sourceChatId: null,
      sourceMessageId: source.chatMessageId ?? null,
      source,
      phase: 'extracting',
      candidates: [],
      correctionDrafts: {},
      saveStates: {},
      inspectingCandidateId: null,
      error: null,
    }),

  close: () => set(freshState()),

  setPhase: (phase) => set({ phase }),

  setCandidates: (candidates) =>
    set({
      candidates,
      correctionDrafts: Object.fromEntries(
        candidates.map((candidate, index) => [
          candidateId(index),
          {
            correctedTypeNodeId: candidate.conceptHint?.proposedConceptType ?? null,
            reason: '',
            newTypeLabel: '',
          },
        ]),
      ),
      saveStates: Object.fromEntries(
        candidates.map((_, index) => [
          candidateId(index),
          { state: 'idle', captureId: null, error: null },
        ]),
      ),
    }),

  setCandidateSaveState: (id, status) =>
    set((state) => ({
      saveStates: {
        ...state.saveStates,
        [id]: {
          state: 'state' in status ? status.state ?? 'idle' : state.saveStates[id]?.state ?? 'idle',
          captureId: 'captureId' in status
            ? status.captureId ?? null
            : state.saveStates[id]?.captureId ?? null,
          error: 'error' in status ? status.error ?? null : state.saveStates[id]?.error ?? null,
        },
      },
    })),

  setCandidateCorrection: (id, patch) =>
    set((state) => ({
      correctionDrafts: {
        ...state.correctionDrafts,
        [id]: {
          correctedTypeNodeId: state.correctionDrafts[id]?.correctedTypeNodeId ?? null,
          reason: state.correctionDrafts[id]?.reason ?? '',
          newTypeLabel: state.correctionDrafts[id]?.newTypeLabel ?? '',
          ...patch,
        },
      },
    })),

  inspectCandidate: (candidateId) => set({ inspectingCandidateId: candidateId }),

  editCandidateTitle: (id, title) =>
    set((state) => {
      const index = Number(id.replace('candidate-', ''));
      if (!Number.isInteger(index) || !state.candidates[index]) return {};

      const candidates = state.candidates.map((candidate, candidateIndex) =>
        candidateIndex === index ? { ...candidate, title } : candidate,
      );
      return { candidates };
    }),

  setError: (error) => set({ error, phase: 'error' }),

  reset: () => set(freshState()),
}));

export type { CandidateSaveStatus };
