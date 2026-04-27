import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const aiProviders = sqliteTable('ai_providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  baseUrl: text('base_url').notNull(),
  sourceUrl: text('source_url'),
  apiKeySecureRef: text('api_key_secure_ref'),
  createdAt: integer('created_at').notNull(),
});

export const aiModels = sqliteTable('ai_models', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'cascade' }),
  modelName: text('model_name').notNull(),
  isFreeTier: integer('is_free_tier', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
});
