import type { Migration } from './index';

export const migration009: Migration = {
  version: 9,
  up: [
    `ALTER TABLE ai_providers ADD COLUMN source_url TEXT`,
  ],
};
