// Composition root — wire adapters to ports
// Fully wired in Phase 1 once db/client.ts and adapters are implemented

import { makeExpoSecureStore } from './adapters/secure-store-expo';
import { makeMmkvStore } from './adapters/kv-mmkv';
import type { SecureStorePort } from './ports/secure-store';
import type { KvStorePort } from './ports/kv-store';

export const secureStore: SecureStorePort = makeExpoSecureStore();
export const kv: KvStorePort = makeMmkvStore();

// Phase 1: export vectorStore, aiClient once adapters exist
