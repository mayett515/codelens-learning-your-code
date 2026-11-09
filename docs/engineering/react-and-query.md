# React and query state (only for React applications)

- Keep render pure. Distinguish pending, blocked, empty, failed and successful
  states where meaningful. Parse untrusted values before render.
- Follow hook ordering and honest effect dependencies. User-triggered writes
  belong in handlers/mutations, not effect toggles. Clean up async work so stale
  results cannot overwrite newer state.
- Separate transient input from durable business state. Submit through the owning
  use case and expose errors; local state is not hidden persistence authority.
- Use the application's query mechanism. With TanStack Query, use owned stable
  keys containing every data-changing input, including scope, and invalidate
  affected keys after successful writes.
- A cache update does not prove a commit. Detached refresh is appropriate only
  where stale display is the accepted failure mode and errors are handled.
- Preserve component identity and state locality. Memoize for demonstrated work
  or identity needs. Give independently failing surfaces appropriate error and
  loading boundaries; guard browser-only APIs on non-browser platforms.
- Routing, forms, tables and virtualization are separate adoption decisions.
  These rules do not import TanStack Router or web APIs into native code.

Kordex's target core does not depend on React to define its meaning.
