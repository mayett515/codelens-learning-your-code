import type { InjectionResult, RetrieveDiagnostics, RetrieveOptions, RetrieveResult, RetrievedMemory } from '../../retrieval/types/retrieval';

export type InjectionMode = 'conservative' | 'standard' | 'aggressive';
export type PerTurnDefault = 'on' | 'off';
export type DotConnectorIndicatorStatus = 'idle' | 'loading' | 'ok' | 'partial' | 'unavailable' | 'disabled';

export interface DotConnectorSettings {
  enableDotConnector: boolean;
  injectionMode: InjectionMode;
  dotConnectorPerTurnDefault: PerTurnDefault;
}

export interface DotConnectorModeConfig {
  limit: number;
  tokenBudget: number;
}

export interface TypingRetrievalSnapshot {
  query: string;
  result: RetrieveResult;
  injection: InjectionResult;
  createdAt: number;
}

export interface SendInjectionInput {
  query: string;
  settings: DotConnectorSettings;
  perTurnEnabled: boolean;
  removedMemoryIds?: string[] | undefined;
  typingSnapshot?: TypingRetrievalSnapshot | null | undefined;
  retrieve?: (opts: RetrieveOptions) => Promise<RetrieveResult>;
  bumpLastAccessed?: ((items: Array<{ kind: 'capture' | 'concept'; id: string }>) => Promise<void>) | undefined;
  now?: () => number;
}

export interface SendInjectionResult {
  memories: RetrievedMemory[];
  injection: InjectionResult | null;
  diagnostics: RetrieveDiagnostics | null;
  reusedTypingResult: boolean;
}

export interface MemoryPreviewState {
  memories: RetrievedMemory[];
  diagnostics: RetrieveDiagnostics | null;
  injection: InjectionResult;
  maxItems: number;
}
