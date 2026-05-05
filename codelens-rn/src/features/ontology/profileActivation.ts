import { composeDomainProfile } from './profileComposition';
import type { ActiveDomainProfileSource, DomainProfile } from './types';

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
