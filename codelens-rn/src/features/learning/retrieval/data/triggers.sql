CREATE TRIGGER IF NOT EXISTS captures_fts_ai AFTER INSERT ON learning_captures BEGIN
  INSERT INTO captures_fts(rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
  VALUES (new.rowid, new.title, new.what_clicked, COALESCE(new.why_it_mattered, ''), new.raw_snippet, COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.keywords_json)), ''), new.id);
END;

CREATE TRIGGER IF NOT EXISTS captures_fts_au AFTER UPDATE ON learning_captures BEGIN
  INSERT INTO captures_fts(captures_fts, rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
  VALUES ('delete', old.rowid, old.title, old.what_clicked, COALESCE(old.why_it_mattered, ''), old.raw_snippet, COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.keywords_json)), ''), old.id);
  INSERT INTO captures_fts(rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
  VALUES (new.rowid, new.title, new.what_clicked, COALESCE(new.why_it_mattered, ''), new.raw_snippet, COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.keywords_json)), ''), new.id);
END;

CREATE TRIGGER IF NOT EXISTS captures_fts_ad AFTER DELETE ON learning_captures BEGIN
  INSERT INTO captures_fts(captures_fts, rowid, title, what_clicked, why_it_mattered, raw_snippet, keywords, capture_id)
  VALUES ('delete', old.rowid, old.title, old.what_clicked, COALESCE(old.why_it_mattered, ''), old.raw_snippet, COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.keywords_json)), ''), old.id);
END;

CREATE TRIGGER IF NOT EXISTS concepts_fts_ai AFTER INSERT ON concepts BEGIN
  INSERT INTO concepts_fts(rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
  VALUES (new.rowid, new.name, COALESCE(new.canonical_summary, new.summary, ''), COALESCE(new.core_concept, ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.surface_features_json)), ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.language_or_runtime_json)), ''), new.id);
END;

CREATE TRIGGER IF NOT EXISTS concepts_fts_au AFTER UPDATE ON concepts BEGIN
  INSERT INTO concepts_fts(concepts_fts, rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
  VALUES ('delete', old.rowid, old.name, COALESCE(old.canonical_summary, old.summary, ''), COALESCE(old.core_concept, ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.surface_features_json)), ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.language_or_runtime_json)), ''), old.id);
  INSERT INTO concepts_fts(rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
  VALUES (new.rowid, new.name, COALESCE(new.canonical_summary, new.summary, ''), COALESCE(new.core_concept, ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.surface_features_json)), ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(new.language_or_runtime_json)), ''), new.id);
END;

CREATE TRIGGER IF NOT EXISTS concepts_fts_ad AFTER DELETE ON concepts BEGIN
  INSERT INTO concepts_fts(concepts_fts, rowid, name, canonical_summary, core_concept, surface_features, language_or_runtime, concept_id)
  VALUES ('delete', old.rowid, old.name, COALESCE(old.canonical_summary, old.summary, ''), COALESCE(old.core_concept, ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.surface_features_json)), ''), COALESCE((SELECT group_concat(value, ' ') FROM json_each(old.language_or_runtime_json)), ''), old.id);
END;
