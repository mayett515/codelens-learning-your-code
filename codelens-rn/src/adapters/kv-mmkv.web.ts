import type { KvStorePort } from '../ports/kv-store';

const memoryStore = new Map<string, string>();

export function makeMmkvStore(): KvStorePort {
  return {
    get<T>(key: string): T | null {
      const raw = memoryStore.get(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },
    set<T>(key: string, value: T) {
      memoryStore.set(key, JSON.stringify(value));
    },
    delete(key: string) {
      memoryStore.delete(key);
    },
  };
}
