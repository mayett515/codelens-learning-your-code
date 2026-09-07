export interface CaptureListFilters {
  /** Preferred: filter by profile/base IDs so type node ids stay scoped. */
  profileIds?: string[];
  /** Compatibility alias for a single profile filter. */
  profileId?: string;
}

export function normalizedCaptureProfileIds(filters: CaptureListFilters): string[] {
  return [...new Set([
    ...(filters.profileIds ?? []),
    ...(filters.profileId ? [filters.profileId] : []),
  ].map((value) => value.trim()).filter(Boolean))];
}

export function matchesCaptureListFilters(
  capture: { profileId: string },
  filters: CaptureListFilters,
): boolean {
  const allowedProfiles = normalizedCaptureProfileIds(filters);
  if (allowedProfiles.length === 0) return true;
  return allowedProfiles.includes(capture.profileId);
}
