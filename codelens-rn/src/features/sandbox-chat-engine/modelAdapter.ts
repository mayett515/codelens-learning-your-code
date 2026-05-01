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
  SandboxProseSpan,
  SandboxTermCategory,
} from './types';

export type SandboxRequestMode = 'local-contract' | 'configured-model';

export interface SandboxModelRequest {
  prompt: string;
  mode: SandboxRequestMode;
  signal?: AbortSignal | undefined;
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
        request.signal,
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
    'The UI will parse the block and render code artifacts, code layers, terms, calculations, and findings.',
    buildSandboxPromptContract(),
    'Hidden keyword categorization rule:',
    'Terms are the words that become light clickable blocks in chat. Pick terms that a developer would naturally click for deeper meaning.',
    'Classify each term as risk, concept, api, data, performance, or test.',
    'Good code-review terms include cache key, stale data, malformed schema, token budget, invalidation, error boundary, and tool schema.',
    'Each term must include spans: an array of { proseOffset, length } objects that anchor the label exactly in the prose text. Use JavaScript-style string indexing.',
    'Each term label must appear in the prose exactly at the listed offsets, so the UI can highlight it deterministically.',
    'Each term may include an optional subcategory for finer routing:',
    '  risk subcategories: auth, data-loss, stale, malformed',
    '  concept subcategories: pattern, deprecation, versioning',
    '  api subcategories: endpoint, contract, lifecycle',
    '  data subcategories: schema, payload, cache-state',
    '  performance subcategories: latency, quota, tokens',
    '  test subcategories: unit, integration, regression',
    'Or use x-{name} for a custom subcategory.',
    'Each term may include an optional depth: surface, moderate, or deep.',
    '  surface = quick concept.',
    '  moderate = normal explanation.',
    '  deep = important or subtle topic worth closer inspection.',
    '  Default to moderate if unsure.',
    'The UI displays category, optional subcategory, optional depth, promptHook, and relatedTermIds in the inspector.',
    'The parser may infer missing subcategory/depth values from the term label, but explicit accurate values are preferred.',
    'Prefer 3-6 distinct terms with different labels when the answer mentions more than one concept.',
    'Do not use category names like "risk" as term labels. The label should be the concrete phrase, for example "schema cache" or "cache key".',
    'When the user asks about multiple servers with the same tool name, include separate terms for schema cache, cache key, tool schema, and stale data.',
    'Use findings for concrete review issues with severity (critical, high, medium, low, info) and category (bug, security, reliability, performance, maintainability, accessibility, design).',
    'Link findings to terms and artifacts when possible, and include suggestedFix when you have a concrete recommendation.',
    'Use stable ids. Include the reviewed code as a codeArtifact with line ranges that match the selected-code context.',
    'Set version to 1.',
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
  signal?: AbortSignal,
): Promise<string> {
  console.info('[sandbox-chat-engine] model request started', {
    promptLength: prompt.length,
  });
  const start = Date.now();
  const result = await enqueueCompletion(
    'general',
    buildSandboxAiMessages(prompt),
    signal,
  );
  console.info('[sandbox-chat-engine] model request finished', {
    ms: Date.now() - start,
  });
  return result;
}

async function requestConfiguredModelWithRepair(
  prompt: string,
  enqueueCompletion: typeof enqueue,
  signal?: AbortSignal,
): Promise<{ raw: string; timing: SandboxModelTiming }> {
  const firstStart = Date.now();
  const first = await requestConfiguredModel(prompt, enqueueCompletion, signal);
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
    signal,
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
        '  "version": 1,',
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
        '      "subcategory": "stale",',
        '      "depth": "deep",',
        '      "spans": [{ "proseOffset": 0, "length": 12 }],',
        '      "summary": "One sentence.",',
        '      "detail": "Detailed explanation.",',
        '      "promptHook": "How this term should guide a follow-up prompt.",',
        '      "relatedTermIds": []',
        '    }',
        '  ],',
        '  "calculations": [',
        '    {',
        '      "id": "example-calc",',
        '      "title": "Example Calculation",',
        '      "kind": "reasoning",',
        '      "steps": [',
        '        { "label": "Step one", "value": 1, "unit": "item" },',
        '        { "label": "Step two", "value": 2, "unit": "items" }',
        '      ],',
        '      "conclusion": "This is the conclusion."',
        '    }',
        '  ],',
        '  "findings": []',
        '}',
        '```',
        'Do not put a bare JSON object outside the fence. Do not use markdown code fences for the reviewed source code inside the JSON.',
      ].join('\n'),
    },
  ];
}

function buildLocalContractResponse(prompt: string): string {
  const topic = summarizePrompt(prompt);
  const prose =
    `Local code-review sandbox response for "${topic}". The schema cache is risky because the cache key only uses toolName, which can return a stale data result or the wrong tool schema when multiple MCP servers expose the same name. The token budget benefit is real, but it must not hide correctness risk.`;

  function spanFor(label: string): SandboxProseSpan[] {
    const offset = prose.indexOf(label);
    return offset >= 0 ? [{ proseOffset: offset, length: label.length }] : [];
  }

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
    version: 1,
    prose,
    codeArtifacts: [artifact],
    terms: [
      {
        id: 'schema-cache',
        label: 'schema cache',
        category: 'risk',
        subcategory: 'stale' as const,
        depth: 'deep' as const,
        spans: spanFor('schema cache'),
        summary: 'A memory cache for fetched and compressed tool schemas.',
        detail:
          'The cache improves speed, but it needs a complete identity. Tool name alone is not enough when multiple MCP servers can expose the same tool.',
        promptHook:
          'Ask the model to identify cache key inputs, invalidation rules, and stale-data risks.',
        relatedTermIds: ['cache-key', 'malformed-schemas'],
      },
      {
        id: 'cache-key',
        label: 'cache key',
        category: 'risk',
        subcategory: 'stale' as const,
        depth: 'deep' as const,
        spans: spanFor('cache key'),
        summary:
          'The identity used to decide whether a cached schema can be reused.',
        detail:
          'A cache key based only on toolName is too weak when schemas can come from different MCP servers or versions.',
        promptHook:
          'Ask whether every input that changes the returned schema is represented in the cache key.',
        relatedTermIds: ['schema-cache', 'stale-data'],
      },
      {
        id: 'tool-schema',
        label: 'tool schema',
        category: 'api',
        subcategory: 'contract' as const,
        depth: 'moderate' as const,
        spans: spanFor('tool schema'),
        summary:
          'The API contract returned by the MCP server for a callable tool.',
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
        subcategory: 'cache-state' as const,
        depth: 'moderate' as const,
        spans: spanFor('stale data'),
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
        subcategory: 'tokens' as const,
        depth: 'surface' as const,
        spans: spanFor('token budget'),
        summary:
          'The context cost saved by compressing MCP tool descriptions.',
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
        title: 'Review Coverage',
        kind: 'reasoning' as const,
        steps: [
          { label: 'Cache risk', value: 1, unit: 'finding' },
          { label: 'API risk', value: 1, unit: 'finding' },
          { label: 'Compression risk', value: 1, unit: 'finding' },
        ],
        conclusion:
          'The local response gives the engine enough structure to test line-click review findings, term explanations, and risk calculations from one realistic code snippet.',
      },
    ],
    findings: [
      {
        id: 'local-cache-eviction-gap',
        severity: 'high' as const,
        category: 'reliability' as const,
        termId: 'schema-cache',
        title: 'No cache eviction or invalidation path',
        description:
          'schemaCache is a plain Map with no TTL, version check, or deletion logic. A server-side schema update will never be reflected.',
        artifactId: artifact.id,
        lineStart: 1,
        lineEnd: 4,
        suggestedFix:
          'Add a version or content-hash segment to the cache key, and provide an invalidation API or TTL.',
      },
      {
        id: 'local-unchecked-fetch',
        severity: 'medium' as const,
        category: 'reliability' as const,
        termId: 'tool-schema',
        title: 'Unchecked external schema fetch',
        description:
          'client.callTool can throw or return an unexpected shape. The code does not guard against missing fields before compression.',
        artifactId: artifact.id,
        lineStart: 6,
        lineEnd: 6,
        suggestedFix:
          'Validate the schema response shape and wrap the call in a retryable error boundary.',
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
  const fallbackProse =
    'The configured model returned a malformed renderer contract, so the sandbox is showing a stable fallback review. The important concepts are schema cache, cache key, stale data, tool schema, and token budget.';

  function spanFor(label: string): SandboxProseSpan[] {
    const offset = fallbackProse.indexOf(label);
    return offset >= 0 ? [{ proseOffset: offset, length: label.length }] : [];
  }

  const contract = {
    version: 1,
    prose: fallbackProse,
    codeArtifacts: parsed.codeArtifacts,
    terms: [
      ...parsed.terms.map((term) => ({
        ...term,
        spans: spanFor(term.label),
      })),
      {
        id: 'model-contract-failure',
        label: 'model contract failure',
        category: 'risk' as const,
        spans: spanFor('model contract failure'),
        summary: 'The provider did not follow the renderer schema.',
        detail: `The raw model response could not be trusted as UI data. Excerpt: ${compactFailedOutput(failedOutput)}`,
        promptHook:
          'Ask the model for exactly one fenced codelens-chat-engine JSON block and no malformed source-code JSON.',
        relatedTermIds: ['schema-cache', 'cache-key'],
      },
    ],
    calculations: parsed.calculations,
    findings: parsed.findings,
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
