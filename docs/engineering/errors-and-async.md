# Errors, execution and concurrency

- Separate invalid input, forbidden action, business refusal, transient failure
  and programmer defects. Empty results differ from failed queries. Branch on
  stable codes rather than messages; preserve the existing error dialect.
- Use one failure dialect per layer; do not use `null` or `undefined` for several
  distinct failure modes. Existing mixtures require an explicit migration, not
  an incidental change during a structural refactor.
- Normalize unknown caught values at the owning boundary, preserve causes and
  log once with safe context. Do not expose secrets or raw provider payloads.
  Explain intentionally ignored failures; do not convert them to fake success.
- Include safe context about the attempted operation where callers need it to
  choose recovery; do not expose raw payloads or make them parse error prose.
- Give outbound work bounded lifetime and propagate cancellation where supported.
  A timeout race does not cancel its loser. Cancellation is not successful emptiness.
- Bound fan-out. Retry only when semantics tolerate repetition, with limits and
  backoff. Preserve different use cases' intentional retry policies.
- Choose concurrency by semantics. Independent observations can return partial
  results; one atomic change cannot. `allSettled` does not repair a partial commit.
- Keep network/model calls outside DB transactions. Revalidate their input state
  before committing if it may have changed. Name cleanup and recovery owners.
- Durable jobs/external writes need explicit idempotency, crash/retry behavior
  and acknowledgement boundaries. Acceptance is distinct from downstream success.
- Transport adapters map owned outcomes to stable safe responses. Authorization
  uses trusted identity and resource scope, not merely valid IDs or permission prose.

These rules do not mandate queues, BullMQ, Redis or a distributed runtime.
