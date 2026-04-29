import { enqueue } from '../../ai/queue';
import { buildChatSystemPrompt } from '../chat/promptComposition/buildChatSystemPrompt';
import {
  buildSandboxPromptContract,
  hasBlockingContractDiagnostics,
  parseSandboxModelOutput,
} from './engine';
import { reviewSnippet } from './sampleData';
import type {
  SandboxChatMessage,
  SandboxModelOutput,
  SandboxModelTiming,
} from './types';

export type SandboxRequestMode = 'local-contract' | 'configured-model';

export interface SandboxModelRequest {
  prompt: string;
  mode: SandboxRequestMode;
  enqueueCompletion?: typeof enqueue | undefined;
}

export interface SandboxModelResponse {
  raw: string;
  parsed: SandboxModelOutput;
  timing: SandboxModelTiming;
}

export async function requestSandboxModelOutput(
  request: SandboxModelRequest,
): Promise<SandboxModelResponse> {
  const trimmed = request.prompt.trim();
  if (!trimmed) {
    throw new Error('Type a sandbox prompt first');
  }

  const start = Date.now();
  const result = request.mode === 'configured-model'
    ? await requestConfiguredModelWithRepair(
        trimmed,
        request.enqueueCompletion ?? enqueue,
      )
    : {
        raw: buildLocalContractResponse(trimmed),
        timing: {
          mode: 'local-contract' as const,
          totalMs: 0,
          repaired: false,
        },
      };

  result.timing.totalMs = Date.now() - start;
  const parsed = parseSandboxModelOutput(result.raw);
  if (
    request.mode === 'configured-model' &&
    hasBlockingContractDiagnostics(parsed)
  ) {
    const fallbackRaw = buildModelFallbackContractResponse(
      trimmed,
      result.raw,
    );
    const fallbackParsed = parseSandboxModelOutput(fallbackRaw);
    fallbackParsed.diagnostics.unshift({
      id: 'model-contract-fallback',
      level: 'error',
      title: 'Model contract fallback used',
      detail:
        'The configured model did not return a usable codelens-chat-engine contract after repair, so the sandbox rendered a deterministic fallback for testing.',
    });

    return {
      raw: fallbackRaw,
      parsed: fallbackParsed,
      timing: result.timing,
    };
  }

  return {
    raw: result.raw,
    parsed,
    timing: result.timing,
  };
}

export function buildSandboxAiMessages(
  prompt: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: buildSandboxSystemPrompt(),
    },
    {
      role: 'user',
      content: prompt,
    },
  ];
}

export function buildSandboxSystemPrompt(): string {
  const mainPrompt = buildChatSystemPrompt({
    codeContext: {
      kind: 'selected_code',
      text: reviewSnippet,
      filePath: 'skeleton.js',
      language: 'js',
      startLine: 1,
      endLine: reviewSnippet.split('\n').length,
    },
  });

  return [
    mainPrompt,
    'Sandbox renderer contract:',
    'You are producing output for the CodeLens sandbox chat engine.',
    'The user is reviewing existing code, not asking you to build an app from scratch.',
    'Prioritize concrete code-review findings, runtime risks, and line-referenced explanations.',
    'Respond with concise prose plus exactly one fenced codelens-chat-engine JSON block.',
    'The UI will parse the block and render code artifacts, code layers, terms, and calculations.',
    buildSandboxPromptContract(),
    'Hidden keyword categorization rule:',
    'Terms are the words that become light clickable blocks in chat. Pick terms that a developer would naturally click for deeper meaning.',
    'Classify each term as risk, concept, api, data, performance, or test.',
    'Good code-review terms include cache key, stale data, malformed schema, token budget, invalidation, error boundary, and tool schema.',
    'Each term label must appear in the prose exactly, so the UI can highlight it.',
    'Do not create only one generic term. Produce 4-6 distinct terms with different labels when the answer mentions more than one concept.',
    'Do not use category names like "risk" as term labels. The label should be the concrete phrase, for example "schema cache" or "cache key".',
    'When the user asks about multiple servers with the same tool name, include separate terms for schema cache, cache key, tool schema, and stale data.',
    'Use stable ids. Include the reviewed code as a codeArtifact with line ranges that match the selected-code context.',
  ].join('\n\n=====\n\n');
}

export function makeSandboxUserMessage(prompt: string): SandboxChatMessage {
  return {
    id: `sandbox-user-${Date.now()}`,
    role: 'user',
    content: prompt.trim(),
  };
}

export function makeSandboxAssistantMessage(
  response: SandboxModelResponse,
): SandboxChatMessage {
  return {
    id: `sandbox-assistant-${Date.now()}`,
    role: 'assistant',
    content: response.raw,
    parsed: response.parsed,
    timing: response.timing,
  };
}

async function requestConfiguredModel(
  prompt: string,
  enqueueCompletion: typeof enqueue,
): Promise<string> {
  console.info('[sandbox-chat-engine] model request started', {
    promptLength: prompt.length,
  });
  const start = Date.now();
  const result = await enqueueCompletion('general', buildSandboxAiMessages(prompt));
  console.info('[sandbox-chat-engine] model request finished', {
    ms: Date.now() - start,
  });
  return result;
}

async function requestConfiguredModelWithRepair(
  prompt: string,
  enqueueCompletion: typeof enqueue,
): Promise<{ raw: string; timing: SandboxModelTiming }> {
  const firstStart = Date.now();
  const first = await requestConfiguredModel(prompt, enqueueCompletion);
  const firstCallMs = Date.now() - firstStart;
  const parsed = parseSandboxModelOutput(first);
  if (!hasBlockingContractDiagnostics(parsed)) {
    return {
      raw: first,
      timing: {
        mode: 'configured-model',
        totalMs: firstCallMs,
        firstCallMs,
        repaired: false,
      },
    };
  }

  const repairStart = Date.now();
  const repaired = await enqueueCompletion(
    'general',
    buildSandboxRepairMessages(prompt, first),
  );
  const repairCallMs = Date.now() - repairStart;

  return {
    raw: repaired,
    timing: {
      mode: 'configured-model',
      totalMs: firstCallMs + repairCallMs,
      firstCallMs,
      repairCallMs,
      repaired: true,
    },
  };
}

function buildSandboxRepairMessages(
  originalPrompt: string,
  failedOutput: string,
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [
    {
      role: 'system',
      content: buildSandboxSystemPrompt(),
    },
    {
      role: 'user',
      content: originalPrompt,
    },
    {
      role: 'assistant',
      content: failedOutput,
    },
    {
      role: 'user',
      content: [
        'Repair the previous answer for the CodeLens renderer.',
        'Return the same review idea, but the final answer must include exactly one fenced block using this fence label:',
        '```codelens-chat-engine',
        '{',
        '  "prose": "short visible answer",',
        '  "codeArtifacts": [',
        '    {',
        '      "id": "skeleton-review",',
        '      "title": "skeleton.js",',
        '      "language": "js",',
        '      "code": "const schemaCache = new Map();\\n...",',
        '      "layers": [',
        '        {',
        '          "id": "cache-risk",',
        '          "kind": "state",',
        '          "title": "Cache Risk",',
        '          "summary": "One sentence.",',
        '          "detail": "Detailed explanation.",',
        '          "lineStart": 1,',
        '          "lineEnd": 4',
        '        }',
        '      ]',
        '    }',
        '  ],',
        '  "terms": [',
        '    {',
        '      "id": "schema-cache",',
        '      "label": "schema cache",',
        '      "category": "risk",',
        '      "summary": "One sentence.",',
        '      "detail": "Detailed explanation.",',
        '      "promptHook": "How this term should guide a follow-up prompt.",',
        '      "relatedTermIds": []',
        '    }',
        '  ],',
        '  "calculations": []',
        '}',
        '```',
        'Do not put a bare JSON object outside the fence. Do not use markdown code fences for the reviewed source code inside the JSON.',
      ].join('\n'),
    },
  ];
}

function buildLocalContractResponse(prompt: string): string {
  const topic = summarizePrompt(prompt);
  const artifact = {
    id: 'local-mcp-schema-compressor-review',
    title: 'skeleton.js',
    language: 'js',
    code: reviewSnippet,
    layers: [
      {
        id: 'cache-key-risk',
        kind: 'state',
        title: 'Cache Key Risk',
        summary: 'The cache key uses only the tool name.',
        detail:
          'A real MCP client can talk to multiple servers. Cache by server id plus tool name, otherwise one server can receive another server tool schema.',
        lineStart: 1,
        lineEnd: 4,
      },
      {
        id: 'unchecked-tool-call',
        kind: 'api',
        title: 'Unchecked Tool Call',
        summary: 'The schema fetch has no error boundary.',
        detail:
          'If get_tool_schema fails or returns a malformed payload, the compressor can throw or cache misleading partial data. The review should show that as a concrete runtime risk.',
        lineStart: 6,
        lineEnd: 6,
      },
      {
        id: 'lossy-compression',
        kind: 'calculation',
        title: 'Lossy Compression',
        summary: 'The output drops most inputSchema fields.',
        detail:
          'Compressing descriptions and keeping only required fields may remove enum values, nested objects, defaults, or examples needed for valid tool input.',
        lineStart: 7,
        lineEnd: 11,
      },
    ],
  };

  const contract = {
    prose:
      `Local code-review sandbox response for "${topic}". The schema cache is risky because the cache key only uses toolName, which can return a stale data result or the wrong tool schema when multiple MCP servers expose the same name. The token budget benefit is real, but it must not hide correctness risk.`,
    codeArtifacts: [artifact],
    terms: [
      {
        id: 'schema-cache',
        label: 'schema cache',
        category: 'risk',
        summary: 'A memory cache for fetched and compressed tool schemas.',
        detail:
          'The cache improves speed, but it needs a complete identity. Tool name alone is not enough when multiple MCP servers can expose the same tool.',
        promptHook:
          'Ask the model to identify cache key inputs, invalidation rules, and stale-data risks.',
        relatedTermIds: ['token-budget'],
      },
      {
        id: 'cache-key',
        label: 'cache key',
        category: 'risk',
        summary: 'The identity used to decide whether a cached schema can be reused.',
        detail:
          'A cache key based only on toolName is too weak when schemas can come from different MCP servers or versions.',
        promptHook:
          'Ask whether every input that changes the returned schema is represented in the cache key.',
        relatedTermIds: ['schema-cache', 'tool-schema'],
      },
      {
        id: 'tool-schema',
        label: 'tool schema',
        category: 'api',
        summary: 'The API contract returned by the MCP server for a callable tool.',
        detail:
          'If the wrong tool schema is reused, later model calls may construct invalid arguments or call the wrong behavior.',
        promptHook:
          'Ask what fields are required to safely identify and invoke the tool.',
        relatedTermIds: ['cache-key', 'stale-data'],
      },
      {
        id: 'stale-data',
        label: 'stale data',
        category: 'data',
        summary: 'Cached information that no longer matches the server state.',
        detail:
          'Without invalidation, a schema change on the server can leave the local compressed schema permanently outdated.',
        promptHook:
          'Ask what event, TTL, or version check should invalidate the cached value.',
        relatedTermIds: ['schema-cache'],
      },
      {
        id: 'token-budget',
        label: 'token budget',
        category: 'performance',
        summary: 'The context cost saved by compressing MCP tool descriptions.',
        detail:
          'The review should balance saved tokens against correctness. If compression drops validation detail, the model may call tools incorrectly.',
        promptHook:
          'Ask for the exact fields removed by compression and the invocation risk caused by removing them.',
        relatedTermIds: ['schema-cache'],
      },
    ],
    calculations: [
      {
        id: 'review-coverage',
        label: 'Review coverage',
        expression: 'cache risk + API risk + compression risk',
        result: '3 primary findings',
        explanation:
          'The local response gives the engine enough structure to test line-click review findings, term explanations, and risk calculations from one realistic code snippet.',
      },
    ],
  };

  return [
    contract.prose,
    '',
    '```codelens-chat-engine',
    JSON.stringify(contract, null, 2),
    '```',
  ].join('\n');
}

function buildModelFallbackContractResponse(
  prompt: string,
  failedOutput: string,
): string {
  const raw = buildLocalContractResponse(prompt);
  const parsed = parseSandboxModelOutput(raw);
  const contract = {
    prose:
      'The configured model returned a malformed renderer contract, so the sandbox is showing a stable fallback review. The important concepts are schema cache, cache key, stale data, tool schema, and token budget.',
    codeArtifacts: parsed.codeArtifacts,
    terms: [
      ...parsed.terms,
      {
        id: 'model-contract-failure',
        label: 'model contract failure',
        category: 'risk',
        summary: 'The provider did not follow the renderer schema.',
        detail:
          `The raw model response could not be trusted as UI data. Excerpt: ${compactFailedOutput(failedOutput)}`,
        promptHook:
          'Ask the model for exactly one fenced codelens-chat-engine JSON block and no malformed source-code JSON.',
        relatedTermIds: ['schema-cache', 'cache-key'],
      },
    ],
    calculations: parsed.calculations,
  };

  return [
    contract.prose,
    '',
    '```codelens-chat-engine',
    JSON.stringify(contract, null, 2),
    '```',
  ].join('\n');
}

function compactFailedOutput(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= 220) {
    return compact;
  }

  return `${compact.slice(0, 217)}...`;
}

function summarizePrompt(prompt: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 42) {
    return normalized;
  }

  return `${normalized.slice(0, 39)}...`;
}
