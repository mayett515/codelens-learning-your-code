import { composeDomainProfile } from './profileComposition';
import type {
  ActiveDomainProfileActivationInput,
  ActiveDomainProfileSource,
  DomainProfile,
  ProfileOverlay,
} from './types';

/**
 * Resolve a `DomainProfile` from an explicit `ActiveDomainProfileSource`.
 *
 * Pure function: no caching, no module-level state, no mutation of inputs.
 *
 * - If `source.overlays` is omitted, null, or empty, returns `source.baseProfile`
 *   by reference.
 * - If overlays are present, returns `composeDomainProfile(source.baseProfile, overlays)`.
 */
export function resolveActiveDomainProfile<TItemTypeNodeId extends string = string>(
  source: ActiveDomainProfileSource<TItemTypeNodeId>,
): DomainProfile<TItemTypeNodeId> {
  const overlays = source.overlays;
  if (!overlays || overlays.length === 0) {
    return source.baseProfile;
  }
  return composeDomainProfile(source.baseProfile, overlays);
}

// ---------------------------------------------------------------------------
// Activation input helpers: grouped-overlay input -> ActiveDomainProfileSource
// ---------------------------------------------------------------------------

/**
 * Flatten a single optional overlay group into an array of overlays.
 * Returns an empty array for omitted, `null`, or empty groups; otherwise a shallow copy.
 */
function flattenGroup<TItemTypeNodeId extends string>(
  group: readonly ProfileOverlay<TItemTypeNodeId>[] | null | undefined,
): ProfileOverlay<TItemTypeNodeId>[] {
  if (!group) return [];
  return [...group];
}

/**
 * Create an `ActiveDomainProfileSource` from a caller-owned activation input
 * whose overlays are grouped by runtime role.
 *
 * Pure function: no caching, no module-level state, no mutation of inputs.
 *
 * Normalized overlay order:
 *   1. project overlays
 *   2. learning overlays
 *   3. personal overlays
 *
 * When all overlay groups are omitted, `null`, or empty, returns a source
 * with no `overlays` property.
 */
export function createActiveDomainProfileSource<TItemTypeNodeId extends string = string>(
  input: ActiveDomainProfileActivationInput<TItemTypeNodeId>,
): ActiveDomainProfileSource<TItemTypeNodeId> {
  const overlays = [
    ...flattenGroup(input.projectOverlays),
    ...flattenGroup(input.learningOverlays),
    ...flattenGroup(input.personalOverlays),
  ];

  if (overlays.length === 0) {
    return { baseProfile: input.baseProfile };
  }
  return { baseProfile: input.baseProfile, overlays };
}

/**
 * Convenience resolver that composes grouped overlays through the existing
 * `resolveActiveDomainProfile` pipeline.
 *
 * Equivalent to `resolveActiveDomainProfile(createActiveDomainProfileSource(input))`.
 */
export function resolveActiveDomainProfileFromActivationInput<TItemTypeNodeId extends string = string>(
  input: ActiveDomainProfileActivationInput<TItemTypeNodeId>,
): DomainProfile<TItemTypeNodeId> {
  return resolveActiveDomainProfile(createActiveDomainProfileSource(input));
}
