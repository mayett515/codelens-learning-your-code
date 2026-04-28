import { describe, expect, it } from 'vitest';
import {
  findLayerForLine,
  getPrimaryInspectorTarget,
  parseSandboxModelOutput,
  resolveInspectorTarget,
} from '../engine';

describe('sandbox chat engine', () => {
  it('parses the codelens chat contract from a fenced model response', () => {
    const output = parseSandboxModelOutput(`
Visible answer.

\`\`\`codelens-chat-engine
{
  "prose": "Click the import line.",
  "codeArtifacts": [
    {
      "id": "artifact",
      "title": "Example.tsx",
      "language": "tsx",
      "code": "import { Text } from 'react-native';\\nexport const Label = () => <Text />;",
      "layers": [
        {
          "id": "imports",
          "kind": "imports",
          "title": "Imports",
          "summary": "Imports primitives.",
          "detail": "The import decides which platform primitive renders text.",
          "lineStart": 1,
          "lineEnd": 1
        }
      ]
    }
  ],
  "terms": [
    {
      "id": "contract",
      "label": "contract",
      "summary": "Structured model output.",
      "detail": "The UI reads this instead of guessing.",
      "promptHook": "Emit the contract."
    }
  ],
  "calculations": []
}
\`\`\`
`);

    expect(output.prose).toBe('Click the import line.');
    expect(output.codeArtifacts).toHaveLength(1);
    expect(output.terms[0]?.label).toBe('contract');
    expect(findLayerForLine(output.codeArtifacts[0]!, 1)?.id).toBe('imports');
    expect(findLayerForLine(output.codeArtifacts[0]!, 2)).toBeNull();
  });

  it('falls back to plain prose when no contract is present', () => {
    const output = parseSandboxModelOutput('plain chat answer');

    expect(output.prose).toBe('plain chat answer');
    expect(output.codeArtifacts).toEqual([]);
    expect(output.terms).toEqual([]);
  });

  it('resolves the first code layer as the default inspector target', () => {
    const output = parseSandboxModelOutput(`
\`\`\`json
{
  "prose": "x",
  "codeArtifacts": [
    {
      "id": "a",
      "title": "A.ts",
      "language": "ts",
      "code": "const a = 1;",
      "layers": [
        {
          "id": "surface",
          "kind": "surface",
          "title": "Surface",
          "summary": "Visible code.",
          "detail": "A constant is declared.",
          "lineStart": 1,
          "lineEnd": 1
        }
      ]
    }
  ],
  "terms": [],
  "calculations": []
}
\`\`\`
`);

    const target = getPrimaryInspectorTarget(output);
    expect(target).toEqual({ type: 'layer', artifactId: 'a', layerId: 'surface' });
    expect(target && resolveInspectorTarget(output, target)?.id).toBe('surface');
  });
});
