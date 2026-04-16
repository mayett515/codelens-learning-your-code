import { create } from 'zustand';
import type { ChatId, ChatMessage, ConceptId } from '../../../domain/types';
import type { ExtractedConcept } from '../application/extract';
import type { RetrievalResult } from '../application/retrieve';

type Phase = 'idle' | 'extracting' | 'reviewing' | 'saving' | 'error';

export interface MergeSuggestion {
  conceptIndex: number;
  candidates: RetrievalResult[];
}

interface SaveLearningStore {
  visible: boolean;
  snippet: string;
  sourceChatId: ChatId | null;
  phase: Phase;
  extractedConcepts: ExtractedConcept[];
  extractedTitle: string;
  selectedIndices: Set<number>;
  mergeSuggestions: MergeSuggestion[];
  mergeTargets: Map<number, ConceptId>;
  error: string | null;

  open: (message: ChatMessage, chatId: ChatId) => void;
  close: () => void;
  setPhase: (phase: Phase) => void;
  setExtractionResult: (title: string, concepts: ExtractedConcept[]) => void;
  toggleConceptSelection: (index: number) => void;
  setMergeSuggestions: (suggestions: MergeSuggestion[]) => void;
  acceptMerge: (index: number, existingId: ConceptId) => void;
  rejectMerge: (index: number) => void;
  editSnippet: (snippet: string) => void;
  editTitle: (title: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

function freshState() {
  return {
    visible: false,
    snippet: '',
    sourceChatId: null as ChatId | null,
    phase: 'idle' as Phase,
    extractedConcepts: [] as ExtractedConcept[],
    extractedTitle: '',
    selectedIndices: new Set<number>(),
    mergeSuggestions: [] as MergeSuggestion[],
    mergeTargets: new Map<number, ConceptId>(),
    error: null as string | null,
  };
}

export const useSaveLearningStore = create<SaveLearningStore>((set) => ({
  ...freshState(),

  open: (message, chatId) =>
    set({
      visible: true,
      snippet: message.content,
      sourceChatId: chatId,
      phase: 'extracting',
      extractedConcepts: [],
      extractedTitle: '',
      selectedIndices: new Set<number>(),
      mergeSuggestions: [],
      mergeTargets: new Map<number, ConceptId>(),
      error: null,
    }),

  close: () => set(freshState()),

  setPhase: (phase) => set({ phase }),

  setExtractionResult: (title, concepts) =>
    set({
      extractedTitle: title,
      extractedConcepts: concepts,
      selectedIndices: new Set(concepts.map((_, i) => i)),
    }),

  toggleConceptSelection: (index) =>
    set((s) => {
      const next = new Set(s.selectedIndices);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { selectedIndices: next };
    }),

  setMergeSuggestions: (suggestions) => set({ mergeSuggestions: suggestions }),

  acceptMerge: (index, existingId) =>
    set((s) => {
      const next = new Map(s.mergeTargets);
      next.set(index, existingId);
      return { mergeTargets: next };
    }),

  rejectMerge: (index) =>
    set((s) => {
      const next = new Map(s.mergeTargets);
      next.delete(index);
      return { mergeTargets: next };
    }),

  editSnippet: (snippet) => set({ snippet }),

  editTitle: (title) => set({ extractedTitle: title }),

  setError: (error) => set({ error, phase: 'error' }),

  reset: () => set(freshState()),
}));
