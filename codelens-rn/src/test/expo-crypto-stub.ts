// Test stub — provides randomUUID backed by Node's crypto in vitest runs.
// expo-crypto transitively imports react-native (Flow-typed) which rolldown
// cannot parse, so we substitute a Node-native implementation here.
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

export const CryptoDigestAlgorithm = {
  SHA256: 'SHA-256',
} as const;

export function randomUUID(): string {
  return nodeRandomUUID();
}

export async function digestStringAsync(_algorithm: string, value: string): Promise<string> {
  return createHash('sha256').update(value).digest('hex');
}
