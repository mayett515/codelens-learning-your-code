import type { Migration } from './index';

function normalizedConceptNameSql(column: string): string {
  let expr = `replace(replace(replace(${column}, char(9), ' '), char(10), ' '), char(13), ' ')`;
  for (let index = 0; index < 8; index += 1) {
    expr = `replace(${expr}, '  ', ' ')`;
  }
  return `lower(trim(${expr}))`;
}

const normalizedName = normalizedConceptNameSql('name');
const normalizedOtherName = normalizedConceptNameSql('other.name');
const stageOneConceptId = `id GLOB 'c_?????????????????????'`;
const otherStageOneConceptId = `other.id GLOB 'c_?????????????????????'`;
const duplicateStageOnePredecessor = `EXISTS (
        SELECT 1
        FROM concepts other
        WHERE ${otherStageOneConceptId}
          AND ${normalizedOtherName} = ${normalizedName}
          AND other.rowid < concepts.rowid
      )`;

export const migration005: Migration = {
  version: 5,
  up: [
    `DROP INDEX IF EXISTS unique_concepts_normalized_key`,
    `UPDATE concepts
      SET normalized_key = CASE
        WHEN ${stageOneConceptId} AND NOT ${duplicateStageOnePredecessor}
          THEN ${normalizedName}
        ELSE ${normalizedName} || char(31) || 'legacy_duplicate' || char(31) || rowid
      END`,
    `CREATE UNIQUE INDEX IF NOT EXISTS unique_concepts_normalized_key ON concepts(normalized_key)`,
  ],
};
