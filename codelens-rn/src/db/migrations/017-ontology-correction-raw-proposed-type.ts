import type { Migration } from './index';

export const migration017: Migration = {
  version: 17,
  up: [
    `ALTER TABLE ontology_correction_evidence ADD COLUMN raw_proposed_type_node_id TEXT`,
  ],
};
