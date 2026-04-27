let activeRetrievals = 0;
let activeCriticalWrites = 0;
let activeGc = 0;

export async function withRetrievalActivity<T>(fn: () => Promise<T>): Promise<T> {
  await waitForNoGc();
  activeRetrievals += 1;
  try {
    return await fn();
  } finally {
    activeRetrievals = Math.max(0, activeRetrievals - 1);
  }
}

export async function withCriticalWriteActivity<T>(fn: () => Promise<T>): Promise<T> {
  await waitForNoGc();
  activeCriticalWrites += 1;
  try {
    return await fn();
  } finally {
    activeCriticalWrites = Math.max(0, activeCriticalWrites - 1);
  }
}

export async function withGcActivity<T>(fn: () => Promise<T>): Promise<T> {
  activeGc += 1;
  try {
    return await fn();
  } finally {
    activeGc = Math.max(0, activeGc - 1);
  }
}

export async function waitForRetrievalQuiet(timeoutMs = 5000): Promise<boolean> {
  const startedAt = Date.now();
  while (activeRetrievals > 0 || activeCriticalWrites > 0) {
    if (Date.now() - startedAt >= timeoutMs) return false;
    await sleep(50);
  }
  return true;
}

async function waitForNoGc(timeoutMs = 5000): Promise<boolean> {
  const startedAt = Date.now();
  while (activeGc > 0) {
    if (Date.now() - startedAt >= timeoutMs) return false;
    await sleep(50);
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
