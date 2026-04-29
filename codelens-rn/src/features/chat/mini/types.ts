import type { ChatCodeContext } from '../promptComposition/types';

export interface MiniChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  isError?: boolean | undefined;
}

export interface MiniChatSaveContext {
  lineRef: ChatCodeContext;
  history: MiniChatMessage[];
  selectedMessageId: string;
}
