import type { SecureStorePort } from '../ports/secure-store';

const KEY_PREFIX = 'codelens_';
const memoryStore = new Map<string, string>();

function storageKey(provider: string): string {
  return `${KEY_PREFIX}api_key_${provider}`;
}

function getWebStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function makeExpoSecureStore(): SecureStorePort {
  return {
    async getApiKey(provider: string) {
      const key = storageKey(provider);
      return getWebStorage()?.getItem(key) ?? memoryStore.get(key) ?? null;
    },
    async setApiKey(provider: string, value: string) {
      const key = storageKey(provider);
      const storage = getWebStorage();
      if (storage) {
        storage.setItem(key, value);
      } else {
        memoryStore.set(key, value);
      }
    },
    async deleteApiKey(provider: string) {
      const key = storageKey(provider);
      getWebStorage()?.removeItem(key);
      memoryStore.delete(key);
    },
  };
}
