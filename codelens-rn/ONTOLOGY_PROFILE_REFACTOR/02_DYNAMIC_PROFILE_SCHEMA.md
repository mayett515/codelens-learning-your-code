# Dynamic Profile Schema

This file sketches the target shapes. Names are proposals, not final implementation commands.

## Stable Core Types

<core_principle>
Keep core persisted shapes small and durable.
Move domain-specific meaning into profile-defined metadata and ontology nodes.
</core_principle>

```ts
export interface KnowledgeCapture {
  id: KnowledgeCaptureId;
  title: string;
  body: string;
  context: string | null;
  sourceText: string;
  source: KnowledgeSource | null;
  state: CaptureState;
  linkedItemId: KnowledgeItemId | null;
  editableUntil: number;
  extractionConfidence: number | null;
  derivedFromCaptureId: KnowledgeCaptureId | null;
  embeddingStatus: EmbeddingStatus;
  embeddingRetryCount: number;
  classification: ClassificationResult | null;
  tagNodeIds: OntologyNodeId[];
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeItem {
  id: KnowledgeItemId;
  name: string;
  normalizedKey: string;
  summary: string | null;
  typeNodeId: OntologyNodeId;
  metadata: Record<string, unknown>;
  relationshipIds: KnowledgeRelationshipId[];
  representativeCaptureIds: KnowledgeCaptureId[];
  familiarityScore: number;
  importanceScore: number;
  createdAt: number;
  updatedAt: number;
}
```

## Domain Profile

```ts
export interface DomainProfile {
  id: string;
  version: number;
  label: string;
  description: string;
  labels: DomainLabels;
  ontology: OntologyProfile;
  metadataFields: MetadataFieldDefinition[];
  extraction: ExtractionProfile;
  embedding: EmbeddingProfile;
  retrieval: RetrievalProfile;
  promotion: PromotionProfile;
  review: ReviewProfile;
  graph: GraphProfile;
}
```

## Domain Labels

Labels let the same app engine speak the active profile's language.

```ts
export interface DomainLabels {
  hubTitle: string;
  captureSingular: string;
  capturePlural: string;
  itemSingular: string;
  itemPlural: string;
  saveAction: string;
  reviewModeTitle: string;
  strengthLabel: string;
  bodyFieldLabel: string;
  contextFieldLabel: string;
  sourceFieldLabel: string;
}
```

Default coding labels can preserve current wording:

```ts
export const codingLabels = {
  hubTitle: 'Learning Hub',
  captureSingular: 'Capture',
  capturePlural: 'Captures',
  itemSingular: 'Concept',
  itemPlural: 'Concepts',
  saveAction: 'Save Capture',
  reviewModeTitle: 'Review Mode',
  strengthLabel: 'Strength',
  bodyFieldLabel: 'What clicked',
  contextFieldLabel: 'Why it mattered',
  sourceFieldLabel: 'Snippet',
};
```

## Ontology Node

<ontology_node_rule>
Every category and subcategory needs human-readable meaning.
This meaning is for the LLM and the user, not just for UI display.
</ontology_node_rule>

```ts
export interface OntologyNode {
  id: OntologyNodeId;
  label: string;
  kind: 'category' | 'subcategory' | 'tag' | 'field' | 'relationshipType';
  parentId: OntologyNodeId | null;
  meaning: string;
  useWhen: string[];
  doNotUseWhen: BoundaryRule[];
  examples: string[];
  relatedNodeIds: OntologyNodeId[];
  contrastNodeIds: OntologyNodeId[];
  status: 'active' | 'suggested' | 'deprecated';
  createdBy: 'system' | 'user' | 'model';
  createdAt: number;
  updatedAt: number;
}
```

## Boundary Rules

Boundary rules are contextual "do not use" rules. They should not be generic.

Bad:

```text
Do not use React Hook Pattern when the insight is about stale data.
```

Better:

```text
Do not use React Hook Pattern when the main point is stale closure caused by a missing effect dependency.
Prefer Stale Closure Risk unless the reusable hook structure itself is the main insight.
```

Schema:

```ts
export interface BoundaryRule {
  id: string;
  text: string;
  preferNodeId?: OntologyNodeId | undefined;
  source: 'profile_seed' | 'user_correction' | 'checker_suggestion';
  evidenceIds: string[];
}
```

## Metadata Fields

```ts
export interface MetadataFieldDefinition {
  id: string;
  label: string;
  appliesTo: Array<'capture' | 'item'>;
  kind: 'string' | 'stringList' | 'number' | 'boolean' | 'enum' | 'date' | 'json';
  required: boolean;
  description: string;
  examples: unknown[];
  enumOptions?: Array<{ id: string; label: string; description?: string }>;
}
```

Coding examples:

```ts
[
  {
    id: 'languageOrRuntime',
    label: 'Language / Runtime',
    appliesTo: ['capture', 'item'],
    kind: 'stringList',
    required: false,
    description: 'Programming language, runtime, framework, or platform involved in the insight.',
    examples: ['TypeScript', 'React Native', 'SQLite'],
  },
  {
    id: 'architecturalPattern',
    label: 'Architecture Pattern',
    appliesTo: ['item'],
    kind: 'string',
    required: false,
    description: 'A named structure or recurring architecture shape.',
    examples: ['Repository pattern', 'Hexagonal port/adapter boundary'],
  },
]
```

## LLM Classification Result

```ts
export interface ClassificationResult {
  selectedNodeId: OntologyNodeId | null;
  confidence: number;
  reasoningSummary: string;
  alternatives: Array<{
    nodeId: OntologyNodeId;
    confidence: number;
    whyNotSelected: string;
  }>;
  suggestedNode?: SuggestedOntologyNode | undefined;
  boundaryRuleSuggestion?: BoundaryRuleSuggestion | undefined;
}
```

## Suggested Ontology Node

```ts
export interface SuggestedOntologyNode {
  proposedId: string;
  label: string;
  parentId: OntologyNodeId | null;
  kind: 'category' | 'subcategory' | 'tag';
  meaning: string;
  examples: string[];
  whyExistingNodesDoNotFit: string;
}
```

## Migration Strategy

<migration_strategy>
Add flexible profile-owned fields before removing old coding-specific fields.
Backfill existing coding data into metadata_json.
Keep old fields readable until all UI/retrieval/promotion paths read through profile-aware mappers.
</migration_strategy>

Suggested additions:

```text
concepts.profile_id
concepts.type_node_id
concepts.metadata_json
learning_captures.profile_id
learning_captures.classification_json
learning_captures.metadata_json
ontology_nodes
ontology_edges
ontology_patch_suggestions
ontology_corrections
```

