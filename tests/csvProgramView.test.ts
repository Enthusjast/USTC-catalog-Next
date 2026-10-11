import { describe, it, expect } from "vitest";
import { csvContent } from "../src/domain/csv";
import {
  filterProgramModules,
  programOccurrences,
  programTermGroups,
} from "../src/domain/programView";
import type { ProgramModule } from "../src/domain/models";
const modules: ProgramModule[] = [
  {
    id: "a",
    name: "公共模块",
    requirement: "至少一门",
    courses: [
      {
        course: { code: "MATH", name: "数学" },
        terms: ["1秋", "2春"],
        compulsory: true,
      },
      { course: { code: "EN", name: "英语" }, terms: [] },
    ],
    children: [
      {
        id: "b",
        name: "子模块",
        courses: [{ course: { code: "PHY", name: "物理" }, terms: ["3秋"] }],
        children: [],
        publicId: "unknown",
        referenceState: "incomplete",
      },
    ],
  },
];
describe("CSV exports", () => {
  it("preserves Chinese, commas, double quotes, newlines and zero", () => {
    expect(csvContent(["标题"], [['中文,内容"\n第二行'], [0]])).toContain(
      '"中文,内容""\n第二行"\r\n"0"',
    );
  });
  it("neutralizes text spreadsheet formulas while preserving numeric negatives", () => {
    const csv = csvContent(["标题"], [["=1+1"], ["\t@SUM(A1)"], [-1]]);
    expect(csv).toContain('"\'=1+1"');
    expect(csv).toContain('"\'\t@SUM(A1)"');
    expect(csv).toContain('"-1"');
  });
  it("exports all rows beyond a page", () => {
    expect(
      csvContent(
        ["编号"],
        Array.from({ length: 130 }, (_, i) => [i]),
      ).split("\r\n"),
    ).toHaveLength(132);
  });
});
describe("program views", () => {
  it("uses original term labels and preserves multiple occurrences", () => {
    const groups = programTermGroups(modules);
    expect(groups.map((g) => g.label)).toEqual([
      "1秋",
      "2春",
      "3秋",
      "建议学期未提供",
    ]);
    expect(
      groups
        .flatMap((g) => g.entries)
        .filter((r) => r.entry.course.code === "MATH"),
    ).toHaveLength(2);
  });
  it("retains parent requirements when finding a descendant course", () => {
    const found = filterProgramModules(modules, "PHY");
    expect(found[0]?.requirement).toBe("至少一门");
    expect(programOccurrences(found)).toHaveLength(1);
    expect(found[0]?.children[0]?.referenceState).toBe("incomplete");
  });
  it("keeps all descendants when the module name matches", () => {
    expect(
      programOccurrences(filterProgramModules(modules, "公共")),
    ).toHaveLength(3);
  });
});
