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
      const request = indexedDB.open("ustc-catalog-cache", 2);
      let blocked = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        const store = db.objectStoreNames.contains("queries")
          ? request.transaction!.objectStore("queries")
          : db.createObjectStore("queries", { keyPath: "key" });
        if (!store.indexNames.contains("retrievedAt"))
          store.createIndex("retrievedAt", "retrievedAt");
      };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          database = undefined;
        };
        resolve(db);
      };
      request.onerror = () => resolve(undefined);
      request.onblocked = () => {
        blocked = true;
        resolve(undefined);
      };
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
    await new Promise<void>((resolve) => {
      const transaction = db.transaction("queries", "readwrite"),
        store = transaction.objectStore("queries");
      store.put(entry);
      const count = store.count();
      count.onsuccess = () => {
        let excess = count.result - MAX_ENTRIES;
        if (excess <= 0) return;
        // Keys only: eviction never clones every cached API response into memory.
        const request = store.index("retrievedAt").openKeyCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor || excess <= 0) return;
          store.delete(cursor.primaryKey);
          memory.delete(String(cursor.primaryKey));
          excess--;
          if (excess > 0) cursor.continue();
        };
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => resolve();
      transaction.onerror = () => resolve();
    });
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
    transaction.onabort = transaction.onerror;
  });
}
