import { create } from 'zustand';
import { loadLearningSetting, saveLearningSetting } from '../../settingsStorage';
import { DEFAULT_REVIEW_SETTINGS, parseReviewSettings } from '../services/reviewSettings';
import type { ReviewSettings } from '../types/review';

const STORAGE_KEY = 'learning.review.settings.v1';

interface ReviewSettingsStore {
  settings: ReviewSettings;
  updateSettings: (patch: Partial<ReviewSettings>) => void;
}

const useReviewSettingsStore = create<ReviewSettingsStore>((set) => ({
  settings: parseReviewSettings(
    loadLearningSetting<Partial<ReviewSettings>>(STORAGE_KEY) ?? DEFAULT_REVIEW_SETTINGS,
  ),
  updateSettings: (patch) =>
    set((state) => {
      const settings = parseReviewSettings({ ...state.settings, ...patch });
      saveLearningSetting(STORAGE_KEY, settings);
      return { settings };
    }),
}));

export function useReviewSettings(): ReviewSettings {
  return useReviewSettingsStore((state) => state.settings);
}

export function useUpdateReviewSettings() {
  return useReviewSettingsStore((state) => state.updateSettings);
}
