import { CODE_CONTEXT_TEXT_LIMIT } from '../promptComposition/constants';
import type { ChatCodeContext } from '../promptComposition/types';

const MINI_CHAT_CONTEXT_LIMIT = 300;

export function buildLineRef(input: {
  content: string;
  filePath: string;
  lineNumber: number;
  language?: string | null | undefined;
  contextRadius?: number | undefined;
}): ChatCodeContext {
  const lines = input.content.split('\n');
  const lineNumber = clamp(input.lineNumber, 1, Math.max(1, lines.length));
  const contextRadius = input.contextRadius ?? 5;
  const lineText = lines[lineNumber - 1] ?? '';
  const beforeStart = Math.max(0, lineNumber - 1 - contextRadius);
  const before = lines.slice(beforeStart, lineNumber - 1).join('\n');
  const after = lines.slice(lineNumber, lineNumber + contextRadius).join('\n');

  return {
    kind: 'line_anchor',
    text: lineText.slice(0, CODE_CONTEXT_TEXT_LIMIT),
    filePath: input.filePath,
    startLine: lineNumber,
    endLine: lineNumber,
    language: input.language ?? null,
    precedingLines: before.slice(0, MINI_CHAT_CONTEXT_LIMIT) || null,
    followingLines: after.slice(0, MINI_CHAT_CONTEXT_LIMIT) || null,
  };
}

export function toExpandedMiniChatContext(lineRef: ChatCodeContext): ChatCodeContext {
  return {
    ...lineRef,
    kind: 'expanded_mini_chat',
    text: lineRef.text.slice(0, CODE_CONTEXT_TEXT_LIMIT),
    precedingLines: lineRef.precedingLines?.slice(0, MINI_CHAT_CONTEXT_LIMIT) ?? null,
    followingLines: lineRef.followingLines?.slice(0, MINI_CHAT_CONTEXT_LIMIT) ?? null,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.floor(value);
}
