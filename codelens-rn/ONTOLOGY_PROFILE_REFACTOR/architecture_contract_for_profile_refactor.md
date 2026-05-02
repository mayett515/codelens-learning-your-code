# Architecture Contract For Profile Refactor

This is the local, adjusted contract for agents working specifically on the ontology/profile refactor. It extends the root [whatwe_agreedonthearchitecture.md](../whatwe_agreedonthearchitecture.md).

<inherits>
All root architecture rules still apply:
- thin route screens
- feature-owned modules
- barrel discipline
- query key factories
- Zod boundary parsing
- transaction discipline
- strict TypeScript
- loud critical failures
- local-first embedding direction
- testable pure logic
</inherits>

## Profile Refactor Constraints

<hard_constraints>
- Keep the current coding app usable at every stage.
- Treat coding as the first and strongest default profile, not a weak generic demo.
- Move domain-specific taxonomy, prompts, labels, metadata, promotion rules, retrieval formatting, and graph visual encoding into profile-owned definitions over time.
- Do not add scattered hardcoded coding ontology assumptions.
- Do not let the model silently mutate durable ontology.
- User/profile owner approval is required before ontology suggestions become active profile changes.
- Add flexible metadata/profile fields before removing old coding-specific columns.
- Keep backup/import/export in sync with any persistence changes.
</hard_constraints>

## Logic Gates

<logic_gate>
IF a change touches concept types,
THEN use the active profile ontology instead of adding a scattered enum.

IF a change touches capture/concept metadata,
THEN check whether it belongs in profile metadata field definitions.

IF a change touches extractor prompts,
THEN profile-owned ontology descriptions and boundary rules should drive classification guidance.

IF a change touches retrieval memory formatting,
THEN use profile labels and profile formatters.

IF a change touches graph visual encoding,
THEN visual meaning should come from profile-owned node/relationship definitions.

IF a model suggests a new category/subcategory/boundary rule,
THEN store an ontology patch suggestion, not an automatic durable mutation.
</logic_gate>

## Verification

<verification>
- TypeScript passes.
- Relevant Vitest tests pass.
- Static grep shows no new hardcoded `queryKey: [` arrays.
- Static grep shows no persona/chat prompt composition imported into extractor internals.
- Static grep shows no new `as any`.
- Existing coding save flow still works.
- Current coding profile behavior is preserved unless the product decision says otherwise.
</verification>

