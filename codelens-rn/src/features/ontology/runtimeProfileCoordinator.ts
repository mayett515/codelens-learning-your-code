import { resolveActiveDomainProfileFromActivationInput } from './profileActivation';
import type { ActiveDomainProfileActivationInput, DomainProfile } from './types';

/**
 * Runtime Profile Coordinator input - re-exported as a named type alias so
 * callers can import it from this module without reaching into `types.ts`.
 */
export type RuntimeProfileCoordinatorInput<TItemTypeNodeId extends string = string> =
  ActiveDomainProfileActivationInput<TItemTypeNodeId>;

/**
 * Compose a `DomainProfile` from grouped activation input.
 *
 * This is the explicit, above-services coordinator boundary: it accepts
 * caller-owned input, delegates to the existing grouped activation pipeline,
 * and returns a composed profile. It has no state, no persistence, and no
 * side effects - it is a pure function.
 *
 * Runtime services receive the resulting `DomainProfile` and do not know
 * about branch groups, activation input resolvers, or global active-profile
 * state.
 */
export function composeRuntimeDomainProfile<TItemTypeNodeId extends string = string>(
  input: RuntimeProfileCoordinatorInput<TItemTypeNodeId>,
): DomainProfile<TItemTypeNodeId> {
  return resolveActiveDomainProfileFromActivationInput(input);
}
