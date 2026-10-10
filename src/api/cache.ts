import { z } from "zod";

const entrySchema = z.object({
  key: z.string(),
  retrievedAt: z.string().datetime(),
  payload: z.unknown(),
});
export type CacheEntry = z.infer<typeof entrySchema>;
const memory = new Map<string, CacheEntry>();
const MAX_ENTRIES = 100;
let generation = 0;
export const cacheGeneration = () => generation;
function remember(entry: CacheEntry) {
  memory.delete(entry.key);
  memory.set(entry.key, entry);
  while (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value!);
}
let database: Promise<IDBDatabase | undefined> | undefined;
function open() {
  database ??= new Promise<IDBDatabase | undefined>((resolve) => {
    try {
      const request = indexedDB.open("ustc-catalog-cache", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("queries", { keyPath: "key" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
      request.onblocked = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
  return database;
}
export async function readCache(key: string) {
  const current = generation;
  if (memory.has(key)) return memory.get(key);
  const db = await open();
  if (!db || current !== generation) return undefined;
  return new Promise<CacheEntry | undefined>((resolve) => {
    try {
      const request = db.transaction("queries").objectStore("queries").get(key);
      request.onsuccess = () => {
        const result = entrySchema.safeParse(request.result);
        if (result.success && current === generation) {
          remember(result.data);
          resolve(result.data);
        } else resolve(undefined);
      };
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}
export async function writeCache(entry: CacheEntry, current = generation) {
  if (current !== generation) return;
  remember(entry);
  const db = await open();
  if (!db || current !== generation) return;
  try {
    const store = db.transaction("queries", "readwrite").objectStore("queries");
    store.put(entry);
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = (request.result as CacheEntry[]).sort((a, b) =>
        b.retrievedAt.localeCompare(a.retrievedAt),
      );
      entries.slice(MAX_ENTRIES).forEach((item) => {
        store.delete(item.key);
        memory.delete(item.key);
      });
    };
    // Storage quota failures must never turn a successful API response into an error.
  } catch {
    /* Private browsing may deny persistent storage. */
  }
}
export async function clearCache() {
  generation++;
  memory.clear();
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("queries", "readwrite");
    transaction.objectStore("queries").clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new Error("无法清除本机数据，请在浏览器设置中清除站点数据。"));
  });
}
