function unavailable(): never {
  throw new Error('CodeLens SQLite storage is not available in Expo web');
}

const webDbProxy = new Proxy(
  {},
  {
    get() {
      return unavailable;
    },
  },
);

export const db = webDbProxy as any;

export type Database = typeof db;
export type Transaction = any;
export type DbOrTx = Database | Transaction;

export function initDatabase() {
  return;
}

export function getRawDb() {
  return webDbProxy;
}
