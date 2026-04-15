import { create } from 'zustand';
import type { MarkColor } from '../domain/types';

interface MarkColorStore {
  activeColor: MarkColor;
  setColor: (color: MarkColor) => void;
}

export const useMarkColorStore = create<MarkColorStore>((set) => ({
  activeColor: 'yellow',
  setColor: (color) => set({ activeColor: color }),
}));
