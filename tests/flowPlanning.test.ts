import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { candidateUpdates } from "../src/domain/lessonUpdates";
import { roomLink, lessonLink } from "../src/domain/queryLinks";
import type { Lesson } from "../src/domain/models";
const lesson: Lesson = {
  id: "one",
  code: "MATH.01",
  course: { code: "MATH", name: "数学" },
  department: "数学",
  departmentCode: "1",
  teachers: ["甲"],
  schedule: { slots: [], unknown: true, text: "未知" },
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
afterEach(() => vi.useRealTimers());
describe("planning changes", () => {
  it("reports updates and keeps missing or ambiguous classes separate", () => {
    const current = { ...lesson, teachers: ["乙"], capacity: 40 };
    const changed = candidateUpdates([lesson], [current])[0]!;
    expect(changed.status).toBe("changed");
    expect(changed.fields.some((f) => f.label === "教师")).toBe(true);
    expect(candidateUpdates([lesson], [])[0]?.status).toBe("missing");
    expect(candidateUpdates([lesson], [current, current])[0]?.status).toBe(
      "ambiguous",
    );
    expect(candidateUpdates([lesson], [lesson])[0]?.status).toBe("same");
  });
  it("only links uniquely identified rooms and includes the semester in lesson links", () => {
    expect(roomLink("1101", "2026-10-12")?.query.date).toBe("2026-10-12");
    expect(roomLink("unknown")).toBeUndefined();
    expect(lessonLink("461", "MATH.01").query.semester).toBe("461");
  });
  it("restores removals, clear and deletion without overwriting later writes", async () => {
    const { ref } = await import("vue"),
      { usePlanner } = await import("../src/features/usePlanner"),
      { useWorkspaceUndo } = await import("../src/features/useWorkspaceUndo");
    const planner = usePlanner(ref("2026")),
      undo = useWorkspaceUndo();
    await planner.toggle(lesson);
    await planner.toggle(lesson);
    expect(undo.last.value).toBeDefined();
    await undo.undo();
    expect(planner.lessons.value).toHaveLength(1);
    await planner.clear();
    await undo.undo();
    expect(planner.lessons.value).toHaveLength(1);
    await planner.removeScheme();
    await undo.undo();
    expect(planner.lessons.value).toHaveLength(1);
    await planner.clear();
    await planner.renameScheme("修改");
    expect(undo.last.value).toBeUndefined();
    expect(await undo.undo()).toBe(false);
  });
  it("expires the undo after 15 seconds", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const { ref } = await import("vue"),
      { usePlanner } = await import("../src/features/usePlanner"),
      { useWorkspaceUndo } = await import("../src/features/useWorkspaceUndo");
    const planner = usePlanner(ref("2026")),
      undo = useWorkspaceUndo();
    await planner.toggle(lesson);
    await planner.clear();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(undo.last.value).toBeUndefined();
    expect(await undo.undo()).toBe(false);
  });
});
