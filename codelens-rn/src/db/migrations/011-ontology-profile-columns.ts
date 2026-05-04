import type { Migration } from './index';

// Wraps a column reference in nested replace() calls that produce a valid JSON
// string value. Order matters: backslash must come first so the escapes
// introduced by later steps are not themselves double-escaped.
//   1. \ -> \\   (existing backslashes)
//   2. " -> \"   (double quotes)
//   3. LF  -> \n  (newline)
//   4. CR  -> \r  (carriage return)
//   5. TAB -> \t  (horizontal tab)
function escJsonStr(col: string): string {
  return `replace(replace(replace(replace(replace(${col},'\\','\\\\'),'"','\\"'),char(10),'\\n'),char(13),'\\r'),char(9),'\\t')`;
}

export const migration011: Migration = {
  version: 11,
  up: [
    `ALTER TABLE concepts ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'coding'`,
    `ALTER TABLE concepts ADD COLUMN type_node_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE concepts ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'`,

    `UPDATE concepts SET type_node_id = concept_type WHERE type_node_id = ''`,

    // Backfill metadata_json from legacy columns using string concatenation.
    // Avoids json_set/json_object so the migration works on any SQLite build.
    // ltrim(..., ',') strips the leading comma from the first non-null CASE arm.
    `UPDATE concepts SET metadata_json =
      '{' ||
      ltrim(
        CASE WHEN core_concept IS NOT NULL THEN ',"coreConcept":"' || ${escJsonStr('core_concept')} || '"' ELSE '' END ||
        CASE WHEN architectural_pattern IS NOT NULL THEN ',"architecturalPattern":"' || ${escJsonStr('architectural_pattern')} || '"' ELSE '' END ||
        CASE WHEN programming_paradigm IS NOT NULL THEN ',"programmingParadigm":"' || ${escJsonStr('programming_paradigm')} || '"' ELSE '' END,
        ','
      ) ||
      '}'
    WHERE core_concept IS NOT NULL OR architectural_pattern IS NOT NULL OR programming_paradigm IS NOT NULL`,

    `ALTER TABLE learning_captures ADD COLUMN profile_id TEXT NOT NULL DEFAULT 'coding'`,
    `ALTER TABLE learning_captures ADD COLUMN classification_json TEXT`,
  ],
};
