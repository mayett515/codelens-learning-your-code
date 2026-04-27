import { create } from 'zustand';
import { DEFAULT_REVIEW_SETTINGS, parseReviewSettings } from '../services/reviewSettings';
import type { ReviewSettings } from '../types/review';

interface ReviewSettingsStore {
  settings: ReviewSettings;
  updateSettings: (patch: Partial<ReviewSettings>) => void;
}

const useReviewSettingsStore = create<ReviewSettingsStore>((set) => ({
  settings: DEFAULT_REVIEW_SETTINGS,
  updateSettings: (patch) =>
    set((state) => ({
      settings: parseReviewSettings({ ...state.settings, ...patch }),
    })),
}));

export function useReviewSettings(): ReviewSettings {
  return useReviewSettingsStore((state) => state.settings);
}

export function useUpdateReviewSettings() {
  return useReviewSettingsStore((state) => state.updateSettings);
}
