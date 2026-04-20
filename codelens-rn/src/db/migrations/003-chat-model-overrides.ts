import type { Migration } from './index';

export const migration003: Migration = {
  version: 3,
  up: [
    `ALTER TABLE chats ADD COLUMN model_override TEXT`,
  ],
};
