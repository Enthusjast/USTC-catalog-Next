import { describe, it, expect } from "vitest";
import {
  courseMatches,
  lessonMatches,
  programMatches,
  rankCourses,
} from "../src/domain/search";
import { matchesLessonFilters } from "../src/domain/lessonFilters";
import type { Lesson } from "../src/domain/models";
describe("shared search", () => {
  it("ranks exact and prefix before historical broad matches", () => {
    const data = [
      { code: "OLD", name: "高等数学", valid: false },
      { code: "M2", name: "数学分析", valid: true },
      { code: "M1", name: "数学", valid: true },
    ];
    expect(rankCourses(data, "数学").map((c) => c.code)).toEqual([
      "M1",
      "M2",
      "OLD",
    ]);
  });
  it("normalizes whitespace and English case", () => {
    expect(courseMatches({ code: "MATH", name: "数学" }, " math ")).toBe(true);
  });
  it("matches training type consistently", () => {
    expect(
      programMatches(
        {
          id: "1",
          name: "数学",
          major: "数学",
          department: "数学学院",
          grade: "2026",
          trainType: "主修",
        },
        "主修",
      ),
    ).toBe(true);
  });
  it("matches course codes in both lesson search and filtering", () => {
    const l: Lesson = {
      id: "1",
      code: "L1",
      course: { code: "MATH", name: "数学" },
      department: "数学学院",
      departmentCode: "1",
      teachers: ["教师"],
      schedule: { unknown: false, text: "", slots: [] },
    };
    expect(lessonMatches(l, "MATH")).toBe(true);
    expect(matchesLessonFilters(l, { q: "MATH" })).toBe(true);
    expect(matchesLessonFilters(l, { q: "不存在" })).toBe(false);
  });
});
