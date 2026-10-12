import { computed, type Ref } from "vue";
import type { Lesson } from "../domain/models";
import type { usePlanner } from "./usePlanner";
import { useFilter } from "./useFilters";
import { useToday } from "./useToday";
import { addISODate, teachingWeek, isFirstMonday } from "../domain/dates";
import { integerParam } from "../domain/queryParams";
export function useLessonTimetable(
  filtered: Ref<Lesson[]>,
  planner: ReturnType<typeof usePlanner>,
  teacher: Ref<string>,
) {
  const view = useFilter("view", "list"),
    week = useFilter("week", "1"),
    timetableSource = useFilter("source", "candidates"),
    timetableMode = useFilter("ttMode", "week"),
    timetableDay = useFilter("ttDay", "1");
  const timetableLessons = computed(() =>
    timetableSource.value === "results"
      ? filtered.value
      : planner.lessons.value,
  );
  const timetableExportData = computed(() => ({
    lessons: timetableLessons.value,
    week: currentWeek.value,
    mode: timetableMode.value === "day" ? ("day" as const) : ("week" as const),
    day: Number(integerParam(1, 7)(timetableDay.value) ?? "1"),
    title:
      timetableSource.value === "results"
        ? teacher.value
          ? `${teacher.value}的查询课表`
          : "查询结果课表"
        : (planner.active.value?.name ?? "默认方案"),
  }));
  const currentWeek = computed(() =>
    Number(integerParam(1, 53)(week.value) ?? "1"),
  );
  const today = useToday(),
    thisWeek = computed(() =>
      teachingWeek(planner.firstMonday.value, today.value),
    );
  function jumpToday(dayOnly = false) {
    if (!thisWeek.value) return;
    week.value = String(thisWeek.value);
    timetableMode.value = dayOnly ? "day" : "week";
    if (dayOnly)
      timetableDay.value = String(
        ((new Date(`${today.value}T12:00:00Z`).getUTCDay() + 6) % 7) + 1,
      );
  }
  const detailWeekStart = computed(() =>
    view.value === "week" && isFirstMonday(planner.firstMonday.value)
      ? addISODate(planner.firstMonday.value, (currentWeek.value - 1) * 7)
      : undefined,
  );
  return {
    view,
    week,
    timetableSource,
    timetableMode,
    timetableDay,
    timetableLessons,
    timetableExportData,
    currentWeek,
    thisWeek,
    jumpToday,
    detailWeekStart,
  };
}
