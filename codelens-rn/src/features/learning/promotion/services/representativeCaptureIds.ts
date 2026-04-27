import type { LearningCaptureId } from '../../types/ids';
import type { LearningCapture } from '../../types/learning';

export function pickRepresentativeCaptureIds(captures: LearningCapture[]): LearningCaptureId[] {
  return captures
    .slice()
    .sort((left, right) => {
      const leftConfidence = left.extractionConfidence ?? -1;
      const rightConfidence = right.extractionConfidence ?? -1;
      if (leftConfidence !== rightConfidence) return rightConfidence - leftConfidence;
      if (left.createdAt !== right.createdAt) return right.createdAt - left.createdAt;
      return left.id.localeCompare(right.id);
    })
    .slice(0, 3)
    .map((capture) => capture.id);
}
