// Test stub — provides randomUUID backed by Node's crypto in vitest runs.
// expo-crypto transitively imports react-native (Flow-typed) which rolldown
// cannot parse, so we substitute a Node-native implementation here.
import { randomUUID as nodeRandomUUID } from 'node:crypto';

export function randomUUID(): string {
  return nodeRandomUUID();
}
