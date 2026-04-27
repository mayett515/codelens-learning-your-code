import {
  OPENROUTER_DEFAULT_MODEL,
  SILICONFLOW_DEFAULT_MODEL,
} from '../../../ai/fallback';
import type { Provider } from '../../../domain/types';

export type ChatModelId = string & { readonly __brand: 'ChatModelId' };

export interface ChatModelOption {
  id: ChatModelId;
  displayName: string;
  provider: Provider;
  providerLabel?: string | undefined;
  model: string;
  pricingTier: 'free' | 'paid';
  description: string;
  isVisible: boolean;
  pickerOrder: number;
}

export const CHAT_MODEL_CATALOG: readonly ChatModelOption[] = [
  {
    id: 'cm_openrouter_default_flash' as ChatModelId,
    displayName: 'OpenRouter Default',
    provider: 'openrouter',
    providerLabel: 'OpenRouter',
    model: OPENROUTER_DEFAULT_MODEL,
    pricingTier: 'free',
    description: 'Default OpenRouter chat model for CodeLens.',
    isVisible: true,
    pickerOrder: 0,
  },
  {
    id: 'cm_siliconflow_qwen_7b' as ChatModelId,
    displayName: 'SiliconFlow Qwen 7B',
    provider: 'siliconflow',
    providerLabel: 'SiliconFlow',
    model: SILICONFLOW_DEFAULT_MODEL,
    pricingTier: 'free',
    description: 'Default SiliconFlow chat model for CodeLens.',
    isVisible: true,
    pickerOrder: 1,
  },
] as const;

export function getAvailableChatModels(): ChatModelOption[] {
  return [...CHAT_MODEL_CATALOG]
    .filter((row) => row.isVisible)
    .sort((a, b) => a.pickerOrder - b.pickerOrder || a.displayName.localeCompare(b.displayName));
}

export function getChatModelById(id: ChatModelId | string | null | undefined): ChatModelOption | null {
  if (!id) return null;
  return CHAT_MODEL_CATALOG.find((row) => row.id === id) ?? null;
}
