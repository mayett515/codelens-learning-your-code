import { z } from 'zod';

export const DiscoveredModelSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  isFreeTier: z.boolean().default(false),
});

export const DiscoveryResultSchema = z.object({
  providerName: z.string(),
  baseUrl: z.string().url(),
  sourceUrl: z.string().url().optional(),
  models: z.array(DiscoveredModelSchema).min(1),
});

export type DiscoveredModel = z.infer<typeof DiscoveredModelSchema>;
export type DiscoveryResult = z.infer<typeof DiscoveryResultSchema>;
