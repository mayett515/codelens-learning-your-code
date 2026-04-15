export interface SecureStorePort {
  getApiKey(provider: string): Promise<string | null>;
  setApiKey(provider: string, key: string): Promise<void>;
  deleteApiKey(provider: string): Promise<void>;
}
