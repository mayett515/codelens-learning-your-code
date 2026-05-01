import type { SandboxTermCategory, SandboxTermDepth, SandboxTermSubcategory } from './types';

/**
 * Conservative term categorization suggestions.
 *
 * The contract still treats model output as the source of truth. This helper
 * only suggests missing metadata such as subcategory and depth.
 */

export interface CategorizationVote {
  category: SandboxTermCategory;
  subcategory?: SandboxTermSubcategory;
  depth?: SandboxTermDepth;
  confidence: number;
  reason: string;
}

export interface CategorizationStrategy {
  name: string;
  suggest(label: string, context?: CategorizationContext): CategorizationVote[];
}

export type CategorizationContext = {
  prose?: string;
  findingSeverities?: string[];
  adjacentTerms?: Array<{ label: string; category: string }>;
};

export type CategorizationResult = {
  category: SandboxTermCategory;
  subcategory?: SandboxTermSubcategory;
  depth?: SandboxTermDepth;
  confidence: number;
  votes: CategorizationVote[];
};

const VALID_CATEGORIES: SandboxTermCategory[] = [
  'risk',
  'concept',
  'api',
  'data',
  'performance',
  'test',
];

const VALID_SUBCATEGORIES: string[] = [
  'auth',
  'data-loss',
  'stale',
  'malformed',
  'pattern',
  'deprecation',
  'versioning',
  'endpoint',
  'contract',
  'lifecycle',
  'schema',
  'payload',
  'cache-state',
  'latency',
  'quota',
  'tokens',
  'unit',
  'integration',
  'regression',
];

const VALID_DEPTHS: SandboxTermDepth[] = ['surface', 'moderate', 'deep'];

function isTermCategory(value: string | undefined): value is SandboxTermCategory {
  return value != null && VALID_CATEGORIES.includes(value as SandboxTermCategory);
}

function isTermSubcategory(value: string | undefined): value is SandboxTermSubcategory {
  return value != null && (VALID_SUBCATEGORIES.includes(value) || value.startsWith('x-'));
}

function isTermDepth(value: string | undefined): value is SandboxTermDepth {
  return value != null && VALID_DEPTHS.includes(value as SandboxTermDepth);
}

const CATEGORY_KEYWORDS: Record<SandboxTermCategory, string[]> = {
  risk: [
    'risk',
    'danger',
    'vuln',
    'exploit',
    'crash',
    'failure',
    'uncheck',
    'unsafe',
    'stale',
    'invalid',
    'missing',
    'race',
    'deadlock',
    'leak',
    'overflow',
    'injection',
    'authentication',
    'authorization',
  ],
  concept: [
    'pattern',
    'architecture',
    'paradigm',
    'approach',
    'strategy',
    'design',
    'principle',
    'abstraction',
    'dependency',
    'composition',
    'inheritance',
    'interface',
    'contract',
    'protocol',
  ],
  api: [
    'endpoint',
    'route',
    'handler',
    'controller',
    'service',
    'method',
    'function',
    'call',
    'request',
    'response',
    'http',
    'rest',
    'graphql',
    'rpc',
    'callback',
    'fetch',
    'schema',
    'mcp',
    'server',
  ],
  data: [
    'cache',
    'payload',
    'model',
    'record',
    'document',
    'field',
    'column',
    'table',
    'collection',
    'store',
    'state',
    'config',
    'env',
    'migration',
    'seed',
    'fixture',
    'dto',
    'entity',
  ],
  performance: [
    'performance',
    'latency',
    'throughput',
    'bottleneck',
    'slow',
    'speed',
    'memory',
    'cpu',
    'timeout',
    'batch',
    'lazy',
    'memo',
    'cache-hit',
    'token',
    'budget',
    'cost',
    'quota',
    'rate-limit',
    'throttle',
  ],
  test: [
    'test',
    'spec',
    'assert',
    'expect',
    'mock',
    'stub',
    'fixture',
    'coverage',
    'regression',
    'e2e',
    'integration',
    'unit',
    'snapshot',
    'fuzz',
    'property',
  ],
};

const SUBCATEGORY_KEYWORDS: Record<string, SandboxTermSubcategory> = {
  auth: 'auth',
  authentication: 'auth',
  authorization: 'auth',
  permission: 'auth',
  'data-loss': 'data-loss',
  loss: 'data-loss',
  corruption: 'data-loss',
  stale: 'stale',
  outdated: 'stale',
  dirty: 'stale',
  invalidation: 'stale',
  malformed: 'malformed',
  invalid: 'malformed',
  corrupt: 'malformed',
  pattern: 'pattern',
  idiom: 'pattern',
  paradigm: 'pattern',
  deprecation: 'deprecation',
  deprecated: 'deprecation',
  legacy: 'deprecation',
  versioning: 'versioning',
  version: 'versioning',
  migration: 'versioning',
  endpoint: 'endpoint',
  route: 'endpoint',
  url: 'endpoint',
  contract: 'contract',
  interface: 'contract',
  protocol: 'contract',
  mcp: 'contract',
  lifecycle: 'lifecycle',
  startup: 'lifecycle',
  shutdown: 'lifecycle',
  init: 'lifecycle',
  schema: 'schema',
  shape: 'schema',
  structure: 'schema',
  payload: 'payload',
  body: 'payload',
  request: 'payload',
  response: 'payload',
  'cache-state': 'cache-state',
  cached: 'cache-state',
  memoized: 'cache-state',
  latency: 'latency',
  delay: 'latency',
  rtt: 'latency',
  quota: 'quota',
  limit: 'quota',
  rate: 'quota',
  tokens: 'tokens',
  'token-budget': 'tokens',
  cost: 'tokens',
  unit: 'unit',
  isolate: 'unit',
  integration: 'integration',
  e2e: 'integration',
  'end-to-end': 'integration',
  regression: 'regression',
  previous: 'regression',
  snapshot: 'regression',
};

const DEPTH_KEYWORDS: Record<SandboxTermDepth, string[]> = {
  surface: ['brief', 'quick', 'overview', 'summary', 'surface', 'simple', 'obvious'],
  moderate: ['moderate', 'standard', 'normal', 'typical', 'expected'],
  deep: ['deep', 'thorough', 'detailed', 'complex', 'critical', 'security', 'auth', 'risk', 'vulnerability'],
};

export const keywordStrategy: CategorizationStrategy = {
  name: 'keyword',
  suggest(label) {
    const lower = label.toLowerCase();
    const votes: CategorizationVote[] = [];

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        votes.push({
          category: category as SandboxTermCategory,
          confidence: keywords.includes(lower) ? 0.9 : 0.7,
          reason: `Label matches ${category} vocabulary`,
        });
      }
    }

    if (votes.length === 0) {
      votes.push({
        category: 'concept',
        confidence: 0.3,
        reason: 'No keyword match; defaulting to concept',
      });
    }

    const firstSubcategory = Object.entries(SUBCATEGORY_KEYWORDS).find(([keyword]) =>
      lower.includes(keyword),
    );
    if (firstSubcategory) {
      votes.push({
        category: votes[0]?.category ?? 'concept',
        subcategory: firstSubcategory[1],
        confidence: 0.6,
        reason: `Label contains "${firstSubcategory[0]}" -> ${firstSubcategory[1]}`,
      });
    }

    const firstDepth = Object.entries(DEPTH_KEYWORDS).find(([, keywords]) =>
      keywords.some((keyword) => lower.includes(keyword)),
    );
    if (firstDepth && votes[0]) {
      votes[0].depth = firstDepth[0] as SandboxTermDepth;
    }

    return votes;
  },
};

export const contextStrategy: CategorizationStrategy = {
  name: 'context',
  suggest(label, context) {
    if (!context) return [];

    const lower = label.toLowerCase();
    const votes: CategorizationVote[] = [];

    const hasHighSeverity = context.findingSeverities?.some(
      (severity) => severity === 'critical' || severity === 'high',
    );
    if (hasHighSeverity && (lower.includes('cache') || lower.includes('key') || lower.includes('data'))) {
      votes.push({
        category: 'risk',
        confidence: 0.65,
        reason: 'High-severity findings present near this term',
      });
    }

    if (context.adjacentTerms?.length) {
      const categoryCounts: Record<string, number> = {};
      for (const term of context.adjacentTerms) {
        categoryCounts[term.category] = (categoryCounts[term.category] || 0) + 1;
      }

      const dominant = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
      if (dominant && isTermCategory(dominant[0]) && dominant[1] >= 2) {
        votes.push({
          category: dominant[0],
          confidence: 0.5,
          depth: dominant[0] === 'risk' ? 'deep' : 'moderate',
          reason: `Surrounding terms are mostly ${dominant[0]}`,
        });
      }
    }

    return votes;
  },
};

const STRATEGIES: CategorizationStrategy[] = [keywordStrategy, contextStrategy];

export function suggestCategorization(
  label: string,
  context?: CategorizationContext,
): CategorizationResult {
  const allVotes = STRATEGIES.flatMap((strategy) => strategy.suggest(label, context));

  if (allVotes.length === 0) {
    return {
      category: 'concept',
      confidence: 0.2,
      votes: [],
    };
  }

  const categoryScores: Record<string, number> = {};
  const categorySubcategories: Record<string, SandboxTermSubcategory | undefined> = {};
  const categoryDepths: Record<string, SandboxTermDepth | undefined> = {};

  for (const vote of allVotes) {
    categoryScores[vote.category] = (categoryScores[vote.category] || 0) + vote.confidence;
    if (vote.subcategory && !categorySubcategories[vote.category]) {
      categorySubcategories[vote.category] = vote.subcategory;
    }
    if (vote.depth && !categoryDepths[vote.category]) {
      categoryDepths[vote.category] = vote.depth;
    }
  }

  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const [bestCategory, bestScore] = sorted[0]!;
  const totalScore = sorted.reduce((sum, [, score]) => sum + score, 0);
  const confidence = Math.min(totalScore > 0 ? bestScore / totalScore : 0.5, 1);

  return {
    category: bestCategory as SandboxTermCategory,
    ...(categorySubcategories[bestCategory] != null
      ? { subcategory: categorySubcategories[bestCategory] }
      : {}),
    ...(categoryDepths[bestCategory] != null ? { depth: categoryDepths[bestCategory] } : {}),
    confidence: Math.round(confidence * 100) / 100,
    votes: allVotes,
  };
}

export function fillMissingCategorizations(
  terms: Array<{
    label: string;
    category?: string;
    subcategory?: string;
    depth?: string;
  }>,
  context?: CategorizationContext,
): Array<{
  category: SandboxTermCategory;
  subcategory?: SandboxTermSubcategory;
  depth?: SandboxTermDepth;
}> {
  return terms.map((term) => {
    const suggestion = suggestCategorization(term.label, context);
    const category = isTermCategory(term.category) ? term.category : suggestion.category;
    const subcategory = isTermSubcategory(term.subcategory)
      ? term.subcategory
      : suggestion.subcategory;
    const depth = isTermDepth(term.depth) ? term.depth : suggestion.depth;

    return {
      category,
      ...(subcategory != null ? { subcategory } : {}),
      ...(depth != null ? { depth } : {}),
    };
  });
}
