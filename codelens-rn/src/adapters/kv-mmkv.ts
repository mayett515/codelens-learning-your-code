import { createMMKV } from 'react-native-mmkv';
import type { KvStorePort } from '../ports/kv-store';

let storage: ReturnType<typeof createMMKV> | null = null;

function getStorage() {
  if (!storage) {
    storage = createMMKV({ id: 'codelens-kv' });
  }
  return storage;
}

export function makeMmkvStore(): KvStorePort {
  return {
    get<T>(key: string): T | null {
      const raw = getStorage().getString(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },
    set<T>(key: string, value: T) {
      getStorage().set(key, JSON.stringify(value));
    },
    delete(key: string) {
      getStorage().remove(key);
    },
  };
}
