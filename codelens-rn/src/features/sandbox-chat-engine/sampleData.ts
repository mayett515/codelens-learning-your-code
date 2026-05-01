import { parseSandboxModelOutput } from './engine';
import type { SandboxChatMessage } from './types';

export const reviewSnippet = [
  'const schemaCache = new Map();',
  '',
  'export async function getCompressedToolSchema(client, toolName) {',
  '  if (schemaCache.has(toolName)) return schemaCache.get(toolName);',
  '',
  "  const schema = await client.callTool('get_tool_schema', { toolName });",
  '  const compressed = {',
  '    name: schema.name,',
  '    description: schema.description?.slice(0, 180),',
  '    required: schema.inputSchema?.required ?? [],',
  '  };',
  '',
  '  schemaCache.set(toolName, compressed);',
  '  return compressed;',
  '}',
].join('\n');

const prose =
  'This MCP-style compressor is useful for shrinking tool context, but the schema cache needs a stronger cache key. Otherwise stale data, malformed schemas, and the wrong tool schema can leak into later tool calls. Watch the token budget, because lossy compression can hide correctness risk.';

const contract = {
  version: 1,
  prose,
  codeArtifacts: [
    {
      id: 'mcp-schema-compressor',
      title: 'skeleton.js',
      language: 'js',
      code: reviewSnippet,
      layers: [
        {
          id: 'cache-layer',
          kind: 'state',
          title: 'Cache Identity',
          summary: 'The cache key only uses toolName.',
          detail:
            'If multiple MCP servers expose the same tool name, this cache can return the wrong schema. Include a server id, version, or namespace in the key before sharing cached compressed schemas.',
          lineStart: 1,
          lineEnd: 4,
        },
        {
          id: 'api-layer',
          kind: 'api',
          title: 'Schema Fetch',
          summary: 'The external MCP call is the main failure boundary.',
          detail:
            'The code assumes get_tool_schema always returns a valid object. A review should ask what happens on missing tools, transport errors, and schema versions that do not match this shape.',
          lineStart: 6,
          lineEnd: 6,
        },
        {
          id: 'compression-layer',
          kind: 'calculation',
          title: 'Compression Tradeoff',
          summary: 'The compressor saves tokens by dropping most schema details.',
          detail:
            'Keeping name, a shortened description, and required fields may be too lossy for safe tool invocation. The engine should surface which fields were removed and whether the call still has enough information to build valid tool input.',
          lineStart: 7,
          lineEnd: 11,
        },
        {
          id: 'return-layer',
          kind: 'render',
          title: 'Returned Review Surface',
          summary: 'The returned object becomes the inspectable review artifact.',
          detail:
            'This is the right place for CodeLens to attach review findings, line references, and prompt hooks so a model can explain exactly why a compression choice is risky.',
          lineStart: 13,
          lineEnd: 14,
        },
      ],
    },
  ],
  terms: [
    {
      id: 'schema-cache',
      label: 'schema cache',
      category: 'risk',
      subcategory: 'stale' as const,
      depth: 'deep' as const,
      spans: [{ proseOffset: 72, length: 12 }],
      summary: 'A memory cache for fetched and compressed tool schemas.',
      detail:
        'The cache improves repeated lookups, but it needs a key that distinguishes servers and schema versions. Otherwise a correct-looking review can be based on stale or wrong schema data.',
      promptHook:
        'When reviewing cache logic, ask the model to identify cache key inputs and invalidation triggers.',
      relatedTermIds: ['cache-key', 'malformed-schemas'],
    },
    {
      id: 'cache-key',
      label: 'cache key',
      category: 'risk',
      subcategory: 'stale' as const,
      depth: 'deep' as const,
      spans: [{ proseOffset: 102, length: 9 }],
      summary: 'The identity used to decide whether cached data can be reused.',
      detail:
        'A cache key based only on toolName is too weak when different MCP servers or schema versions can return different schemas for the same name.',
      promptHook:
        'Ask which inputs define schema identity: server id, tool name, version, and schema hash.',
      relatedTermIds: ['schema-cache', 'stale-data'],
    },
    {
      id: 'stale-data',
      label: 'stale data',
      category: 'data',
      subcategory: 'cache-state' as const,
      depth: 'moderate' as const,
      spans: [{ proseOffset: 123, length: 10 }],
      summary: 'Cached information that no longer matches server state.',
      detail:
        'The function has no invalidation path, so a server-side schema update can leave the compressed schema outdated forever.',
      promptHook:
        'Ask what invalidation trigger or TTL should exist for this cache.',
      relatedTermIds: ['schema-cache'],
    },
    {
      id: 'tool-schema',
      label: 'tool schema',
      category: 'api',
      subcategory: 'contract' as const,
      depth: 'moderate' as const,
      spans: [{ proseOffset: 168, length: 11 }],
      summary: 'The MCP server contract for how a tool can be called.',
      detail:
        'If the wrong tool schema is reused, the model may build arguments for the wrong server or an old version of a tool.',
      promptHook:
        'Ask which schema fields must survive compression to keep invocation safe.',
      relatedTermIds: ['cache-key', 'stale-data'],
    },
    {
      id: 'token-budget',
      label: 'token budget',
      category: 'performance',
      subcategory: 'tokens' as const,
      depth: 'surface' as const,
      spans: [{ proseOffset: 222, length: 12 }],
      summary:
        'The context cost saved by compressing MCP tool descriptions.',
      detail:
        'Compression is useful only if the remaining schema is still enough for safe invocation. The review engine should compare saved tokens with lost validation detail.',
      promptHook:
        'Ask for both the token-saving intent and the correctness risk introduced by removed fields.',
      relatedTermIds: ['schema-cache'],
    },
    {
      id: 'malformed-schemas',
      label: 'malformed schemas',
      category: 'data',
      subcategory: 'malformed' as const,
      depth: 'deep' as const,
      spans: [{ proseOffset: 135, length: 17 }],
      summary:
        'Provider or server responses that do not match the expected shape.',
      detail:
        'A realistic code review should flag unchecked optional chains, missing object guards, and places where a bad schema could produce misleading compressed output.',
      promptHook:
        'Require findings to cite the exact line and explain the runtime consequence.',
      relatedTermIds: ['tool-schema', 'token-budget'],
    },
  ],
  calculations: [
    {
      id: 'description-truncation',
      title: 'Description Truncation Risk',
      kind: 'tradeoff',
      steps: [
        { label: 'Original description', value: 400, unit: 'chars' },
        { label: 'Kept after truncation', value: 180, unit: 'chars' },
        {
          label: 'Lost detail',
          value: 220,
          unit: 'chars',
          note: 'May include constraints or examples',
        },
      ],
      conclusion:
        'Truncating descriptions can remove constraints or examples that a model needs to call the tool correctly. The engine should make that tradeoff visible.',
    },
  ],
  findings: [
    {
      id: 'stale-cache-risk',
      severity: 'high',
      category: 'reliability',
      termId: 'schema-cache',
      title: 'Stale schema cache has no eviction path',
      description:
        'The cache key does not include a version or timestamp, so refreshed tool schemas cannot replace stale entries.',
      artifactId: 'mcp-schema-compressor',
      lineStart: 1,
      lineEnd: 4,
      suggestedFix:
        'Include a content hash or version tag in the cache key so that updated schemas replace stale entries.',
    },
    {
      id: 'unchecked-fetch',
      severity: 'medium',
      category: 'reliability',
      termId: 'tool-schema',
      title: 'Unchecked schema fetch call',
      description:
        'The code assumes get_tool_schema always succeeds. Transport errors, missing tools, or malformed responses will propagate uncaught.',
      artifactId: 'mcp-schema-compressor',
      lineStart: 6,
      lineEnd: 6,
      suggestedFix:
        'Wrap the schema fetch in a try/catch and validate the returned shape before compression.',
    },
    {
      id: 'lossy-compression-risk',
      severity: 'medium',
      category: 'maintainability',
      termId: 'malformed-schema',
      title: 'Lossy compression drops validation detail',
      description:
        'Removing optional fields and truncating descriptions may leave the model without enough information to construct valid tool arguments.',
      artifactId: 'mcp-schema-compressor',
      lineStart: 7,
      lineEnd: 11,
      suggestedFix:
        'Preserve critical fields like enum, default, and nested object constraints during compression.',
    },
  ],
};

const assistantRaw = [
  'This review focuses on correctness and runtime risk in the MCP-style schema compressor. Click a code line to inspect the layer, or click terms like schema cache and token budget for review context.',
  '',
  '```codelens-chat-engine',
  JSON.stringify(contract, null, 2),
  '```',
].join('\n');

export const sandboxMessages: SandboxChatMessage[] = [
  {
    id: 'u-1',
    role: 'user',
    content:
      'Review this MCP schema-compressor skeleton. I care about bugs, runtime risks, and whether the compression still leaves enough information for safe tool calls.',
  },
  {
    id: 'a-1',
    role: 'assistant',
    content: assistantRaw,
    parsed: parseSandboxModelOutput(assistantRaw),
  },
];
