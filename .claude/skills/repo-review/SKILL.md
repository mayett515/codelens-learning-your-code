---
name: repo-review
description: Assess module responsibilities, business-rule ownership, dependencies and unnecessary abstraction in a TypeScript repository or subsystem. Use for architecture reviews, not a formatting pass.
---

# Repository review

Paths below are repository-relative. Read `docs/engineering/README.md` and the
relevant capability parent/leaves in `docs/capabilities/`. The generated map is
a locator, not evidence that its claims are correct.

Inspect actual entrypoints, callers and changed/churning areas. Trace representative
use cases across pure decisions, orchestration, mapping, IO and presentation.
Compare product intent with actual implementation without letting either silently
replace the other. Existing folders are not the target architecture.

Judge an extraction by rule ownership, lifecycle, transaction root, dependencies
and change isolation. A cohesive large module can be appropriate; a small forwarding
class may add no owner. Confirm well-placed responsibilities as well as defects.

Return ranked evidence-backed findings: inspected location, concrete scenario,
consequence, smallest useful correction and missing proof. Distinguish policy from
mechanical enforcement and declared dependencies from observed imports. Check the
originating request, not a requirement reconstructed from the current diff.
