export { dotConnectorKeys } from './data/queryKeys';
export { useDotConnectorRetrieve } from './hooks/useDotConnectorRetrieve';
export { useDotConnectorSettings, useUpdateDotConnectorSettings } from './hooks/useDotConnectorSettings';
export { useSendWithInjection } from './hooks/useSendWithInjection';
export { DotConnectorIndicator } from './ui/DotConnectorIndicator';
export { MemoryPreviewSheet } from './ui/MemoryPreviewSheet';
export { PerTurnToggle } from './ui/PerTurnToggle';
export {
  DEFAULT_DOT_CONNECTOR_SETTINGS,
  DOT_CONNECTOR_DEBOUNCE_MS,
  DOT_CONNECTOR_MIN_QUERY_LENGTH,
  getInjectionModeConfig,
  parseDotConnectorSettings,
  runSendInjection,
  runTypingRetrieval,
  SEND_RETRIEVAL_FRESHNESS_MS,
  SEND_RETRIEVAL_TIMEOUT_MS,
  sortPreviewMemories,
} from './services';
export type {
  DotConnectorIndicatorStatus,
  DotConnectorSettings,
  InjectionMode,
  MemoryPreviewState,
  SendInjectionResult,
  TypingRetrievalSnapshot,
} from './types/dotConnector';
