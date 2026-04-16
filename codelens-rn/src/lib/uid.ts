import { randomUUID } from 'expo-crypto';

/**
 * Crypto-grade RFC 4122 v4 UUID via expo-crypto.
 * Safe for offline-first sync — no collision risk under concurrent writes.
 */
export function uid(): string {
  return randomUUID();
}
