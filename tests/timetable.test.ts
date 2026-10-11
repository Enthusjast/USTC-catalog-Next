import { describe, it, expect } from "vitest";
import {
  timetableBlocks,
  timetableClusters,
  courseHue,
} from "../src/domain/timetable";
import type { Lesson } from "../src/domain/models";
const lesson = (id: string, periods = [3, 4, 6], location = "A"): Lesson => ({
  id,
  code: id,
  course: { code: "MATH", name: "数学" },
  department: "学院",
  departmentCode: "1",
  teachers: ["教师"],
  schedule: {
    unknown: false,
    text: "",
    slots: [{ day: 2, weeks: [1, 3], periods, location }],
  },
});
describe("timetable layout", () => {
  it("merges consecutive periods without joining gaps", () => {
    expect(
      timetableBlocks([lesson("A")], 1).map((b) => [b.start, b.end]),
    ).toEqual([
      [3, 5],
      [6, 7],
    ]);
  });
  it("keeps different locations and weeks separate", () => {
    const a = lesson("A", [3]);
    a.schedule.slots.push({ day: 2, weeks: [1], periods: [4], location: "B" });
    expect(timetableBlocks([a], 1)).toHaveLength(2);
    expect(timetableBlocks([a], 2)).toHaveLength(0);
  });
  it("keeps every matching result in dense clusters", () => {
    const blocks = timetableBlocks(
        Array.from({ length: 1200 }, (_, i) => lesson(String(i), [3, 4])),
        1,
      ),
      clusters = timetableClusters(blocks);
    expect(blocks).toHaveLength(1200);
    expect(clusters[0]?.blocks).toHaveLength(1200);
    expect(clusters[0]?.lanes).toBe(1200);
  });
  it("does not mark touching intervals as overlapping", () => {
    const clusters = timetableClusters(
      timetableBlocks([lesson("A", [3]), lesson("B", [4])], 1),
    );
    expect(clusters).toHaveLength(2);
  });
  it("assigns stable course colors", () => {
    expect(courseHue("MATH")).toBe(courseHue("MATH"));
  });
});
