export const CODE_CONTEXT_INJECTION_CAP = 800;
export const CODE_CONTEXT_PREVIEW_CHAR_CAP = 400;
export const CODE_CONTEXT_PREVIEW_LINE_CAP = 5;

export interface SliceFromLinesInput {
  fileLines: string[];
  startLine: number;
  endLine: number;
}

export interface SlicedContext {
  text: string;
  startLine: number;
  endLine: number;
  truncated: boolean;
}

export function sliceCodeFromLines(input: SliceFromLinesInput): SlicedContext {
  const total = input.fileLines.length;
  if (total === 0) {
    return { text: '', startLine: 1, endLine: 1, truncated: false };
  }
  const startLine = clamp(input.startLine, 1, total);
  const endLine = clamp(Math.max(startLine, input.endLine), startLine, total);
  const raw = input.fileLines.slice(startLine - 1, endLine).join('\n');
  return capInjectionText(raw, startLine, endLine);
}

export function expandRange(input: {
  startLine: number;
  endLine: number;
  fileLineCount: number;
  before: number;
  after: number;
}): { startLine: number; endLine: number } {
  const total = Math.max(0, input.fileLineCount);
  if (total === 0) return { startLine: 1, endLine: 1 };
  const startLine = clamp(input.startLine - Math.max(0, input.before), 1, total);
  const endLine = clamp(
    Math.max(startLine, input.endLine + Math.max(0, input.after)),
    startLine,
    total,
  );
  return { startLine, endLine };
}

export interface PreviewBody {
  lines: string[];
  hiddenLineCount: number;
  charTruncated: boolean;
}

export function buildPreviewBody(text: string): PreviewBody {
  if (!text) return { lines: [], hiddenLineCount: 0, charTruncated: false };
  const allLines = text.split('\n');
  const visible = allLines.slice(0, CODE_CONTEXT_PREVIEW_LINE_CAP);
  const hiddenLineCount = Math.max(0, allLines.length - visible.length);

  let runningChars = 0;
  let charTruncated = false;
  const capped: string[] = [];

  for (const line of visible) {
    if (runningChars >= CODE_CONTEXT_PREVIEW_CHAR_CAP) {
      charTruncated = true;
      break;
    }
    const remaining = CODE_CONTEXT_PREVIEW_CHAR_CAP - runningChars;
    if (line.length <= remaining) {
      capped.push(line);
      runningChars += line.length + 1;
    } else {
      capped.push(line.slice(0, remaining));
      runningChars += remaining;
      charTruncated = true;
      break;
    }
  }

  return { lines: capped, hiddenLineCount, charTruncated };
}

export function inferLanguageFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const dot = path.lastIndexOf('.');
  if (dot === -1) return null;
  const ext = path.slice(dot + 1).toLowerCase();
  switch (ext) {
    case 'ts':
      return 'ts';
    case 'tsx':
      return 'tsx';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'js';
    case 'jsx':
      return 'jsx';
    case 'py':
      return 'py';
    case 'go':
      return 'go';
    case 'rs':
      return 'rs';
    case 'java':
      return 'java';
    case 'kt':
    case 'kts':
      return 'kt';
    case 'swift':
      return 'swift';
    case 'md':
    case 'markdown':
      return 'md';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'sh':
    case 'bash':
      return 'sh';
    case 'sql':
      return 'sql';
    case 'c':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'cs':
      return 'cs';
    case 'rb':
      return 'rb';
    case 'php':
      return 'php';
    default:
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function capInjectionText(text: string, startLine: number, endLine: number): SlicedContext {
  if (text.length <= CODE_CONTEXT_INJECTION_CAP) {
    return { text, startLine, endLine, truncated: false };
  }
  return {
    text: text.slice(0, CODE_CONTEXT_INJECTION_CAP),
    startLine,
    endLine,
    truncated: true,
  };
}
