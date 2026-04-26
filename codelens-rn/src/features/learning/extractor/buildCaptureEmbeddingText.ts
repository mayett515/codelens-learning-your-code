import type { SaveModalCandidateData } from '../types/saveModal';

export function buildCaptureEmbeddingText(candidate: SaveModalCandidateData): string {
  return [
    candidate.title,
    candidate.whatClicked,
    candidate.whyItMattered ?? '',
    candidate.rawSnippet.slice(0, 800),
  ]
    .filter(Boolean)
    .join('\n\n');
}
