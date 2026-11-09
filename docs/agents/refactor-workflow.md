# Bounded refactor workflow

Use for a meaningful module, type, persistence or orchestration change. Small
local fixes can use a brief working note; do not manufacture a document ceremony.

1. **Locate the requirement.** State the user-visible outcome and whether this is
   behavior-preserving restructuring or an intentional behavior change. Read the
   owning decision, [module map](module-map.md) and relevant [baseline](baseline.md).
   Locate the capability in the [root](../capabilities/ROOT.md), domain parent
   and adjacent leaf. These describe intent and claims; verify them in source.
2. **Trace a complete path.** Follow input through route/store, application,
   decision, codec/repository and read-back. Find callers, writes, events and
   downstream query invalidation. Inspect source; a generated graph is a locator.
3. **Assign responsibility.** Distinguish product capability from module role and
   individual function intent. Name one owner for each rule and transaction;
   identify competing definitions and actual dependency edges.
4. **Choose the smallest change.** Keep cohesive code where ownership already
   works. For extraction, define the facade and invariants that stay unchanged.
   Record significant unresolved product choices; do independent authorized work
   while clarifying them. No prescribed approval keywords are required.
5. **Implement one coherent slice.** Avoid combining schema migration, dependency
   adoption, broad file moves and behavior fixes into an unreviewable rewrite.
   For codemods, inspect representative matches and diffs first. Update consumers
   with the owner rather than leaving two authoritative contracts.
   Carry renames into live prose/configuration, preserving historical records.
6. **Prove the outcome.** Select checks from [verification](verification.md).
   For behavior changes, include the relevant failure path and regression case.
   Update code-linked docs and explain any remaining integration gap.
   Update affected leaves and run the [repository gate](../../tools/README.md).
   Keep gaps visible; a green map must not be bought by weakening a valid check.

## Slice template

```text
Requirement and observable outcome:
Current source path and callers:
Product capability / primary module owner:
Logic roles: decision / orchestration / translation / IO / presentation
Invariant and canonical type/schema owner:
Transaction, lifecycle and concurrency owner:
Dependencies before -> after:
Choice: keep cohesive / extract capability / defer pending evidence
Behavior preserved / intentional behavior change:
Compatibility, migration and affected consumers:
Verification and failure-case proof:
Open decision or bounded exception with removal condition:
```

This is a design aid, not a mandate to implement a new operation framework.
If a future slice adds an operation kind, it needs a coherent schema, validation,
preview, guarded apply, lifecycle/audit behavior and tests before any producer
can emit it as executable. Names from old chats are not existing APIs.

Report the result by requirement: what now works, why its ownership is clearer,
what proved it and what remains unverified. Do not infer success from a clean
typecheck when the user asked for working runtime behavior.
