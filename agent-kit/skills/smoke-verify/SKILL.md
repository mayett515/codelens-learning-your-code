---
name: smoke-verify
description: Verify a changed runtime boundary by exercising its real entrypoint, such as a CLI, native app flow, database integration, API or worker. Use for runtime wiring; typecheck alone is insufficient.
---

# Runtime smoke verification

Paths below are repository-relative. Identify the changed boundary and a reversible
representative request or scenario. Read `docs/agents/verification.md` for the
actual environment and commands; do not assume a web server or Node test can
exercise native app behavior.

Start the appropriate runtime when available, invoke the real entrypoint and
inspect the resulting state and relevant failure path. For DB atomicity use an
actual transaction with a failing step, not a callback mock. For repository CLI
tools invoke the command and verify its exit code and generated output.

Preserve the user's authorization scope; a smoke check does not authorize external
publishing or destructive production changes. Report exactly what was exercised,
observed and unavailable. Keep static, mocked and runtime evidence distinct.
