import { useCallback, useState } from 'react';
import { runSendInjection } from '../services/runSendInjection';
import type { DotConnectorSettings, SendInjectionResult, TypingRetrievalSnapshot } from '../types/dotConnector';

export function useSendWithInjection(settings: DotConnectorSettings) {
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
        typingSnapshot: input.typingSnapshot,
        removedMemoryIds: input.removedMemoryIds,
      });
      setLastResult(result);
      return result;
    },
    [settings],
  );

  return { prepareSend, lastResult };
}
