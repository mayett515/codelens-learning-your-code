import type { Migration } from './index';

export const migration020: Migration = {
  version: 20,
  up: [
    `ALTER TABLE ontology_correction_evidence ADD COLUMN near_miss_candidates_json TEXT`,
  ],
};
