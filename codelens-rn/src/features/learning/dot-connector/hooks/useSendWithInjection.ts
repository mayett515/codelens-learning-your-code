import { useCallback, useState } from 'react';
import { runSendInjection } from '../services/runSendInjection';
import type { DotConnectorSettings, SendInjectionResult, TypingRetrievalSnapshot } from '../types/dotConnector';
import type { RetrieveFilters } from '../../retrieval/types/retrieval';

export function useSendWithInjection(
  settings: DotConnectorSettings,
  filters?: RetrieveFilters | undefined,
) {
  const [lastResult, setLastResult] = useState<SendInjectionResult | null>(null);

  const prepareSend = useCallback(
    async (input: {
      query: string;
      perTurnEnabled: boolean;
      typingSnapshot?: TypingRetrievalSnapshot | null;
      removedMemoryIds?: string[];
    }): Promise<SendInjectionResult> => {
      const result = await runSendInjection({
        query: input.query,
        settings,
        perTurnEnabled: input.perTurnEnabled,
        filters,
        typingSnapshot: input.typingSnapshot,
        removedMemoryIds: input.removedMemoryIds,
      });
      setLastResult(result);
      return result;
    },
    [settings, filters],
  );

  return { prepareSend, lastResult };
}
