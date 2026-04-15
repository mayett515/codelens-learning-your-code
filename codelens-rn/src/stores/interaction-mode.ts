import { create } from 'zustand';
import type { CodeInteractionMode } from '../domain/types';

interface InteractionModeStore {
  mode: CodeInteractionMode;
  setMode: (mode: CodeInteractionMode) => void;
  toggleMode: () => void;
}

export const useInteractionModeStore = create<InteractionModeStore>((set) => ({
  mode: 'view',
  setMode: (mode) => set({ mode }),
  toggleMode: () =>
    set((s) => ({ mode: s.mode === 'view' ? 'mark' : 'view' })),
}));
