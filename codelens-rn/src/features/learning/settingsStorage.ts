import { makeMmkvStore } from '../../adapters/kv-mmkv';
import type { KvStorePort } from '../../ports/kv-store';

let store: KvStorePort | null | undefined;

function getStore(): KvStorePort | null {
  if (store !== undefined) return store;
  try {
    store = makeMmkvStore();
  } catch {
    store = null;
  }
  return store;
}

export function loadLearningSetting<T>(key: string): T | null {
  return getStore()?.get<T>(key) ?? null;
}

export function saveLearningSetting<T>(key: string, value: T): void {
  getStore()?.set(key, value);
}
