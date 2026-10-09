export function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("查询已取消", "AbortError");
}
export async function mapConcurrent<T, U>(
  items: T[],
  worker: (item: T, index: number) => Promise<U>,
  signal?: AbortSignal,
  concurrency = 3,
): Promise<U[]> {
  const result: U[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        abortIfNeeded(signal);
        const index = cursor++;
        result[index] = await worker(items[index]!, index);
      }
    }),
  );
  abortIfNeeded(signal);
  return result;
}
export function createLimiter(maximum: number) {
  let active = 0;
  const waiting: { start: () => void; signal: AbortSignal }[] = [];
  function drain() {
    while (active < maximum && waiting.length) {
      const next = waiting.shift()!;
      if (!next.signal.aborted) next.start();
    }
  }
  return (signal: AbortSignal): Promise<() => void> => {
    abortIfNeeded(signal);
    return new Promise((resolve, reject) => {
      const entry = {
        signal,
        start: () => {
          signal.removeEventListener("abort", abort);
          active++;
          let released = false;
          resolve(() => {
            if (!released) {
              released = true;
              active--;
              drain();
            }
          });
        },
      };
      const abort = () => {
        const index = waiting.indexOf(entry);
        if (index >= 0) waiting.splice(index, 1);
        reject(new DOMException("查询已取消", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      waiting.push(entry);
      drain();
    });
  };
}
