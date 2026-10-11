import { describe, it, expect, beforeEach, vi } from "vitest";
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
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
vi.mock("../src/api/environment", () => ({ DEMO_MODE: false }));
describe("workspace persistence", () => {
  it("persists legacy migration before deleting legacy keys", async () => {
    values.set(
      "catalog:planner",
      JSON.stringify({ "2026": { lessons: [lesson], savedAt: "old" } }),
    );
    const { workspace } = await import("../src/features/useWorkspace");
    expect(workspace.value.semesters["2026"]?.schemes[0]?.lessons).toHaveLength(
      1,
    );
    expect(values.has("catalog:workspace")).toBe(true);
    expect(values.has("catalog:planner")).toBe(false);
  });
  it("preserves legacy storage and loaded candidates on migration quota errors", async () => {
    values.set(
      "catalog:planner",
      JSON.stringify({ "2026": { lessons: [lesson], savedAt: "old" } }),
    );
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: (key: string) => values.delete(key),
    });
    const { workspace } = await import("../src/features/useWorkspace");
    expect(workspace.value.semesters["2026"]?.schemes[0]?.lessons).toHaveLength(
      1,
    );
    expect(values.has("catalog:planner")).toBe(true);
  });
  it("keeps existing state when an import cannot persist", async () => {
    const store = await import("../src/features/useWorkspace");
    store.saveWorkspace(populated());
    const before = JSON.stringify(store.workspace.value);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(store.importWorkspace(JSON.stringify(makeBackup(populated())))).toBe(
      false,
    );
    expect(JSON.stringify(store.workspace.value)).toBe(before);
  });
  it("switches candidates with the active scheme and preserves calendar preferences", async () => {
    const { ref } = await import("vue"),
      { usePlanner } = await import("../src/features/usePlanner");
    const planner = usePlanner(ref("2026"));
    planner.toggle(lesson);
    const original = planner.activeSchemeId.value;
    planner.firstMonday.value = "2026-08-31";
    planner.addScheme("新方案");
    expect(planner.lessons.value).toHaveLength(0);
    planner.activeSchemeId.value = original;
    expect(planner.lessons.value).toHaveLength(1);
    expect(planner.firstMonday.value).toBe("2026-08-31");
    planner.removeScheme();
    planner.removeScheme();
    expect(planner.schemes.value).toHaveLength(1);
    expect(planner.lessons.value).toHaveLength(0);
  });
});
