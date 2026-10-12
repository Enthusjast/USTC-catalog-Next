import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { z } from "zod";
vi.mock("../src/api/environment", () => ({ DEMO_MODE: false }));
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
});
async function cacheDatabase(version?: number) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("ustc-catalog-cache", version);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("queries", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const entry = (i: number) => ({
  key: String(i),
  retrievedAt: new Date(Date.UTC(2026, 9, 12, 0, 0, i)).toISOString(),
  payload: { nested: [i] },
});
describe("query cache indexed eviction", () => {
  it("upgrades existing records and adds the date index without losing payloads", async () => {
    const db = await cacheDatabase(1);
    await new Promise<void>((resolve) => {
      const tx = db.transaction("queries", "readwrite");
      tx.objectStore("queries").put(entry(1));
      tx.oncomplete = () => resolve();
    });
    db.close();
    const { readCache } = await import("../src/api/cache");
    expect(await readCache("1")).toEqual(entry(1));
    const upgraded = await cacheDatabase();
    expect(upgraded.version).toBe(2);
    expect(
      upgraded
        .transaction("queries")
        .objectStore("queries")
        .indexNames.contains("retrievedAt"),
    ).toBe(true);
    upgraded.close();
  });
  it("keeps the 100 newest records using key cursors without reading all payloads", async () => {
    const getAll = vi
      .spyOn(IDBObjectStore.prototype, "getAll")
      .mockImplementation(() => {
        throw new Error("full payload read forbidden");
      });
    const { writeCache, readCache } = await import("../src/api/cache");
    for (let i = 0; i < 130; i++) await writeCache(entry(i));
    expect(await readCache("0")).toBeUndefined();
    expect(await readCache("29")).toBeUndefined();
    expect(await readCache("30")).toEqual(entry(30));
    expect(await readCache("129")).toEqual(entry(129));
    const db = await cacheDatabase();
    const count = await new Promise<number>((resolve) => {
      const request = db.transaction("queries").objectStore("queries").count();
      request.onsuccess = () => resolve(request.result);
    });
    expect(count).toBe(100);
    expect(getAll).not.toHaveBeenCalled();
    getAll.mockRestore();
    db.close();
  });
  it("does not resurrect cleared results through an older request generation", async () => {
    const { cacheGeneration, writeCache, readCache, clearCache } =
      await import("../src/api/cache");
    const old = cacheGeneration();
    await writeCache(entry(1));
    await clearCache();
    await writeCache(entry(2), old);
    expect(await readCache("1")).toBeUndefined();
    expect(await readCache("2")).toBeUndefined();
  });
  it.each(["network", "http", "content", "schema"])(
    "preserves network-only stale fallback: %s",
    async (kind) => {
      const { writeCache } = await import("../src/api/cache");
      await writeCache({
        key: "https://api.catalog.enthusjast.cc/test:null",
        payload: [1],
        retrievedAt: "2000-01-01T00:00:00.000Z",
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (url.endsWith("/restricted"))
            return new Response('{"restricted":false}', {
              headers: { "content-type": "application/json" },
            });
          if (kind === "network") throw new TypeError("failed");
          return new Response(kind === "schema" ? "{}" : "[]", {
            status: kind === "http" ? 500 : 200,
            headers: {
              "content-type":
                kind === "content" ? "text/html" : "application/json",
            },
          });
        }),
      );
      const { query } = await import("../src/api/client");
      if (kind === "network")
        expect((await query("/test", z.array(z.number()))).meta.state).toBe(
          "stale",
        );
      else
        await expect(query("/test", z.array(z.number()))).rejects.toMatchObject(
          { kind },
        );
    },
  );
});
