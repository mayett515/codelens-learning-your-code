# Why This Exists

This file captures the intent behind the ontology/profile refactor so future agents do not have to reconstruct it from scattered chat history.

## The Human Intent

<human_intent>
The user wants to build CodeLens first as a serious personal coding learning tool.
The app should help capture coding insights, connect them into a graph, retrieve them during chat, review weak knowledge, and evolve the user's personal coding ontology over time.
</human_intent>

This is not a request to make a vague generic app. The coding profile should be strong, opinionated, and useful because it is the real first product.

## The Forkability Intent

<forkability_intent>
The engine should not be permanently welded to one hardcoded coding taxonomy.
Future profiles should be possible for another programmer's ontology, math, writing, photography, personal notes, or other domains.
</forkability_intent>

Future profiles should mainly change:

- ontology/category definitions
- prompts
- metadata fields
- labels
- graph visual encoding
- profile-specific review/promotion/retrieval rules

They should not require rewriting the whole save flow, retrieval engine, promotion flow, review flow, or graph engine.

## Where This Came From

The sandbox worktree had a better categorization pattern:

```text
model provides structured category metadata
parser validates it
local code fills only obvious missing metadata
invalid values are diagnosed/dropped
UI reads structured metadata
```

The main app still has more hardcoded coding-learning assumptions:

```text
fixed concept types
coding-specific extractor prompt
programming-specific metadata fields
coding wording in cards and retrieval
promotion rules that know programming tokens
graph visual encoding tied to current concept fields
```

The refactor exists to bring the main app closer to the sandbox's dynamic-but-validated idea.

## What Dynamic Means

Dynamic does not mean the model can invent permanent structure whenever it wants.

<dynamic_but_controlled>
The model can suggest a category, subcategory, boundary rule, or ontology change.
The app stores that as a suggestion.
The user/profile owner approves, edits, rejects, or postpones it.
Only approved changes become durable profile ontology.
</dynamic_but_controlled>

## User Correction Is Core

If the app classifies a capture wrong and the user corrects it, that correction should become evidence.

Example:

```text
App: Saved as React Hook Pattern.
User: No, this is about stale closure from a missing dependency.
App: Should I remember this boundary?
     Do not classify missing dependency stale closure as React Hook Pattern.
     Prefer Stale Closure Risk.
```

This lets the ontology become personal and context-aware.

## Refactor Sequence

<sequence>
1. Refactor the core so the coding profile is no longer welded into the engine.
2. Keep the current coding behavior working.
3. Build the personal coding tool seriously on top of the new profile system.
4. Add lightweight demo profiles later to prove forkability.
</sequence>

Do not build every possible future profile before the coding product is good.

## Why Demo Profiles Matter Later

Before publishing or showing the app, a small math or photography profile can prove:

```text
Same app.
Different profile.
Different category tree.
Different extractor prompt.
Different metadata fields.
Same capture/retrieval/graph engine.
```

That demonstration is valuable, but it should not block building the real coding profile first.

## Success Criteria

<success_criteria>
- The coding product remains excellent.
- Coding assumptions move into a default coding profile.
- Future profiles can exist without rewriting the engine.
- User corrections can improve ontology boundary rules.
- The ontology checker can suggest profile improvements with evidence.
- The user remains the final authority over durable ontology changes.
</success_criteria>

