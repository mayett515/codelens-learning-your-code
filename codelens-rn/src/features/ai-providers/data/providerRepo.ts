import { getRawDb } from '../../../db/client';
import type { DiscoveryResult } from '../domain/types';
import * as crypto from 'expo-crypto';

export interface AiProviderRow {
  id: string;
  name: string;
  base_url: string;
  source_url: string | null;
  api_key_secure_ref: string | null;
  created_at: number;
}

export async function saveDiscoveredProvider(result: DiscoveryResult, secureKeyRef: string): Promise<string> {
  const providerId = `p_${crypto.randomUUID().replace(/-/g, '').slice(0, 21)}`;
  const now = Date.now();

  await getRawDb().transaction(async (tx) => {
    await tx.execute(
      `INSERT INTO ai_providers (id, name, base_url, source_url, api_key_secure_ref, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [providerId, result.providerName, result.baseUrl, result.sourceUrl ?? null, secureKeyRef, now],
    );

    for (const model of result.models) {
      const modelId = `m_${crypto.randomUUID().replace(/-/g, '').slice(0, 21)}`;
      await tx.execute(
        `INSERT INTO ai_models (id, provider_id, model_name, is_free_tier, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [modelId, providerId, model.id, model.isFreeTier ? 1 : 0, now],
      );
    }
  });

  return providerId;
}

export async function getSavedProviders(): Promise<AiProviderRow[]> {
  const result = await getRawDb().execute('SELECT * FROM ai_providers ORDER BY created_at DESC');
  return result.rows as AiProviderRow[];
}
