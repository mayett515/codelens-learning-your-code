import type { RetrievedMemory } from '../../retrieval/types/retrieval';

export function sortPreviewMemories(memories: RetrievedMemory[]): RetrievedMemory[] {
  return [...memories].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (left.kind !== right.kind) return left.kind === 'concept' ? -1 : 1;
    return String(left.id).localeCompare(String(right.id));
  });
}
