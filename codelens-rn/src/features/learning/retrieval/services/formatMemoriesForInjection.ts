import type { InjectionResult, RetrievedMemory } from '../types/retrieval';

const DEFAULT_HEADER = 'Relevant context from your saved learning';
const DEFAULT_TOKEN_BUDGET = 1500;
const DEFAULT_MAX_ITEMS = 8;

export function formatMemoriesForInjection(
  memories: RetrievedMemory[],
  opts: { tokenBudget?: number; maxItems?: number; header?: string } = {},
): InjectionResult {
  const tokenBudget = opts.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const maxItems = opts.maxItems ?? DEFAULT_MAX_ITEMS;
  const header = opts.header ?? DEFAULT_HEADER;
  const included: string[] = [];
  const includedIds: InjectionResult['includedIds'] = [];
  let totalTokensApprox = approximateTokens(header);
  let droppedCount = 0;

  for (const memory of memories) {
    if (included.length >= maxItems) {
      droppedCount += 1;
      continue;
    }
    const itemText = renderMemory(memory);
    const cost = approximateTokens(itemText);
    if (totalTokensApprox + cost > tokenBudget) {
      droppedCount += 1;
      continue;
    }
    included.push(itemText);
    includedIds.push({ kind: memory.kind, id: String(memory.id) });
    totalTokensApprox += cost;
  }

  const footer = includedIds.length > 0
    ? `[memoryIds: ${includedIds.map((item) => item.id).join(', ')}]`
    : '[memoryIds: ]';
  const text = included.length === 0
    ? ''
    : [header, ...included, footer].join('\n\n---\n\n');

  return {
    text,
    includedIds,
    includedCount: includedIds.length,
    droppedCount,
    totalTokensApprox: included.length === 0 ? 0 : totalTokensApprox + approximateTokens(footer),
  };
}

function renderMemory(memory: RetrievedMemory): string {
  if (memory.kind === 'concept') {
    const payload = memory.payload;
    const summary = payload.canonicalSummary ?? payload.coreConcept ?? '';
    const languages = payload.languageOrRuntime.length > 0 ? payload.languageOrRuntime.join(', ') : 'none';
    return [
      `Concept: ${payload.name} (${payload.conceptType})`,
      `Summary: ${summary}`,
      `Languages: ${languages}`,
    ].join('\n');
  }

  const payload = memory.payload;
  const source = payload.snippetSourcePath
    ? `${payload.snippetSourcePath}:${payload.snippetStartLine ?? '?'}-${payload.snippetEndLine ?? '?'}`
    : 'chat';
  const lang = payload.snippetLang ?? 'text';
  return [
    `Capture: ${payload.title}`,
    `What clicked: ${payload.whatClicked}`,
    `Snippet (${lang}):`,
    `\`\`\`${lang}`,
    payload.rawSnippet,
    '```',
    `Source: ${source}`,
  ].join('\n');
}

function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
