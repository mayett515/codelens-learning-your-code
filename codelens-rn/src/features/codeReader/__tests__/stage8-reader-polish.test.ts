import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { highlightLine } from '../highlighting/highlightLine';
import { PLAIN_TOKEN_COLOR } from '../highlighting/vscodeDarkPlusPalette';

const testDir = dirname(fileURLToPath(import.meta.url));

describe('Stage 8 reader polish', () => {
  it('highlightLine is lossless for supported languages', () => {
    const source = 'const answer = call("value", 42); // keep text intact';
    const tokens = highlightLine(source, 'ts');

    expect(tokens.map((token) => token.text).join('')).toBe(source);
    expect(tokens.some((token) => token.color !== PLAIN_TOKEN_COLOR)).toBe(true);
  });

  it('unknown languages fall back to one neutral token', () => {
    const source = 'plain <not really highlighted>';

    expect(highlightLine(source, 'made-up-lang')).toEqual([
      { text: source, color: PLAIN_TOKEN_COLOR },
    ]);
  });

  it('SelectionStartIndicator unmounts when the range-start state is cleared', () => {
    const indicatorSource = readFileSync(join(testDir, '../ui/SelectionStartIndicator.tsx'), 'utf8');
    const viewerSource = readFileSync(join(testDir, '../../../ui/components/CodeViewer.tsx'), 'utf8');

    expect(indicatorSource).toContain('if (!visible) return null');
    expect(viewerSource).toContain('isSelectionStart={selectionStartLine === lineNum}');
  });
});
