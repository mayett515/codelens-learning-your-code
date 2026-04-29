import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MINI_CHAT_MAX_EXCHANGES, MINI_CHAT_SYSTEM_PROMPT } from '../promptComposition/constants';
import { BASE_CHAT_SYSTEM_PROMPT } from '../promptComposition/constants';
import { buildMiniChatSystemPrompt } from '../mini/buildMiniChatSystemPrompt';
import { buildLineRef, toExpandedMiniChatContext } from '../mini/buildLineRef';

const testDir = dirname(fileURLToPath(import.meta.url));

describe('Stage 8 mini chat', () => {
  it('buildMiniChatSystemPrompt uses only the mini prompt and code context layer', () => {
    const lineRef = buildLineRef({
      content: ['const first = 1;', 'const target = first + 1;', 'return target;'].join('\n'),
      filePath: 'src/example.ts',
      lineNumber: 2,
      language: 'ts',
    });

    const prompt = buildMiniChatSystemPrompt(lineRef);

    expect(prompt).toContain(MINI_CHAT_SYSTEM_PROMPT);
    expect(prompt).toContain('Code at the line the user asked about:');
    expect(prompt).toContain('const target = first + 1;');
    expect(prompt).not.toContain(BASE_CHAT_SYSTEM_PROMPT);
    expect(prompt).not.toContain('Capture:');
  });

  it('buildLineRef anchors one line and caps text plus surrounding context', () => {
    const longLine = 'x'.repeat(900);
    const longBefore = 'b'.repeat(350);
    const longAfter = 'a'.repeat(350);
    const lineRef = buildLineRef({
      content: [longBefore, longLine, longAfter].join('\n'),
      filePath: 'src/long.ts',
      lineNumber: 2,
      language: 'ts',
      contextRadius: 1,
    });

    expect(lineRef.kind).toBe('line_anchor');
    expect(lineRef.startLine).toBe(2);
    expect(lineRef.endLine).toBe(2);
    expect(lineRef.text).toHaveLength(800);
    expect(lineRef.precedingLines).toHaveLength(300);
    expect(lineRef.followingLines).toHaveLength(300);
  });

  it('expanded mini chat context preserves the original line reference metadata', () => {
    const lineRef = buildLineRef({
      content: 'let answer = 42;',
      filePath: 'src/answer.ts',
      lineNumber: 1,
      language: 'ts',
    });

    const expanded = toExpandedMiniChatContext(lineRef);

    expect(expanded.kind).toBe('expanded_mini_chat');
    expect(expanded.text).toBe(lineRef.text);
    expect(expanded.filePath).toBe(lineRef.filePath);
    expect(expanded.startLine).toBe(lineRef.startLine);
    expect(expanded.endLine).toBe(lineRef.endLine);
    expect(expanded.language).toBe(lineRef.language);
  });

  it('keeps mini chat capped at five exchanges and isolated from personas and Dot Connector', () => {
    const useMiniChatSource = readFileSync(join(testDir, '../mini/useMiniChat.ts'), 'utf8');
    const lineMiniChatSource = readFileSync(join(testDir, '../mini/LineMiniChat.tsx'), 'utf8');

    expect(MINI_CHAT_MAX_EXCHANGES).toBe(5);
    expect(useMiniChatSource).not.toContain('useDotConnector');
    expect(useMiniChatSource).not.toContain('persona');
    expect(useMiniChatSource).not.toContain('buildChatSystemPrompt');
    expect(useMiniChatSource).toContain('useCancelGeneration');
    expect(useMiniChatSource).toContain('signal');
    expect(useMiniChatSource).toContain('!message.isError');
    expect(useMiniChatSource).not.toContain('startsWith');
    expect(lineMiniChatSource).toContain('Continue this in the full chat');
    expect(lineMiniChatSource).toContain('Save what clicked');
    expect(lineMiniChatSource).toContain('StopGeneratingButton');
    expect(lineMiniChatSource).not.toContain('<Modal');
    expect(lineMiniChatSource).not.toContain('numberOfLines={3}');
  });

  it('wires mini chat cancel through AbortSignal without adding a failure row', () => {
    const useMiniChatSource = readFileSync(join(testDir, '../mini/useMiniChat.ts'), 'utf8');
    const lineMiniChatSource = readFileSync(join(testDir, '../mini/LineMiniChat.tsx'), 'utf8');

    expect(useMiniChatSource).toContain('const signal = startGeneration();');
    expect(useMiniChatSource).toContain("], signal);");
    expect(useMiniChatSource).toContain('if (isAbortError(err) || signal.aborted) {');
    expect(useMiniChatSource).toContain('return;');
    expect(useMiniChatSource).toContain('clearGeneration();');
    expect(lineMiniChatSource).toContain('miniChat.isGenerationInFlight ? (');
    expect(lineMiniChatSource).toContain('<StopGeneratingButton onPress={miniChat.stopGenerating} />');
  });
});
