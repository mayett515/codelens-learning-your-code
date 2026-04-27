import { CODE_CONTEXT_TEXT_LIMIT } from './constants';
import type { ChatCodeContext } from './types';

const HEADERS: Record<ChatCodeContext['kind'], string> = {
  selected_code: 'Selected code from the file the user is reading:',
  line_anchor: 'Code at the line the user asked about:',
  expanded_mini_chat: 'Code context from the conversation the user just had:',
};

export function buildCodeContextLayer(context: ChatCodeContext | null | undefined): string {
  if (!context) return '';
  const text = context.text.trim();
  if (!text) return '';

  const header = HEADERS[context.kind];
  const metadata = buildMetadataLine(context);
  const lang = context.language?.trim() || '';
  const fenceHeader = lang ? `\`\`\`${lang}` : '```';
  const capped = text.slice(0, CODE_CONTEXT_TEXT_LIMIT);
  const preceding = context.precedingLines?.trim().slice(0, 300) ?? '';
  const following = context.followingLines?.trim().slice(0, 300) ?? '';

  return [
    header,
    metadata,
    renderContextBlock('Context before:', preceding, fenceHeader),
    fenceHeader,
    capped,
    '```',
    renderContextBlock('Context after:', following, fenceHeader),
  ].filter((line) => line !== '').join('\n');
}

function buildMetadataLine(context: ChatCodeContext): string {
  const filePath = context.filePath?.trim();
  const hasStart = typeof context.startLine === 'number';
  const hasEnd = typeof context.endLine === 'number';
  if (!filePath && !hasStart && !hasEnd) return '';

  const lineLabel = hasStart && hasEnd
    ? `${context.startLine}-${context.endLine}`
    : hasStart
      ? String(context.startLine)
      : hasEnd
        ? String(context.endLine)
        : '';
  if (filePath && lineLabel) return `File: ${filePath} · Lines ${lineLabel}`;
  if (filePath) return `File: ${filePath}`;
  return `Lines: ${lineLabel}`;
}

function renderContextBlock(label: string, text: string, fenceHeader: string): string {
  if (!text) return '';
  return [label, fenceHeader, text, '```'].join('\n');
}
