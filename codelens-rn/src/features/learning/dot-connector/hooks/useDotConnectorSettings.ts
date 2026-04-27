import { create } from 'zustand';
import { DEFAULT_DOT_CONNECTOR_SETTINGS, parseDotConnectorSettings } from '../services/dotConnectorSettings';
import type { DotConnectorSettings } from '../types/dotConnector';

interface DotConnectorSettingsStore {
  settings: DotConnectorSettings;
  updateSettings: (patch: Partial<DotConnectorSettings>) => void;
}

const useDotConnectorSettingsStore = create<DotConnectorSettingsStore>((set) => ({
  settings: DEFAULT_DOT_CONNECTOR_SETTINGS,
  updateSettings: (patch) =>
    set((state) => ({
      settings: parseDotConnectorSettings({ ...state.settings, ...patch }),
    })),
}));

export function useDotConnectorSettings(): DotConnectorSettings {
  return useDotConnectorSettingsStore((state) => state.settings);
}

export function useUpdateDotConnectorSettings() {
  return useDotConnectorSettingsStore((state) => state.updateSettings);
}
