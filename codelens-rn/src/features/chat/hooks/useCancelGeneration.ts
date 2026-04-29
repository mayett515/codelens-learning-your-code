import { useCallback, useRef, useState } from 'react';

export interface UseCancelGenerationApi {
  startGeneration: () => AbortSignal;
  stopGenerating: () => void;
  clearGeneration: () => void;
  isGenerationInFlight: boolean;
}

export interface CancelGenerationController {
  startGeneration: () => AbortSignal;
  stopGenerating: () => void;
  clearGeneration: () => void;
  getCurrentSignal: () => AbortSignal | null;
}

export function createCancelGenerationController(
  onGenerationInFlightChange: (isGenerationInFlight: boolean) => void,
): CancelGenerationController {
  let controller: AbortController | null = null;

  return {
    startGeneration: () => {
      controller?.abort();
      controller = new AbortController();
      onGenerationInFlightChange(true);
      return controller.signal;
    },
    stopGenerating: () => {
      controller?.abort();
      controller = null;
      onGenerationInFlightChange(false);
    },
    clearGeneration: () => {
      controller = null;
      onGenerationInFlightChange(false);
    },
    getCurrentSignal: () => controller?.signal ?? null,
  };
}

export function useCancelGeneration(): UseCancelGenerationApi {
  const [isGenerationInFlight, setIsGenerationInFlight] = useState(false);
  const controllerRef = useRef<CancelGenerationController | null>(null);

  if (!controllerRef.current) {
    controllerRef.current = createCancelGenerationController(setIsGenerationInFlight);
  }

  const startGeneration = useCallback(
    () => controllerRef.current!.startGeneration(),
    [],
  );

  const stopGenerating = useCallback(
    () => controllerRef.current!.stopGenerating(),
    [],
  );

  const clearGeneration = useCallback(
    () => controllerRef.current!.clearGeneration(),
    [],
  );

  return { startGeneration, stopGenerating, clearGeneration, isGenerationInFlight };
}
