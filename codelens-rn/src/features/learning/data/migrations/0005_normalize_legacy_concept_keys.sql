DROP INDEX IF EXISTS unique_concepts_normalized_key;

UPDATE concepts
SET normalized_key = CASE
  WHEN id GLOB 'c_?????????????????????'
    AND NOT EXISTS (
      SELECT 1
      FROM concepts other
      WHERE other.id GLOB 'c_?????????????????????'
        AND lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(other.name, char(9), ' '), char(10), ' '), char(13), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))) =
            lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(concepts.name, char(9), ' '), char(10), ' '), char(13), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' ')))
        AND other.rowid < concepts.rowid
    )
    THEN lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' ')))
  ELSE lower(trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(name, char(9), ' '), char(10), ' '), char(13), ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '), '  ', ' '))) || char(31) || 'legacy_duplicate' || char(31) || rowid
END;

CREATE UNIQUE INDEX IF NOT EXISTS unique_concepts_normalized_key ON concepts(normalized_key);
