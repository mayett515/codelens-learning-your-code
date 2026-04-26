import { create } from 'zustand';
import type { ChatId, ChatMessage } from '../../../domain/types';
import type { LearningCaptureId } from '../types/ids';
import type { SaveModalCandidateData, CandidateSaveState } from '../types/saveModal';

type Phase = 'idle' | 'extracting' | 'reviewing' | 'error';

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
  phase: Phase;
  candidates: SaveModalCandidateData[];
  saveStates: Record<string, CandidateSaveStatus>;
  inspectingCandidateId: string | null;
  error: string | null;

  open: (message: ChatMessage, chatId: ChatId) => void;
  close: () => void;
  setPhase: (phase: Phase) => void;
  setCandidates: (candidates: SaveModalCandidateData[]) => void;
  setCandidateSaveState: (
    candidateId: string,
    status: Partial<CandidateSaveStatus>,
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
    phase: 'idle' as Phase,
    candidates: [] as SaveModalCandidateData[],
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
      phase: 'extracting',
      candidates: [],
      saveStates: {},
      inspectingCandidateId: null,
      error: null,
    }),

  close: () => set(freshState()),

  setPhase: (phase) => set({ phase }),

  setCandidates: (candidates) =>
    set({
      candidates,
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
