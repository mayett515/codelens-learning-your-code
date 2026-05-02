# Slice N0 - Parser Contract + Structural Read View

## Goal

Open one source file and render stable structural nodes without planning or executing edits.

This slice proves the app can create a shallow parse snapshot and show it as a mobile-friendly structural read view.

## Must Read

- `rewrite-spec/neuanordnung-slices/README.md`
- `rewrite-spec/11-NEUANORDNUNG-MAIN.md`
- `rewrite-spec/12-NEUANORDNUNG-ARCHITECTURE.md`
- `rewrite-spec/13-NEUANORDNUNG-ANTI-REGRESSION.md`
- `rewrite-spec/14-NEUANORDNUNG-PHASES.md`
- `rewrite-spec/03-ARCHITECTURE.md`
- `rewrite-spec/04-STATE-MODEL.md`

## Allowed Write Scope

```txt
codelens-rn/src/ports/code-parser.ts
codelens-rn/src/adapters/shallow-code-parser.ts
codelens-rn/src/features/neuanordnung/domain/parse-snapshot.ts
codelens-rn/src/features/neuanordnung/domain/node-id.ts
codelens-rn/src/features/neuanordnung/domain/standard-intents.ts
codelens-rn/src/features/neuanordnung/domain/validation.ts
codelens-rn/src/features/neuanordnung/ui/NeuanordnungScreen.tsx
codelens-rn/src/features/neuanordnung/ui/NodeBubbleList.tsx
codelens-rn/src/features/neuanordnung/ui/NodeBubble.tsx
codelens-rn/src/features/neuanordnung/index.ts
codelens-rn/app/neuanordnung/[fileId].tsx
```

Test files for the same modules are allowed.

## Required Build

<required_build>
1. Define `CodeParserPort`.
2. Define `ParseSnapshot`, `CodeNode`, import/export hints, and parser metadata types.
3. Implement stable node id creation.
4. Implement a shallow parser adapter good enough for TypeScript/React files.
5. Add standard intent hints as metadata only; do not create SRJ yet.
6. Render nodes in a FlatList with stable keys.
7. Keep the route file thin.
</required_build>

## Hard Constraints

<hard_constraints>
1. No SRJ draft creation in this slice.
2. No executor or patch application in this slice.
3. No deep project-wide AST analysis.
4. Parser failure must not break normal source viewing.
5. Node ids must not be array indexes.
6. UI does not store full file contents in Zustand.
</hard_constraints>

## Stop Conditions

<stop_conditions>
Stop and report if:
- source-file access is not implemented yet in the base app,
- there is no stable `FileId`/`SourceFile` model to read from,
- route structure differs from the architecture docs,
- a parser library choice requires new native code written by us.
</stop_conditions>

## Verification

Run or inspect:

- TypeScript compile.
- Unit tests for `createCodeNodeId`.
- Parser smoke test for at least one function, one class/component, and one export.
- Manual check that `[fileId]` route imports only from `@/src/features/neuanordnung`.

## Done When

Opening a file's Neuanordnung route shows structural bubbles with node kind, name, and line range.
No user action creates SRJ yet.
