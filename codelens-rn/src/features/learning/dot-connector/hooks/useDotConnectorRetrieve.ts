import { useEffect, useRef, useState } from 'react';
import { DOT_CONNECTOR_DEBOUNCE_MS, runTypingRetrieval } from '../services/runTypingRetrieval';
import type { DotConnectorSettings, TypingRetrievalSnapshot } from '../types/dotConnector';

export function useDotConnectorRetrieve(
  queryText: string,
  settings: DotConnectorSettings,
  perTurnEnabled: boolean,
  removedMemoryIds: string[] = [],
) {
  const [snapshot, setSnapshot] = useState<TypingRetrievalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const trimmed = queryText.trim();
    if (!settings.enableDotConnector || !perTurnEnabled || trimmed.length < 3) {
      setIsLoading(false);
      setSnapshot(null);
      setError(null);
      return undefined;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      runTypingRetrieval({ query: trimmed, settings, removedMemoryIds })
        .then((next) => {
          if (generationRef.current !== generation) return;
          setSnapshot(next);
          setError(null);
        })
        .catch((nextError) => {
          if (generationRef.current !== generation) return;
          setSnapshot(null);
          setError(nextError instanceof Error ? nextError : new Error('Retrieval unavailable'));
        })
        .finally(() => {
          if (generationRef.current === generation) setIsLoading(false);
        });
    }, DOT_CONNECTOR_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [queryText, settings, perTurnEnabled, removedMemoryIds]);

  return {
    result: snapshot?.result ?? null,
    snapshot,
    isLoading,
    isFetching: isLoading,
    error,
  };
}
