export function computeStrength(familiarity: number, importance: number): number {
  const clampedFamiliarity = Math.min(1, Math.max(0, familiarity));
  const clampedImportance = Math.min(1, Math.max(0, importance));
  const importanceFloor = 0.1 * clampedImportance;
  return Math.min(1, importanceFloor + 0.7 * clampedFamiliarity + 0.3 * clampedImportance);
}
