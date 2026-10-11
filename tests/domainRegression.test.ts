import { describe, it, expect } from "vitest";
import {
  parseWeeks,
  parseSchedule,
  lessonConflicts,
} from "../src/domain/schedule";
import { lessonCalendar, examCalendar } from "../src/domain/calendar";
import { roomAvailability, roomKey } from "../src/domain/roomAvailability";
import {
  layoutRoomUsage,
  usageCategory,
  classroomDay,
} from "../src/domain/roomTimeline";
import { comparePrograms } from "../src/domain/programCompare";
import { resolveProgramReferences } from "../src/domain/programReferences";
import { weekDates, addISODate } from "../src/domain/dates";
import type {
  Lesson,
  Program,
  RoomUsage,
  ProgramModule,
} from "../src/domain/models";
const lesson = (id: string, weeks = [1, 3]): Lesson => ({
  id,
  code: id,
  course: { code: id, name: "数学分析".repeat(18) },
  department: "学院",
  departmentCode: "1",
  teachers: ["教师"],
  schedule: {
    text: "",
    unknown: false,
    slots: [{ day: 2, periods: [3, 4], weeks, location: "2301" }],
  },
});
const directory = [
  {
    id: 1,
    code: "1101",
    name: "同名",
    englishName: "A",
    buildingCode: "1",
    floor: 9,
  },
  {
    id: 2,
    code: "2101",
    name: "同名",
    englishName: "B",
    buildingCode: "2",
    floor: 3,
  },
];
const usage = (extra: Partial<RoomUsage> = {}): RoomUsage => ({
  id: "u",
  title: "课程",
  type: "lessons",
  room: "同名",
  start: 540,
  end: 585,
  ...extra,
});
describe("schedule and ICS", () => {
  it("parses parity and exclusions without guessing unknown expressions", () => {
    expect(parseWeeks("1~8单周")).toEqual([1, 3, 5, 7]);
    expect(parseWeeks("1~8周除3、4周")).toEqual([1, 2, 5, 6, 7, 8]);
    expect(parseWeeks("1 8周")).toBeUndefined();
  });
  it("keeps recognized slots alongside unknown text", () => {
    const schedule = parseSchedule("1~8周 2301 :2(3,4) 教师;待定");
    expect(schedule.slots).toHaveLength(1);
    expect(schedule.unknown).toBe(true);
  });
  it("requires both matching periods and weeks for a conflict", () => {
    expect(
      lessonConflicts([lesson("A", [1]), lesson("B", [2])]).overlaps,
    ).toHaveLength(0);
    expect(
      lessonConflicts([lesson("A"), lesson("B", [3])]).overlaps[0]?.weeks,
    ).toEqual([3]);
  });
  it("exports irregular weeks and folds Chinese lines at 75 UTF-8 bytes", () => {
    const result = lessonCalendar([lesson("A")], "2026-08-31");
    expect(result.count).toBe(2);
    expect(result.content).toContain("DTSTART;VALUE=DATE:20260901");
    for (const line of result.content.trimEnd().split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it("skips unknown and unmapped periods and requires Monday", () => {
    const unknown = lesson("A");
    unknown.schedule.unknown = true;
    expect(lessonCalendar([unknown], "2026-08-31").skipped).toEqual(["A"]);
    const fifth = lesson("B");
    fifth.schedule.slots[0]!.periods = [5];
    expect(lessonCalendar([fifth], "2026-08-31", "2").count).toBe(0);
    expect(() => lessonCalendar([lesson("A")], "2026-09-01")).toThrow();
  });
  it("uses China time and skips exams lacking valid times", () => {
    const result = examCalendar([
      {
        id: "1",
        courseCode: "A",
        courseName: "数学",
        rooms: ["2301"],
        date: "2026-10-11",
        start: 540,
        end: 600,
      },
      { id: "2", courseCode: "B", courseName: "物理", rooms: [] },
    ]);
    expect(result.count).toBe(1);
    expect(result.content).toContain("DTSTART:20261011T010000Z");
    expect(result.skipped).toEqual(["B"]);
  });
});
describe("rooms and dates", () => {
  it("uses directory floors and exact building-scoped aliases", () => {
    const rooms = roomAvailability(
      [usage({ building: "1" })],
      classroomDay.from,
      classroomDay.to,
      directory,
    );
    expect(rooms.find((r) => r.directoryId === 1)?.floor).toBe(9);
    expect(rooms.find((r) => r.directoryId === 1)?.records).toHaveLength(1);
  });
  it("does not resolve ambiguous names without a building", () => {
    const rooms = roomAvailability(
      [usage()],
      classroomDay.from,
      classroomDay.to,
      directory,
    );
    expect(
      rooms
        .filter((r) => r.directoryId !== undefined)
        .every((r) => !r.records.length),
    ).toBe(true);
    expect(
      rooms.find((r) => r.directoryId === undefined)?.floor,
    ).toBeUndefined();
  });
  it("keeps rooms without records unknown, including incomplete coverage", () => {
    expect(
      roomAvailability([], classroomDay.from, classroomDay.to, directory).every(
        (r) => r.state === "unknown",
      ),
    ).toBe(true);
    const rooms = roomAvailability(
      [usage({ room: undefined })],
      classroomDay.from,
      classroomDay.to,
      directory,
    );
    expect(rooms.every((r) => r.state === "unknown")).toBe(true);
  });
  it("retains clipping, short duration and overlap lanes", () => {
    const records = [
        usage({ id: "a", start: 460, end: 500 }),
        usage({ id: "b", start: 480, end: 525 }),
      ],
      blocks = layoutRoomUsage(records, classroomDay.from, classroomDay.to);
    expect(blocks[0]?.clippedStart).toBe(true);
    expect(blocks.every((b) => b.width === 50)).toBe(true);
    expect(blocks[1]?.height).toBeCloseTo(
      (45 / (classroomDay.to - classroomDay.from)) * 100,
    );
  });
  it("maps all six source groups to three categories", () => {
    expect(
      [
        "lessons",
        "tmpLessons",
        "roomOccupies",
        "exams",
        "makeupExams",
        "tmpExams",
      ].map(usageCategory),
    ).toEqual(["teaching", "occupation", "occupation", "exam", "exam", "exam"]);
  });
  it("normalizes unmatched room keys and handles leap-day weeks", () => {
    expect(roomKey({ building: " 1 ", room: " ab01 " })).toBe(
      roomKey({ building: "1", room: "AB01" }),
    );
    expect(addISODate("2028-02-28", 1)).toBe("2028-02-29");
    expect(weekDates("2026-10-11")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });
});
const entry = { course: { code: "A", name: "数学" }, terms: ["1秋"] };
const module = (id: string, publicId?: string): ProgramModule => ({
  id,
  name: id,
  courses: [entry],
  children: [],
  publicId,
});
const program = (modules: ProgramModule[]): Program => ({
  grade: "2026",
  trainType: "主修",
  department: "学院",
  major: "数学",
  modules,
});
describe("program comparison and references", () => {
  it("preserves repeated course occurrences in changed modules", () => {
    const before = program([module("a"), module("b")]),
      after = program([module("a")]);
    const diff = comparePrograms(before, after);
    expect(diff.changed[0]?.before).toHaveLength(2);
    expect(diff.changed[0]?.after).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
  });
  it("does not merge different codes with matching names", () => {
    const a = program([module("a")]),
      b = program([
        {
          ...module("a"),
          courses: [{ ...entry, course: { code: "B", name: "数学" } }],
        },
      ]);
    expect(comparePrograms(a, b).added).toHaveLength(1);
    expect(comparePrograms(a, b).removed).toHaveLength(1);
  });
  it("retains local courses on failed references", async () => {
    const resolved = await resolveProgramReferences(
      program([module("local", "shared")]),
      async () => {
        throw new Error("请求失败");
      },
    );
    expect(resolved.modules[0]?.courses).toHaveLength(1);
    expect(resolved.modules[0]?.referenceState).toBe("incomplete");
    expect(resolved.referenceIssues).toHaveLength(1);
  });
  it("detects cyclic references as incomplete", async () => {
    const resolved = await resolveProgramReferences(
      program([module("local", "A")]),
      async (id) => ({
        data: module(`wrapper-${id}`, id === "A" ? "B" : "A"),
        meta: {
          source: id,
          retrievedAt: new Date().toISOString(),
          state: "online",
        },
      }),
    );
    expect(resolved.modules[0]?.referenceState).toBe("incomplete");
    expect(resolved.referenceIssues?.length).toBeGreaterThan(0);
  });
});
