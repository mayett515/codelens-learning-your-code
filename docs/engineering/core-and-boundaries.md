# Core and boundaries

Core functions decide from explicit inputs. Execution code loads state, asks for
a decision, performs the effect and exposes the result. Reusable business policy
belongs to named decisions, not hidden inside a mapper, controller or SQL helper.

- Pure decisions have no IO, logging or ambient mutable state. Supply time,
  randomness, IDs and snapshots as inputs. Arbitrary service access hidden in a
  context parameter is still a dependency.
- Model expected outcomes and lifecycle transitions explicitly. Preserve existing
  throw/result contracts in structural refactors; changing them is a behavior
  change. Programmer defects may throw.
- Choose a pure function, injected function, handler, service, adapter or process
  owner by responsibility. A class must own a lifecycle, resource or meaningful
  collaboration, not just wrap a calculation.
- Split by independent capability and change pressure. Identify callers, rules,
  dependencies, lifecycle and transaction owner first. Size prompts inspection;
  it does not decide extraction. Shared canonicalization has one owner.
- Preserve the public facade during structural extraction. Check callers and
  runtime dependencies, including re-exports and barrel side effects. Translate
  framework/provider/row representations at their boundaries.
- A resource guard returns the narrowed resource so callers need not recheck an
  unreachable optional-resource case with a second, inconsistent policy.
- Prefer ordinary control flow and named stages. Strategy maps suit meaningful
  variants; objects suit variants with dependencies/state. Avoid invisible
  execution order and custom combinator ecosystems.
- Plain TypeScript first. Matching libraries help substantial variant handling;
  Result libraries help repeated typed failure composition; Effect needs a real
  combination of lifecycle, interruption, retries and error coordination. Keep
  any experiment bounded and preserve plain public domain contracts.

Core purity is a responsibility, not a folder-name assumption. The leaf checker
guards dependencies of declared decision owners, not all possible side effects.
