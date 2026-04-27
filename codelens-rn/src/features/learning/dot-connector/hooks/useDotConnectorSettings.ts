import { create } from 'zustand';
import { loadLearningSetting, saveLearningSetting } from '../../settingsStorage';
import { DEFAULT_DOT_CONNECTOR_SETTINGS, parseDotConnectorSettings } from '../services/dotConnectorSettings';
import type { DotConnectorSettings } from '../types/dotConnector';

const STORAGE_KEY = 'learning.dotConnector.settings.v1';

interface DotConnectorSettingsStore {
  settings: DotConnectorSettings;
  updateSettings: (patch: Partial<DotConnectorSettings>) => void;
}

const useDotConnectorSettingsStore = create<DotConnectorSettingsStore>((set) => ({
  settings: parseDotConnectorSettings(
    loadLearningSetting<Partial<DotConnectorSettings>>(STORAGE_KEY) ?? DEFAULT_DOT_CONNECTOR_SETTINGS,
  ),
  updateSettings: (patch) =>
    set((state) => {
      const settings = parseDotConnectorSettings({ ...state.settings, ...patch });
      saveLearningSetting(STORAGE_KEY, settings);
      return { settings };
    }),
}));

export function useDotConnectorSettings(): DotConnectorSettings {
  return useDotConnectorSettingsStore((state) => state.settings);
}

export function useUpdateDotConnectorSettings() {
  return useDotConnectorSettingsStore((state) => state.updateSettings);
}
