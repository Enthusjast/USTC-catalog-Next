import { describe, it, expect, beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  emptyWorkspace,
  createScheme,
  migrateLegacy,
  makeBackup,
  parseBackup,
  mergeBackup,
} from "../src/domain/workspace";
import type { Lesson } from "../src/domain/models";
const lesson: Lesson = {
  id: "L1",
  code: "MATH.01",
  course: { code: "MATH", name: "数学" },
  department: "数学学院",
  departmentCode: "1",
  teachers: ["教师"],
  schedule: { slots: [], unknown: true, text: "待定" },
};
function populated() {
  const workspace = emptyWorkspace(),
    scheme = createScheme("方案", [lesson]);
  workspace.semesters["2026"] = { activeId: scheme.id, schemes: [scheme] };
  workspace.favorites = ["MATH"];
  return workspace;
}
describe("workspace format", () => {
  it("migrates each legacy semester to a default scheme", () => {
    const result = migrateLegacy(
      { "2026": { lessons: [lesson], savedAt: "2026-10-11T00:00:00Z" } },
      ["MATH", "MATH"],
    );
    expect(result.semesters["2026"]?.schemes[0]?.name).toBe("默认方案");
    expect(result.semesters["2026"]?.schemes[0]?.lessons[0]?.id).toBe("L1");
    expect(result.favorites).toEqual(["MATH"]);
  });
  it("roundtrips all schemes, favorites and calendar settings", () => {
    const source = populated();
    source.semesters["2026"]!.schemes[0]!.calendar = {
      firstMonday: "2026-08-31",
      layout: "1",
    };
    const backup = parseBackup(JSON.stringify(makeBackup(source)));
    expect(backup.semesters).toEqual(source.semesters);
    expect(backup.favorites).toEqual(source.favorites);
  });
  it("imports copies without replacing existing identities or active schemes", () => {
    const source = populated(),
      id = source.semesters["2026"]!.activeId;
    const merged = mergeBackup(source, makeBackup(source));
    expect(merged.semesters["2026"]?.activeId).toBe(id);
    expect(merged.semesters["2026"]?.schemes.map((s) => s.name)).toEqual([
      "方案",
      "方案 (2)",
    ]);
    expect(merged.semesters["2026"]?.schemes[1]?.id).not.toBe(id);
    expect(source.semesters["2026"]?.schemes).toHaveLength(1);
    expect(merged.favorites).toEqual(["MATH"]);
  });
  it("rejects invalid versions, missing fields and duplicate candidates", () => {
    expect(() => parseBackup("{}")).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...makeBackup(populated()), version: 9 })),
    ).toThrow();
    const invalid = makeBackup(populated());
    invalid.semesters["2026"]!.schemes[0]!.lessons.push(lesson);
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
  });
  it("rejects excessive merged schemes without modifying either input", () => {
    const source = populated();
    source.semesters["2026"]!.schemes = Array.from({ length: 20 }, () =>
      createScheme("方案"),
    );
    source.semesters["2026"]!.activeId =
      source.semesters["2026"]!.schemes[0]!.id;
    expect(() => mergeBackup(source, makeBackup(populated()))).toThrow("20");
    expect(source.semesters["2026"]?.schemes).toHaveLength(20);
  });
});
let values: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  values = new Map();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
vi.mock("../src/api/environment", () => ({ DEMO_MODE: false }));
describe("workspace persistence", () => {
  it("persists migration before deleting legacy keys", async () => {
    values.set(
      "catalog:planner",
      JSON.stringify({ "2026": { lessons: [lesson], savedAt: "old" } }),
    );
    const store = await import("../src/features/useWorkspace");
    await store.workspaceReady;
    const { readWorkspace } =
      await import("../src/features/workspaceRepository");
    expect((await readWorkspace("catalog:workspace"))?.version).toBe(2);
    expect(
      store.workspace.value.semesters["2026"]?.schemes[0]?.lessons,
    ).toHaveLength(1);
    expect(values.has("catalog:planner")).toBe(false);
  });
  it("preserves legacy data on unavailable storage", async () => {
    vi.stubGlobal("indexedDB", undefined);
    values.set(
      "catalog:planner",
      JSON.stringify({ "2026": { lessons: [lesson], savedAt: "old" } }),
    );
    const store = await import("../src/features/useWorkspace");
    await store.workspaceReady;
    expect(
      store.workspace.value.semesters["2026"]?.schemes[0]?.lessons,
    ).toHaveLength(1);
    expect(values.has("catalog:planner")).toBe(true);
    expect(
      await store.editWorkspace((next) => {
        next.favorites.push("MATH");
      }),
    ).toBe(true);
    expect(store.workspaceStorageError.value).toContain("无法保存");
  });
  it("keeps existing state when import cannot persist", async () => {
    const store = await import("../src/features/useWorkspace");
    await store.workspaceReady;
    await store.editWorkspace((next) => Object.assign(next, populated()));
    const before = JSON.stringify(store.workspace.value);
    const repository = await import("../src/features/workspaceRepository");
    vi.spyOn(repository, "transactWorkspace").mockRejectedValueOnce(
      new repository.WorkspaceStorageError("quota"),
    );
    expect(
      await store.importWorkspace(JSON.stringify(makeBackup(populated()))),
    ).toBe(false);
    expect(JSON.stringify(store.workspace.value)).toBe(before);
  });
  it("merges concurrent operations against the latest persisted revision", async () => {
    const { transactWorkspace, readWorkspace } =
      await import("../src/features/workspaceRepository");
    await Promise.all([
      transactWorkspace("test", (next) => next.favorites.push("A")),
      transactWorkspace("test", (next) => next.favorites.push("B")),
    ]);
    expect((await readWorkspace("test"))?.favorites).toEqual(["A", "B"]);
    expect((await readWorkspace("test"))?.revision).toBe(2);
  });
  it("switches schemes and rejects deleted targets and old rename drafts", async () => {
    const { ref } = await import("vue"),
      { usePlanner } = await import("../src/features/usePlanner");
    const planner = usePlanner(ref("2026"));
    await planner.toggle(lesson);
    const original = planner.activeSchemeId.value;
    await planner.edit((s) => {
      s.calendar.firstMonday = "2026-08-31";
    });
    const draft = structuredClone(planner.active.value!);
    await planner.addScheme("新方案");
    expect(planner.lessons.value).toHaveLength(0);
    await planner.selectScheme(original);
    expect(planner.firstMonday.value).toBe("2026-08-31");
    await planner.renameScheme("修改后");
    expect(await planner.renameScheme("过期草稿", draft)).toBe(false);
    await planner.removeScheme(original);
    expect(await planner.renameScheme("失效目标", draft)).toBe(false);
    await planner.removeScheme();
    expect(planner.schemes.value).toHaveLength(1);
    expect(planner.lessons.value).toHaveLength(0);
  });
  it("reads version 1 backups and preserves new metadata when merging", () => {
    const old = {
      ...populated(),
      version: 1,
      format: "USTC-catalog-Next-backup",
      exportedAt: new Date().toISOString(),
    };
    expect(parseBackup(JSON.stringify(old)).version).toBe(2);
    const current = populated();
    current.favoriteGroups = [{ id: "g", name: "分组" }];
    current.favoriteDetails = { MATH: { groupId: "g", note: "保留" } };
    const incoming = makeBackup(populated());
    incoming.favoriteGroups = [{ id: "incoming", name: "分组" }];
    incoming.favoriteDetails = {
      MATH: { groupId: "incoming", note: "不能覆盖" },
    };
    const merged = mergeBackup(current, incoming);
    expect(merged.favoriteGroups).toHaveLength(1);
    expect(merged.favoriteDetails.MATH?.note).toBe("保留");
  });
});
