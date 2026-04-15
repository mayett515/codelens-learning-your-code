import { makeExpoSecureStore } from './adapters/secure-store-expo';
import { makeMmkvStore } from './adapters/kv-mmkv';
import { makeSqliteVectorStore } from './adapters/sqlite-vector-store';
import { getRawDb } from './db/client';
import type { VectorStorePort } from './ports/vector-store';
import type { SecureStorePort } from './ports/secure-store';
import type { KvStorePort } from './ports/kv-store';

export const secureStore: SecureStorePort = makeExpoSecureStore();
export const kv: KvStorePort = makeMmkvStore();
export const vectorStore: VectorStorePort = makeSqliteVectorStore(getRawDb());
