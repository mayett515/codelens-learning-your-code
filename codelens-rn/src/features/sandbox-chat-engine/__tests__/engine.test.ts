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

function validContract(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    prose: 'Click the import line.',
    codeArtifacts: [
      {
        id: 'artifact',
        title: 'Example.tsx',
        language: 'tsx',
        code: "import { Text } from 'react-native';\nexport const Label = () => <Text />;",
        layers: [
          {
            id: 'imports',
            kind: 'imports',
            title: 'Imports',
            summary: 'Imports primitives.',
            detail: 'The import decides which platform primitive renders text.',
            lineStart: 1,
            lineEnd: 1,
          },
        ],
      },
    ],
    terms: [
      {
        id: 'contract',
        label: 'contract',
        category: 'concept',
        spans: [{ proseOffset: 9, length: 8 }],
        summary: 'Structured model output.',
        detail: 'The UI reads this instead of guessing.',
        promptHook: 'Emit the contract.',
        relatedTermIds: [],
      },
    ],
    calculations: [],
    findings: [],
    ...overrides,
  };
}

describe('sandbox chat engine', () => {
  it('parses the codelens chat contract from a fenced model response', () => {
    const output = parseSandboxModelOutput(`
Visible answer.

\`\`\`codelens-chat-engine
${JSON.stringify(validContract(), null, 2)}
\`\`\`
`);

    expect(output.prose).toBe('Click the import line.');
    expect(output.version).toBe(1);
    expect(output.codeArtifacts).toHaveLength(1);
    expect(output.terms[0]?.label).toBe('contract');
    expect(output.terms[0]?.spans).toEqual([{ proseOffset: 9, length: 8 }]);
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

{ "prose": "x", "codeArtifacts": [], "terms": [], "calculations": [], "findings": [] }
`);

    expect(output.prose).toBe('x');
    expect(output.diagnostics[0]?.id).toBe('bare-json-contract');
    expect(hasBlockingContractDiagnostics(output)).toBe(true);
  });

  it('drops invalid contract pieces and keeps diagnostics', () => {
    const contract = validContract();
    (contract.codeArtifacts as any[])[0]!.layers = [
      {
        id: 'bad',
        kind: 'unknown',
        title: 'Bad',
        summary: 'Bad kind.',
        detail: 'This should be dropped.',
        lineStart: 1,
        lineEnd: 1,
      },
    ];
    contract.terms = [{ id: 'missing-fields' }] as any;

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.codeArtifacts[0]?.layers).toEqual([]);
    expect(output.terms).toEqual([]);
    expect(output.diagnostics.map((item) => item.id)).toContain(
      'invalid-layer-kind-artifact-bad',
    );
    expect(output.diagnostics.map((item) => item.id)).toContain(
      'invalid-term-0',
    );
  });

  it('resolves the first code layer as the default inspector target', () => {
    const output = parseSandboxModelOutput(`
\`\`\`json
${JSON.stringify(validContract(), null, 2)}
\`\`\`
`);

    const target = getPrimaryInspectorTarget(output);
    expect(target).toEqual({ type: 'layer', artifactId: 'artifact', layerId: 'imports' });
    expect(target && resolveInspectorTarget(output, target)?.id).toBe('imports');
  });

  it('resolves findings through resolveInspectorTarget', () => {
    const contract = validContract({
      findings: [
        {
          id: 'f1',
          severity: 'high',
          category: 'reliability',
          title: 'Test finding',
          description: 'A finding for testing.',
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    const resolved = resolveInspectorTarget(output, { type: 'finding', id: 'f1' });
    expect(resolved).not.toBeNull();
    expect((resolved as any).title).toBe('Test finding');
  });

  it('emits xr-006 when term span does not match label', () => {
    const contract = validContract({
      terms: [
        {
          id: 'mismatch',
          label: 'hello',
          category: 'concept',
          spans: [{ proseOffset: 0, length: 4 }], // "Clic" not "hello"
          summary: 'x',
          detail: 'x',
          relatedTermIds: [],
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-006-mismatch');
  });

  it('emits xr-005 when term span exceeds prose length', () => {
    const contract = validContract({
      terms: [
        {
          id: 'too-long',
          label: 'overflow',
          category: 'concept',
          spans: [{ proseOffset: 20, length: 999 }],
          summary: 'x',
          detail: 'x',
          relatedTermIds: [],
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-005-too-long');
  });

  it('emits xr-001 when relatedTermIds points to a missing term', () => {
    const contract = validContract({
      terms: [
        {
          id: 'orphan',
          label: 'orphan',
          category: 'concept',
          spans: [{ proseOffset: 0, length: 6 }],
          summary: 'x',
          detail: 'x',
          relatedTermIds: ['does-not-exist'],
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-001-orphan-does-not-exist');
  });

  it('emits xr-002 when finding termId points to a missing term', () => {
    const contract = validContract({
      findings: [
        {
          id: 'bad-link',
          severity: 'medium',
          category: 'bug',
          termId: 'missing-term',
          title: 'Bad link',
          description: 'Term does not exist.',
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-002-bad-link');
  });

  it('emits xr-003 when finding artifactId points to a missing artifact', () => {
    const contract = validContract({
      findings: [
        {
          id: 'bad-artifact',
          severity: 'low',
          category: 'maintainability',
          artifactId: 'ghost',
          title: 'Ghost artifact',
          description: 'Artifact does not exist.',
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-003-bad-artifact');
  });

  it('emits xr-004 when finding line range exceeds artifact lines', () => {
    const contract = validContract({
      findings: [
        {
          id: 'out-of-range',
          severity: 'info',
          category: 'design',
          artifactId: 'artifact',
          lineStart: 99,
          lineEnd: 100,
          title: 'Out of range',
          description: 'Lines do not exist.',
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-004-out-of-range');
  });

  it('emits xr-007 when layer line range exceeds artifact lines', () => {
    const contract = validContract({
      codeArtifacts: [
        {
          id: 'artifact',
          title: 'Example.tsx',
          language: 'tsx',
          code: 'const a = 1;',
          layers: [
            {
              id: 'too-long',
              kind: 'surface',
              title: 'Too long',
              summary: 'x',
              detail: 'x',
              lineStart: 1,
              lineEnd: 99,
            },
          ],
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-007-artifact-too-long');
  });

  it('emits xr-008 when duplicate ids exist in a collection', () => {
    const contract = validContract({
      terms: [
        {
          id: 'dup',
          label: 'dup-a',
          category: 'concept',
          spans: [{ proseOffset: 0, length: 5 }],
          summary: 'a',
          detail: 'a',
          relatedTermIds: [],
        },
        {
          id: 'dup',
          label: 'dup-b',
          category: 'risk',
          spans: [{ proseOffset: 0, length: 5 }],
          summary: 'b',
          detail: 'b',
          relatedTermIds: [],
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.diagnostics.map((d) => d.id)).toContain('xr-008-terms-dup');
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
    expect(response.parsed.version).toBe(1);
    expect(response.parsed.findings.length).toBeGreaterThan(0);
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
  "version": 1,
  "prose": "Fixed.",
  "codeArtifacts": [],
  "terms": [
    {
      "id": "schema-cache",
      "label": "schema cache",
      "category": "risk",
      "spans": [{ "proseOffset": 0, "length": 12 }],
      "summary": "Cache term.",
      "detail": "Cache detail.",
      "promptHook": "Ask about cache invalidation.",
      "relatedTermIds": []
    }
  ],
  "calculations": [],
  "findings": []
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

  it('validates new calculation shape with steps and conclusion', () => {
    const contract = validContract({
      calculations: [
        {
          id: 'calc-1',
          title: 'Token Budget',
          kind: 'tradeoff',
          steps: [
            { label: 'Original', value: 400, unit: 'tokens' },
            { label: 'Compressed', value: 180, unit: 'tokens' },
          ],
          conclusion: 'Saves tokens but risks correctness.',
        },
      ],
    });

    const output = parseSandboxModelOutput(`
\`\`\`codelens-chat-engine
${JSON.stringify(contract, null, 2)}
\`\`\`
`);

    expect(output.calculations).toHaveLength(1);
    expect(output.calculations[0]?.title).toBe('Token Budget');
    expect(output.calculations[0]?.kind).toBe('tradeoff');
    expect(output.calculations[0]?.steps).toHaveLength(2);
    expect(output.calculations[0]?.conclusion).toContain('correctness');
  });
});
