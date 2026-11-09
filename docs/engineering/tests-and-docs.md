# Tests, comments and claims

- Test observable decisions/effects and relevant failure paths. Do not mirror
  implementation in assertions or mock the module under test. Keep doubles in tests.
- Exercise each meaningful arm of a domain outcome union. A correctness finding
  beyond the typecheck needs a regression test or an explicit deferred-proof note
  explaining the missing evidence; do not imply compiler coverage.
- Match proof to responsibility: pure policy uses direct tests; transactions
  need actual persistence; navigation/native wiring needs a compatible running app.
  A mocked callback does not prove rollback.
- Keep meaningful valid fixtures isolated; mark invalid-input cases explicitly.
  Property testing helps combinatorial laws but is not a universal dependency.
- Review the original requirement as well as technical soundness. A sound
  implementation of the wrong behavior is still a failed outcome.
- Comments explain reasons, ordering, constraints or workarounds. Update them
  when responsibilities move; avoid narrating syntax or cataloging trivial helpers.
- Update the owning doc/leaf when behavior, lifecycle, commands or ownership changes.
  Keep intent, implementation and executed proof distinct. Do not universalize
  an incident without evidence that the rule belongs at that scope.
- A rename also reaches strings, configuration, comments and documentation.
  Search retired names, preserve deliberate historical records and repair stale
  claims rather than mechanically substituting words. Guard a retirement when
  recurrence would be a real regression; compilation alone cannot enforce it.
- Mechanically checkable claims belong in a fitting compiler/lint/guard/test.
  Demonstrate a negative case for a new guard. A proof filename or hook config
  is not evidence that a behavior passed or a hook ran.
- Report checks actually run and missing evidence. Dynamic counts belong in
  generated output or dated reports. Maps cannot prove more than their bound facts.
