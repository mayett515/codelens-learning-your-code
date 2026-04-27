import { ensureEmbedded } from './ensureEmbedded';
import type { ConceptId, LearningCaptureId } from '../../types/ids';
import type { RetrievedMemoryKind } from '../types/retrieval';

type Ref = { kind: RetrievedMemoryKind; id: LearningCaptureId | ConceptId };

class RehydrationQueue {
  private readonly pending = new Set<string>();

  enqueueMany(refs: Ref[]): void {
    refs.forEach((ref) => this.enqueue(ref));
  }

  enqueue(ref: Ref): void {
    const key = `${ref.kind}:${ref.id}`;
    if (this.pending.has(key)) return;
    this.pending.add(key);
    const run = async () => {
      try {
        await ensureEmbedded(ref);
      } catch (error) {
        if (ref.kind === 'capture') {
          await markCaptureRehydrationFailed(String(ref.id)).catch(() => undefined);
        }
        console.warn('[learning/retrieval] JIT rehydration failed', error);
      } finally {
        this.pending.delete(key);
      }
    };
    run().catch((error) => {
      this.pending.delete(key);
      console.warn('[learning/retrieval] JIT rehydration scheduling failed', error);
    });
  }

  size(): number {
    return this.pending.size;
  }
}

export const rehydrationQueue = new RehydrationQueue();

async function markCaptureRehydrationFailed(id: string): Promise<void> {
  const { getRawDb } = await import('../../../../db/client');
  await getRawDb().execute(
    `UPDATE learning_captures
     SET embedding_status = 'failed',
         embedding_retry_count = embedding_retry_count + 1
     WHERE id = ?`,
    [id],
  );
}
