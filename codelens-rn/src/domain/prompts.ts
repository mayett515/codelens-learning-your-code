import type { LineMark, RangeMark } from './types';
import { getLineMarkInfo } from './marker';

export function buildSectionSystemPrompt(
  filePath: string,
  codeSnippet: string,
  startLine: number,
  endLine: number,
  marks: LineMark[],
  ranges: RangeMark[],
): string {
  const lines = codeSnippet.split('\n');
  const annotated = lines.map((text, i) => {
    const lineNum = startLine + i;
    const info = getLineMarkInfo(marks, ranges, lineNum);
    const prefix = `${lineNum}`;
    if (info && info.isDirectMark && info.isOverlap) {
      return `${prefix} [FOCUS] ${text}`;
    }
    return `${prefix} ${text}`;
  }).join('\n');

  return `You are a code tutor helping someone learn by reading code on their phone. Be concise — they're on a small screen.

File: ${filePath}
Lines ${startLine}–${endLine}:
\`\`\`
${annotated}
\`\`\`

Lines marked [FOCUS] are ones the user specifically highlighted for discussion. Pay extra attention to those.

Answer questions about this code. Explain clearly. Use short paragraphs.`;
}

export function buildGeneralSystemPrompt(): string {
  return `You are a helpful coding assistant. The user is learning programming by reading code on their phone. Be concise and clear — they're on a small screen. Use short paragraphs and code blocks when helpful.`;
}
