import { it, expect, vi, beforeEach } from "vitest";
import { ref, computed, effectScope, nextTick } from "vue";
import type { Lesson } from "../src/domain/models";
const mocked = vi.hoisted(() => ({
  fields: new Map<string, ReturnType<typeof ref<string>>>(),
  lessons: vi.fn(),
}));
vi.mock("../src/features/useFilters", () => ({
  useFilter: (name: string, fallback = "") => {
    if (!mocked.fields.has(name)) mocked.fields.set(name, ref(fallback));
    return mocked.fields.get(name)!;
  },
  useDebounced: (value: unknown) => value,
}));
vi.mock("../src/api/catalog", () => ({ catalog: { lessons: mocked.lessons } }));
vi.mock("../src/features/useLessonFilterInfo", () => ({
  useLessonFilterInfo: () => ({
    data: ref([]),
    loading: ref(false),
    error: ref(),
    reload: vi.fn(),
  }),
}));
import { useLessonResults } from "../src/features/useLessonResults";
import { useLessonComparison } from "../src/features/useLessonComparison";
import { useLessonTimetable } from "../src/features/useLessonTimetable";
const makeLesson = (code: string, id: string, name = "课程"): Lesson => ({
  id,
  code: `${code}.${id}`,
  course: { code, name },
  teachers: ["教师"],
  department: "院系",
  departmentCode: "1",
  schedule: { slots: [], unknown: true, text: "未提供" },
});
beforeEach(() => {
  mocked.fields.clear();
  mocked.lessons.mockReset();
});
it("keeps ranked filtering, department compatibility and full results after extraction", async () => {
  const scope = effectScope();
  mocked.lessons.mockResolvedValue({
    data: [makeLesson("B", "2"), makeLesson("A", "1")],
    meta: {
      state: "online",
      source: "test",
      retrievedAt: new Date().toISOString(),
    },
  });
  const results = scope.run(() => useLessonResults(ref("461")))!;
  await nextTick();
  expect(results.filtered.value.map((l) => l.course.code)).toEqual(["A", "B"]);
  results.q.value = "A";
  expect(results.filtered.value).toHaveLength(1);
  results.dept.value = "院系";
  expect(results.selectedDepartment.value).toBe("1");
  expect(results.filterSummary.count.value).toBe(2);
  scope.stop();
});
it("keeps comparison limits and timetable source changes independent of pagination", () => {
  const scope = effectScope();
  const rows = ref(
    Array.from({ length: 130 }, (_, i) => makeLesson("A", String(i))),
  );
  const comparison = scope.run(() => useLessonComparison(rows))!;
  for (const lesson of rows.value.slice(0, 5)) comparison.toggleCompare(lesson);
  expect(comparison.compared.value).toHaveLength(4);
  expect(comparison.compareMessage.value).toContain("四个");
  const planner = {
    lessons: ref([rows.value[0]!]),
    active: ref({ name: "方案" }),
    firstMonday: ref(""),
  } as any;
  const timetable = scope.run(() =>
    useLessonTimetable(
      computed(() => rows.value),
      planner,
      ref("教师"),
    ),
  )!;
  expect(timetable.timetableLessons.value).toHaveLength(1);
  timetable.timetableSource.value = "results";
  expect(timetable.timetableExportData.value.lessons).toHaveLength(130);
  timetable.week.value = "1.5";
  timetable.timetableDay.value = "Infinity";
  expect(timetable.currentWeek.value).toBe(1);
  expect(timetable.timetableExportData.value.day).toBe(1);
  scope.stop();
});
