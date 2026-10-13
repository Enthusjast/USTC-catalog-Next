import { describe, it, expect, beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { removeCatalogStorage } from "../src/domain/localData";

function storage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get length() {
      return values.size;
    },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
}
vi.mock("../src/api/environment", () => ({ DEMO_MODE: false }));
vi.mock("../src/app/theme", () => ({
  applyTheme: (theme: string) => {
    document.documentElement.dataset.theme = theme;
  },
}));
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("document", {
    createElement: () => ({}),
    documentElement: { dataset: {} },
  });
});
describe("local data management", () => {
  it("removes current, legacy and demo keys without touching unrelated data", () => {
    const local = storage({
      "catalog:workspace": "{}",
      "catalog:planner": "{}",
      "catalog:favorites": "[]",
      "catalog:demo:workspace": "{}",
      unrelated: "keep",
    });
    const session = storage({
      "catalog:classroom-positions": "[]",
      unrelated: "keep",
    });
    removeCatalogStorage(local);
    removeCatalogStorage(session);
    expect([...local.values.entries()]).toEqual([["unrelated", "keep"]]);
    expect([...session.values.entries()]).toEqual([["unrelated", "keep"]]);
  });
  it("clears query cache separately and resets all in-memory planning state on full clear", async () => {
    const local = storage({
      "catalog:favorites": '["MATH"]',
      "catalog:theme": "dark",
      "catalog:demo:planner": "{}",
      unrelated: "keep",
    });
    const session = storage({ "catalog:classroom-positions": "[]" });
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    const { workspace, workspaceReady } =
      await import("../src/features/useWorkspace");
    await workspaceReady;
    const { clearCache, writeCache, readCache } =
      await import("../src/api/cache");
    const entry = {
      key: "query",
      retrievedAt: new Date().toISOString(),
      payload: [1],
    };
    await writeCache(entry);
    await clearCache();
    expect(await readCache("query")).toBeUndefined();
    expect(workspace.value.favorites).toEqual(["MATH"]);
    const { readWorkspace } =
      await import("../src/features/workspaceRepository");
    expect((await readWorkspace("catalog:workspace"))?.favorites).toEqual([
      "MATH",
    ]);
    const { clearAllLocalData } =
      await import("../src/features/clearLocalData");
    const { usePreferences } = await import("../src/features/usePreferences");
    await clearAllLocalData();
    expect(workspace.value.favorites).toEqual([]);
    expect(workspace.value.semesters).toEqual({});
    expect(usePreferences().theme.value).toBe("light");
    expect([...local.values.entries()]).toEqual([["unrelated", "keep"]]);
    expect(session.length).toBe(0);
  });
  it("reports storage removal failure", () => {
    const local = storage({ "catalog:workspace": "{}" });
    local.removeItem = () => {
      throw new Error("denied");
    };
    expect(() => removeCatalogStorage(local)).toThrow("denied");
  });
});
