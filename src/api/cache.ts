import { z } from "zod";

const entrySchema = z.object({
  key: z.string(),
  retrievedAt: z.string().datetime(),
  payload: z.unknown(),
});
export type CacheEntry = z.infer<typeof entrySchema>;
const memory = new Map<string, CacheEntry>();
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
  if (memory.has(key)) return memory.get(key);
  const db = await open();
  if (!db) return undefined;
  return new Promise<CacheEntry | undefined>((resolve) => {
    try {
      const request = db.transaction("queries").objectStore("queries").get(key);
      request.onsuccess = () => {
        const result = entrySchema.safeParse(request.result);
        if (result.success) {
          memory.set(key, result.data);
          resolve(result.data);
        } else resolve(undefined);
      };
      request.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}
export async function writeCache(entry: CacheEntry) {
  memory.set(entry.key, entry);
  const db = await open();
  if (!db) return;
  try {
    const store = db.transaction("queries", "readwrite").objectStore("queries");
    store.put(entry);
    const request = store.getAll();
    request.onsuccess = () => {
      const entries = (request.result as CacheEntry[]).sort((a, b) =>
        b.retrievedAt.localeCompare(a.retrievedAt),
      );
      entries.slice(100).forEach((item) => {
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
  memory.clear();
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("queries", "readwrite");
    transaction.objectStore("queries").clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(new Error("无法清除本机缓存，请在浏览器设置中清除站点数据。"));
  });
}
