import { computeStrength } from '../../strength/computeStrength';
import { unsafeConceptId, unsafeLearningCaptureId } from '../../types/ids';
import { parseRetrievedCapturePayload, parseRetrievedConceptPayload } from '../codecs/retrievedMemory';
import type { RetrievedCapturePayload, RetrievedConceptPayload } from '../types/retrieval';

function parseJsonArray(raw: unknown, columnName: string): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string') throw new Error(`Missing JSON column ${columnName}`);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`Expected array JSON in ${columnName}`);
  return parsed.map(String);
}

function parseCaptureIds(raw: unknown): ReturnType<typeof unsafeLearningCaptureId>[] {
  return parseJsonArray(raw, 'representative_capture_ids_json').map(unsafeLearningCaptureId);
}

function parseMsOrIso(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const asNumber = Number(raw);
    if (Number.isFinite(asNumber)) return asNumber;
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`Invalid timestamp: ${String(raw)}`);
}

export function captureRowToRetrievedPayload(row: Record<string, unknown>): RetrievedCapturePayload {
  return parseRetrievedCapturePayload({
    id: unsafeLearningCaptureId(String(row.id)),
    title: String(row.title),
    whatClicked: String(row.what_clicked),
    whyItMattered: row.why_it_mattered === null ? null : String(row.why_it_mattered),
    rawSnippet: String(row.raw_snippet),
    snippetLang: row.snippet_lang === null ? null : String(row.snippet_lang),
    snippetSourcePath: row.snippet_source_path === null ? null : String(row.snippet_source_path),
    snippetStartLine: row.snippet_start_line === null ? null : Number(row.snippet_start_line),
    snippetEndLine: row.snippet_end_line === null ? null : Number(row.snippet_end_line),
    state: row.state,
    linkedConceptId: row.linked_concept_id === null ? null : unsafeConceptId(String(row.linked_concept_id)),
    linkedConceptName: row.linked_concept_name === null || row.linked_concept_name === undefined
      ? null
      : String(row.linked_concept_name),
    sessionId: row.session_id === null ? null : String(row.session_id),
    createdAt: parseMsOrIso(row.created_at),
    lastAccessedAt: row.last_accessed_at === null ? null : Number(row.last_accessed_at),
    embeddingStatus: row.embedding_status,
  });
}

export function conceptRowToRetrievedPayload(row: Record<string, unknown>): RetrievedConceptPayload {
  const familiarityScore = Number(row.familiarity_score);
  const importanceScore = Number(row.importance_score);
  return parseRetrievedConceptPayload({
    id: unsafeConceptId(String(row.id)),
    name: String(row.name),
    conceptType: row.concept_type,
    canonicalSummary: row.canonical_summary === null ? null : String(row.canonical_summary),
    coreConcept: row.core_concept === null ? null : String(row.core_concept),
    languageOrRuntime: parseJsonArray(row.language_or_runtime_json, 'language_or_runtime_json'),
    surfaceFeatures: parseJsonArray(row.surface_features_json, 'surface_features_json'),
    familiarityScore,
    importanceScore,
    strength: computeStrength(familiarityScore, importanceScore),
    representativeCaptureIds: parseCaptureIds(row.representative_capture_ids_json),
    createdAt: parseMsOrIso(row.created_at),
    lastAccessedAt: row.last_accessed_at === null ? null : Number(row.last_accessed_at),
  });
}
