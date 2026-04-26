import { computeStrength } from '../strength/computeStrength';
import type { LearningSession } from '../../../domain/types';
import type { LearningCapture, LearningConcept } from '../types/learning';

export function sortCapturesForHub(captures: LearningCapture[]): LearningCapture[] {
  return [...captures].sort((left, right) => {
    const byCreatedAt = right.createdAt - left.createdAt;
    if (byCreatedAt !== 0) return byCreatedAt;
    return left.id.localeCompare(right.id);
  });
}

export function sortConceptsForHub(concepts: LearningConcept[]): LearningConcept[] {
  return [...concepts].sort((left, right) => {
    const leftStrength = computeStrength(left.familiarityScore, left.importanceScore);
    const rightStrength = computeStrength(right.familiarityScore, right.importanceScore);
    const byStrength = leftStrength - rightStrength;
    if (byStrength !== 0) return byStrength;

    const byUpdatedAt = right.updatedAt - left.updatedAt;
    if (byUpdatedAt !== 0) return byUpdatedAt;

    return left.name.localeCompare(right.name);
  });
}

export function sortSessionsForHub(sessions: LearningSession[]): LearningSession[] {
  return [...sessions].sort((left, right) => {
    const byActivity = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (byActivity !== 0) return byActivity;
    return right.id.localeCompare(left.id);
  });
}
