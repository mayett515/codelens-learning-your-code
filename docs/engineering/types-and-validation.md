# Types and validation

- Name domain concepts and distinguish mutually exclusive states with unions.
  Use required fields per variant instead of flags/optional fields that admit
  impossible combinations. Audit producers and stored values before changing a contract.
- Identify one owner for a definition. Derive from runtime registries with
  `keyof typeof`/`satisfies`, schemas with `z.output`, or generated code at its
  boundary. Plain domain unions are often the clearest source themselves.
  Shape equality does not make differently meaningful concepts duplicates.
- Treat model/provider/file/DB JSON/network input as `unknown` until parsed.
  Distinguish pre-parse `z.input` from parsed `z.output` when transforms, defaults
  or coercions differ. A cast does not establish runtime validity.
- Decide unknown-key behavior explicitly. Strict schemas suit closed internal
  commands; stripping or passthrough needs a compatibility reason. Tighten an
  existing schema one contract at a time after checking its producers.
- Omission, `undefined` and `null` are different contracts. Use optional for a
  legitimately absent property and nullable for explicit null. Preserve `strict`
  and `exactOptionalPropertyTypes`.
- Distinguish a missing value from a valid falsy one: `0`, `false` and an empty
  string must not trigger a missing-value fallback when the contract permits them.
- Parse representation once at each trust boundary. Then check named semantic
  invariants in the domain. Re-read and recheck mutable state at a write/process
  boundary: earlier parsing cannot establish present freshness or access.
- Map expected invalid external input into an owned failure. Do not leak Zod or
  provider internals through public contracts. Preserve the existing error dialect.
- When parsing allows a fallback, model it as a named outcome with its reason;
  a silent catch must not make degraded model output look like normal success.
- Use checked brands where they prevent real identity mix-ups. Carry scope where
  identifiers can collide. Avoid scattered casts or brands on every primitive.
- Exhaust closed variants; reject unknown executable operations. An extensible
  display category can have an explicit unknown/other case without making
  unsupported commands executable.
- Prefer narrowing to `any`, double casts or suppression. Necessary interop escapes
  belong to one tested boundary. Keep recursive schemas and type machinery proportional.
