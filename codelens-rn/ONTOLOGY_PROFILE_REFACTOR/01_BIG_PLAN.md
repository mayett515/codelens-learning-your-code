# Big Plan

## Product North Star

<north_star>
CodeLens is a personal knowledge capture and graph system.
The default profile is coding.
The app should eventually support user-specific and fork-specific ontology profiles without rewriting core app logic.
</north_star>

The current product can still say "Learning Hub", "Save Capture", "Concept", and "What clicked" if the active profile is the coding profile. But those words must become profile-owned labels instead of deep assumptions.

## Explain Like I Am 5

Right now the app has boxes with labels printed directly on the plastic:

```text
Concept
  conceptType = mechanism | api_idiom | debugging_heuristic
  architecturalPattern
  programmingParadigm
  languageOrRuntime
```

That is strong for coding, but weak for forkability.

We want reusable boxes with removable labels:

```text
KnowledgeCapture
  title
  body
  context
  source
  tags
  metadata

KnowledgeItem
  name
  summary
  typeNodeId
  metadata
  relationships
  representativeCaptures
```

Then the coding profile attaches coding labels:

```text
Capture body = What clicked
Capture context = Why it mattered
Source = Code snippet / chat text
Item = Concept
Item types = mechanism, mental model, API idiom, failure mode
Metadata = language/runtime, architecture pattern, programming paradigm
```

A photography profile could attach different labels:

```text
Capture body = What I noticed
Capture context = Why the shot worked
Source = Photo note / EXIF / image region
Item = Technique
Item types = composition, lighting pattern, lens choice
Metadata = focal length, aperture, lighting condition
```

Same app engine. Different profile.

## Architecture Goal

<architecture_goal>
Introduce a profile and ontology seam before doing broad renames.
Keep the current coding behavior working while moving hardcoded coding assumptions into the default coding profile.
</architecture_goal>

## Main Concepts

### Domain Profile

A domain profile is the complete active meaning system.

```text
DomainProfile
  id
  labels
  ontology
  metadata field definitions
  extraction prompt rules
  embedding text builders
  retrieval formatting rules
  promotion rules
  review rules
  graph visual encoding
```

### Ontology

The ontology is the category graph inside the profile.

```text
Ontology
  categories
  subcategories
  tags
  relationship types
  boundary rules
  examples
  user corrections
```

### Ontology Checker

The ontology checker is a periodic or manual review assistant.

It looks at:

- current ontology definitions
- saved captures
- promoted concepts/items
- uncertain classifications
- user corrections
- repeated custom categories
- category conflicts

It suggests:

- add a category
- split a category
- merge categories
- move a subcategory
- add a boundary rule
- promote a tag into a subcategory
- demote a category into a tag
- improve category descriptions

The checker never silently changes the durable profile.

## Why This Is Better Than Only "Dynamic Categories"

Dynamic categories alone can become messy. A real profile makes the system understandable:

```text
Category has meaning.
Subcategory has parent.
Parent has boundaries.
User corrections become evidence.
Checker proposes changes.
User approves durable ontology evolution.
```

## Strategic Outcome

<strategic_outcome>
The app remains coding-first today.
The codebase becomes profile-driven enough that future forks change profile definitions instead of rewriting extraction, cards, retrieval, promotion, review, and graph code.
</strategic_outcome>

