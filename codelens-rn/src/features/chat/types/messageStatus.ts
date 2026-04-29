import type { ChatMessageStatus } from '../../../domain/types';
export type { ChatMessageStatus };

export const STOP_LABEL = '[Generation stopped]';
export const STOP_KEEP_THRESHOLD = 100;

export interface PartialResponseDecision {
  insertAssistant: boolean;
  content: string;
  status: ChatMessageStatus;
}

export function decidePartialResponse(receivedChars: number, partial: string): PartialResponseDecision {
  if (receivedChars <= 0) {
    return { insertAssistant: false, content: '', status: 'stopped' };
  }
  if (receivedChars < STOP_KEEP_THRESHOLD) {
    return { insertAssistant: true, content: STOP_LABEL, status: 'stopped' };
  }
  return {
    insertAssistant: true,
    content: `${partial}\n\n${STOP_LABEL}`,
    status: 'stopped',
  };
}

export function isAbortError(error: unknown): boolean {
  if (!error) return false;
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    if (error.message === 'Aborted') return true;
    if (/aborted/i.test(error.message)) return true;
  }
  return false;
}
