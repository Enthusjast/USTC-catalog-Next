import { computed, ref, watch, type Ref } from "vue";
import { catalog } from "../api/catalog";
import { useQuery } from "./useQuery";
import { useFilter, useDebounced } from "./useFilters";
import { useLessonFilterInfo } from "./useLessonFilterInfo";
import { useFilterSummary } from "./useFilterSummary";
import {
  matchesLessonFilters,
  matchesOption,
  missingValue,
} from "../domain/lessonFilters";
import { rankLessons } from "../domain/search";
import { weekdays } from "../domain/schedule";
export function useLessonResults(semester: Ref<string>) {
  const q = useFilter("q"),
    keyword = useDebounced(q),
    dept = useFilter("dept"),
    teacher = useFilter("teacher"),
    day = useFilter("day"),
    period = useFilter("period"),
    location = useFilter("location"),
    education = useFilter("education"),
    type = useFilter("type"),
    courseType = useFilter("courseType"),
    category = useFilter("category"),
    discipline = useFilter("discipline"),
    grading = useFilter("grading"),
    campus = useFilter("campus"),
    language = useFilter("language"),
    examMode = useFilter("exam");
  const sort = useFilter("sort", "code");
  const query = useQuery(
    (signal, force) => catalog.lessons(semester.value, { signal, force }),
    semester,
    () => !!semester.value,
  );
  const { data } = query;
  const advancedOpen = ref(false);
  watch(
    () =>
      [
        education,
        type,
        courseType,
        category,
        discipline,
        grading,
        campus,
        language,
        examMode,
      ].some((field) => !!field.value),
    (active) => {
      if (active) advancedOpen.value = true;
    },
    { immediate: true },
  );
  const metadataOpen = ref(false);
  const baseFiltered = computed(() =>
    (data.value ?? []).filter((l) =>
      matchesLessonFilters(l, {
        q: keyword.value,
        dept: dept.value,
        teacher: teacher.value,
        day: day.value,
        period: period.value,
        location: location.value,
        education: education.value,
        type: type.value,
        courseType: courseType.value,
        category: category.value,
        campus: campus.value,
        language: language.value,
        exam: examMode.value,
      }),
    ),
  );
  const lessonFilterInfo = useLessonFilterInfo(
    semester,
    baseFiltered,
    () => metadataOpen.value || !!discipline.value || !!grading.value,
  );
  const filterInfoByCode = computed(
    () =>
      new Map(
        (lessonFilterInfo.data.value ?? []).map((info) => [info.code, info]),
      ),
  );
  const metadataFiltersPending = computed(
    () =>
      !!baseFiltered.value.length &&
      !!(discipline.value || grading.value) &&
      !lessonFilterInfo.data.value,
  );
  const departments = computed(() =>
    [
      ...new Map(
        (data.value ?? []).map((l) => [
          l.departmentCode,
          { code: l.departmentCode, name: l.department },
        ]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name, "zh")),
  );
  const selectedDepartment = computed({
    get: () =>
      departments.value.find((d) => d.name === dept.value)?.code ?? dept.value,
    set: (value) => {
      dept.value = value;
    },
  });
  const filterSummary = useFilterSummary({
    q: { label: "关键词", model: q },
    dept: {
      label: "院系",
      model: dept,
      display: () =>
        departments.value.find(
          (department) => department.code === selectedDepartment.value,
        )?.name,
    },
    teacher: { label: "教师", model: teacher },
    day: {
      label: "星期",
      model: day,
      display: () =>
        weekdays[Number(day.value) - 1]
          ? `周${weekdays[Number(day.value) - 1]}`
          : day.value,
    },
    period: {
      label: "课节",
      model: period,
      display: () => `第 ${period.value} 节`,
    },
    location: { label: "地点", model: location },
    education: { label: "学历层次", model: education },
    type: { label: "课堂类型", model: type },
    courseType: {
      label: "课程类型",
      model: courseType,
      display: () => (courseType.value === missingValue ? "未提供" : undefined),
    },
    category: { label: "课程范畴", model: category },
    discipline: {
      label: "学科类别",
      model: discipline,
      display: () => (discipline.value === missingValue ? "未提供" : undefined),
    },
    grading: {
      label: "评分制",
      model: grading,
      display: () => (grading.value === missingValue ? "未提供" : undefined),
    },
    campus: {
      label: "校区",
      model: campus,
      display: () => (campus.value === missingValue ? "未提供" : undefined),
    },
    language: { label: "授课语言", model: language },
    exam: { label: "考试方式", model: examMode },
  });
  function distinctOptions(
    values: (string | undefined)[],
    includeMissing = false,
  ) {
    const result = [...new Set(values.filter((v): v is string => !!v))].sort(
      (a, b) => a.localeCompare(b, "zh-CN"),
    );
    if (includeMissing && values.some((value) => !value))
      result.push(missingValue);
    return result;
  }
  const options = (
    field:
      | "education"
      | "classType"
      | "courseType"
      | "category"
      | "language"
      | "examMode"
      | "campus",
  ) =>
    distinctOptions(
      (data.value ?? []).map((l) => l[field]),
      field === "courseType" || field === "campus",
    );
  function detailOptions(field: "discipline" | "grading") {
    if (!lessonFilterInfo.data.value) return [];
    return distinctOptions(
      (lessonFilterInfo.data.value ?? []).map((info) => info[field]),
      true,
    );
  }
  const advanced = computed(() => [
    {
      key: "education",
      label: "学历层次",
      model: education,
      values: options("education"),
    },
    {
      key: "type",
      label: "课堂类型",
      model: type,
      values: options("classType"),
    },
    {
      key: "courseType",
      label: "课程类型",
      model: courseType,
      values: options("courseType"),
    },
    {
      key: "category",
      label: "课程范畴",
      model: category,
      values: options("category"),
    },
    {
      key: "discipline",
      label: "学科类别",
      model: discipline,
      values: detailOptions("discipline"),
    },
    {
      key: "grading",
      label: "评分制",
      model: grading,
      values: detailOptions("grading"),
    },
    { key: "campus", label: "校区", model: campus, values: options("campus") },
    {
      key: "language",
      label: "授课语言",
      model: language,
      values: options("language"),
    },
    {
      key: "exam",
      label: "考试方式",
      model: examMode,
      values: options("examMode"),
    },
  ]);
  const filtered = computed(() =>
    (metadataFiltersPending.value ? [] : baseFiltered.value)
      .filter(
        (l) =>
          matchesOption(
            filterInfoByCode.value.get(l.code)?.discipline,
            discipline.value,
          ) &&
          matchesOption(
            filterInfoByCode.value.get(l.code)?.grading,
            grading.value,
          ),
      )
      .sort(
        (a, b) =>
          (keyword.value.trim() && sort.value === "code"
            ? rankLessons([a, b], keyword.value).findIndex((l) => l === a) -
              rankLessons([a, b], keyword.value).findIndex((l) => l === b)
            : 0) ||
          (sort.value === "name"
            ? a.course.name
            : sort.value === "department"
              ? a.department
              : a.code
          ).localeCompare(
            sort.value === "name"
              ? b.course.name
              : sort.value === "department"
                ? b.department
                : b.code,
            "zh-CN",
            { numeric: true },
          ),
      ),
  );
  return {
    ...query,
    q,
    keyword,
    dept,
    teacher,
    day,
    period,
    location,
    education,
    type,
    courseType,
    category,
    discipline,
    grading,
    campus,
    language,
    examMode,
    sort,
    advancedOpen,
    metadataOpen,
    baseFiltered,
    lessonFilterInfo,
    metadataFiltersPending,
    filterInfoByCode,
    departments,
    selectedDepartment,
    filterSummary,
    advanced,
    filtered,
  };
}
