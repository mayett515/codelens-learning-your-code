import type * as schema from '../../db/schema';

/**
 * Explicit column-name maps for each table exported in backup archives.
 *
 * Export uses raw `SELECT *` which returns snake_case DB column names.
 * Drizzle `insert().values()` expects camelCase JS schema property names.
 * These maps translate NDJSON rows into the shape Drizzle requires.
 *
 * Every map lists all columns, including identically-named ones, so the
 * mapper drops unknown keys by default and keeps imports controlled.
 *
 * For concepts, export adds an `embedding` key that is not a real DB column.
 * It must be stripped separately before mapping.
 */

const EMPTY_JSON_COLUMNS = new Set<string>();

export function parseBackupJsonColumn(value: unknown, columnName: string): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON in backup column ${columnName}`);
  }
}

export function mapBackupRow(
  row: Record<string, unknown>,
  columnMap: Record<string, string>,
  jsonColumns: ReadonlySet<string> = EMPTY_JSON_COLUMNS,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [dbCol, jsProp] of Object.entries(columnMap)) {
    if (dbCol in row) {
      mapped[jsProp] = jsonColumns.has(dbCol)
        ? parseBackupJsonColumn(row[dbCol], dbCol)
        : row[dbCol];
    }
  }
  return mapped;
}

export const PROJECTS_COLUMN_MAP = {
  'id': 'id',
  'name': 'name',
  'source': 'source',
  'github_url': 'githubUrl',
  'created_at': 'createdAt',
  'recent_file_ids': 'recentFileIds',
} as const satisfies Record<string, string>;
export const PROJECTS_JSON_COLUMNS = new Set<string>(['recent_file_ids']);

export const FILES_COLUMN_MAP = {
  'id': 'id',
  'project_id': 'projectId',
  'path': 'path',
  'content': 'content',
  'marks': 'marks',
  'ranges': 'ranges',
} as const satisfies Record<string, string>;
export const FILES_JSON_COLUMNS = new Set<string>(['marks', 'ranges']);

export const CHATS_COLUMN_MAP = {
  'id': 'id',
  'scope': 'scope',
  'project_id': 'projectId',
  'file_id': 'fileId',
  'start_line': 'startLine',
  'end_line': 'endLine',
  'folder_id': 'folderId',
  'concept_id': 'conceptId',
  'persona_id': 'personaId',
  'model_override_id': 'modelOverrideId',
  'model_override': 'modelOverride',
  'title': 'title',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
} as const satisfies Record<string, string>;
export const CHATS_JSON_COLUMNS = new Set<string>(['model_override']);

export const CHAT_MESSAGES_COLUMN_MAP = {
  'id': 'id',
  'chat_id': 'chatId',
  'role': 'role',
  'content': 'content',
  'created_at': 'createdAt',
} as const satisfies Record<string, string>;
export const CHAT_MESSAGES_JSON_COLUMNS = EMPTY_JSON_COLUMNS;

export const LEARNING_SESSIONS_COLUMN_MAP = {
  'id': 'id',
  'title': 'title',
  'source': 'source',
  'source_chat_id': 'sourceChatId',
  'concept_ids': 'conceptIds',
  'created_at': 'createdAt',
  'raw_snippet': 'rawSnippet',
} as const satisfies Record<string, string>;
export const LEARNING_SESSIONS_JSON_COLUMNS = new Set<string>(['concept_ids']);

export const LEARNING_CAPTURES_COLUMN_MAP = {
  'id': 'id',
  'title': 'title',
  'what_clicked': 'whatClicked',
  'why_it_mattered': 'whyItMattered',
  'raw_snippet': 'rawSnippet',
  'snippet_lang': 'snippetLang',
  'snippet_source_path': 'snippetSourcePath',
  'snippet_start_line': 'snippetStartLine',
  'snippet_end_line': 'snippetEndLine',
  'chat_message_id': 'chatMessageId',
  'session_id': 'sessionId',
  'state': 'state',
  'linked_concept_id': 'linkedConceptId',
  'editable_until': 'editableUntil',
  'extraction_confidence': 'extractionConfidence',
  'derived_from_capture_id': 'derivedFromCaptureId',
  'embedding_status': 'embeddingStatus',
  'embedding_retry_count': 'embeddingRetryCount',
  'embedding_tier': 'embeddingTier',
  'last_accessed_at': 'lastAccessedAt',
  'concept_hint_json': 'conceptHint',
  'profile_id': 'profileId',
  'classification_json': 'classificationJson',
  'keywords_json': 'keywords',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
} as const satisfies Record<string, string>;
export const LEARNING_CAPTURES_JSON_COLUMNS = new Set<string>([
  'concept_hint_json',
  'classification_json',
  'keywords_json',
]);

export const CONCEPTS_COLUMN_MAP = {
  'id': 'id',
  'name': 'name',
  'summary': 'summary',
  'normalized_key': 'normalizedKey',
  'canonical_summary': 'canonicalSummary',
  'concept_type': 'conceptType',
  'core_concept': 'coreConcept',
  'architectural_pattern': 'architecturalPattern',
  'programming_paradigm': 'programmingParadigm',
  'language_or_runtime_json': 'languageOrRuntime',
  'surface_features_json': 'surfaceFeatures',
  'prerequisites_json': 'prerequisites',
  'related_concepts_json': 'relatedConcepts',
  'contrast_concepts_json': 'contrastConcepts',
  'representative_capture_ids_json': 'representativeCaptureIds',
  'familiarity_score': 'familiarityScore',
  'importance_score': 'importanceScore',
  'embedding_tier': 'embeddingTier',
  'last_accessed_at': 'lastAccessedAt',
  'language_syntax_legacy': 'languageSyntaxLegacy',
  'taxonomy': 'taxonomy',
  'session_ids': 'sessionIds',
  'profile_id': 'profileId',
  'type_node_id': 'typeNodeId',
  'metadata_json': 'metadataJson',
  'strength': 'strength',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
} as const satisfies Record<string, string>;
export const CONCEPTS_JSON_COLUMNS = new Set<string>([
  'language_or_runtime_json',
  'surface_features_json',
  'prerequisites_json',
  'related_concepts_json',
  'contrast_concepts_json',
  'representative_capture_ids_json',
  'taxonomy',
  'session_ids',
  'metadata_json',
]);

export const CONCEPT_LINKS_COLUMN_MAP = {
  'from_id': 'fromId',
  'to_id': 'toId',
  'kind': 'kind',
  'weight': 'weight',
} as const satisfies Record<string, string>;
export const CONCEPT_LINKS_JSON_COLUMNS = EMPTY_JSON_COLUMNS;

export const PROFILE_BRANCHES_COLUMN_MAP = {
  'id': 'id',
  'parent_profile_id': 'parentProfileId',
  'branch_kind': 'branchKind',
  'name': 'name',
  'overlay_json': 'overlayJson',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
} as const satisfies Record<string, string>;
export const PROFILE_BRANCHES_JSON_COLUMNS = new Set<string>(['overlay_json']);

export const PROFILE_SELECTIONS_COLUMN_MAP = {
  'id': 'id',
  'project_id': 'projectId',
  'base_profile_id': 'baseProfileId',
  'project_branch_ids_json': 'projectBranchIdsJson',
  'learning_branch_ids_json': 'learningBranchIdsJson',
  'personal_branch_ids_json': 'personalBranchIdsJson',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
} as const satisfies Record<string, string>;
export const PROFILE_SELECTIONS_JSON_COLUMNS = new Set<string>([
  'project_branch_ids_json',
  'learning_branch_ids_json',
  'personal_branch_ids_json',
]);

export const PROFILE_DEFINITIONS_COLUMN_MAP = {
  'id': 'id',
  'label': 'label',
  'description': 'description',
  'version': 'version',
  'source_kind': 'sourceKind',
  'profile_json': 'profileJson',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
} as const satisfies Record<string, string>;
export const PROFILE_DEFINITIONS_JSON_COLUMNS = new Set<string>(['profile_json']);

export const TABLE_COLUMN_MAPS: Record<string, Record<string, string>> = {
  'projects': PROJECTS_COLUMN_MAP,
  'files': FILES_COLUMN_MAP,
  'chats': CHATS_COLUMN_MAP,
  'chat_messages': CHAT_MESSAGES_COLUMN_MAP,
  'learning_sessions': LEARNING_SESSIONS_COLUMN_MAP,
  'learning_captures': LEARNING_CAPTURES_COLUMN_MAP,
  'concepts': CONCEPTS_COLUMN_MAP,
  'concept_links': CONCEPT_LINKS_COLUMN_MAP,
  'profile_branches': PROFILE_BRANCHES_COLUMN_MAP,
  'profile_selections': PROFILE_SELECTIONS_COLUMN_MAP,
  'profile_definitions': PROFILE_DEFINITIONS_COLUMN_MAP,
};

export const TABLE_JSON_COLUMNS: Record<string, ReadonlySet<string>> = {
  'projects': PROJECTS_JSON_COLUMNS,
  'files': FILES_JSON_COLUMNS,
  'chats': CHATS_JSON_COLUMNS,
  'chat_messages': CHAT_MESSAGES_JSON_COLUMNS,
  'learning_sessions': LEARNING_SESSIONS_JSON_COLUMNS,
  'learning_captures': LEARNING_CAPTURES_JSON_COLUMNS,
  'concepts': CONCEPTS_JSON_COLUMNS,
  'concept_links': CONCEPT_LINKS_JSON_COLUMNS,
  'profile_branches': PROFILE_BRANCHES_JSON_COLUMNS,
  'profile_selections': PROFILE_SELECTIONS_JSON_COLUMNS,
  'profile_definitions': PROFILE_DEFINITIONS_JSON_COLUMNS,
};

type MissingMappedKeys<TMap extends Record<string, string>, TSchema extends Record<string, unknown>> =
  Exclude<keyof TSchema, TMap[keyof TMap]>;
type ExtraMappedKeys<TMap extends Record<string, string>, TSchema extends Record<string, unknown>> =
  Exclude<TMap[keyof TMap], keyof TSchema>;
type AssertNever<T extends never> = T;

type _CheckProjectsMissing = AssertNever<MissingMappedKeys<typeof PROJECTS_COLUMN_MAP, typeof schema.projects.$inferSelect>>;
type _CheckProjectsExtra = AssertNever<ExtraMappedKeys<typeof PROJECTS_COLUMN_MAP, typeof schema.projects.$inferSelect>>;
type _CheckFilesMissing = AssertNever<MissingMappedKeys<typeof FILES_COLUMN_MAP, typeof schema.files.$inferSelect>>;
type _CheckFilesExtra = AssertNever<ExtraMappedKeys<typeof FILES_COLUMN_MAP, typeof schema.files.$inferSelect>>;
type _CheckChatsMissing = AssertNever<MissingMappedKeys<typeof CHATS_COLUMN_MAP, typeof schema.chats.$inferSelect>>;
type _CheckChatsExtra = AssertNever<ExtraMappedKeys<typeof CHATS_COLUMN_MAP, typeof schema.chats.$inferSelect>>;
type _CheckChatMessagesMissing = AssertNever<MissingMappedKeys<typeof CHAT_MESSAGES_COLUMN_MAP, typeof schema.chatMessages.$inferSelect>>;
type _CheckChatMessagesExtra = AssertNever<ExtraMappedKeys<typeof CHAT_MESSAGES_COLUMN_MAP, typeof schema.chatMessages.$inferSelect>>;
type _CheckLearningSessionsMissing = AssertNever<MissingMappedKeys<typeof LEARNING_SESSIONS_COLUMN_MAP, typeof schema.learningSessions.$inferSelect>>;
type _CheckLearningSessionsExtra = AssertNever<ExtraMappedKeys<typeof LEARNING_SESSIONS_COLUMN_MAP, typeof schema.learningSessions.$inferSelect>>;
type _CheckLearningCapturesMissing = AssertNever<MissingMappedKeys<typeof LEARNING_CAPTURES_COLUMN_MAP, typeof schema.learningCaptures.$inferSelect>>;
type _CheckLearningCapturesExtra = AssertNever<ExtraMappedKeys<typeof LEARNING_CAPTURES_COLUMN_MAP, typeof schema.learningCaptures.$inferSelect>>;
type _CheckConceptsMissing = AssertNever<MissingMappedKeys<typeof CONCEPTS_COLUMN_MAP, typeof schema.concepts.$inferSelect>>;
type _CheckConceptsExtra = AssertNever<ExtraMappedKeys<typeof CONCEPTS_COLUMN_MAP, typeof schema.concepts.$inferSelect>>;
type _CheckConceptLinksMissing = AssertNever<MissingMappedKeys<typeof CONCEPT_LINKS_COLUMN_MAP, typeof schema.conceptLinks.$inferSelect>>;
type _CheckConceptLinksExtra = AssertNever<ExtraMappedKeys<typeof CONCEPT_LINKS_COLUMN_MAP, typeof schema.conceptLinks.$inferSelect>>;
type _CheckProfileBranchesMissing = AssertNever<MissingMappedKeys<typeof PROFILE_BRANCHES_COLUMN_MAP, typeof schema.profileBranches.$inferSelect>>;
type _CheckProfileBranchesExtra = AssertNever<ExtraMappedKeys<typeof PROFILE_BRANCHES_COLUMN_MAP, typeof schema.profileBranches.$inferSelect>>;
type _CheckProfileSelectionsMissing = AssertNever<MissingMappedKeys<typeof PROFILE_SELECTIONS_COLUMN_MAP, typeof schema.profileSelections.$inferSelect>>;
type _CheckProfileSelectionsExtra = AssertNever<ExtraMappedKeys<typeof PROFILE_SELECTIONS_COLUMN_MAP, typeof schema.profileSelections.$inferSelect>>;
type _CheckProfileDefinitionsMissing = AssertNever<MissingMappedKeys<typeof PROFILE_DEFINITIONS_COLUMN_MAP, typeof schema.profileDefinitions.$inferSelect>>;
type _CheckProfileDefinitionsExtra = AssertNever<ExtraMappedKeys<typeof PROFILE_DEFINITIONS_COLUMN_MAP, typeof schema.profileDefinitions.$inferSelect>>;
