import { getActiveDomainProfile, getOntologyNodeLabel, type DomainProfile } from '../../../ontology';
import type { InjectionResult, RetrievedMemory } from '../types/retrieval';

const DEFAULT_TOKEN_BUDGET = 1500;
const DEFAULT_MAX_ITEMS = 8;

export function formatMemoriesForInjection(
  memories: RetrievedMemory[],
  opts: {
    tokenBudget?: number;
    maxItems?: number;
    header?: string;
    profile?: DomainProfile | undefined;
  } = {},
): InjectionResult {
  const profile = opts.profile ?? getActiveDomainProfile();
  const tokenBudget = opts.tokenBudget ?? DEFAULT_TOKEN_BUDGET;
  const maxItems = opts.maxItems ?? DEFAULT_MAX_ITEMS;
  const header = opts.header ?? profile.retrieval.defaultHeader;
  const included: string[] = [];
  const includedIds: InjectionResult['includedIds'] = [];
  let totalTokensApprox = approximateTokens(header);
  let droppedCount = 0;

  for (const memory of memories) {
    if (included.length >= maxItems) {
      droppedCount += 1;
      continue;
    }
    const itemText = renderMemory(memory, profile);
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

function renderMemory(memory: RetrievedMemory, profile: DomainProfile): string {
  if (memory.kind === 'concept') {
    const payload = memory.payload;
    const summary = payload.canonicalSummary ?? payload.coreConcept ?? '';
    const languages = payload.languageOrRuntime.length > 0 ? payload.languageOrRuntime.join(', ') : 'none';
    const typeLabel = getOntologyNodeLabel(payload.typeNodeId, profile);
    return [
      `${profile.retrieval.itemLabel}: ${payload.name} (${typeLabel})`,
      `${profile.retrieval.summaryLabel}: ${summary}`,
      `${profile.retrieval.languageOrRuntimeLabel}: ${languages}`,
    ].join('\n');
  }

  const payload = memory.payload;
  const source = payload.snippetSourcePath
    ? `${payload.snippetSourcePath}:${payload.snippetStartLine ?? '?'}-${payload.snippetEndLine ?? '?'}`
    : 'chat';
  const lang = payload.snippetLang ?? 'text';
  return [
    `${profile.retrieval.captureLabel}: ${payload.title}`,
    `${profile.labels.bodyFieldLabel}: ${payload.whatClicked}`,
    `${profile.labels.sourceFieldLabel} (${lang}):`,
    `\`\`\`${lang}`,
    payload.rawSnippet,
    '```',
    `${profile.retrieval.sourceLabel}: ${source}`,
  ].join('\n');
}

function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
