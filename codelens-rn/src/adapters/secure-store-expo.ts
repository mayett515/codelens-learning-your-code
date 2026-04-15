import * as ExpoSecureStore from 'expo-secure-store';
import type { SecureStorePort } from '../ports/secure-store';

export function makeExpoSecureStore(): SecureStorePort {
  return {
    async getApiKey(provider: string) {
      return ExpoSecureStore.getItemAsync(`api_key_${provider}`);
    },
    async setApiKey(provider: string, key: string) {
      await ExpoSecureStore.setItemAsync(`api_key_${provider}`, key);
    },
    async deleteApiKey(provider: string) {
      await ExpoSecureStore.deleteItemAsync(`api_key_${provider}`);
    },
  };
}
