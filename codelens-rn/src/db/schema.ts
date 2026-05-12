import { sqliteTable, text, integer, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  source: text('source', { enum: ['github', 'paste'] }).notNull(),
  githubUrl: text('github_url'),
  createdAt: text('created_at').notNull(),
  recentFileIds: text('recent_file_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
});

export const files = sqliteTable('files', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  content: text('content').notNull(),
  marks: text('marks', { mode: 'json' }).notNull().$type<
    Array<{ line: number; color: string; depth: number }>
  >().default([]),
  ranges: text('ranges', { mode: 'json' }).notNull().$type<
    Array<{
      startLine: number;
      endLine: number;
      color: string;
      depth: number;
    }>
  >().default([]),
});

export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  systemPromptLayer: text('system_prompt_layer').notNull(),
  iconEmoji: text('icon_emoji'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(100),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  uniqueIndex('idx_personas_name').on(t.name),
  index('idx_personas_sort').on(t.sortOrder, t.name),
]);

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  scope: text('scope', { enum: ['section', 'general', 'learning'] }).notNull(),
  projectId: text('project_id'),
  fileId: text('file_id'),
  startLine: integer('start_line'),
  endLine: integer('end_line'),
  folderId: text('folder_id'),
  conceptId: text('concept_id'),
  personaId: text('persona_id').references(() => personas.id, { onDelete: 'set null' }),
  // Stage 8: modelOverride is the legacy free-form override; modelOverrideId is the catalog-backed selector.
  modelOverrideId: text('model_override_id'),
  modelOverride: text('model_override', { mode: 'json' }).$type<{
    provider: 'openrouter' | 'siliconflow';
    model: string;
    fallbackModels?: {
      openrouter: string[];
      siliconflow: string[];
    } | undefined;
    allowCrossProviderFallback?: boolean | undefined;
    freeTierFallbacksOnly?: boolean | undefined;
  } | null>(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});

export const learningSessions = sqliteTable('learning_sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  source: text('source', { enum: ['chat', 'bubble'] }).notNull(),
  sourceChatId: text('source_chat_id').notNull(),
  conceptIds: text('concept_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  createdAt: text('created_at').notNull(),
  rawSnippet: text('raw_snippet').notNull(),
});

export const concepts = sqliteTable('concepts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  normalizedKey: text('normalized_key').notNull().default(''),
  canonicalSummary: text('canonical_summary'),
  conceptType: text('concept_type', {
    enum: [
      'mechanism',
      'mental_model',
      'pattern',
      'architecture_principle',
      'language_feature',
      'api_idiom',
      'data_structure',
      'algorithmic_idea',
      'performance_principle',
      'debugging_heuristic',
      'failure_mode',
      'testing_principle',
    ],
  }).notNull().default('mental_model'),
  coreConcept: text('core_concept'),
  architecturalPattern: text('architectural_pattern'),
  programmingParadigm: text('programming_paradigm'),
  languageOrRuntime: text('language_or_runtime_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  surfaceFeatures: text('surface_features_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  prerequisites: text('prerequisites_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  relatedConcepts: text('related_concepts_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  contrastConcepts: text('contrast_concepts_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  representativeCaptureIds: text('representative_capture_ids_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  familiarityScore: real('familiarity_score').notNull().default(0),
  importanceScore: real('importance_score').notNull().default(0),
  embeddingTier: text('embedding_tier', { enum: ['hot', 'cold'] }).notNull().default('cold'),
  lastAccessedAt: integer('last_accessed_at'),
  languageSyntaxLegacy: text('language_syntax_legacy'),
  taxonomy: text('taxonomy', { mode: 'json' }).notNull().$type<{
    domain?: string | undefined;
    subdomain?: string | undefined;
    pattern?: string | undefined;
    language?: string | undefined;
    tags: string[];
  }>().default({ tags: [] }),
  sessionIds: text('session_ids', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  profileId: text('profile_id').notNull().default('coding'),
  typeNodeId: text('type_node_id').notNull().default(''),
  metadataJson: text('metadata_json', { mode: 'json' }).notNull().$type<Record<string, string>>().default({}),
  strength: real('strength').notNull().default(0.5),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  uniqueIndex('unique_concepts_normalized_key').on(t.normalizedKey),
  index('idx_concepts_concept_type').on(t.conceptType),
  index('idx_concepts_tier').on(t.embeddingTier),
  index('idx_concepts_last_accessed').on(t.lastAccessedAt),
]);

export const learningCaptures = sqliteTable('learning_captures', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  whatClicked: text('what_clicked').notNull(),
  whyItMattered: text('why_it_mattered'),
  rawSnippet: text('raw_snippet').notNull(),
  snippetLang: text('snippet_lang'),
  snippetSourcePath: text('snippet_source_path'),
  snippetStartLine: integer('snippet_start_line'),
  snippetEndLine: integer('snippet_end_line'),
  chatMessageId: text('chat_message_id'),
  sessionId: text('session_id'),
  state: text('state', { enum: ['unresolved', 'linked', 'proposed_new'] }).notNull().default('unresolved'),
  linkedConceptId: text('linked_concept_id').references(() => concepts.id, { onDelete: 'set null' }),
  editableUntil: integer('editable_until').notNull(),
  extractionConfidence: real('extraction_confidence'),
  derivedFromCaptureId: text('derived_from_capture_id'),
  embeddingStatus: text('embedding_status', { enum: ['pending', 'ready', 'failed'] }).notNull().default('pending'),
  embeddingRetryCount: integer('embedding_retry_count').notNull().default(0),
  embeddingTier: text('embedding_tier', { enum: ['hot', 'cold'] }).notNull().default('cold'),
  lastAccessedAt: integer('last_accessed_at'),
  conceptHint: text('concept_hint_json', { mode: 'json' }).$type<unknown | null>(),
  profileId: text('profile_id').notNull().default('coding'),
  classificationJson: text('classification_json', { mode: 'json' }).$type<unknown | null>(),
  keywords: text('keywords_json', { mode: 'json' }).notNull().$type<string[]>().default([]),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_captures_state').on(t.state),
  index('idx_captures_linked_concept').on(t.linkedConceptId),
  index('idx_captures_session').on(t.sessionId),
  index('idx_captures_created_at').on(t.createdAt),
  index('idx_captures_tier').on(t.embeddingTier),
  index('idx_captures_last_accessed').on(t.lastAccessedAt),
]);

export const bookmarks = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  startLine: integer('start_line').notNull(),
  endLine: integer('end_line').notNull(),
  colorKey: text('color_key').notNull(),
  note: text('note'),
  linkedCaptureId: text('linked_capture_id').references(() => learningCaptures.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  uniqueIndex('idx_bookmarks_location').on(t.projectId, t.filePath, t.startLine, t.endLine),
  // Migration creates this with DESC ordering; Drizzle's index() doesn't model that.
  index('idx_bookmarks_created').on(t.createdAt),
  index('idx_bookmarks_session').on(t.sessionId),
  index('idx_bookmarks_project_file').on(t.projectId, t.filePath, t.startLine),
  index('idx_bookmarks_color').on(t.projectId, t.colorKey),
]);

export const bookmarkPalettes = sqliteTable('bookmark_palettes', {
  projectId: text('project_id')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  paletteJson: text('palette_json').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const conceptLinks = sqliteTable('concept_links', {
  fromId: text('from_id').notNull(),
  toId: text('to_id').notNull(),
  kind: text('kind', {
    enum: ['related', 'prereq', 'example-of'],
  }).notNull(),
  weight: real('weight').notNull().default(0.5),
}, (t) => [
  primaryKey({ columns: [t.fromId, t.toId] }),
]);

export const embeddingsMeta = sqliteTable('embeddings_meta', {
  conceptId: text('concept_id').primaryKey(),
  model: text('model').notNull(),
  api: text('api').notNull(),
  signature: text('signature').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const promotionSuggestionsCache = sqliteTable('promotion_suggestions_cache', {
  clusterFingerprint: text('cluster_fingerprint').primaryKey(),
  captureIds: text('capture_ids_json', { mode: 'json' }).notNull().$type<string[]>(),
  proposedName: text('proposed_name').notNull(),
  proposedNormalizedKey: text('proposed_normalized_key').notNull(),
  proposedConceptType: text('proposed_concept_type').notNull(),
  sharedKeywords: text('shared_keywords_json', { mode: 'json' }).notNull().$type<string[]>(),
  sessionCount: integer('session_count').notNull(),
  captureCount: integer('capture_count').notNull(),
  meanSimilarity: real('mean_similarity').notNull(),
  avgExtractionConfidence: real('avg_extraction_confidence').notNull(),
  clusterScore: real('cluster_score').notNull(),
  maxCaptureCreatedAt: integer('max_capture_created_at').notNull().default(0),
  computedAt: integer('computed_at').notNull(),
}, (t) => [
  index('idx_promotion_cache_score').on(t.clusterScore),
]);

export const promotionDismissals = sqliteTable('promotion_dismissals', {
  clusterFingerprint: text('cluster_fingerprint').primaryKey(),
  dismissedAt: integer('dismissed_at').notNull(),
  captureIds: text('capture_ids_json', { mode: 'json' }).notNull().$type<string[]>(),
  captureCount: integer('capture_count').notNull(),
  isPermanent: integer('is_permanent', { mode: 'boolean' }).notNull().default(false),
  proposedNormalizedKey: text('proposed_normalized_key').notNull().default(''),
}, (t) => [
  index('idx_promotion_dismissals_at').on(t.dismissedAt),
]);

export const reviewEvents = sqliteTable('review_events', {
  id: text('id').primaryKey(),
  conceptId: text('concept_id')
    .notNull()
    .references(() => concepts.id, { onDelete: 'cascade' }),
  rating: text('rating', { enum: ['strong', 'partial', 'weak'] }).notNull(),
  delta: real('delta').notNull(),
  familiarityBefore: real('familiarity_before').notNull(),
  familiarityAfter: real('familiarity_after').notNull(),
  userRecallText: text('user_recall_text'),
  createdAt: integer('created_at').notNull(),
}, (t) => [
  index('idx_review_events_concept').on(t.conceptId),
  index('idx_review_events_created').on(t.createdAt),
]);

export const profileBranches = sqliteTable('profile_branches', {
  id: text('id').primaryKey(),
  parentProfileId: text('parent_profile_id').notNull(),
  branchKind: text('branch_kind', { enum: ['project', 'learning', 'personal'] }).notNull(),
  name: text('name').notNull(),
  overlayJson: text('overlay_json', { mode: 'json' }).notNull().$type<unknown>(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_profile_branches_parent').on(t.parentProfileId),
  index('idx_profile_branches_kind').on(t.branchKind),
  index('idx_profile_branches_updated').on(t.updatedAt),
]);

export const profileSelections = sqliteTable('profile_selections', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  baseProfileId: text('base_profile_id').notNull(),
  projectBranchIdsJson: text('project_branch_ids_json', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  learningBranchIdsJson: text('learning_branch_ids_json', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  personalBranchIdsJson: text('personal_branch_ids_json', { mode: 'json' })
    .notNull()
    .$type<string[]>()
    .default([]),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  uniqueIndex('unique_profile_selections_project').on(t.projectId),
  index('idx_profile_selections_base_profile').on(t.baseProfileId),
  index('idx_profile_selections_updated').on(t.updatedAt),
]);

export const profileDefinitions = sqliteTable('profile_definitions', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  version: integer('version').notNull(),
  sourceKind: text('source_kind', { enum: ['built_in', 'user', 'imported', 'adapter'] }).notNull(),
  profileJson: text('profile_json', { mode: 'json' }).notNull().$type<unknown>(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => [
  index('idx_profile_definitions_source_kind').on(t.sourceKind),
  index('idx_profile_definitions_updated').on(t.updatedAt),
]);

export const ontologyCorrectionEvidence = sqliteTable('ontology_correction_evidence', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').notNull(),
  activeSelectionSnapshotJson: text('active_selection_snapshot_json', { mode: 'json' })
    .notNull()
    .$type<unknown>(),
  subjectKind: text('subject_kind', { enum: ['capture', 'item'] }).notNull(),
  subjectId: text('subject_id').notNull(),
  field: text('field', { enum: ['typeNodeId'] }).notNull(),
  previousTypeNodeId: text('previous_type_node_id'),
  correctedTypeNodeId: text('corrected_type_node_id').notNull(),
  reason: text('reason'),
  source: text('source', { enum: ['user'] }).notNull(),
  createdAt: integer('created_at').notNull(),
}, (t) => [
  index('idx_ontology_correction_evidence_profile').on(t.profileId),
  index('idx_ontology_correction_evidence_subject').on(t.subjectKind, t.subjectId),
  index('idx_ontology_correction_evidence_created').on(t.createdAt),
]);

export const profileChangeProposals = sqliteTable('profile_change_proposals', {
  id: text('id').primaryKey(),
  proposalKind: text('proposal_kind', {
    enum: ['classification_patch', 'ontology_node_patch', 'relationship_patch', 'branch_merge', 'manual_draft'],
  }).notNull(),
  sourceKind: text('source_kind', { enum: ['checker', 'model', 'user', 'system'] }).notNull(),
  baseProfileId: text('base_profile_id').notNull(),
  sourceBranchId: text('source_branch_id'),
  targetKind: text('target_kind', { enum: ['base_profile', 'profile_branch'] }).notNull(),
  targetProfileId: text('target_profile_id'),
  targetBranchId: text('target_branch_id'),
  evidenceIdsJson: text('evidence_ids_json', { mode: 'json' }).notNull().$type<string[]>(),
  patchJson: text('patch_json', { mode: 'json' }).notNull().$type<unknown>(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  reason: text('reason').notNull(),
  riskScore: real('risk_score').notNull(),
  semanticConfidence: real('semantic_confidence'),
  userFitConfidence: real('user_fit_confidence'),
  status: text('status', {
    enum: ['pending', 'accepted', 'rejected', 'postponed', 'superseded'],
  }).notNull(),
  supersededByProposalId: text('superseded_by_proposal_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  reviewedAt: integer('reviewed_at'),
  appliedAt: integer('applied_at'),
}, (t) => [
  index('idx_profile_change_proposals_base_profile').on(t.baseProfileId),
  index('idx_profile_change_proposals_source_branch').on(t.sourceBranchId),
  index('idx_profile_change_proposals_target_branch').on(t.targetBranchId),
  index('idx_profile_change_proposals_status').on(t.status),
  index('idx_profile_change_proposals_updated').on(t.updatedAt),
]);
