import { PLAIN_TOKEN_COLOR, VSCODE_DARK_PLUS_PALETTE } from './vscodeDarkPlusPalette';

export interface HighlightedToken {
  text: string;
  color: string;
}

type SupportedLang =
  | 'ts'
  | 'tsx'
  | 'js'
  | 'jsx'
  | 'py'
  | 'go'
  | 'rs'
  | 'java'
  | 'kt'
  | 'swift';

const TS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export',
  'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'is', 'keyof', 'let',
  'namespace', 'new', 'null', 'of', 'private', 'protected', 'public', 'readonly',
  'return', 'satisfies', 'set', 'static', 'super', 'switch', 'this', 'throw',
  'true', 'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'with',
  'yield',
]);

const JS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof',
  'let', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with',
  'yield',
]);

const PY_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
  'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global',
  'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass',
  'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

const GO_KEYWORDS = new Set([
  'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
  'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map',
  'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var',
  'true', 'false', 'nil',
]);

const RS_KEYWORDS = new Set([
  'as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else',
  'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop',
  'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static',
  'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
]);

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'false', 'final', 'finally', 'float', 'for', 'goto', 'if',
  'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
  'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'short',
  'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw',
  'throws', 'transient', 'true', 'try', 'void', 'volatile', 'while',
]);

const KT_KEYWORDS = new Set([
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if',
  'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this',
  'throw', 'true', 'try', 'typealias', 'val', 'var', 'when', 'while',
  'companion', 'data', 'enum', 'import', 'internal', 'lateinit', 'open',
  'override', 'private', 'protected', 'public', 'sealed', 'suspend',
]);

const SWIFT_KEYWORDS = new Set([
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func',
  'import', 'init', 'inout', 'internal', 'let', 'open', 'operator', 'private',
  'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript', 'typealias',
  'var', 'break', 'case', 'continue', 'default', 'defer', 'do', 'else',
  'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'switch',
  'where', 'while', 'as', 'catch', 'false', 'is', 'nil', 'self', 'Self', 'super',
  'throw', 'throws', 'true', 'try',
]);

const KEYWORDS_BY_LANG: Record<SupportedLang, Set<string>> = {
  ts: TS_KEYWORDS,
  tsx: TS_KEYWORDS,
  js: JS_KEYWORDS,
  jsx: JS_KEYWORDS,
  py: PY_KEYWORDS,
  go: GO_KEYWORDS,
  rs: RS_KEYWORDS,
  java: JAVA_KEYWORDS,
  kt: KT_KEYWORDS,
  swift: SWIFT_KEYWORDS,
};

const SLASH_COMMENT_LANGS = new Set<SupportedLang>([
  'ts', 'tsx', 'js', 'jsx', 'go', 'rs', 'java', 'kt', 'swift',
]);
const HASH_COMMENT_LANGS = new Set<SupportedLang>(['py']);

function isSupported(lang: string): lang is SupportedLang {
  return lang in KEYWORDS_BY_LANG;
}

function isIdStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

function isIdCont(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function readNumberEnd(text: string, start: number): number {
  let i = start;

  if (
    text[i] === '0'
    && (text[i + 1] === 'x' || text[i + 1] === 'X')
    && /[0-9a-fA-F]/.test(text[i + 2] ?? '')
  ) {
    i += 2;
    while (i < text.length && /[0-9a-fA-F]/.test(text[i]!)) i++;
    return i;
  }

  while (i < text.length && /[0-9_]/.test(text[i]!)) i++;

  if (text[i] === '.' && isDigit(text[i + 1] ?? '')) {
    i++;
    while (i < text.length && /[0-9_]/.test(text[i]!)) i++;
  }

  if (text[i] === 'e' || text[i] === 'E') {
    const exponentStart = i;
    i++;
    if (text[i] === '+' || text[i] === '-') i++;
    if (isDigit(text[i] ?? '')) {
      while (i < text.length && /[0-9_]/.test(text[i]!)) i++;
    } else {
      i = exponentStart;
    }
  }

  return i;
}

export function highlightLine(text: string, lang: string): HighlightedToken[] {
  if (!text) return [];
  if (!isSupported(lang)) {
    return [{ text, color: PLAIN_TOKEN_COLOR }];
  }
  return tokenize(text, lang);
}

function tokenize(text: string, lang: SupportedLang): HighlightedToken[] {
  const keywords = KEYWORDS_BY_LANG[lang];
  const tokens: HighlightedToken[] = [];
  let i = 0;
  let plainStart = -1;

  function flushPlain(end: number) {
    if (plainStart >= 0 && end > plainStart) {
      tokens.push({ text: text.slice(plainStart, end), color: PLAIN_TOKEN_COLOR });
    }
    plainStart = -1;
  }

  function pushColored(text: string, color: string) {
    tokens.push({ text, color });
  }

  while (i < text.length) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (SLASH_COMMENT_LANGS.has(lang) && ch === '/' && next === '/') {
      flushPlain(i);
      pushColored(text.slice(i), VSCODE_DARK_PLUS_PALETTE.comment);
      i = text.length;
      continue;
    }

    if (HASH_COMMENT_LANGS.has(lang) && ch === '#') {
      flushPlain(i);
      pushColored(text.slice(i), VSCODE_DARK_PLUS_PALETTE.comment);
      i = text.length;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      flushPlain(i);
      const start = i;
      const quote = ch;
      i++;
      while (i < text.length) {
        const inner = text[i]!;
        if (inner === '\\' && i + 1 < text.length) {
          i += 2;
          continue;
        }
        if (inner === quote) {
          i++;
          break;
        }
        i++;
      }
      pushColored(text.slice(start, i), VSCODE_DARK_PLUS_PALETTE.string);
      continue;
    }

    if (isDigit(ch)) {
      flushPlain(i);
      const start = i;
      i = readNumberEnd(text, i);
      pushColored(text.slice(start, i), VSCODE_DARK_PLUS_PALETTE.number);
      continue;
    }

    if (isIdStart(ch)) {
      flushPlain(i);
      const start = i;
      while (i < text.length && isIdCont(text[i]!)) i++;
      const word = text.slice(start, i);
      const color = keywords.has(word)
        ? VSCODE_DARK_PLUS_PALETTE.keyword
        : VSCODE_DARK_PLUS_PALETTE.identifier;
      pushColored(word, color);
      continue;
    }

    if (plainStart < 0) plainStart = i;
    i++;
  }

  flushPlain(i);
  return tokens;
}
