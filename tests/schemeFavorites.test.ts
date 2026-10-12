import { describe, it, expect, beforeEach, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  createScheme,
  emptyWorkspace,
  singleSchemeBackup,
  serializeBackup,
  parseBackup,
} from "../src/domain/workspace";
import { schemeStats, compareSchemes } from "../src/domain/schemeComparison";
import type { Lesson } from "../src/domain/models";
const lesson: Lesson = {
  id: "1",
  code: "A.01",
  course: { code: "A", name: "甲" },
  department: "院系",
  departmentCode: "1",
  teachers: ["教师"],
  credits: 3,
  schedule: {
    unknown: false,
    text: "安排",
    slots: [{ day: 1, periods: [1, 2], weeks: [1], location: "1101" }],
  },
};
vi.mock("../src/api/environment", () => ({ DEMO_MODE: false }));
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("localStorage", {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  });
});
describe("scheme comparisons and private favorites", () => {
  it("deduplicates credits and counts occupied and overlapping periods separately", () => {
    const stats = schemeStats(
      createScheme("方案", [lesson, { ...lesson, id: "2", code: "A.02" }]),
      1,
    );
    expect(stats.credits).toBe(3);
    expect(stats.courses).toBe(1);
    expect(stats.days[0]).toEqual({ occupied: 2, overlapping: 2 });
    expect(
      schemeStats(
        createScheme("方案", [
          lesson,
          { ...lesson, id: "2", credits: undefined },
        ]),
        1,
      ).unknownCredits,
    ).toEqual(["A"]);
  });
  it("compares course changes and teaching-class differences", () => {
    const result = compareSchemes(
      createScheme("左", [lesson]),
      createScheme("右", [
        { ...lesson, code: "A.02" },
        { ...lesson, id: "2", course: { code: "B", name: "乙" } },
      ]),
    );
    expect(result.added).toEqual(["B"]);
    expect(result.changed).toEqual(["A"]);
  });
  it("exports only the selected scheme and calendar", () => {
    const data = emptyWorkspace(),
      scheme = createScheme("私有方案", [lesson], {
        firstMonday: "2026-08-31",
        layout: "1",
      });
    data.semesters["461"] = {
      activeId: scheme.id,
      schemes: [scheme, createScheme("其他")],
    };
    data.favorites = ["A"];
    data.favoriteDetails = { A: { note: "不分享" } };
    data.roomFavorites = [{ directoryId: 1, room: "1101", building: "1" }];
    const file = parseBackup(
      serializeBackup(singleSchemeBackup(data, "461", scheme.id)),
    );
    expect(file.semesters["461"]?.schemes).toHaveLength(1);
    expect(file.favorites).toEqual([]);
    expect(file.favoriteDetails).toEqual({});
    expect(file.roomFavorites).toEqual([]);
  });
  it("preserves notes on group deletion and rejects stale note drafts", async () => {
    const { workspaceReady, workspace } =
      await import("../src/features/useWorkspace");
    await workspaceReady;
    const { useFavorites } = await import("../src/features/useFavorites");
    const favorites = useFavorites();
    await favorites.toggle("A");
    await favorites.createGroup("选修");
    const id = workspace.value.favoriteGroups[0]!.id;
    expect(
      await favorites.saveDetails(
        "A",
        { groupId: id, note: "新备注" },
        { note: "" },
      ),
    ).toBe(true);
    expect(
      await favorites.saveDetails("A", { note: "旧草稿" }, { note: "" }),
    ).toBe(false);
    await favorites.removeGroup(id);
    expect(workspace.value.favoriteDetails.A).toEqual({
      groupId: undefined,
      note: "新备注",
    });
  });
  it("rejects excessive notes and group counts atomically", async () => {
    const { workspaceReady, workspace } =
      await import("../src/features/useWorkspace");
    await workspaceReady;
    const { useFavorites } = await import("../src/features/useFavorites");
    const favorites = useFavorites();
    await favorites.toggle("A");
    expect(
      await favorites.saveDetails(
        "A",
        { note: "a".repeat(1001) },
        { note: "" },
      ),
    ).toBe(false);
    expect(workspace.value.favoriteDetails.A).toBeUndefined();
    for (let i = 0; i < 20; i++) await favorites.createGroup(String(i));
    expect(await favorites.createGroup("第21组")).toBe(false);
    expect(workspace.value.favoriteGroups).toHaveLength(20);
  });
});
