import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getScopeConfig,
} from '../../ai/scopes';
import { secureStore } from '../../composition';
import type { Provider } from '../../domain/types';
import { colors } from '../../ui/theme';
import {
  makeSandboxAssistantMessage,
  makeSandboxUserMessage,
  requestSandboxModelOutput,
} from './modelAdapter';
import {
  getPrimaryInspectorTarget,
} from './engine';
import type {
  SandboxChatMessage,
  SandboxInspectorTarget,
  SandboxModelOutput,
  SandboxTermCategory,
} from './types';
import type { SandboxRequestMode } from './modelAdapter';
import { sandboxMessages } from './sampleData';

export type SandboxModelStatus = {
  provider: Provider;
  model: string;
  openrouterKeySet: boolean;
  siliconflowKeySet: boolean;
  loading: boolean;
};

const MAX_MESSAGES = 50;
const MODEL_REQUEST_TIMEOUT_MS = 45_000;

export function providerLabel(provider: Provider): string {
  return provider === 'openrouter' ? 'OpenRouter' : 'SiliconFlow';
}

export function canSendModelRequest(
  mode: SandboxRequestMode,
  status: SandboxModelStatus,
): boolean {
  if (mode !== 'configured-model') return true;
  if (status.loading) return false;
  if (!status.model.trim()) return false;
  return status.openrouterKeySet || status.siliconflowKeySet;
}

export function termCategoryColor(category: SandboxTermCategory, alpha: number): string {
  const base: Record<SandboxTermCategory, string> = {
    risk: colors.red,
    concept: colors.blue,
    api: colors.green,
    data: colors.purple,
    performance: colors.orange,
    test: colors.teal,
  };
  const hex = base[category] ?? colors.yellow;
  if (alpha >= 1) return hex;
  if (hex.length !== 7 || !hex.startsWith('#')) return colors.yellow;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function severityColor(severity: 'critical' | 'high' | 'medium' | 'low' | 'info'): string {
  switch (severity) {
    case 'critical':
      return colors.red;
    case 'high':
      return colors.red;
    case 'medium':
      return colors.orange;
    case 'low':
      return colors.yellow;
    case 'info':
      return colors.blue;
    default:
      return colors.textSecondary;
  }
}

export function useSandboxChat() {
  const assistantOutput = sandboxMessages.find((m: SandboxChatMessage) => m.parsed)?.parsed;
  const assistantMessageId = sandboxMessages.find((m: SandboxChatMessage) => m.parsed)?.id;

  const [messages, setMessages] = useState<SandboxChatMessage[]>(sandboxMessages);
  const [selectedOutput, setSelectedOutput] = useState<SandboxModelOutput | null>(
    assistantOutput ?? null,
  );
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    assistantMessageId ?? null,
  );
  const [target, setTarget] = useState<SandboxInspectorTarget | null>(
    assistantOutput ? getPrimaryInspectorTarget(assistantOutput) : null,
  );
  const [prompt, setPrompt] = useState(
    'Review this MCP schema-compressor skeleton for runtime bugs, cache risks, and lossy compression problems.',
  );
  const [mode, setMode] = useState<SandboxRequestMode>('local-contract');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [requestStatus, setRequestStatus] = useState('');
  const [modelStatus, setModelStatus] = useState<SandboxModelStatus>(() => {
    const general = getScopeConfig('general');
    return {
      provider: general.provider,
      model: general.models[general.provider],
      openrouterKeySet: false,
      siliconflowKeySet: false,
      loading: true,
    };
  });

  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOutRef = useRef(false);

  const refreshModelStatus = useCallback(async (): Promise<SandboxModelStatus> => {
    const general = getScopeConfig('general');
    setModelStatus((current) => ({
      ...current,
      provider: general.provider,
      model: general.models[general.provider],
      loading: true,
    }));

    const [openrouterKey, siliconflowKey] = await Promise.all([
      secureStore.getApiKey('openrouter'),
      secureStore.getApiKey('siliconflow'),
    ]);

    const next: SandboxModelStatus = {
      provider: general.provider,
      model: general.models[general.provider],
      openrouterKeySet: Boolean(openrouterKey?.trim()),
      siliconflowKeySet: Boolean(siliconflowKey?.trim()),
      loading: false,
    };
    setModelStatus(next);
    return next;
  }, []);

  useEffect(() => {
    void refreshModelStatus();
    return () => {
      abortRef.current?.abort();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [refreshModelStatus]);

  const handleSend = useCallback(
    async (overridePrompt?: string) => {
      const trimmed = (overridePrompt ?? prompt).trim();
      if (!trimmed || sending) return;

      if (messages.length >= MAX_MESSAGES) {
        setError('Session limit reached. Press Clear to start a new session.');
        setRequestStatus('');
        return;
      }

      let controller: AbortController | null = null;
      timedOutRef.current = false;
      let requestLabel =
        mode === 'configured-model'
          ? `Requesting ${providerLabel(modelStatus.provider)} / ${modelStatus.model}`
          : 'Building local contract';

      if (mode === 'configured-model') {
        const latestStatus = await refreshModelStatus();
        requestLabel = `Requesting ${providerLabel(latestStatus.provider)} / ${latestStatus.model}`;
        const hasAnyKey = latestStatus.openrouterKeySet || latestStatus.siliconflowKeySet;
        if (!hasAnyKey) {
          setError(
            'Model mode needs an OpenRouter or SiliconFlow API key. Save one in Settings, or use Local mode.',
          );
          return;
        }
        if (!latestStatus.model.trim()) {
          setError(
            `No model configured for ${providerLabel(latestStatus.provider)}. Check Settings.`,
          );
          return;
        }

        const activeKeySet =
          latestStatus.provider === 'openrouter'
            ? latestStatus.openrouterKeySet
            : latestStatus.siliconflowKeySet;
        if (!activeKeySet) {
          const otherProvider = latestStatus.provider === 'openrouter' ? 'SiliconFlow' : 'OpenRouter';
          requestLabel += ` (falling back to ${otherProvider})`;
        }

        controller = new AbortController();
        abortRef.current = controller;
        timeoutRef.current = setTimeout(() => {
          timedOutRef.current = true;
          controller?.abort();
        }, MODEL_REQUEST_TIMEOUT_MS);
      }

      setSending(true);
      if (mode !== 'configured-model') {
        setError('');
      }
      setRequestStatus(requestLabel);

      const userMessage = makeSandboxUserMessage(trimmed);
      setMessages((current) => [...current, userMessage]);

      try {
        const response = await requestSandboxModelOutput({
          prompt: trimmed,
          mode,
          signal: controller?.signal,
        });
        const assistantMessage = makeSandboxAssistantMessage(response);
        setMessages((current) => [...current, assistantMessage]);
        setSelectedOutput(response.parsed);
        setSelectedMessageId(assistantMessage.id);
        setTarget(getPrimaryInspectorTarget(response.parsed));
        if (!overridePrompt) {
          setPrompt('');
        }
      } catch (e) {
        if (timedOutRef.current) {
          setError('Model request timed out after 45 seconds. Check API key, provider, model, or network.');
        } else if (e instanceof Error && e.message === 'Aborted') {
          setError('Model request cancelled.');
        } else {
          setError(e instanceof Error ? e.message : 'Sandbox request failed');
        }
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        abortRef.current = null;
        // Clear refs before resetting UI state to prevent race
        timedOutRef.current = false;
        setRequestStatus('');
        setSending(false);
      }
    },
    [prompt, mode, modelStatus, messages.length, refreshModelStatus, sending],
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRequestStatus('Cancelling model request');
  }, []);

  const handleClear = useCallback(() => {
    const assistantOutput = sandboxMessages.find((m: SandboxChatMessage) => m.parsed)?.parsed;
    const assistantMessageId = sandboxMessages.find((m: SandboxChatMessage) => m.parsed)?.id;
    setMessages(sandboxMessages);
    setSelectedOutput(assistantOutput ?? null);
    setSelectedMessageId(assistantMessageId ?? null);
    setTarget(assistantOutput ? getPrimaryInspectorTarget(assistantOutput) : null);
    setError('');
    setRequestStatus('');
  }, []);

  return {
    messages,
    setMessages,
    selectedOutput,
    setSelectedOutput,
    selectedMessageId,
    setSelectedMessageId,
    target,
    setTarget,
    prompt,
    setPrompt,
    mode,
    setMode,
    sending,
    setSending,
    error,
    setError,
    requestStatus,
    setRequestStatus,
    modelStatus,
    setModelStatus,
    refreshModelStatus,
    handleSend,
    handleCancel,
    handleClear,
  };
}
