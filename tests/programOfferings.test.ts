import { describe, it, expect } from "vitest";
import { programOfferings } from "../src/domain/programOfferings";
import type { Lesson, ProgramModule } from "../src/domain/models";
const entry = {
  course: { code: "A", name: "同名课程" },
  terms: ["1秋", "2春"],
};
const modules: ProgramModule[] = [
  {
    id: "root",
    name: "主模块",
    requirement: "任选两门",
    requiredCredits: 6,
    courses: [entry],
    children: [
      {
        id: "child",
        name: "子模块",
        courses: [entry],
        referenceState: "incomplete",
        publicId: "unknown",
        children: [],
      },
    ],
  },
];
const lesson = (code: string, id: string): Lesson => ({
  id,
  code: `${code}.${id}`,
  course: { code, name: "同名课程" },
  teachers: [],
  department: "",
  departmentCode: "",
  schedule: { text: "", unknown: true, slots: [] },
});
describe("program semester offerings", () => {
  it("matches exact codes, retaining repeated occurrences and original requirements", () => {
    const rows = programOfferings(modules, [
      lesson("A", "1"),
      lesson("A", "2"),
      lesson("AB", "3"),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.entries[0]?.lessons.length)).toEqual([2, 2]);
    expect(rows[0]?.module.requirement).toBe("任选两门");
    expect(rows[1]?.module.referenceState).toBe("incomplete");
    expect(rows[0]?.entries[0]?.entry.terms).toEqual(["1秋", "2春"]);
  });
  it("keeps all classes rather than taking a fixed maximum", () => {
    expect(
      programOfferings(
        modules,
        Array.from({ length: 130 }, (_, i) => lesson("A", String(i))),
      )[0]?.entries[0]?.lessons,
    ).toHaveLength(130);
    expect(
      programOfferings(modules, [lesson("AB", "1")])[0]?.entries[0]?.lessons,
    ).toEqual([]);
  });
  it("keeps occurrence keys stable while sibling courses are filtered", () => {
    const second = { course: { code: "B", name: "乙" }, terms: [] };
    const whole = [{ ...modules[0]!, courses: [second, entry] }],
      filtered = [{ ...modules[0]!, courses: [entry] }];
    expect(programOfferings(whole, [])[0]?.entries[1]?.key).toBe(
      programOfferings(filtered, [])[0]?.entries[0]?.key,
    );
  });
});
