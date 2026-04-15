import { create } from 'zustand';
import type { SelectionState } from '../domain/types';

interface SelectionStore extends SelectionState {
  setStartLine: (line: number) => void;
  setEndLine: (line: number) => void;
  setLastClickedLine: (line: number) => void;
  toggleRangeSelectMode: () => void;
  reset: () => void;
}

const initialState: SelectionState = {
  isRangeSelectMode: false,
  startLine: null,
  endLine: null,
  lastClickedLine: null,
};

export const useSelectionStore = create<SelectionStore>((set) => ({
  ...initialState,
  setStartLine: (line) => set({ startLine: line }),
  setEndLine: (line) => set({ endLine: line }),
  setLastClickedLine: (line) => set({ lastClickedLine: line }),
  toggleRangeSelectMode: () =>
    set((s) => ({ isRangeSelectMode: !s.isRangeSelectMode })),
  reset: () => set(initialState),
}));
