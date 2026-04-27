import { z } from 'zod';
import type { DotConnectorModeConfig, DotConnectorSettings, InjectionMode } from '../types/dotConnector';

export const DotConnectorSettingsCodec = z.object({
  enableDotConnector: z.boolean().default(true),
  injectionMode: z.enum(['conservative', 'standard', 'aggressive']).default('standard'),
  dotConnectorPerTurnDefault: z.enum(['on', 'off']).default('on'),
});

export const DEFAULT_DOT_CONNECTOR_SETTINGS: DotConnectorSettings = {
  enableDotConnector: true,
  injectionMode: 'standard',
  dotConnectorPerTurnDefault: 'on',
};

export const INJECTION_MODE_CONFIG: Record<InjectionMode, DotConnectorModeConfig> = {
  conservative: { limit: 3, tokenBudget: 800 },
  standard: { limit: 5, tokenBudget: 1500 },
  aggressive: { limit: 8, tokenBudget: 2000 },
};

export function parseDotConnectorSettings(input: unknown): DotConnectorSettings {
  return DotConnectorSettingsCodec.parse({
    ...DEFAULT_DOT_CONNECTOR_SETTINGS,
    ...(typeof input === 'object' && input !== null ? input : {}),
  });
}

export function getInjectionModeConfig(mode: InjectionMode): DotConnectorModeConfig {
  return INJECTION_MODE_CONFIG[mode];
}
