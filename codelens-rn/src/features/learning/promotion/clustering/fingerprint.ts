import * as Crypto from 'expo-crypto';
import type { LearningCaptureId } from '../../types/ids';

export async function clusterFingerprint(captureIds: LearningCaptureId[]): Promise<string> {
  const input = captureIds.slice().sort().join('|');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}
