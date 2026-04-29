import { describe, expect, it } from 'vitest';
import {
  findLayerForLine,
  getPrimaryInspectorTarget,
  hasBlockingContractDiagnostics,
  parseSandboxModelOutput,
  resolveInspectorTarget,
} from '../engine';
import {
  buildSandboxAiMessages,
  buildSandboxSystemPrompt,
  requestSandboxModelOutput,
} from '../modelAdapter';
import type { ChatScope } from '../../../domain/types';

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
    expect(output.diagnostics[0]?.id).toBe('missing-contract');
  });

  it('reports invalid contract json instead of silently losing it', () => {
    const output = parseSandboxModelOutput(`
Visible answer.

\`\`\`codelens-chat-engine
{ "prose": "broken",
\`\`\`
`);

    expect(output.prose).toBe('Visible answer.');
    expect(output.diagnostics[0]?.id).toBe('invalid-json');
    expect(output.diagnostics[0]?.level).toBe('error');
  });

  it('parses bare trailing json but reports that the fence is missing', () => {
    const output = parseSandboxModelOutput(`
Answer text.

{ "prose": "x", "codeArtifacts": [], "terms": [], "calculations": [] }
`);

    expect(output.prose).toBe('x');
    expect(output.diagnostics[0]?.id).toBe('bare-json-contract');
    expect(hasBlockingContractDiagnostics(output)).toBe(true);
  });

  it('drops invalid contract pieces and keeps diagnostics', () => {
    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
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
          "id": "bad",
          "kind": "unknown",
          "title": "Bad",
          "summary": "Bad kind.",
          "detail": "This should be dropped.",
          "lineStart": 1,
          "lineEnd": 1
        }
      ]
    }
  ],
  "terms": [{ "id": "missing-fields" }],
  "calculations": []
}
\`\`\`
`);

    expect(output.codeArtifacts[0]?.layers).toEqual([]);
    expect(output.terms).toEqual([]);
    expect(output.diagnostics.map((item) => item.id)).toContain(
      'invalid-layer-kind-a-bad',
    );
    expect(output.diagnostics.map((item) => item.id)).toContain(
      'invalid-term-0',
    );
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

  it('builds model messages with the sandbox contract', () => {
    const messages = buildSandboxAiMessages('make inspectable chat code');

    expect(messages[0]?.role).toBe('system');
    expect(messages[0]?.content).toContain('codelens-chat-engine');
    expect(messages[0]?.content).toContain('You are the AI assistant inside CodeLens');
    expect(messages[0]?.content).toContain('Selected code from the file');
    expect(messages[1]).toEqual({
      role: 'user',
      content: 'make inspectable chat code',
    });
  });

  it('layers the sandbox contract on top of the real CodeLens prompt', () => {
    const prompt = buildSandboxSystemPrompt();

    expect(prompt).toContain('You are the AI assistant inside CodeLens');
    expect(prompt).toContain('File: skeleton.js');
    expect(prompt).toContain('Sandbox renderer contract');
    expect(prompt).toContain('codelens-chat-engine');
  });

  it('can generate a local contract response without a provider', async () => {
    const response = await requestSandboxModelOutput({
      prompt: 'test prompt',
      mode: 'local-contract',
    });

    expect(response.raw).toContain('```codelens-chat-engine');
    expect(response.parsed.codeArtifacts.length).toBeGreaterThan(0);
    expect(response.parsed.terms.map((term) => term.id)).toContain(
      'schema-cache',
    );
  });

  it('repairs configured model output once when the contract is malformed', async () => {
    const calls: string[][] = [];
    const enqueueCompletion = async (
      _scope: ChatScope,
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    ) => {
      calls.push(messages.map((message) => message.content));
      if (calls.length === 1) {
        return 'Plain answer without a contract';
      }

      return `
\`\`\`codelens-chat-engine
{
  "prose": "Fixed.",
  "codeArtifacts": [],
  "terms": [
    {
      "id": "schema-cache",
      "label": "schema cache",
      "summary": "Cache term.",
      "detail": "Cache detail.",
      "promptHook": "Ask about cache invalidation."
    }
  ],
  "calculations": []
}
\`\`\`
`;
    };

    const response = await requestSandboxModelOutput({
      prompt: 'Does this cache go stale?',
      mode: 'configured-model',
      enqueueCompletion,
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]?.at(-1)).toContain('Repair the previous answer');
    expect(response.parsed.prose).toBe('Fixed.');
    expect(response.parsed.terms[0]?.id).toBe('schema-cache');
  });
});
