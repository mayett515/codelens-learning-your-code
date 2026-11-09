# Module ownership and dependencies

This is a capability map of the current app, with intended dependency rules for
changes. It is not a proposal to move everything into new top-level packages.
Paths below are relative to `codelens-rn/`; linked files are representative owners,
not an exhaustive call graph. Reinspect callers before changing a boundary.

## Product areas and current owners

| Capability | Primary owner | Responsibility |
| --- | --- | --- |
| Domain vocabulary and composition | [ontology types](../../codelens-rn/src/features/ontology/types.ts), [profileComposition](../../codelens-rn/src/features/ontology/profileComposition.ts), [profileSelection](../../codelens-rn/src/features/ontology/profileSelection.ts) | Meaning, selections, deterministic composition |
| Registry and activation | [profileRegistry](../../codelens-rn/src/features/ontology/profileRegistry.ts), [bootstrap](../../codelens-rn/src/features/ontology/data/profileRegistryBootstrap.ts) | Source identity/registration; IO stays in bootstrap |
| Ontology evolution | [pure branch apply](../../codelens-rn/src/features/ontology/branchLocalProposalApply.ts), [branch apply service](../../codelens-rn/src/features/ontology/data/branchLocalProposalApplyService.ts), [base apply service](../../codelens-rn/src/features/ontology/data/baseProfileProposalApplyService.ts) | Patch decisions versus atomic application |
| Proposal review/history | [lifecycle service](../../codelens-rn/src/features/ontology/data/profileChangeProposalLifecycleService.ts), [review service](../../codelens-rn/src/features/ontology/data/profileChangeProposalReviewService.ts) | Review transitions, replacement, audit ownership |
| Model context and fit | [contextAssembly](../../codelens-rn/src/features/ontology/contextAssembly.ts), [contextSelector](../../codelens-rn/src/features/ontology/contextSelector.ts), [userFitProjection](../../codelens-rn/src/features/ontology/userFitProjection.ts) | Assemble explicit facts, select bounded context, derive signals |
| Manual checker | [checker mapper](../../codelens-rn/src/features/ontology/checkerProposalMapper.ts), [checkerRunService](../../codelens-rn/src/features/ontology/data/checkerRunService.ts) | Interpret validated findings; orchestrate model call and pending insertion |
| Capture and classification | [saveCapture](../../codelens-rn/src/features/learning/services/saveCapture.ts), [profile context](../../codelens-rn/src/features/learning/services/conceptualizeProfileContext.ts) | User learning flow, classification and correction integration |
| Reusable knowledge | `src/features/learning/promotion`, `review`, `retrieval` | Promote, review and retrieve scoped concepts |
| Graph presentation | `src/features/graph/` | Present scoped concept relationships; not ontology mutation authority |
| Interaction | `app/`, feature `ui/`, `hooks/`, `state/`; chat/codeReader/personas/bookmarks | Routes, display, user actions and transient interaction state |
| Storage and external effects | `src/db/`, feature `data/`, `codecs/`, `src/ai/`, `src/adapters/` | Durable records, boundary translation, model/native services |
| Backup | `src/features/backup/` | Export/import compatible durable state; no independent schema dialect |
| Dependency wiring | [composition.ts](../../codelens-rn/src/composition.ts), `src/ports/` | Select implementations behind explicit contracts |

## Classify logic by responsibility

| Role | May do | Must delegate |
| --- | --- | --- |
| Pure domain decision | Calculate composition, validity, freshness, supported changes from arguments | DB, network, native APIs, ambient clock/randomness, UI |
| Use-case shell | Load facts, call policies, coordinate transactions/effects, return a result | Reusable business decisions to named policy functions |
| Codec/mapper | Parse untrusted representations and map into owned types | IO and concealed lifecycle decisions |
| Repository/adapter | Execute persistence/provider operations and normalize boundary failures | Product policy such as whether a proposal may apply |
| Hook/UI | Present state, collect user intent, coordinate query lifecycle | Schema evolution, cross-record transaction logic and domain validation |

A file called `service` can currently contain both decision and orchestration.
Classify functions before selecting an extraction; do not infer purity from the
directory name `ontology` or apply new layer names by filename alone.

## Dependency direction for new or changed code

- Pure ontology decisions depend on semantic contracts and pure helpers, not
  React, Expo, DB/native adapters, AI runtimes, feature hooks or learning storage.
- Application shells depend on pure decisions and explicit effect contracts.
  Concrete wiring belongs in the existing composition/bootstrap/service seam.
  Keep dependency injection proportional: a function argument or small dependency
  object is enough when it makes the real dependency explicit.
- Learning, graph and chat may consume ontology's public contracts. Do not make
  pure ontology policy reach back into these consumers. Shared meaning belongs
  to its domain owner, not a new generic `utils` module.
- UI invokes an existing use-case entrypoint/hook for mutation. Reading a feature
  query is different from owning the write transaction. Do not add direct profile
  SQL writes to UI or let checker import apply services as a shortcut.
- Codecs may import schema/provider types at the boundary; map them into domain
  contracts before pure decisions. A Drizzle row is not automatically the domain.
- Check both direct imports and re-exports. An apparently pure barrel can load
  persistence/native code. A new generic barrel is not a boundary by itself.

The repo has incremental conventions and exceptions. These rules are a direction
for touched code, not proof of an already clean dependency graph. An existing
violation does not justify spreading it; record a bounded exception with its
owner and removal condition when it cannot be resolved in the current scope.

## Extraction decision

Name the capability, its callers, business rules, state lifecycle, transaction
owner and external dependencies. Extract only when it gains a real owner,
independent change/test isolation or removes repeated policy. Preserve the
public facade and transaction ordering in a structural refactor. Keep shared
canonicalization and concurrency checks with one owner.

Conclude `keep cohesive`, `extract capability`, or `defer pending evidence`,
with concrete reasons. No file-count targets, folder-count targets or mandatory
one-class-per-function policy. Use the [slice template](refactor-workflow.md).
