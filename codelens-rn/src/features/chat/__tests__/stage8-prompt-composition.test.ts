import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BASE_CHAT_SYSTEM_PROMPT,
  CHAT_PROMPT_LAYER_SEPARATOR,
  MINI_CHAT_SYSTEM_PROMPT,
} from '../promptComposition/constants';
import {
  buildChatSystemPrompt,
  buildMiniChatSystemPrompt,
} from '../promptComposition/buildChatSystemPrompt';
import { buildCodeContextLayer } from '../promptComposition/buildCodeContextLayer';
import { getAvailableChatModels } from '../modelCatalog/catalog';
import type { Persona } from '../../personas/types/persona';
import type { LearningCaptureId } from '../../learning/types/ids';
import type { RetrievedMemory } from '../../learning/retrieval/types/retrieval';

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');

const persona: Pick<Persona, 'systemPromptLayer'> = {
  systemPromptLayer: 'Persona layer',
};

const memory: RetrievedMemory = {
  kind: 'capture',
  id: 'lc_123456789012345678901' as LearningCaptureId,
  score: 1,
  rrfScore: 1,
  vecScore: null,
  ftsScore: 0.9,
  recencyFactor: 1,
  strengthFactor: 0,
  tier: 'hot',
  payload: {
    id: 'lc_123456789012345678901' as LearningCaptureId,
    title: 'Saved thing',
    whatClicked: 'The callback closes over state.',
    whyItMattered: null,
    rawSnippet: 'const handler = () => value;',
    snippetLang: 'ts',
    snippetSourcePath: 'src/file.ts',
    snippetStartLine: 1,
    snippetEndLine: 1,
    state: 'unresolved',
    linkedConceptId: null,
    linkedConceptName: null,
    sessionId: null,
    createdAt: 1,
    lastAccessedAt: null,
    embeddingStatus: 'ready',
  },
};

describe('Stage 8 prompt composition foundation', () => {
  it('omits separators when only the base chat layer is present', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toBe(BASE_CHAT_SYSTEM_PROMPT);
    expect(prompt).not.toContain(CHAT_PROMPT_LAYER_SEPARATOR);
  });

  it('composes chat prompt layers in the locked order', () => {
    const prompt = buildChatSystemPrompt({
      persona,
      memories: [memory],
      codeContext: {
        kind: 'selected_code',
        text: 'const value = 1;',
        filePath: 'src/file.ts',
        startLine: 7,
        endLine: 7,
        language: 'ts',
      },
    });

    expect(prompt.indexOf(BASE_CHAT_SYSTEM_PROMPT)).toBeLessThan(prompt.indexOf('Persona layer'));
    expect(prompt.indexOf('Persona layer')).toBeLessThan(prompt.indexOf('Capture: Saved thing'));
    expect(prompt.indexOf('Capture: Saved thing')).toBeLessThan(
      prompt.indexOf('Selected code from the file the user is reading:'),
    );
    expect(prompt).toContain('File: src/file.ts · Lines 7-7');
  });

  it('caps code context text at 800 chars', () => {
    const layer = buildCodeContextLayer({
      kind: 'line_anchor',
      text: 'x'.repeat(820),
    });

    expect(layer).toContain('Code at the line the user asked about:');
    expect(layer).toContain('x'.repeat(800));
    expect(layer).not.toContain('x'.repeat(801));
  });

  it('includes line-anchor surrounding context when provided', () => {
    const layer = buildCodeContextLayer({
      kind: 'line_anchor',
      text: 'return total;',
      precedingLines: 'const total = add(a, b);',
      followingLines: '};',
    });

    expect(layer).toContain('Context before:');
    expect(layer).toContain('const total = add(a, b);');
    expect(layer).toContain('Context after:');
    expect(layer).toContain('};');
  });

  it('builds mini chat prompt without the full chat base or persona layers', () => {
    const prompt = buildMiniChatSystemPrompt({
      kind: 'line_anchor',
      text: 'return total;',
    });

    expect(prompt).toContain(MINI_CHAT_SYSTEM_PROMPT);
    expect(prompt).toContain('Code at the line the user asked about:');
    expect(prompt).not.toContain(BASE_CHAT_SYSTEM_PROMPT);
    expect(prompt).not.toContain('Persona layer');
  });

  it('returns visible model catalog rows in picker order', () => {
    const models = getAvailableChatModels();

    expect(models.length).toBeGreaterThan(0);
    expect(models.every((model) => model.isVisible)).toBe(true);
    expect(models.every((model) => model.pricingTier === 'free' || model.pricingTier === 'paid')).toBe(true);
    expect(models.every((model) => model.displayName.length > 0)).toBe(true);
    expect(models.map((model) => model.pickerOrder)).toEqual(
      [...models.map((model) => model.pickerOrder)].sort((a, b) => a - b),
    );
  });

  it('keeps Stage 8 chat prompt constants out of extractor files', () => {
    const extractorDir = path.join(repoRoot, 'src', 'features', 'learning', 'extractor');
    const offenders = fs.readdirSync(extractorDir)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter((file) => {
        const text = fs.readFileSync(path.join(extractorDir, file), 'utf8');
        return /BASE_CHAT_SYSTEM_PROMPT|features\/chat|features\\chat|personas/.test(text);
      });

    expect(offenders).toEqual([]);
  });
});
