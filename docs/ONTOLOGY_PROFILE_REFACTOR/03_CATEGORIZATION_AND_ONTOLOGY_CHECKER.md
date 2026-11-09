# Categorization And Ontology Checker

## Existing Inspiration From Sandbox

The sandbox chat engine already has the right philosophy:

<sandbox_pattern>
- Model output is the source of truth for classification.
- Parser validates shape and allowed values.
- Local categorizer fills only obvious missing metadata.
- Invalid values are dropped or diagnosed.
- UI renders structured metadata instead of guessing from text.
</sandbox_pattern>

Main should adopt this pattern for durable knowledge classification.

## Category Descriptions For The LLM

Every ontology node should be described in a human way, similar to MCP server/tool descriptions.

```md
<ontology_node id="react-hook-pattern">
Label: React Hook Pattern
Parent: API Pattern
Meaning: A reusable way React code organizes behavior through hooks, lifecycle, state, or custom hook boundaries.
Use when:
- The insight is mainly about the reusable structure of hook-based code.
- The user is learning how state/effects/callbacks are organized through hook APIs.
Do not use when:
- The main point is stale closure caused by a missing effect dependency. Prefer stale-closure-risk.
- The main point is a one-off runtime failure rather than the reusable hook structure.
Examples:
- extracting a custom hook
- useEffect cleanup lifecycle
- useMemo/useCallback dependency shape
Related:
- lifecycle-boundary
- state-synchronization
Contrast:
- stale-closure-risk
</ontology_node>
```

## Dynamic But Controlled

<control_rule>
The model may suggest taxonomy changes.
The model must not silently change durable ontology.
User approval is required for profile mutations.
</control_rule>

## Save Flow With Correction

When the user saves a capture:

```text
1. App sends selected text plus active ontology profile to extractor/classifier.
2. Model returns capture candidate plus classification.
3. App shows the user the proposed category/subcategory.
4. User accepts or corrects.
5. Correction is stored as ontology evidence.
6. App may suggest a boundary rule or category change.
7. User approves, edits, or rejects that ontology patch.
```

Example correction:

```text
App: Saved as React Hook Pattern.
User: No, this is about stale closure from missing dependency.
App: I can remember this boundary:
     Do not classify missing dependency stale closure as React Hook Pattern.
     Prefer Stale Closure Risk.
     Apply this rule to your coding profile?
```

## Uncertain Classification

<definition name="uncertain_classification">
An uncertain classification is any signal that the current ontology may not cleanly fit the saved capture or concept.
</definition>

Signals:

- model confidence is low
- two or more categories have close confidence
- model says no existing category fits cleanly
- model suggests a new node
- user edits category soon after save
- similar captures were classified into different nodes
- classification violates a boundary rule
- capture uses a temporary `x-*` node
- repeated tags appear that are not represented in the ontology tree

## Ontology Checker

The checker is a periodic or manual review assistant for the user's ontology profile.

<checker_scope>
The checker reviews profile quality.
It does not classify one capture only.
It looks across many captures, items, tags, corrections, and uncertainty signals.
</checker_scope>

Inputs:

- active DomainProfile
- OntologyNode definitions
- recent captures
- promoted items/concepts
- user corrections
- classification confidence history
- `x-*` temporary nodes
- repeated tags and keywords
- promotion clusters

Outputs:

```ts
export type OntologyPatchSuggestion =
  | AddNodeSuggestion
  | SplitNodeSuggestion
  | MergeNodesSuggestion
  | MoveNodeSuggestion
  | RenameNodeSuggestion
  | DeprecateNodeSuggestion
  | AddBoundaryRuleSuggestion
  | PromoteTagSuggestion
  | DemoteNodeSuggestion
  | ImproveDescriptionSuggestion;
```

Example:

```json
{
  "kind": "add_boundary_rule",
  "targetNodeId": "react-hook-pattern",
  "reason": "The user corrected 4 captures where useEffect dependency bugs were misclassified as hook patterns.",
  "rule": {
    "text": "Do not use when the main point is stale closure caused by a missing dependency.",
    "preferNodeId": "stale-closure-risk"
  },
  "evidenceIds": ["lc_1", "lc_2", "lc_3", "lc_4"]
}
```

## Checker Timing

Recommended UX:

```text
Ontology Review
  Run now
  Last checked: 2026-05-02 14:35
  Suggested next check: after 20 new captures or 14 days
  Reminder: on/off
```

<checker_timing_rules>
- Checker is always manually available.
- Reminders can be disabled.
- Disabling reminders does not disable manual checking.
- The app may show a quiet settings hint if ontology review has not run for a long time.
- No pushy notifications unless the user opted in.
</checker_timing_rules>

## Prompt Shape For Checker

Use Markdown for readability and XML tags for strict boundaries.

```md
# Ontology Review Task

You are reviewing a user's active ontology profile.
Suggest profile improvements only when evidence supports them.

<active_profile>
...
</active_profile>

<ontology_nodes>
...
</ontology_nodes>

<recent_captures>
...
</recent_captures>

<user_corrections>
...
</user_corrections>

<rules>
- Do not rewrite the user's captures.
- Do not silently apply ontology changes.
- Suggest patches only.
- Every patch must include evidenceIds and a reason.
- Prefer improving boundary rules before adding new categories.
- Add a new category only when existing nodes do not fit cleanly.
</rules>
```

## Patch Approval

<approval_rule>
Every ontology patch must be inspectable before apply.
The user can accept, edit, reject, or postpone each patch.
</approval_rule>

