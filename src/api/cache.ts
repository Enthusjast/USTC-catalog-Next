import { z } from "zod";
import { API_BASE } from "./config";

const entrySchema = z.object({
  key: z.string(),
  retrievedAt: z.string().datetime(),
  payload: z.unknown(),
});
export type CacheEntry = z.infer<typeof entrySchema>;
type StoredEntry = CacheEntry & { kind: "essential" | "query" };
export interface CacheToken {
  generation: number;
  revision?: number;
}
export class CacheStorageError extends Error {}
const MAX_ENTRIES = 100,
  memory = new Map<string, StoredEntry>();
const essentialKeys = new Set(
  ["/restricted", "/teach/semester/list", "/teach/department/college-tree"].map(
    (path) => `${API_BASE}${path}:null`,
  ),
);
const signalKey = "catalog:query-cache-signal";
let generation = 0,
  knownRevision: number | undefined,
  database: Promise<IDBDatabase> | undefined;
let channel: BroadcastChannel | undefined;
export const cacheGeneration = () => generation;
const classify = (entry: CacheEntry): StoredEntry => ({
  ...entry,
  kind: essentialKeys.has(entry.key) ? "essential" : "query",
});
function invalidate() {
  generation++;
  memory.clear();
}
function synchronize(revision: number) {
  if (knownRevision !== undefined && revision <= knownRevision) return;
  if (knownRevision !== undefined || memory.size || revision > 0) invalidate();
  knownRevision = revision;
}
function remember(entry: CacheEntry) {
  memory.set(entry.key, classify(entry));
  while (memory.size > MAX_ENTRIES) {
    let oldest: StoredEntry | undefined;
    for (const row of memory.values())
      if (
        row.kind === "query" &&
        (!oldest || row.retrievedAt < oldest.retrievedAt)
      )
        oldest = row;
    if (!oldest) break;
    memory.delete(oldest.key);
  }
}
const queryRange = () => IDBKeyRange.bound(["query", ""], ["query", "\uffff"]);
const essentialRange = () =>
  IDBKeyRange.bound(["essential", ""], ["essential", "\uffff"]);
function normalizeEssential(db: IDBDatabase) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("queries", "readwrite"),
      request = tx
        .objectStore("queries")
        .index("byKindAndTime")
        .openCursor(essentialRange());
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const parsed = entrySchema.safeParse(cursor.value);
      if (parsed.success && !essentialKeys.has(parsed.data.key))
        cursor.update(classify(parsed.data));
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onabort = tx.onerror = () =>
      reject(new CacheStorageError("无法连接查询缓存。"));
  });
}
function open() {
  if (database) return database;
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    let abandoned = false;
    const fail = (message: string) => {
      abandoned = true;
      reject(new CacheStorageError(message));
    };
    try {
      const request = indexedDB.open("ustc-catalog-cache", 3);
      request.onupgradeneeded = () => {
        const db = request.result,
          tx = request.transaction!;
        const store = db.objectStoreNames.contains("queries")
          ? tx.objectStore("queries")
          : db.createObjectStore("queries", { keyPath: "key" });
        if (!store.indexNames.contains("retrievedAt"))
          store.createIndex("retrievedAt", "retrievedAt");
        if (!store.indexNames.contains("byKindAndTime"))
          store.createIndex("byKindAndTime", ["kind", "retrievedAt"]);
        if (!db.objectStoreNames.contains("metadata"))
          db.createObjectStore("metadata").put(0, "clearRevision");
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row) return;
          const parsed = entrySchema.safeParse(row.value);
          if (parsed.success) row.update(classify(parsed.data));
          else row.delete();
          row.continue();
        };
      };
      request.onerror = () => fail("无法打开查询缓存，请重试。");
      request.onblocked = () =>
        fail("查询缓存正在升级，请关闭旧标签页后重试。");
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          if (database === pending) database = undefined;
        };
        void normalizeEssential(db)
          .then(() => resolve(db))
          .catch((error) => {
            db.close();
            reject(error);
          });
      };
    } catch {
      fail("浏览器无法访问查询缓存。");
    }
  });
  database = pending;
  void pending.catch(() => {
    if (database === pending) database = undefined;
  });
  return pending;
}
function revisionValue(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new CacheStorageError("查询缓存版本记录无法读取。");
  return value;
}
function guardTransaction(tx: IDBTransaction, action: () => void) {
  return () => {
    try {
      action();
    } catch {
      tx.abort();
    }
  };
}
async function revision(db: IDBDatabase) {
  return new Promise<number>((resolve, reject) => {
    const request = db
      .transaction("metadata")
      .objectStore("metadata")
      .get("clearRevision");
    request.onsuccess = () => {
      try {
        resolve(revisionValue(request.result));
      } catch (error) {
        reject(error);
      }
    };
    request.onerror = () =>
      reject(new CacheStorageError("无法读取查询缓存版本。"));
  });
}
export async function captureCacheToken(): Promise<CacheToken> {
  const before = generation;
  try {
    const value = await revision(await open());
    if (before !== generation) return { generation: before, revision: value };
    synchronize(value);
    return { generation, revision: value };
  } catch {
    return { generation: before };
  }
}
export async function isCacheTokenCurrent(token: CacheToken) {
  if (token.generation !== generation) return false;
  if (token.revision === undefined) {
    const fresh = await captureCacheToken();
    return token.generation === fresh.generation;
  }
  try {
    const value = await revision(await open());
    synchronize(value);
    return token.generation === generation && token.revision === value;
  } catch {
    return false;
  }
}
export async function readCache(key: string, provided?: CacheToken) {
  const token = provided ?? (await captureCacheToken());
  if (token.generation !== generation) return undefined;
  if (token.revision === undefined) {
    const cached = memory.get(key);
    return cached && entrySchema.parse(cached);
  }
  try {
    const db = await open();
    return await new Promise<CacheEntry | undefined>((resolve) => {
      const tx = db.transaction(["metadata", "queries"]),
        epoch = tx.objectStore("metadata").get("clearRevision");
      epoch.onsuccess = guardTransaction(tx, () => {
        const value = revisionValue(epoch.result);
        synchronize(value);
        if (token.generation !== generation || token.revision !== value) {
          resolve(undefined);
          return;
        }
        const cached = memory.get(key);
        if (cached) {
          resolve(entrySchema.parse(cached));
          return;
        }
        const request = tx.objectStore("queries").get(key);
        request.onsuccess = () => {
          const parsed = entrySchema.safeParse(request.result);
          if (parsed.success && token.generation === generation) {
            remember(parsed.data);
            resolve(parsed.data);
          } else resolve(undefined);
        };
        request.onerror = () => resolve(undefined);
      });
      tx.onabort = tx.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}
export async function writeCache(
  entry: CacheEntry,
  provided?: CacheToken | number,
) {
  if (typeof provided === "number" && provided !== generation) return;
  const token =
    typeof provided === "object" ? provided : await captureCacheToken();
  if (
    token.generation !== generation ||
    (typeof provided === "number" && provided !== generation)
  )
    return;
  if (token.revision === undefined) {
    if (await isCacheTokenCurrent(token)) remember(entry);
    return;
  }
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(["queries", "metadata"], "readwrite"),
        store = tx.objectStore("queries"),
        epoch = tx.objectStore("metadata").get("clearRevision");
      let accepted = false;
      const removed: string[] = [];
      epoch.onsuccess = guardTransaction(tx, () => {
        const value = revisionValue(epoch.result);
        synchronize(value);
        if (token.generation !== generation || value !== token.revision) return;
        store.put(classify(entry));
        accepted = true;
        const count = store.count();
        count.onsuccess = () => {
          let excess = count.result - MAX_ENTRIES;
          if (excess <= 0) return;
          const request = store
            .index("byKindAndTime")
            .openKeyCursor(queryRange());
          request.onsuccess = () => {
            const row = request.result;
            if (!row || excess <= 0) return;
            store.delete(row.primaryKey);
            removed.push(String(row.primaryKey));
            if (--excess > 0) row.continue();
          };
        };
      });
      tx.oncomplete = () => {
        if (accepted && token.generation === generation) {
          remember(entry);
          removed.forEach((key) => memory.delete(key));
        }
        resolve();
      };
      tx.onabort = tx.onerror = () => {
        if (accepted && token.generation === generation) remember(entry);
        resolve();
      };
    });
  } catch {
    if (await isCacheTokenCurrent(token)) remember(entry);
  }
}
function announce(value: number) {
  channel?.postMessage({ type: "clear", revision: value });
  try {
    localStorage.setItem(
      signalKey,
      JSON.stringify({ revision: value, nonce: crypto.randomUUID() }),
    );
  } catch {
    /* Storage events are optional. */
  }
}
async function checkRevision() {
  try {
    synchronize(await revision(await open()));
  } catch {
    /* Preserve temporary in-memory queries. */
  }
}
if (typeof window !== "undefined") {
  try {
    channel = new BroadcastChannel("ustc-catalog-cache");
    channel.onmessage = (event) => {
      if (event.data?.type === "clear") {
        try {
          synchronize(revisionValue(event.data.revision));
        } catch {
          /* Ignore invalid notifications. */
        }
      }
    };
  } catch {
    /* Storage-event fallback. */
  }
  window.addEventListener("storage", (event) => {
    if (event.key === signalKey) void checkRevision();
  });
  window.addEventListener("focus", () => void checkRevision());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void checkRevision();
  });
}
export async function clearCache() {
  invalidate();
  const db = await open();
  const value = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(["queries", "metadata"], "readwrite"),
      metadata = tx.objectStore("metadata"),
      request = metadata.get("clearRevision");
    let next: number;
    request.onsuccess = guardTransaction(tx, () => {
      next = revisionValue(request.result) + 1;
      tx.objectStore("queries").clear();
      metadata.put(next, "clearRevision");
    });
    tx.oncomplete = () => resolve(next!);
    tx.onabort = tx.onerror = () =>
      reject(
        new CacheStorageError(
          "无法清除查询缓存，请重试或在浏览器设置中清除站点数据。",
        ),
      );
  });
  knownRevision = value;
  invalidate();
  announce(value);
}
