import { conceptSignature } from '../../lib/hash';

export const dotConnectorKeys = {
  all: () => ['learning', 'dotConnector'] as const,
  retrieve: (query: string, modeHash: string) =>
    [...dotConnectorKeys.all(), 'retrieve', conceptSignature(query), modeHash] as const,
};
