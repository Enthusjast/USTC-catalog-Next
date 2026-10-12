import { it, expect } from "vitest";
import {
  normalizeQuery,
  integerParam,
  dateParam,
} from "../src/domain/queryParams";
it("rejects decimal, infinite, repeated and out-of-range query parameters", () => {
  for (const value of ["1.5", "1.0", "Infinity", "NaN", "-1", "0", "54", "1e1"])
    expect(integerParam(1, 53)(value)).toBeUndefined();
  expect(integerParam(1, 53)("02")).toBe("2");
  expect(
    normalizeQuery("/lessons", {
      week: "1.5",
      ttDay: ["1", "2"],
      view: "bad",
      semester: "461",
      lesson: "MATH.01",
      q: "教师",
    }),
  ).toEqual({ semester: "461", lesson: "MATH.01", q: "教师" });
});
it("validates dates and enums, preserving unknown identifiers and deprecated classroom arguments", () => {
  expect(normalizeQuery("/classrooms", { capacity: "Infinity" })).toEqual({});
  expect(normalizeQuery("/classrooms", { capacity: "0" })).toEqual({
    capacity: "0",
  });
  expect(dateParam("2026-02-30")).toBeUndefined();
  expect(dateParam("2028-02-29")).toBe("2028-02-29");
  expect(
    normalizeQuery("/classrooms", {
      date: "bad",
      from: "08:00",
      to: "12:00",
      state: "unknown",
      page: "abc",
      roomKey: "directory:207",
    }),
  ).toEqual({
    from: "08:00",
    to: "12:00",
    state: "unknown",
    page: "abc",
    roomKey: "directory:207",
  });
  expect(
    normalizeQuery("/programs/123", {
      view: "offerings",
      semester: "461",
      lesson: "A.01",
    }),
  ).toEqual({ view: "offerings", semester: "461", lesson: "A.01" });
});
